import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmergencyResponseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchCentralService } from '../dispatch-central/dispatch-central.service';
import { AlarmQueueService } from '../notifications/alarm-queue.service';
import { EmergencyBroadcaster } from '../emergency-realtime/emergency-broadcaster.service';
import { EMERGENCY_EVENT_NAMES } from '../emergency-realtime/emergency-events.contract';

const RESPONSE_LABELS: Record<EmergencyResponseStatus, string> = {
  GOING: 'Voy',
  NOT_GOING: 'No voy',
  NOT_AVAILABLE: 'No disponible',
  ON_SCENE: 'En el lugar',
  LOCATION_MARKED: 'Ubicación marcada',
};

const ROLE_LABELS: Record<string, string> = {
  KODESK: 'Kodesk',
  SUPER_ADMIN: 'Administrador del cuerpo',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán',
  ENCARGADO_MATERIAL: 'Encargado de material',
  SECRETARIO: 'Secretario/a',
  TESORERO: 'Tesorero/a',
  BOMBERO: 'Bombero',
  BOMBERO_HONORARIO: 'Bombero honorario',
  BOMBERO_INICIAL: 'Bombero inicial',
  BOMBERO_PROFESIONAL: 'Bombero profesional',
  AUDITOR: 'Auditor',
  OPERADOR_CENTRAL: 'Operador de central',
};

const INCIDENT_SELECT = {
  id: true,
  code: true,
  type: true,
  description: true,
  address: true,
  latitude: true,
  longitude: true,
  confirmedLatitude: true,
  confirmedLongitude: true,
  locationPinAt: true,
  locationPinNote: true,
  dispatchedAt: true,
  closedAt: true,
  companyId: true,
  company: { select: { id: true, name: true, number: true, city: true } },
  vehicles: {
    select: {
      vehicle: { select: { patent: true, type: true, brand: true, companyId: true } },
    },
  },
} satisfies Prisma.IncidentSelect;

@Injectable()
export class EmergencyResponseService {
  constructor(
    private prisma: PrismaService,
    private dispatchCentral: DispatchCentralService,
    private alarms: AlarmQueueService,
    private emergencyBroadcaster: EmergencyBroadcaster,
  ) {}

  private incidentsForCompany(companyId: string): Prisma.IncidentWhereInput {
    return {
      closedAt: null,
      status: { in: ['ACTIVE', 'ARRIVED'] },
      AND: [
        {
          OR: [
            { companyId },
            { vehicles: { some: { vehicle: { companyId } } } },
          ],
        },
      ],
    };
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        photoUrl: true,
        operativeNumber: true,
        stationAvailable: true,
        isActive: true,
        company: { select: { isActive: true } },
      },
    });
    if (!user?.isActive) throw new ForbiddenException('Usuario inactivo');
    if (!user.companyId || !user.company?.isActive) {
      throw new ForbiddenException('Usuario sin compañía activa asignada');
    }
    return user;
  }

  private mapIncident(inc: Prisma.IncidentGetPayload<{ select: typeof INCIDENT_SELECT }>, userCompanyId: string) {
    const isOwner = inc.companyId === userCompanyId;
    const vehicles = inc.vehicles
      .filter((v) => (isOwner ? true : v.vehicle.companyId === userCompanyId))
      .map((v) => v.vehicle);

    const hasFieldGps = inc.confirmedLatitude != null && inc.confirmedLongitude != null;
    const hasDispatchGps = inc.latitude != null && inc.longitude != null;
    const desc = inc.description?.trim() ?? '';
    const radioMessage = /SECTOR/i.test(desc) && /CONCURRE/i.test(desc) ? desc : desc || `${inc.type} — ${inc.address}`;

    return {
      id: inc.id,
      code: inc.code,
      type: inc.type,
      description: inc.description,
      address: inc.address,
      dispatchedAt: inc.dispatchedAt,
      emergencyCodeId: this.parseEmergencyCodeId(inc.type),
      radioMessage,
      company: inc.company,
      vehicles,
      involvedAsSupport: !isOwner,
      dispatchGps: hasDispatchGps ? { latitude: inc.latitude!, longitude: inc.longitude! } : null,
      fieldGps: hasFieldGps
        ? {
            latitude: inc.confirmedLatitude!,
            longitude: inc.confirmedLongitude!,
            confirmedAt: inc.locationPinAt,
            note: inc.locationPinNote,
          }
        : null,
      mapLat: hasFieldGps ? inc.confirmedLatitude! : hasDispatchGps ? inc.latitude! : null,
      mapLng: hasFieldGps ? inc.confirmedLongitude! : hasDispatchGps ? inc.longitude! : null,
      hasCoordinates: hasFieldGps || hasDispatchGps,
    };
  }

  private mapResponse(r: {
    id: string;
    status: EmergencyResponseStatus | null;
    latitude: number | null;
    longitude: number | null;
    markerLatitude: number | null;
    markerLongitude: number | null;
    onSceneAt: Date | null;
    locationMarkedAt: Date | null;
    note: string | null;
    respondedAt: Date;
    updatedAt: Date;
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null; operativeNumber: number | null };
  }) {
    return {
      id: r.id,
      status: r.status,
      statusLabel: r.status ? RESPONSE_LABELS[r.status] : null,
      latitude: r.latitude,
      longitude: r.longitude,
      markerLatitude: r.markerLatitude,
      markerLongitude: r.markerLongitude,
      onSceneAt: r.onSceneAt,
      locationMarkedAt: r.locationMarkedAt,
      locationMarked: r.locationMarkedAt != null,
      note: r.note,
      respondedAt: r.respondedAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        fullName: `${r.user.firstName} ${r.user.lastName}`,
        photoUrl: r.user.photoUrl,
        operativeNumber: r.user.operativeNumber,
      },
    };
  }

  async listActive(userId: string) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        number: true,
        city: true,
        address: true,
        logoUrl: true,
        dispatchSlug: true,
      },
    });

    const recent = await this.dispatchCentral.getRecentEmergencies(companyId, 20);
    const active = recent.filter((e) => e.status === 'ACTIVA');
    const incidentIds = active.map((e) => e.id);

    const myByIncident = new Map<string, Awaited<ReturnType<typeof this.mapResponse>>>();
    const summaryByIncident = new Map<string, ReturnType<typeof this.summarizeResponses>>();

    if (incidentIds.length > 0) {
      try {
        const myResponses = await this.prisma.incidentEmergencyResponse.findMany({
          where: {
            userId,
            incidentId: { in: incidentIds },
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
          },
        });
        for (const r of myResponses) {
          myByIncident.set(r.incidentId, this.mapResponse(r));
        }

        const allResponses = await this.prisma.incidentEmergencyResponse.findMany({
          where: { incidentId: { in: incidentIds } },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
          },
        });
        for (const incId of incidentIds) {
          const rows = allResponses.filter((r) => r.incidentId === incId);
          summaryByIncident.set(incId, this.summarizeResponses(rows));
        }
      } catch {
        for (const incId of incidentIds) {
          summaryByIncident.set(incId, this.emptyTeamSummary());
        }
      }
    }

    return {
      company,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        companyId,
        operativeNumber: user.operativeNumber,
        photoUrl: user.photoUrl,
        stationAvailable: user.stationAvailable,
      },
      incidents: active.map((inc) => ({
        id: inc.id,
        code: inc.code,
        type: inc.type,
        description: inc.description,
        address: inc.address,
        dispatchedAt: inc.dispatchedAt,
        emergencyCodeId: inc.emergencyCodeId,
        radioMessage: inc.radioMessage,
        company: inc.involvedAsSupport && inc.dispatchCompanyNumber != null
          ? {
              number: inc.dispatchCompanyNumber,
              name: inc.dispatchCompanyName ?? 'Compañía despachante',
              city: company?.city ?? '',
            }
          : {
              number: company?.number ?? 0,
              name: company?.name ?? '',
              city: company?.city ?? '',
            },
        vehicles: inc.vehicles,
        involvedAsSupport: inc.involvedAsSupport,
        dispatchGps:
          inc.dispatchLatitude != null && inc.dispatchLongitude != null
            ? { latitude: inc.dispatchLatitude, longitude: inc.dispatchLongitude }
            : null,
        fieldGps: inc.hasFieldGps
          ? {
              latitude: inc.confirmedLatitude!,
              longitude: inc.confirmedLongitude!,
              confirmedAt: inc.locationPinAt,
            }
          : null,
        mapLat: inc.latitude ?? null,
        mapLng: inc.longitude ?? null,
        hasCoordinates: inc.hasCoordinates,
        myResponse: myByIncident.get(inc.id) ?? null,
        teamSummary: summaryByIncident.get(inc.id) ?? this.emptyTeamSummary(),
      })),
      statusLabels: RESPONSE_LABELS,
    };
  }

  async getSnapshot(userId: string) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;
    const where = this.incidentsForCompany(companyId);
    const [active, incidentVersion, responseVersion] = await Promise.all([
      this.listActive(userId),
      this.prisma.incident.aggregate({ where, _max: { updatedAt: true } }),
      this.prisma.incidentEmergencyResponse.aggregate({
        where: { incident: where },
        _max: { updatedAt: true },
      }),
    ]);
    const latest = Math.max(
      incidentVersion._max.updatedAt?.getTime() ?? 0,
      responseVersion._max.updatedAt?.getTime() ?? 0,
    );
    return {
      schemaVersion: 1,
      snapshotVersion: latest ? new Date(latest).toISOString() : new Date(0).toISOString(),
      serverTime: new Date().toISOString(),
      ...active,
    };
  }

  private emptyTeamSummary() {
    return {
      going: 0,
      notGoing: 0,
      notAvailable: 0,
      onScene: 0,
      locationMarked: 0,
      total: 0,
      responses: [] as ReturnType<typeof this.summarizeResponses>['responses'],
    };
  }

  private summarizeResponses(
    rows: {
      status: EmergencyResponseStatus | null;
      locationMarkedAt: Date | null;
      user: { id: string; firstName: string; lastName: string; photoUrl: string | null; operativeNumber: number | null };
    }[],
  ) {
    const counts = {
      going: 0,
      notGoing: 0,
      notAvailable: 0,
      onScene: 0,
      locationMarked: 0,
      total: rows.length,
    };
    for (const r of rows) {
      if (r.status === 'GOING') counts.going += 1;
      if (r.status === 'NOT_GOING') counts.notGoing += 1;
      if (r.status === 'NOT_AVAILABLE') counts.notAvailable += 1;
      if (r.status === 'ON_SCENE') counts.onScene += 1;
      if (r.locationMarkedAt != null || r.status === 'LOCATION_MARKED') counts.locationMarked += 1;
    }
    return {
      ...counts,
      responses: rows.map((r) => ({
        status: r.status,
        statusLabel: r.status ? RESPONSE_LABELS[r.status] : null,
        locationMarked: r.locationMarkedAt != null || r.status === 'LOCATION_MARKED',
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          photoUrl: r.user.photoUrl,
          operativeNumber: r.user.operativeNumber,
        },
      })),
    };
  }

  async getDetail(userId: string, incidentId: string) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.incidentsForCompany(companyId) },
      select: INCIDENT_SELECT,
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada o ya cerrada');

    const responses = await this.prisma.incidentEmergencyResponse.findMany({
      where: { incidentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mine = responses.find((r) => r.userId === userId);

    return {
      incident: this.mapIncident(incident, companyId),
      myResponse: mine ? this.mapResponse(mine) : null,
      teamSummary: this.summarizeResponses(responses),
      teamResponses: responses.map((r) => this.mapResponse(r)),
      statusLabels: RESPONSE_LABELS,
    };
  }

  async respond(
    userId: string,
    incidentId: string,
    dto: {
      status: EmergencyResponseStatus;
      latitude?: number;
      longitude?: number;
      note?: string;
      idempotencyKey?: string;
    },
  ) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.incidentsForCompany(companyId) },
      select: { id: true, companyId: true, closedAt: true },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada o ya cerrada');

    if (dto.status === 'LOCATION_MARKED') {
      throw new BadRequestException('Use el endpoint de marcar ubicación para LOCATION_MARKED');
    }

    const idempotencyKey = dto.idempotencyKey?.trim() || undefined;
    if (idempotencyKey && idempotencyKey.length > 128) {
      throw new BadRequestException('La clave idempotente excede 128 caracteres');
    }
    const note = dto.note?.trim() || null;
    const data = {
      status: dto.status,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      note,
      respondedAt: new Date(),
      ...(dto.status === 'ON_SCENE' ? { onSceneAt: new Date() } : {}),
    };

    const execute = () =>
      this.prisma.$transaction(async (tx) => {
        if (idempotencyKey) {
          const previous = await tx.incidentEmergencyResponseHistory.findUnique({
            where: {
              incidentId_userId_idempotencyKey: { incidentId, userId, idempotencyKey },
            },
          });
          if (previous) {
            if (
              previous.eventType !== 'RESPONSE' ||
              previous.status !== dto.status ||
              previous.latitude !== (dto.latitude ?? null) ||
              previous.longitude !== (dto.longitude ?? null) ||
              previous.note !== note
            ) {
              throw new ConflictException('La clave idempotente ya fue usada con otra respuesta');
            }
            const existing = await tx.incidentEmergencyResponse.findUniqueOrThrow({
              where: { incidentId_userId: { incidentId, userId } },
              include: {
                user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
              },
            });
            return { response: existing, replayed: true };
          }
        }

        await tx.incidentEmergencyResponseHistory.create({
          data: {
            incidentId,
            userId,
            eventType: 'RESPONSE',
            status: dto.status,
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            note,
            idempotencyKey,
          },
        });

        const response = await tx.incidentEmergencyResponse.upsert({
          where: { incidentId_userId: { incidentId, userId } },
          create: { incidentId, userId, ...data },
          update: data,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
          },
        });

        if (dto.status === 'NOT_AVAILABLE') {
          await tx.user.update({
            where: { id: userId },
            data: { stationAvailable: false, stationAvailableAt: null },
          });
        } else if (dto.status === 'GOING' || dto.status === 'ON_SCENE') {
          await tx.user.update({
            where: { id: userId },
            data: { stationAvailable: true, stationAvailableAt: new Date() },
          });
        }
        return { response, replayed: false };
      });

    let result: Awaited<ReturnType<typeof execute>>;
    try {
      result = await execute();
    } catch (error) {
      if (
        !idempotencyKey ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const previous = await this.prisma.incidentEmergencyResponseHistory.findUnique({
        where: { incidentId_userId_idempotencyKey: { incidentId, userId, idempotencyKey } },
      });
      if (
        !previous ||
        previous.eventType !== 'RESPONSE' ||
        previous.status !== dto.status ||
        previous.latitude !== (dto.latitude ?? null) ||
        previous.longitude !== (dto.longitude ?? null) ||
        previous.note !== note
      ) {
        throw new ConflictException('La clave idempotente ya fue usada con otra respuesta');
      }
      const response = await this.prisma.incidentEmergencyResponse.findUniqueOrThrow({
        where: { incidentId_userId: { incidentId, userId } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
        },
      });
      result = { response, replayed: true };
    }

    const involvedCompanyIds = await this.involvedCompanyIds(incidentId);
    const mappedResponse = this.mapResponse(result.response);
    if (!result.replayed) {
      this.emergencyBroadcaster.emit({
        event: EMERGENCY_EVENT_NAMES.responseUpdated,
        incidentId,
        companyIds: involvedCompanyIds,
        snapshotVersion: result.response.updatedAt,
        data: { response: mappedResponse, replayed: false },
      });
    }

    return {
      ok: true,
      response: mappedResponse,
      replayed: result.replayed,
      involvedCompanyIds,
      message: `${RESPONSE_LABELS[dto.status]} registrado`,
    };
  }

  async markLocation(
    userId: string,
    incidentId: string,
    dto: { latitude: number; longitude: number; note?: string; idempotencyKey?: string },
  ) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.incidentsForCompany(companyId) },
      select: {
        id: true,
        code: true,
        type: true,
        address: true,
        latitude: true,
        longitude: true,
        closedAt: true,
      },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada o ya cerrada');

    const markedAt = new Date();
    const note = dto.note?.trim() || null;
    const idempotencyKey = dto.idempotencyKey?.trim() || undefined;
    if (idempotencyKey && idempotencyKey.length > 128) {
      throw new BadRequestException('La clave idempotente excede 128 caracteres');
    }
    const execute = () => this.prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const previous = await tx.incidentEmergencyResponseHistory.findUnique({
          where: { incidentId_userId_idempotencyKey: { incidentId, userId, idempotencyKey } },
        });
        if (previous) {
          if (
            previous.eventType !== 'LOCATION_MARKED' ||
            previous.latitude !== dto.latitude ||
            previous.longitude !== dto.longitude ||
            previous.note !== note
          ) {
            throw new ConflictException('La clave idempotente ya fue usada con otra ubicación');
          }
          const existing = await tx.incidentEmergencyResponse.findUniqueOrThrow({
            where: { incidentId_userId: { incidentId, userId } },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
            },
          });
          const currentIncident = await tx.incident.findUniqueOrThrow({
            where: { id: incidentId },
            select: { updatedAt: true, locationPinAt: true },
          });
          return { response: existing, incident: currentIncident, replayed: true };
        }
      }

      const updatedIncident = await tx.incident.update({
        where: { id: incidentId },
        data: {
          confirmedLatitude: dto.latitude,
          confirmedLongitude: dto.longitude,
          locationPinAt: markedAt,
          locationPinNote: note || `Marcado por ${user.firstName} ${user.lastName}`,
          ...(incident.latitude == null ? { latitude: dto.latitude } : {}),
          ...(incident.longitude == null ? { longitude: dto.longitude } : {}),
        },
        select: { updatedAt: true, locationPinAt: true },
      });

      const current = await tx.incidentEmergencyResponse.upsert({
        where: { incidentId_userId: { incidentId, userId } },
        create: {
          incidentId,
          userId,
          status: null,
          markerLatitude: dto.latitude,
          markerLongitude: dto.longitude,
          locationMarkedAt: markedAt,
        },
        update: {
          markerLatitude: dto.latitude,
          markerLongitude: dto.longitude,
          locationMarkedAt: markedAt,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
        },
      });

      await tx.incidentEmergencyResponseHistory.create({
        data: {
          incidentId,
          userId,
          eventType: 'LOCATION_MARKED',
          status: current.status,
          latitude: dto.latitude,
          longitude: dto.longitude,
          note,
          idempotencyKey,
        },
      });
      return { response: current, incident: updatedIncident, replayed: false };
    });

    let result: Awaited<ReturnType<typeof execute>>;
    try {
      result = await execute();
    } catch (error) {
      if (
        !idempotencyKey ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const previous = await this.prisma.incidentEmergencyResponseHistory.findUnique({
        where: { incidentId_userId_idempotencyKey: { incidentId, userId, idempotencyKey } },
      });
      if (
        !previous ||
        previous.eventType !== 'LOCATION_MARKED' ||
        previous.latitude !== dto.latitude ||
        previous.longitude !== dto.longitude ||
        previous.note !== note
      ) {
        throw new ConflictException('La clave idempotente ya fue usada con otra ubicación');
      }
      const [response, currentIncident] = await Promise.all([
        this.prisma.incidentEmergencyResponse.findUniqueOrThrow({
          where: { incidentId_userId: { incidentId, userId } },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
          },
        }),
        this.prisma.incident.findUniqueOrThrow({
          where: { id: incidentId },
          select: { updatedAt: true, locationPinAt: true },
        }),
      ]);
      result = { response, incident: currentIncident, replayed: true };
    }

    const involvedCompanyIds = await this.involvedCompanyIds(incidentId);
    if (!result.replayed) {
      await this.alarms.enqueue({
        incidentId,
        eventType: 'LOCATION',
        dedupKey: `incident:${incidentId}:location:${dto.latitude.toFixed(6)}:${dto.longitude.toFixed(6)}`,
        title: `UBICACIÓN ${incident.code}`,
        body: `${incident.type} — ubicación crítica actualizada`,
        companyIds: involvedCompanyIds,
        data: {
          code: incident.code,
          type: incident.type,
          address: incident.address,
          latitude: String(dto.latitude),
          longitude: String(dto.longitude),
        },
      });
    }
    const mappedResponse = this.mapResponse(result.response);
    const fieldGps = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      confirmedAt: result.incident.locationPinAt,
    };
    if (!result.replayed) {
      this.emergencyBroadcaster.emit({
        event: EMERGENCY_EVENT_NAMES.locationUpdated,
        incidentId,
        companyIds: involvedCompanyIds,
        snapshotVersion: result.incident.updatedAt,
        data: { response: mappedResponse, fieldGps, replayed: false },
      });
    }

    return {
      ok: true,
      response: mappedResponse,
      fieldGps,
      replayed: result.replayed,
      involvedCompanyIds,
      message: 'Ubicación del incendio notificada a la central',
    };
  }

  async getRecap(userId: string, incidentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true, isActive: true },
    });
    if (!user?.isActive) throw new ForbiddenException('Usuario inactivo');

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: {
        id: true,
        code: true,
        type: true,
        description: true,
        address: true,
        status: true,
        dispatchedAt: true,
        closedAt: true,
        companyId: true,
        vehicles: { select: { vehicle: { select: { companyId: true } } } },
        bitacoraEntry: {
          select: {
            id: true,
            title: true,
            emergencyType: true,
            address: true,
            occurredAt: true,
            summary: true,
            actionsTaken: true,
            personnelNotes: true,
            vehicleNotes: true,
            outcome: true,
            observations: true,
            author: { select: { firstName: true, lastName: true } },
          },
        },
        timelineEvents: {
          select: {
            id: true,
            kind: true,
            label: true,
            note: true,
            occurredAt: true,
            author: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada');

    const privileged = user.role === 'SUPER_ADMIN' || user.role === 'KODESK';
    const companyMatch = Boolean(
      user.companyId && (
        incident.companyId === user.companyId
        || incident.vehicles.some((row) => row.vehicle.companyId === user.companyId)
      ),
    );

    const mine = await this.prisma.incidentEmergencyResponse.findUnique({
      where: { incidentId_userId: { incidentId, userId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
      },
    });

    if (!privileged && !companyMatch && !mine) {
      throw new NotFoundException('Emergencia no encontrada');
    }

    return {
      incident: {
        id: incident.id,
        code: this.parseEmergencyCodeId(incident.type) || incident.code,
        type: incident.type,
        address: incident.address,
        description: incident.description,
        dispatchedAt: incident.dispatchedAt,
        closedAt: incident.closedAt,
        status: incident.status,
      },
      myResponse: mine ? this.mapResponse(mine) : null,
      timeline: incident.timelineEvents,
      report: incident.bitacoraEntry,
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rut: true,
        role: true,
        photoUrl: true,
        operativeNumber: true,
        stationAvailable: true,
        isMaquinista: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            number: true,
            city: true,
            logoUrl: true,
            cuerpo: { select: { name: true } },
          },
        },
        memberProfile: {
          select: { memberNumber: true, status: true, joinedAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const responses = await this.prisma.incidentEmergencyResponse.findMany({
      where: { userId, status: { not: null } },
      select: {
        status: true,
        respondedAt: true,
        onSceneAt: true,
        incident: {
          select: {
            id: true,
            code: true,
            type: true,
            address: true,
            dispatchedAt: true,
            closedAt: true,
            status: true,
          },
        },
      },
      orderBy: { respondedAt: 'desc' },
      take: 40,
    });

    const counts = await this.prisma.incidentEmergencyResponse.groupBy({
      by: ['status'],
      where: { userId, status: { not: null } },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      counts.map((row) => [row.status ?? 'NONE', row._count._all]),
    ) as Record<string, number>;
    const going = byStatus.GOING ?? 0;
    const onScene = byStatus.ON_SCENE ?? 0;
    const notGoing = byStatus.NOT_GOING ?? 0;
    const notAvailable = byStatus.NOT_AVAILABLE ?? 0;

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        rut: user.rut,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        photoUrl: user.photoUrl,
        operativeNumber: user.operativeNumber,
        stationAvailable: user.stationAvailable,
        isMaquinista: user.isMaquinista,
        company: user.company,
        cuerpoName: user.company?.cuerpo?.name ?? null,
        memberNumber: user.memberProfile?.memberNumber ?? null,
        memberStatus: user.memberProfile?.status ?? null,
        joinedAt: user.memberProfile?.joinedAt ?? user.createdAt,
      },
      stats: {
        total: going + onScene + notGoing + notAvailable,
        attended: going + onScene,
        going,
        onScene,
        notGoing,
        notAvailable,
      },
      emergencies: responses.map((row) => ({
        id: row.incident.id,
        code: this.parseEmergencyCodeId(row.incident.type) || row.incident.code,
        type: row.incident.type,
        address: row.incident.address,
        dispatchedAt: row.incident.dispatchedAt,
        closedAt: row.incident.closedAt,
        incidentStatus: row.incident.status,
        status: row.status,
        statusLabel: row.status ? RESPONSE_LABELS[row.status] : 'Sin respuesta',
        respondedAt: row.respondedAt,
        onSceneAt: row.onSceneAt,
      })),
    };
  }

  private async involvedCompanyIds(incidentId: string): Promise<string[]> {
    const inc = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: {
        companyId: true,
        vehicles: { select: { vehicle: { select: { companyId: true } } } },
      },
    });
    if (!inc) return [];
    const ids = new Set<string>([inc.companyId]);
    inc.vehicles.forEach((v) => ids.add(v.vehicle.companyId));
    return [...ids];
  }

  private parseEmergencyCodeId(incidentType: string): string | null {
    const head = incidentType.split(' — ')[0]?.trim();
    if (head && /^10(-\d+)+$/.test(head)) return head;
    return null;
  }
}
