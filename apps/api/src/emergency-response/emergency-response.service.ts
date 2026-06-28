import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmergencyResponseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchCentralService } from '../dispatch-central/dispatch-central.service';

const RESPONSE_LABELS: Record<EmergencyResponseStatus, string> = {
  GOING: 'Voy',
  NOT_GOING: 'No voy',
  NOT_AVAILABLE: 'No disponible',
  ON_SCENE: 'En el lugar',
  LOCATION_MARKED: 'Ubicación marcada',
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
  ) {}

  private incidentsForCompany(companyId: string): Prisma.IncidentWhereInput {
    return {
      closedAt: null,
      OR: [
        { companyId },
        { vehicles: { some: { vehicle: { companyId } } } },
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
      },
    });
    if (!user?.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
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
    status: EmergencyResponseStatus;
    latitude: number | null;
    longitude: number | null;
    markerLatitude: number | null;
    markerLongitude: number | null;
    note: string | null;
    respondedAt: Date;
    updatedAt: Date;
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null; operativeNumber: number | null };
  }) {
    return {
      id: r.id,
      status: r.status,
      statusLabel: RESPONSE_LABELS[r.status],
      latitude: r.latitude,
      longitude: r.longitude,
      markerLatitude: r.markerLatitude,
      markerLongitude: r.markerLongitude,
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
      status: EmergencyResponseStatus;
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
      if (r.status === 'LOCATION_MARKED') counts.locationMarked += 1;
    }
    return {
      ...counts,
      responses: rows.map((r) => ({
        status: r.status,
        statusLabel: RESPONSE_LABELS[r.status],
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
    dto: { status: EmergencyResponseStatus; latitude?: number; longitude?: number; note?: string },
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

    const data = {
      status: dto.status,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      note: dto.note?.trim() || null,
      respondedAt: new Date(),
    };

    const response = await this.prisma.incidentEmergencyResponse.upsert({
      where: { incidentId_userId: { incidentId, userId } },
      create: { incidentId, userId, ...data },
      update: data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
      },
    });

    if (dto.status === 'NOT_AVAILABLE') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { stationAvailable: false, stationAvailableAt: null },
      });
    }

    if (dto.status === 'GOING' || dto.status === 'ON_SCENE') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { stationAvailable: true, stationAvailableAt: new Date() },
      });
    }

    const involvedCompanyIds = await this.involvedCompanyIds(incidentId);

    return {
      ok: true,
      response: this.mapResponse(response),
      involvedCompanyIds,
      message: `${RESPONSE_LABELS[dto.status]} registrado`,
    };
  }

  async markLocation(
    userId: string,
    incidentId: string,
    dto: { latitude: number; longitude: number; note?: string },
  ) {
    const user = await this.getUserOrThrow(userId);
    const companyId = user.companyId!;

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, ...this.incidentsForCompany(companyId) },
      select: { id: true, latitude: true, longitude: true, closedAt: true },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada o ya cerrada');

    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        confirmedLatitude: dto.latitude,
        confirmedLongitude: dto.longitude,
        locationPinAt: new Date(),
        locationPinNote: dto.note?.trim() || `Marcado por ${user.firstName} ${user.lastName}`,
        ...(incident.latitude == null ? { latitude: dto.latitude } : {}),
        ...(incident.longitude == null ? { longitude: dto.longitude } : {}),
      },
    });

    const response = await this.prisma.incidentEmergencyResponse.upsert({
      where: { incidentId_userId: { incidentId, userId } },
      create: {
        incidentId,
        userId,
        status: 'LOCATION_MARKED',
        markerLatitude: dto.latitude,
        markerLongitude: dto.longitude,
        latitude: dto.latitude,
        longitude: dto.longitude,
        note: dto.note?.trim() || null,
      },
      update: {
        status: 'LOCATION_MARKED',
        markerLatitude: dto.latitude,
        markerLongitude: dto.longitude,
        latitude: dto.latitude,
        longitude: dto.longitude,
        note: dto.note?.trim() || null,
        respondedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoUrl: true, operativeNumber: true } },
      },
    });

    const involvedCompanyIds = await this.involvedCompanyIds(incidentId);

    return {
      ok: true,
      response: this.mapResponse(response),
      fieldGps: { latitude: dto.latitude, longitude: dto.longitude },
      involvedCompanyIds,
      message: 'Ubicación del incendio notificada a la central',
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
