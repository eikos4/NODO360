import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DispatchSource, IncidentStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GuardLogService } from '../guard-log/guard-log.service';
import { AlarmQueueService } from '../notifications/alarm-queue.service';
import { AlarmWorkerService } from '../notifications/alarm-worker.service';
import { EmergencyBroadcaster } from '../emergency-realtime/emergency-broadcaster.service';
import { EMERGENCY_EVENT_NAMES } from '../emergency-realtime/emergency-events.contract';
import { cuerpoIdForUser } from '../common/cuerpo-scope';
import { hasAnyRole } from '../common/user-roles';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { DispatchIncidentDto } from './dto/dispatch-incident.dto';
import { UpdateIncidentChecklistDto } from './dto/update-incident-checklist.dto';
import {
  mapIncidentTypeToEmergencyType,
  snapshotPlanChecklist,
  checklistProgress,
  PlanChecklistItem,
} from './incident-plan.util';

const INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  emergencyPlan: {
    select: {
      id: true, title: true, emergencyType: true, severity: true, status: true, version: true,
    },
  },
  participants: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  },
  vehicles: {
    include: {
      vehicle: {
        select: { id: true, patent: true, brand: true, model: true, type: true, status: true, imageUrl: true, companyId: true },
      },
    },
  },
  _count: { select: { timelineEvents: true } },
};

export type IncidentAuthUser = {
  id: string;
  role: string;
  roles?: string[];
  companyId: string | null;
  cuerpoId?: string | null;
};

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private guardLogService: GuardLogService,
    private alarms: AlarmQueueService,
    private alarmWorker: AlarmWorkerService,
    private emergencyBroadcaster: EmergencyBroadcaster,
  ) {}

  async findAll(companyId?: string) {
    const rows = await this.prisma.incident.findMany({
      where: companyId ? { companyId } : {},
      include: INCLUDE,
      orderBy: { dispatchedAt: 'desc' },
    });
    return rows.map((inc) => this.withChecklistMeta(inc));
  }

  async findAllAuthorized(user: IncidentAuthUser, requestedCompanyId?: string) {
    if (hasAnyRole(user, 'KODESK')) return this.findAll(requestedCompanyId);
    if (hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL')) {
      if (requestedCompanyId) {
        await this.assertCanCreateFor(requestedCompanyId, user);
        return this.findAll(requestedCompanyId);
      }
      const cuerpoId = await this.actorCuerpoId(user);
      if (!cuerpoId) {
        if (!user.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
        return this.findAll(user.companyId);
      }
      const rows = await this.prisma.incident.findMany({
        where: { company: { cuerpoId } },
        include: INCLUDE,
        orderBy: { dispatchedAt: 'desc' },
      });
      return rows.map((inc) => this.withChecklistMeta(inc));
    }
    if (!user.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No puede consultar incidentes de otra compañía');
    }
    const rows = await this.prisma.incident.findMany({
      where: {
        OR: [
          { companyId: user.companyId },
          { vehicles: { some: { vehicle: { companyId: user.companyId } } } },
        ],
      },
      include: INCLUDE,
      orderBy: { dispatchedAt: 'desc' },
    });
    return rows.map((incident) => this.withChecklistMeta(incident));
  }

  async findByIdAuthorized(id: string, user: IncidentAuthUser) {
    if (hasAnyRole(user, 'KODESK')) return this.findById(id);
    if (hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL')) {
      const incident = await this.prisma.incident.findUnique({
        where: { id },
        select: { companyId: true, company: { select: { cuerpoId: true } } },
      });
      if (!incident) throw new NotFoundException('Emergencia no encontrada');
      const cuerpoId = await this.actorCuerpoId(user);
      if (cuerpoId && cuerpoId !== incident.company.cuerpoId) {
        throw new NotFoundException('Emergencia no encontrada');
      }
      if (!cuerpoId && user.companyId && user.companyId !== incident.companyId) {
        throw new NotFoundException('Emergencia no encontrada');
      }
      return this.findById(id);
    }
    const or: Prisma.IncidentWhereInput[] = [
      { emergencyResponses: { some: { userId: user.id } } },
    ];
    if (user.companyId) {
      or.push({ companyId: user.companyId });
      or.push({ vehicles: { some: { vehicle: { companyId: user.companyId } } } });
    }
    const permitted = await this.prisma.incident.findFirst({
      where: { id, OR: or },
      select: { id: true },
    });
    if (!permitted) throw new NotFoundException('Emergencia no encontrada');
    return this.findById(id);
  }

  async assertCanManage(id: string, user: IncidentAuthUser) {
    if (hasAnyRole(user, 'KODESK')) return;
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      select: { companyId: true, company: { select: { cuerpoId: true } } },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada');
    if (hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL')) {
      const cuerpoId = await this.actorCuerpoId(user);
      if (cuerpoId && cuerpoId === incident.company.cuerpoId) return;
      if (!cuerpoId && user.companyId === incident.companyId) return;
      throw new ForbiddenException('No puede modificar una emergencia de otro Cuerpo');
    }
    if (!user.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
    if (incident.companyId !== user.companyId) {
      throw new ForbiddenException('No puede modificar una emergencia de otra compañía');
    }
  }

  async assertCanCreateFor(companyId: string, user: IncidentAuthUser) {
    if (hasAnyRole(user, 'KODESK')) return;
    if (user.companyId === companyId) return;

    const target = await this.prisma.company.findFirst({
      where: { id: companyId, isActive: true },
      select: { cuerpoId: true },
    });
    if (!target) throw new ForbiddenException('Compañía no disponible');

    if (hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL')) {
      const cuerpoId = await this.actorCuerpoId(user);
      if (!cuerpoId) {
        throw new ForbiddenException('Usuario sin Cuerpo asignado');
      }
      if (cuerpoId === target.cuerpoId) return;
      throw new ForbiddenException('No puede despachar fuera de este Cuerpo');
    }

    throw new ForbiddenException('No puede despachar para otra compañía');
  }

  private async actorCuerpoId(user: IncidentAuthUser) {
    return user.cuerpoId ?? (await cuerpoIdForUser(this.prisma, user));
  }

  async findById(id: string) {
    const inc = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!inc) throw new NotFoundException('Emergencia no encontrada');
    return this.withChecklistMeta(inc);
  }

  async getReportPack(id: string, user: IncidentAuthUser) {
    await this.findByIdAuthorized(id, user);
    return this.buildReportPack(id);
  }

  async buildReportPack(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            number: true,
            city: true,
            cuerpo: { select: { name: true } },
          },
        },
        emergencyPlan: {
          select: { title: true, emergencyType: true, severity: true },
        },
        participants: {
          include: {
            user: {
              select: { firstName: true, lastName: true, role: true, operativeNumber: true },
            },
          },
        },
        vehicles: {
          include: {
            vehicle: {
              select: {
                patent: true,
                brand: true,
                model: true,
                type: true,
                company: { select: { number: true, name: true } },
              },
            },
          },
        },
        timelineEvents: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
        },
        bitacoraEntry: {
          include: { author: { select: { firstName: true, lastName: true } } },
        },
        emergencyResponses: {
          include: {
            user: {
              select: { firstName: true, lastName: true, role: true, operativeNumber: true },
            },
          },
          orderBy: { respondedAt: 'asc' },
        },
      },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada');
    return this.withChecklistMeta(incident);
  }

  async close(id: string, user: IncidentAuthUser) {
    await this.assertCanManage(id, user);
    const current = await this.prisma.incident.findUnique({
      where: { id },
      select: { closedAt: true },
    });
    if (!current) throw new NotFoundException('Emergencia no encontrada');
    if (!current.closedAt) {
      await this.update(id, {
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
      });
    }
    return this.buildReportPack(id);
  }

  private withChecklistMeta(incident: any) {
    const { locationPinToken: _omit, ...safe } = incident;
    const items = (safe.planChecklist as PlanChecklistItem[]) ?? [];
    return {
      ...safe,
      planChecklist: items,
      checklistProgress: checklistProgress(items),
    };
  }

  private async resolveMatchingPlan(companyId: string, incidentType: string) {
    const emergencyType = mapIncidentTypeToEmergencyType(incidentType);
    const plan = await this.prisma.emergencyPlan.findFirst({
      where: {
        companyId,
        emergencyType,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!plan) return null;
    return {
      planId: plan.id,
      planTitle: plan.title,
      checklist: snapshotPlanChecklist(plan.checklist),
    };
  }

  private async generateCode(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const prefix = company ? `C${company.number}` : 'EMR';
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
    let code = `${prefix}-${datePart}-${timePart}`;
    let attempt = 0;
    while (await this.prisma.incident.findUnique({ where: { code } })) {
      attempt += 1;
      code = `${prefix}-${datePart}-${timePart}-${attempt}`;
    }
    return code;
  }

  private async syncVehicles(incidentId: string, vehicleIds?: string[]) {
    await this.prisma.incidentVehicle.deleteMany({ where: { incidentId } });
    if (vehicleIds?.length) {
      await this.prisma.incidentVehicle.createMany({
        data: vehicleIds.map((vehicleId) => ({ incidentId, vehicleId })),
        skipDuplicates: true,
      });
    }
  }

  async dispatch(dto: DispatchIncidentDto, userId?: string) {
    if (!dto.companyId) throw new BadRequestException('Compañía requerida para despacho');

    const code = await this.generateCode(dto.companyId);
    const description =
      dto.description?.trim() ||
      `Despacho ${dto.dispatchSource === 'BOTONERA' ? 'desde botonera' : 'operativo'}: ${dto.type}`;

    const incident = await this.create(
      {
        code,
        type: dto.type,
        description,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationPinToken: randomUUID().replace(/-/g, ''),
        dispatchedAt: new Date().toISOString(),
        companyId: dto.companyId,
        participantIds: dto.participantIds,
        vehicleIds: dto.vehicleIds,
        dispatchSource: dto.dispatchSource ?? 'BOTONERA',
        dispatchNotes: dto.dispatchNotes,
      },
      userId,
    );

    await this.recordMutualAidGuardLogs(incident, userId);

    return incident;
  }

  /** Bitácora en compañías de apoyo cuando despachan carros al mismo incidente. */
  private async recordMutualAidGuardLogs(incident: {
    id: string;
    companyId: string;
    code: string;
    type: string;
    address: string;
    description?: string | null;
    dispatchNotes?: string | null;
    guardLogLinked?: boolean;
    vehicles?: { vehicle: { companyId: string; patent: string; brand: string } }[];
  }, userId?: string) {
    if (!incident.vehicles?.length) return;

    const byCompany = new Map<string, string[]>();
    for (const row of incident.vehicles) {
      const cid = row.vehicle.companyId;
      if (!cid || cid === incident.companyId) continue;
      const line = `${row.vehicle.patent} ${row.vehicle.brand}`.trim();
      const list = byCompany.get(cid) ?? [];
      list.push(line);
      byCompany.set(cid, list);
    }

    for (const [companyId, vehicleLines] of byCompany) {
      try {
        await this.guardLogService.recordDispatchFromIncident({
          companyId,
          incidentId: incident.id,
          code: incident.code,
          type: incident.type,
          address: incident.address,
          description: `Apoyo mutuo — ${incident.description ?? incident.type}`,
          dispatchNotes: incident.dispatchNotes ?? undefined,
          vehicleLines,
          participantLines: [],
          authorId: userId,
        });
      } catch {
        /* bitácora secundaria opcional */
      }
    }
  }

  async create(dto: CreateIncidentDto, userId?: string) {
    const { participantIds, vehicleIds, ...data } = dto;
    const exists = await this.prisma.incident.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Código '${dto.code}' ya registrado`);

    const dispatchSource =
      data.dispatchSource === 'BOTONERA' ? DispatchSource.BOTONERA : DispatchSource.MANUAL;

    const match = await this.resolveMatchingPlan(data.companyId, data.type);
    const status =
      data.status ??
      (data.closedAt ? IncidentStatus.CLOSED : data.arrivedAt ? IncidentStatus.ARRIVED : IncidentStatus.ACTIVE);
    const arrivedAt =
      status === IncidentStatus.ARRIVED
        ? data.arrivedAt ?? new Date()
        : status === IncidentStatus.ACTIVE
          ? undefined
          : data.arrivedAt;
    const closedAt =
      status === IncidentStatus.CLOSED || status === IncidentStatus.CANCELLED
        ? data.closedAt ?? new Date()
        : undefined;

    const incident = await this.prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          code: data.code,
          type: data.type,
          description: data.description,
          address: data.address,
          status,
          latitude: data.latitude,
          longitude: data.longitude,
          locationPinToken: randomUUID().replace(/-/g, ''),
          dispatchedAt: data.dispatchedAt,
          arrivedAt,
          closedAt,
          report: data.report,
          imageUrl: data.imageUrl,
          companyId: data.companyId,
          dispatchSource,
          dispatchNotes: data.dispatchNotes,
          emergencyPlanId: match?.planId,
          planChecklist: match?.checklist ?? [],
          participants: participantIds?.length
            ? { create: participantIds.map((uid) => ({ userId: uid })) }
            : undefined,
          vehicles: vehicleIds?.length
            ? { create: vehicleIds.map((vid) => ({ vehicleId: vid })) }
            : undefined,
        },
        include: INCLUDE,
      });
      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: created.id,
          kind: 'DESPACHO',
          label: 'Despacho',
          note: data.dispatchNotes?.trim() || null,
          occurredAt: created.dispatchedAt,
          authorId: userId ?? null,
        },
      });
      const companyIds = new Set<string>([created.companyId]);
      created.vehicles.forEach((row) => companyIds.add(row.vehicle.companyId));
      await this.alarms.enqueue(
        {
          incidentId: created.id,
          eventType: 'DISPATCH',
          dedupKey: `incident:${created.id}:dispatch`,
          title: `ALARMA ${created.code}`,
          body: `${created.type} — ${created.address}`,
          companyIds: [...companyIds],
          data: {
            code: created.code,
            type: created.type,
            address: created.address,
            emergencyCodeId: created.type.split(' — ')[0]?.trim() || created.code,
          },
        },
        tx,
      );
      return created;
    });

    const companyIds = new Set<string>([incident.companyId]);
    incident.vehicles.forEach((row) => companyIds.add(row.vehicle.companyId));
    this.emergencyBroadcaster.emit({
      event: EMERGENCY_EVENT_NAMES.dispatchCreated,
      incidentId: incident.id,
      companyIds: [...companyIds],
      snapshotVersion: incident.updatedAt,
      data: { incident },
    });
    void this.alarmWorker.flushNow();

    const full = await this.findById(incident.id);

    let result: typeof full & { guardLogLinked: boolean; guardLogId?: string };
    try {
      const guardLog = await this.guardLogService.recordDispatchFromIncident({
        companyId: full.companyId,
        incidentId: full.id,
        code: full.code,
        type: full.type,
        address: full.address,
        description: full.description,
        dispatchNotes: full.dispatchNotes ?? undefined,
        vehicleLines: full.vehicles?.map((iv) => `${iv.vehicle.patent} ${iv.vehicle.brand}`) ?? [],
        participantLines: full.participants?.map((p) => `${p.user.firstName} ${p.user.lastName}`) ?? [],
        authorId: userId,
      });
      result = { ...full, guardLogLinked: true, guardLogId: guardLog.log?.id };
    } catch {
      result = { ...full, guardLogLinked: false };
    }
    return result;
  }

  async updateChecklist(id: string, dto: UpdateIncidentChecklistDto) {
    const incident = await this.findById(id);
    const current = (incident.planChecklist as PlanChecklistItem[]) ?? [];
    const patchMap = new Map(dto.items.map((i) => [i.id, i]));

    const updated = current.map((item) => {
      const patch = patchMap.get(item.id);
      if (!patch) return item;
      const checked = patch.checked ?? item.checked ?? false;
      return {
        ...item,
        checked,
        checkedAt: checked ? (item.checkedAt ?? new Date().toISOString()) : null,
        notes: patch.notes ?? item.notes ?? null,
      };
    });

    await this.prisma.incident.update({
      where: { id },
      data: { planChecklist: updated as unknown as Prisma.InputJsonValue },
    });

    const result = await this.findById(id);
    this.emergencyBroadcaster.emit({
      event: EMERGENCY_EVENT_NAMES.incidentUpdated,
      incidentId: result.id,
      companyIds: [result.companyId, ...result.vehicles.map((row: any) => row.vehicle.companyId)],
      snapshotVersion: result.updatedAt,
      data: { incident: result },
    });
    return result;
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const incident = await this.findById(id);
    const { participantIds, vehicleIds, dispatchSource, locationPinToken: _pin, ...data } = dto;

    if (participantIds !== undefined) {
      await this.prisma.incidentParticipant.deleteMany({ where: { incidentId: id } });
      if (participantIds.length) {
        await this.prisma.incidentParticipant.createMany({
          data: participantIds.map((userId) => ({ incidentId: id, userId })),
          skipDuplicates: true,
        });
      }
    }

    if (vehicleIds !== undefined) {
      await this.syncVehicles(id, vehicleIds);
    }

    const updateData: Prisma.IncidentUpdateInput = { ...data };
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === IncidentStatus.ACTIVE) {
        updateData.arrivedAt = null;
        updateData.closedAt = null;
      } else if (dto.status === IncidentStatus.ARRIVED) {
        updateData.arrivedAt = dto.arrivedAt ?? incident.arrivedAt ?? new Date();
        updateData.closedAt = null;
      } else {
        updateData.closedAt = dto.closedAt ?? incident.closedAt ?? new Date();
      }
    } else if (dto.closedAt) {
      updateData.status = IncidentStatus.CLOSED;
    } else if (dto.arrivedAt) {
      updateData.status = IncidentStatus.ARRIVED;
    }
    if (dispatchSource !== undefined) {
      updateData.dispatchSource =
        dispatchSource === 'BOTONERA' ? DispatchSource.BOTONERA : DispatchSource.MANUAL;
    }

    await this.prisma.incident.update({ where: { id }, data: updateData });
    const updated = await this.findById(id);
    const critical =
      dto.status !== undefined ||
      dto.closedAt !== undefined ||
      dto.address !== undefined ||
      dto.type !== undefined ||
      dto.latitude !== undefined ||
      dto.longitude !== undefined ||
      participantIds !== undefined ||
      vehicleIds !== undefined ||
      dto.dispatchNotes !== undefined;
    if (critical) {
      const eventType =
        updated.status === IncidentStatus.CANCELLED
          ? 'CANCELLED'
          : updated.status === IncidentStatus.CLOSED
            ? 'CLOSED'
            : 'CRITICAL_UPDATE';
      const companyIds = new Set<string>([updated.companyId]);
      updated.vehicles.forEach((row: any) => companyIds.add(row.vehicle.companyId));
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify({
            status: updated.status,
            type: updated.type,
            address: updated.address,
            latitude: updated.latitude,
            longitude: updated.longitude,
            dispatchNotes: updated.dispatchNotes,
            participants: updated.participants.map((row: any) => row.user.id).sort(),
            vehicles: updated.vehicles.map((row: any) => row.vehicle.id).sort(),
          }),
        )
        .digest('hex')
        .slice(0, 24);
      const label =
        eventType === 'CANCELLED'
          ? 'CANCELADA'
          : eventType === 'CLOSED'
            ? 'CERRADA'
            : 'ACTUALIZACIÓN';
      await this.alarms.enqueue({
        incidentId: updated.id,
        eventType,
        dedupKey: `incident:${updated.id}:${eventType.toLowerCase()}:${fingerprint}`,
        title: `${label} ${updated.code}`,
        body: `${updated.type} — ${updated.address}`,
        companyIds: [...companyIds],
        data: {
          code: updated.code,
          type: updated.type,
          address: updated.address,
          status: updated.status,
          emergencyCodeId: updated.type.split(' — ')[0]?.trim() || updated.code,
        },
      });
      void this.alarmWorker.flushNow();
    }
    const realtimeEvent =
      updated.status === IncidentStatus.CANCELLED
        ? EMERGENCY_EVENT_NAMES.incidentCancelled
        : updated.status === IncidentStatus.CLOSED
          ? EMERGENCY_EVENT_NAMES.incidentClosed
          : EMERGENCY_EVENT_NAMES.incidentUpdated;
    this.emergencyBroadcaster.emit({
      event: realtimeEvent,
      incidentId: updated.id,
      companyIds: [updated.companyId, ...updated.vehicles.map((row: any) => row.vehicle.companyId)],
      snapshotVersion: updated.updatedAt,
      data: { incident: updated },
    });
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.guardLogEntry.updateMany({
      where: { incidentId: id },
      data: { incidentId: null },
    });
    await this.prisma.incidentParticipant.deleteMany({ where: { incidentId: id } });
    await this.prisma.incidentVehicle.deleteMany({ where: { incidentId: id } });
    return this.prisma.incident.delete({ where: { id } });
  }

  async getStatsAuthorized(user: IncidentAuthUser, requestedCompanyId?: string) {
    if (hasAnyRole(user, 'KODESK')) return this.getStats({ companyId: requestedCompanyId });
    if (requestedCompanyId) {
      await this.assertCanCreateFor(requestedCompanyId, user);
      return this.getStats({ companyId: requestedCompanyId });
    }
    if (hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL')) {
      const cuerpoId = await this.actorCuerpoId(user);
      if (cuerpoId) return this.getStats({ cuerpoId });
      if (hasAnyRole(user, 'SUPER_ADMIN')) return this.getStats({});
      if (!user.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
      return this.getStats({ companyId: user.companyId });
    }
    if (!user.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
    return this.getStats({ companyId: user.companyId });
  }

  async getStats(filter: { companyId?: string; cuerpoId?: string } = {}) {
    const where: Prisma.IncidentWhereInput = filter.companyId
      ? { companyId: filter.companyId }
      : filter.cuerpoId
        ? { company: { cuerpoId: filter.cuerpoId } }
        : {};
    const userWhere = filter.companyId
      ? { companyId: filter.companyId }
      : filter.cuerpoId
        ? { company: { cuerpoId: filter.cuerpoId } }
        : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, open, byType, fromBotonera, withPlan, arrivedIncidents, topAvailable] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.count({ where: { ...where, dispatchedAt: { gte: startOfMonth } } }),
      this.prisma.incident.count({ where: { ...where, closedAt: null } }),
      this.prisma.incident.groupBy({ by: ['type'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.incident.count({ where: { ...where, dispatchSource: DispatchSource.BOTONERA } }),
      this.prisma.incident.count({ where: { ...where, emergencyPlanId: { not: null } } }),
      this.prisma.incident.findMany({
        where: { ...where, arrivedAt: { not: null }, dispatchedAt: { not: null } },
        select: { arrivedAt: true, dispatchedAt: true },
        orderBy: { dispatchedAt: 'desc' },
        take: 100, // calc average of last 100
      }),
      this.prisma.user.findMany({
        where: { stationAvailable: true, ...userWhere },
        select: { id: true, firstName: true, lastName: true, stationAvailableAt: true, role: true },
        orderBy: { stationAvailableAt: 'asc' },
        take: 5,
      })
    ]);

    let avgArrivalSecs = 0;
    if (arrivedIncidents.length > 0) {
      const totalSecs = arrivedIncidents.reduce((acc, inc) => {
        const diff = inc.arrivedAt!.getTime() - inc.dispatchedAt!.getTime();
        return acc + Math.max(0, diff / 1000);
      }, 0);
      avgArrivalSecs = Math.round(totalSecs / arrivedIncidents.length);
    }

    return {
      total,
      thisMonth,
      open,
      fromBotonera,
      withPlan,
      avgArrivalSecs,
      topAvailable,
      byType: byType.map((b) => ({ type: b.type, count: b._count.id })),
    };
  }
}
