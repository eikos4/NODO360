import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommandLogKind,
  CommandNoveltyCategory,
  CommandPostStatus,
  CommandRequestStatus,
  CommandResourceOrigin,
  CommandResourceStatus,
  CommandSectorStatus,
  EmergencyResponseStatus,
  IncidentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, companyIdsForActor } from '../common/cuerpo-scope';
import { EmergencyBroadcaster } from '../emergency-realtime/emergency-broadcaster.service';
import { EMERGENCY_EVENT_NAMES } from '../emergency-realtime/emergency-events.contract';
import {
  CloseCommandPostDto,
  CreateExternalResourceDto,
  CreateNoveltyDto,
  CreatePointDto,
  CreateRequestDto,
  CreateSectorDto,
  OpenCommandPostDto,
  TransferCommandDto,
  UpdateRequestDto,
  UpdateResourceDto,
  UpdateSectorDto,
} from './dto/command-post.dto';

const ACTIVE_RESPONSES: EmergencyResponseStatus[] = [
  EmergencyResponseStatus.GOING,
  EmergencyResponseStatus.ON_SCENE,
  EmergencyResponseStatus.LOCATION_MARKED,
];

const UNASSIGNED_STATUSES: CommandResourceStatus[] = [
  CommandResourceStatus.SOLICITADO,
  CommandResourceStatus.DESPACHADO,
  CommandResourceStatus.EN_TRASLADO,
  CommandResourceStatus.ARRIBANDO,
  CommandResourceStatus.DISPONIBLE,
];

type ActorUser = Actor;

function toPolygonJson(points?: { lat: number; lng: number }[]) {
  if (!points?.length) return undefined;
  const path = points
    .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (!path.length) return undefined;
  if (path.length < 3) {
    throw new BadRequestException('La zona necesita al menos 3 puntos en el mapa.');
  }
  return path as unknown as Prisma.InputJsonValue;
}

function companyLabel(company: { name: string; number: number }) {
  return company.name || `${company.number}ª Compañía`;
}

@Injectable()
export class CommandPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcaster: EmergencyBroadcaster,
  ) {}

  async list(actor: Actor) {
    const scope = await companyIdsForActor(this.prisma, actor);
    const companyFilter = scope ? { companyId: { in: scope } } : {};

    const [posts, incidents] = await Promise.all([
      this.prisma.commandPost.findMany({
        where: { incident: companyFilter },
        include: {
          incident: {
            select: {
              id: true,
              code: true,
              type: true,
              address: true,
              status: true,
              dispatchedAt: true,
              company: { select: { id: true, name: true, number: true } },
            },
          },
          commands: { orderBy: { assumedAt: 'desc' }, take: 1 },
          _count: { select: { resources: true, sectors: true } },
        },
        orderBy: { openedAt: 'desc' },
        take: 80,
      }),
      this.prisma.incident.findMany({
        where: { status: IncidentStatus.ACTIVE, commandPost: { is: null }, ...companyFilter },
        select: {
          id: true,
          code: true,
          type: true,
          address: true,
          dispatchedAt: true,
          company: { select: { id: true, name: true, number: true } },
        },
        orderBy: { dispatchedAt: 'desc' },
        take: 40,
      }),
    ]);

    return {
      posts: posts.map((post) => ({
        id: post.id,
        status: post.status,
        openedAt: post.openedAt,
        closedAt: post.closedAt,
        incident: post.incident,
        command: post.commands[0]
          ? { name: post.commands[0].name, rank: post.commands[0].rank, assumedAt: post.commands[0].assumedAt }
          : null,
        resourceCount: post._count.resources,
        sectorCount: post._count.sectors,
      })),
      eligibleIncidents: incidents,
    };
  }

  async snapshot(incidentId: string, actor: ActorUser) {
    const incident = await this.loadIncident(incidentId, actor);
    const post = await this.prisma.commandPost.findUnique({ where: { incidentId } });
    if (post?.status === CommandPostStatus.ACTIVE) {
      await this.syncNodo360Resources(post.id, incident);
    }
    return this.buildSnapshot(incidentId, actor);
  }

  async open(dto: OpenCommandPostDto, actor: ActorUser) {
    const incident = await this.loadIncident(dto.incidentId, actor);
    if (incident.status !== IncidentStatus.ACTIVE) {
      throw new BadRequestException('Solo se puede constituir un puesto de comando en una emergencia activa.');
    }

    const existing = await this.prisma.commandPost.findUnique({ where: { incidentId: dto.incidentId } });
    if (existing?.status === CommandPostStatus.ACTIVE) {
      return this.buildSnapshot(dto.incidentId, actor);
    }
    if (existing) {
      throw new ConflictException('El puesto de comando de esta emergencia ya fue finalizado.');
    }

    const commanderName = dto.commanderName.trim();
    if (!commanderName) throw new BadRequestException('Indique quién asume el mando.');
    const rank = dto.rank?.trim() || null;
    const actorName = await this.actorName(actor);

    await this.prisma.$transaction(async (tx) => {
      const post = await tx.commandPost.create({
        data: {
          incidentId: incident.id,
          latitude: dto.latitude ?? incident.confirmedLatitude ?? incident.latitude,
          longitude: dto.longitude ?? incident.confirmedLongitude ?? incident.longitude,
          openedById: actor.id,
          openedByName: actorName,
          openedByRank: rank,
          initialNote: dto.note?.trim() || null,
        },
      });
      await tx.commandPostCommand.create({
        data: {
          postId: post.id,
          userId: actor.id,
          name: commanderName,
          rank,
          note: dto.note?.trim() || null,
        },
      });
      await tx.commandPostLog.create({
        data: {
          postId: post.id,
          kind: CommandLogKind.COMMAND,
          action: 'Puesto de Comando constituido.',
          detail: dto.note?.trim() || null,
          actorId: actor.id,
          actorName,
        },
      });
      await tx.commandPostLog.create({
        data: {
          postId: post.id,
          kind: CommandLogKind.COMMAND,
          action: `${commanderName}${rank ? ` (${rank})` : ''} asume el mando.`,
          actorId: actor.id,
          actorName,
        },
      });
    });

    const created = await this.prisma.commandPost.findUniqueOrThrow({ where: { incidentId: incident.id } });
    await this.syncNodo360Resources(created.id, incident);
    await this.emitUpdate(incident.id, incident.companyId);
    return this.buildSnapshot(incident.id, actor);
  }

  async transfer(postId: string, dto: TransferCommandDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const commanderName = dto.commanderName.trim();
    if (!commanderName) throw new BadRequestException('Indique el nuevo mando.');
    const actorName = await this.actorName(actor);
    const current = await this.currentCommand(post.id);

    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.commandPostCommand.update({
          where: { id: current.id },
          data: { releasedAt: new Date() },
        });
      }
      await tx.commandPostCommand.create({
        data: {
          postId: post.id,
          userId: actor.id,
          name: commanderName,
          rank: dto.rank?.trim() || null,
          note: dto.note?.trim() || null,
          transferredByName: actorName,
        },
      });
      await tx.commandPostLog.create({
        data: {
          postId: post.id,
          kind: CommandLogKind.COMMAND,
          action: current
            ? `${current.name} transfiere el mando de la emergencia a ${commanderName}.`
            : `${commanderName} asume el mando.`,
          detail: dto.note?.trim() || null,
          actorId: actor.id,
          actorName,
        },
      });
    });

    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async addExternalResource(postId: string, dto: CreateExternalResourceDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const actorName = await this.actorName(actor);
    const resource = await this.prisma.commandPostResource.create({
      data: {
        postId: post.id,
        origin: CommandResourceOrigin.EXTERNAL,
        institution: dto.institution.trim(),
        companyName: dto.companyName?.trim() || null,
        label: dto.label.trim(),
        type: dto.type.trim(),
        responsibleName: dto.responsibleName?.trim() || null,
        staffing: dto.staffing ?? 0,
        contact: dto.contact?.trim() || null,
        status: dto.status ?? CommandResourceStatus.DISPONIBLE,
        latitude: post.latitude,
        longitude: post.longitude,
      },
    });
    await this.log(post.id, {
      kind: CommandLogKind.RESOURCE,
      action: `${resource.label} incorporado como recurso externo (${dto.institution.trim()}).`,
      actorId: actor.id,
      actorName,
      resourceId: resource.id,
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async updateResource(postId: string, resourceId: string, dto: UpdateResourceDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const resource = await this.prisma.commandPostResource.findFirst({
      where: { id: resourceId, postId: post.id },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado.');

    let sectorId = resource.sectorId;
    if (dto.sectorId !== undefined) {
      if (dto.sectorId) {
        const sector = await this.prisma.commandPostSector.findFirst({
          where: { id: dto.sectorId, postId: post.id },
        });
        if (!sector) throw new NotFoundException('Sector no encontrado.');
        sectorId = sector.id;
      } else {
        sectorId = null;
      }
    }

    const nextStatus =
      dto.status ??
      (dto.sectorId
        ? resource.status === CommandResourceStatus.DISPONIBLE || resource.status === CommandResourceStatus.ARRIBANDO
          ? CommandResourceStatus.ASIGNADO
          : resource.status
        : resource.status);

    const updated = await this.prisma.commandPostResource.update({
      where: { id: resource.id },
      data: {
        status: nextStatus,
        sectorId,
        mission: dto.mission !== undefined ? dto.mission.trim() || null : undefined,
        staffing: dto.staffing,
        responsibleName: dto.responsibleName !== undefined ? dto.responsibleName.trim() || null : undefined,
        latitude: dto.latitude,
        longitude: dto.longitude,
        arrivedAt:
          nextStatus === CommandResourceStatus.ARRIBANDO || nextStatus === CommandResourceStatus.EN_OPERACION
            ? resource.arrivedAt ?? new Date()
            : resource.arrivedAt,
        withdrawnAt: nextStatus === CommandResourceStatus.RETIRADO ? resource.withdrawnAt ?? new Date() : resource.withdrawnAt,
      },
      include: { sector: true },
    });

    const actorName = await this.actorName(actor);
    const parts: string[] = [];
    if (dto.sectorId !== undefined) {
      parts.push(
        updated.sector
          ? `${updated.label} asignado a Sector ${updated.sector.name}${updated.mission ? ` / ${updated.mission}` : ''}.`
          : `${updated.label} queda sin asignación de sector.`,
      );
    }
    if (dto.status && dto.status !== resource.status) {
      parts.push(`${updated.label} cambia de ${labelStatus(resource.status)} a ${labelStatus(updated.status)}.`);
    }
    if (dto.staffing !== undefined && dto.staffing !== resource.staffing) {
      parts.push(`${updated.label} actualiza dotación a ${updated.staffing}.`);
    }
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      parts.push(`${updated.label} reposicionado en el mapa táctico.`);
    }
    if (parts.length) {
      await this.log(post.id, {
        kind: CommandLogKind.RESOURCE,
        action: parts.join(' '),
        actorId: actor.id,
        actorName,
        resourceId: updated.id,
        sectorId: updated.sectorId,
        previousStatus: resource.status,
        nextStatus: updated.status,
      });
    }

    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async addSector(postId: string, dto: CreateSectorDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const count = await this.prisma.commandPostSector.count({ where: { postId: post.id } });
    const sector = await this.prisma.commandPostSector.create({
      data: {
        postId: post.id,
        name: dto.name.trim(),
        mission: dto.mission?.trim() || null,
        responsibleName: dto.responsibleName?.trim() || null,
        sortOrder: count,
        polygon: toPolygonJson(dto.polygon),
        color: dto.color?.trim() || '#dc2626',
      },
    });
    await this.log(post.id, {
      kind: CommandLogKind.SECTOR,
      action: dto.polygon?.length
        ? `Zona de emergencia marcada en el mapa: Sector ${sector.name}.`
        : `Sector ${sector.name} creado${sector.mission ? ` · misión ${sector.mission}` : ''}.`,
      actorId: actor.id,
      actorName: await this.actorName(actor),
      sectorId: sector.id,
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async updateSector(postId: string, sectorId: string, dto: UpdateSectorDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const sector = await this.prisma.commandPostSector.findFirst({ where: { id: sectorId, postId: post.id } });
    if (!sector) throw new NotFoundException('Sector no encontrado.');

    const updated = await this.prisma.commandPostSector.update({
      where: { id: sector.id },
      data: {
        name: dto.name?.trim(),
        mission: dto.mission !== undefined ? dto.mission.trim() || null : undefined,
        responsibleName: dto.responsibleName !== undefined ? dto.responsibleName.trim() || null : undefined,
        status: dto.status,
        polygon: toPolygonJson(dto.polygon),
        color: dto.color?.trim() || undefined,
        closedAt:
          dto.status === CommandSectorStatus.COMPLETADO || dto.status === CommandSectorStatus.SUSPENDIDO
            ? sector.closedAt ?? new Date()
            : dto.status
              ? null
              : undefined,
      },
    });

    if (dto.polygon?.length) {
      await this.log(post.id, {
        kind: CommandLogKind.SECTOR,
        action: `Zona de emergencia actualizada en el mapa: Sector ${updated.name}.`,
        actorId: actor.id,
        actorName: await this.actorName(actor),
        sectorId: updated.id,
      });
    }

    if (dto.status && dto.status !== sector.status) {
      await this.log(post.id, {
        kind: CommandLogKind.SECTOR,
        action: `Sector ${updated.name} pasa a ${labelSector(updated.status)}.`,
        actorId: actor.id,
        actorName: await this.actorName(actor),
        sectorId: updated.id,
        previousStatus: sector.status,
        nextStatus: updated.status,
      });
    }
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async addNovelty(postId: string, dto: CreateNoveltyDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('La novedad no puede estar vacía.');
    await this.log(post.id, {
      kind: CommandLogKind.NOVELTY,
      action: text,
      actorId: actor.id,
      actorName: await this.actorName(actor),
      category: dto.category ?? null,
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async addRequest(postId: string, dto: CreateRequestDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    if (dto.sectorId) {
      const sector = await this.prisma.commandPostSector.findFirst({
        where: { id: dto.sectorId, postId: post.id },
      });
      if (!sector) throw new NotFoundException('Sector no encontrado.');
    }
    const request = await this.prisma.commandPostRequest.create({
      data: {
        postId: post.id,
        type: dto.type.trim(),
        quantity: dto.quantity ?? 1,
        reason: dto.reason?.trim() || null,
        priority: dto.priority,
        sectorId: dto.sectorId || null,
      },
      include: { sector: true },
    });
    await this.log(post.id, {
      kind: CommandLogKind.REQUEST,
      action: `Solicitud: ${request.quantity} ${request.type}${request.sector ? ` → Sector ${request.sector.name}` : ''}.`,
      detail: request.reason,
      actorId: actor.id,
      actorName: await this.actorName(actor),
      sectorId: request.sectorId,
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async updateRequest(postId: string, requestId: string, dto: UpdateRequestDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const request = await this.prisma.commandPostRequest.findFirst({
      where: { id: requestId, postId: post.id },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    const updated = await this.prisma.commandPostRequest.update({
      where: { id: request.id },
      data: { status: dto.status },
    });
    await this.log(post.id, {
      kind: CommandLogKind.REQUEST,
      action: `Solicitud ${updated.type} pasa a ${labelRequest(updated.status)}.`,
      actorId: actor.id,
      actorName: await this.actorName(actor),
      previousStatus: request.status,
      nextStatus: updated.status,
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async addPoint(postId: string, dto: CreatePointDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    await this.prisma.commandPostPoint.create({
      data: {
        postId: post.id,
        name: dto.name.trim(),
        kind: dto.kind,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    await this.log(post.id, {
      kind: CommandLogKind.SYSTEM,
      action: `Punto operacional ${dto.name.trim()} (${dto.kind || 'OTRO'}) marcado en el mapa.`,
      actorId: actor.id,
      actorName: await this.actorName(actor),
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async close(postId: string, dto: CloseCommandPostDto, actor: ActorUser) {
    const post = await this.requireActivePost(postId, actor);
    const actorName = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.commandPost.update({
        where: { id: post.id },
        data: {
          status: CommandPostStatus.CLOSED,
          closedAt: new Date(),
          closeNote: dto.note?.trim() || null,
        },
      });
      await tx.commandPostLog.create({
        data: {
          postId: post.id,
          kind: CommandLogKind.CLOSE,
          action: 'Puesto de Comando finalizado.',
          detail: dto.note?.trim() || null,
          actorId: actor.id,
          actorName,
        },
      });
    });
    await this.emitUpdate(post.incidentId, post.incident.companyId);
    return this.buildSnapshot(post.incidentId, actor);
  }

  async exportLog(postId: string, actor: Actor) {
    const post = await this.prisma.commandPost.findUnique({
      where: { id: postId },
      include: {
        incident: { include: { company: { select: { id: true, name: true, number: true } } } },
        commands: { orderBy: { assumedAt: 'asc' } },
        logs: { orderBy: { occurredAt: 'asc' } },
        resources: true,
        sectors: true,
        requests: true,
      },
    });
    if (!post) throw new NotFoundException('Puesto de comando no encontrado.');
    await assertCompanyAccess(this.prisma, actor, post.incident.companyId);

    const lines = [
      `NODO360 | BITÁCORA PUESTO DE COMANDO`,
      `Emergencia: ${post.incident.type}  ${post.incident.code}`,
      `Dirección: ${post.incident.address}`,
      `Apertura: ${post.openedAt.toISOString()}`,
      post.closedAt ? `Cierre: ${post.closedAt.toISOString()}` : 'Estado: ACTIVO',
      '',
      'MANDOS',
      ...post.commands.map(
        (c) =>
          `- ${c.assumedAt.toISOString()}  ${c.name}${c.rank ? ` (${c.rank})` : ''}${c.releasedAt ? ` → hasta ${c.releasedAt.toISOString()}` : ' (actual)'}`,
      ),
      '',
      'LÍNEA DE TIEMPO',
      ...post.logs.map((l) => `${l.occurredAt.toISOString()}  ${l.action}${l.detail ? ` — ${l.detail}` : ''}  [${l.actorName}]`),
      '',
    ];
    return {
      filename: `nodo-command-${post.incident.code}.txt`,
      text: lines.join('\n'),
    };
  }

  private async buildSnapshot(incidentId: string, actor: ActorUser) {
    const incident = await this.loadIncident(incidentId, actor);
    const post = await this.prisma.commandPost.findUnique({
      where: { incidentId },
      include: {
        commands: { orderBy: { assumedAt: 'desc' } },
        sectors: { orderBy: { sortOrder: 'asc' } },
        resources: { orderBy: { createdAt: 'asc' } },
        logs: { orderBy: { occurredAt: 'desc' }, take: 2000 },
        requests: { orderBy: { createdAt: 'desc' } },
        points: { orderBy: { createdAt: 'asc' } },
      },
    });

    const responders = incident.emergencyResponses
      .filter((r) => r.status && ACTIVE_RESPONSES.includes(r.status))
      .map((r) => ({
        userId: r.userId,
        name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        companyName: r.user.company ? companyLabel(r.user.company) : null,
        status: r.status,
        latitude: r.markerLatitude ?? r.latitude,
        longitude: r.markerLongitude ?? r.longitude,
      }));

    const resources = post?.resources ?? [];
    const sectors = post?.sectors ?? [];
    const companies = new Set(
      resources.map((r) => r.companyName || r.institution).filter((v): v is string => Boolean(v)),
    );
    const firefighterFromResources = resources.reduce((sum, r) => sum + (r.staffing || 0), 0);
    const firefighterFromUsers = responders.length;
    const alerts = post ? this.buildAlerts(post.resources, post.sectors, post.requests) : [];

    return {
      incident: {
        id: incident.id,
        code: incident.code,
        type: incident.type,
        address: incident.address,
        status: incident.status,
        latitude: incident.confirmedLatitude ?? incident.latitude,
        longitude: incident.confirmedLongitude ?? incident.longitude,
        dispatchedAt: incident.dispatchedAt,
        company: incident.company,
      },
      post: post
        ? {
            id: post.id,
            status: post.status,
            openedAt: post.openedAt,
            closedAt: post.closedAt,
            closeNote: post.closeNote,
            latitude: post.latitude,
            longitude: post.longitude,
            openedByName: post.openedByName,
            openedByRank: post.openedByRank,
            initialNote: post.initialNote,
            command: post.commands[0]
              ? {
                  id: post.commands[0].id,
                  name: post.commands[0].name,
                  rank: post.commands[0].rank,
                  assumedAt: post.commands[0].assumedAt,
                }
              : null,
            commandHistory: post.commands.map((c) => ({
              id: c.id,
              name: c.name,
              rank: c.rank,
              assumedAt: c.assumedAt,
              releasedAt: c.releasedAt,
              transferredByName: c.transferredByName,
            })),
          }
        : null,
      resources,
      sectors,
      logs: post?.logs ?? [],
      requests: post?.requests ?? [],
      points: post?.points ?? [],
      responders,
      counters: {
        firefighters: Math.max(firefighterFromResources, firefighterFromUsers),
        units: resources.filter((r) => r.status !== CommandResourceStatus.RETIRADO).length,
        companies: companies.size,
        external: resources.filter((r) => r.origin === CommandResourceOrigin.EXTERNAL).length,
        sectorsActive: sectors.filter((s) => s.status === CommandSectorStatus.EN_OPERACION).length,
        available: resources.filter((r) => r.status === CommandResourceStatus.DISPONIBLE).length,
        inTransit: resources.filter(
          (r) =>
            r.status === CommandResourceStatus.EN_TRASLADO ||
            r.status === CommandResourceStatus.DESPACHADO ||
            r.status === CommandResourceStatus.ARRIBANDO,
        ).length,
      },
      alerts,
      canWrite: Boolean(post && post.status === CommandPostStatus.ACTIVE),
    };
  }

  private buildAlerts(
    resources: { id: string; label: string; sectorId: string | null; status: CommandResourceStatus; createdAt: Date }[],
    sectors: { id: string; name: string; responsibleName: string | null; status: CommandSectorStatus }[],
    requests: { id: string; type: string; status: CommandRequestStatus; createdAt: Date }[],
  ) {
    const alerts: { level: 'warn' | 'critical'; message: string }[] = [];
    for (const resource of resources) {
      if (
        !resource.sectorId &&
        resource.status !== CommandResourceStatus.RETIRADO &&
        resource.status !== CommandResourceStatus.FUERA_DE_SERVICIO &&
        UNASSIGNED_STATUSES.includes(resource.status)
      ) {
        alerts.push({ level: 'warn', message: `Unidad ${resource.label} sin asignación.` });
      }
      if (
        (resource.status === CommandResourceStatus.SOLICITADO || resource.status === CommandResourceStatus.DESPACHADO) &&
        Date.now() - resource.createdAt.getTime() > 20 * 60 * 1000
      ) {
        alerts.push({ level: 'warn', message: `Recurso ${resource.label} solicitado aún no arribado.` });
      }
      if (resource.status === CommandResourceStatus.FUERA_DE_SERVICIO) {
        alerts.push({ level: 'critical', message: `Unidad ${resource.label} reportada con problema.` });
      }
    }
    for (const sector of sectors) {
      if (!sector.responsibleName && sector.status === CommandSectorStatus.EN_OPERACION) {
        alerts.push({ level: 'warn', message: `Sector ${sector.name} sin responsable.` });
      }
    }
    for (const request of requests) {
      if (request.status === CommandRequestStatus.SOLICITADO) {
        alerts.push({ level: 'warn', message: `Solicitud pendiente: ${request.type}.` });
      }
    }
    return alerts.slice(0, 12);
  }

  private async syncNodo360Resources(
    postId: string,
    incident: Awaited<ReturnType<CommandPostService['loadIncident']>>,
  ) {
    const existing = await this.prisma.commandPostResource.findMany({
      where: { postId, origin: CommandResourceOrigin.NODO360 },
      select: { vehicleId: true },
    });
    const known = new Set(existing.map((r) => r.vehicleId).filter(Boolean));
    const respondersByCompany = new Map<string, number>();
    for (const response of incident.emergencyResponses) {
      if (!response.status || !ACTIVE_RESPONSES.includes(response.status)) continue;
      const companyId = response.user.companyId;
      if (!companyId) continue;
      respondersByCompany.set(companyId, (respondersByCompany.get(companyId) ?? 0) + 1);
    }
    const staffingAssigned = new Set<string>();

    for (const row of incident.vehicles) {
      if (known.has(row.vehicleId)) continue;
      const companyId = row.vehicle.companyId;
      let staffing = 0;
      if (!staffingAssigned.has(companyId)) {
        staffing = respondersByCompany.get(companyId) ?? 0;
        staffingAssigned.add(companyId);
      }
      await this.prisma.commandPostResource.create({
        data: {
          postId,
          origin: CommandResourceOrigin.NODO360,
          vehicleId: row.vehicleId,
          label: row.vehicle.patent,
          type: row.vehicle.type || 'Carro',
          companyName: companyLabel(row.vehicle.company),
          institution: 'NODO360',
          staffing,
          status: incident.arrivedAt ? CommandResourceStatus.EN_OPERACION : CommandResourceStatus.EN_TRASLADO,
          latitude: incident.confirmedLatitude ?? incident.latitude,
          longitude: incident.confirmedLongitude ?? incident.longitude,
        },
      });
      await this.log(postId, {
        kind: CommandLogKind.RESOURCE,
        action: `${row.vehicle.patent} importado desde NODO360 (${companyLabel(row.vehicle.company)}).`,
        actorName: 'NODO360',
      });
    }
  }

  private async loadIncident(incidentId: string, actor: Actor) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        company: { select: { id: true, name: true, number: true } },
        vehicles: {
          include: {
            vehicle: { include: { company: { select: { id: true, name: true, number: true } } } },
          },
        },
        emergencyResponses: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyId: true,
                company: { select: { id: true, name: true, number: true } },
              },
            },
          },
        },
      },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada.');
    await assertCompanyAccess(this.prisma, actor, incident.companyId);
    return incident;
  }

  private async requireActivePost(postId: string, actor: Actor) {
    const post = await this.prisma.commandPost.findUnique({
      where: { id: postId },
      include: { incident: { select: { id: true, companyId: true, status: true } } },
    });
    if (!post) throw new NotFoundException('Puesto de comando no encontrado.');
    await assertCompanyAccess(this.prisma, actor, post.incident.companyId);
    if (post.status !== CommandPostStatus.ACTIVE) {
      throw new ConflictException('El puesto de comando ya fue finalizado.');
    }
    return post;
  }

  private async actorName(actor: Actor) {
    if (!actor.id) return 'Operador';
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { firstName: true, lastName: true },
    });
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Operador';
  }

  private currentCommand(postId: string) {
    return this.prisma.commandPostCommand.findFirst({
      where: { postId, releasedAt: null },
      orderBy: { assumedAt: 'desc' },
    });
  }

  private log(
    postId: string,
    data: {
      kind: CommandLogKind;
      action: string;
      detail?: string | null;
      actorId?: string;
      actorName: string;
      resourceId?: string | null;
      sectorId?: string | null;
      previousStatus?: string | null;
      nextStatus?: string | null;
      category?: CommandNoveltyCategory | null;
    },
  ) {
    return this.prisma.commandPostLog.create({
      data: {
        postId,
        kind: data.kind,
        action: data.action,
        detail: data.detail ?? null,
        actorId: data.actorId,
        actorName: data.actorName,
        resourceId: data.resourceId ?? null,
        sectorId: data.sectorId ?? null,
        previousStatus: data.previousStatus ?? null,
        nextStatus: data.nextStatus ?? null,
        category: data.category ?? null,
      },
    });
  }

  private async emitUpdate(incidentId: string, companyId: string) {
    this.broadcaster.emit({
      event: EMERGENCY_EVENT_NAMES.incidentUpdated,
      incidentId,
      companyIds: [companyId],
      snapshotVersion: new Date(),
      data: { incident: { id: incidentId, commandPost: true } },
    });
  }
}

function labelStatus(status: CommandResourceStatus) {
  return status.replace(/_/g, ' ').toLowerCase();
}
function labelSector(status: CommandSectorStatus) {
  return status.replace(/_/g, ' ').toLowerCase();
}
function labelRequest(status: CommandRequestStatus) {
  return status.replace(/_/g, ' ').toLowerCase();
}

