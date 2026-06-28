import { Injectable } from '@nestjs/common';
import { DispatchSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [-36.1431, -71.8261];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán',
  OPERADOR_CENTRAL: 'Operador Central',
  ENCARGADO_MATERIAL: 'Enc. Material',
  TESORERO: 'Tesorero',
  SECRETARIO: 'Secretario',
  BOMBERO: 'Bombero',
  AUDITOR: 'Auditor',
};

const CITY_COORDS: Record<string, [number, number]> = {
  santiago: [-33.4489, -70.6693],
  valparaiso: [-33.0472, -71.6127],
  'valparaíso': [-33.0472, -71.6127],
  talca: [-35.4264, -71.6554],
  chillan: [-36.6063, -72.1034],
  chillán: [-36.6063, -72.1034],
  parral: [-36.1431, -71.8261],
  catillo: [-36.2876, -71.6518],
  remulcao: [-36.1985, -71.7820],
};

function asPoint(obj: unknown): LatLng | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, number>;
  if (typeof o.lat === 'number' && typeof o.lng === 'number') return { lat: o.lat, lng: o.lng };
  return null;
}

function companyCoords(city: string, number: number): [number, number] {
  const key = city.trim().toLowerCase();
  const base = CITY_COORDS[key] ?? DEFAULT_CENTER;
  const offset = (number % 10) * 0.008;
  return [base[0] + offset * 0.3, base[1] + offset];
}

function buildBounds(points: LatLng[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const pad = 0.012;
  return [
    [minLat - pad, minLng - pad],
    [maxLat + pad, maxLng + pad],
  ];
}

/** Dispersión estable alrededor del cuartel para voluntarios disponibles */
function volunteerPosition(
  baseLat: number,
  baseLng: number,
  userId: string,
  index: number,
): LatLng {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % 1000;
  }
  const angle = (hash / 1000) * 2 * Math.PI;
  const radius = 0.0025 + (index % 6) * 0.0006;
  return {
    lat: baseLat + Math.cos(angle) * radius,
    lng: baseLng + Math.sin(angle) * radius,
  };
}

function resolveAlarmBy(
  dispatchSource: DispatchSource | null,
  guardAuthor: { firstName: string; lastName: string } | undefined,
  participants: { user: { firstName: string; lastName: string; role: string } }[],
): string {
  if (guardAuthor) return `${guardAuthor.firstName} ${guardAuthor.lastName}`;
  if (dispatchSource === DispatchSource.BOTONERA) return 'Central de Despachos';
  const lead = participants.find((p) => ['COMANDANTE', 'CAPITAN'].includes(p.user.role));
  if (lead) return `${lead.user.firstName} ${lead.user.lastName}`;
  if (participants[0]) {
    return `${participants[0].user.firstName} ${participants[0].user.lastName}`;
  }
  return 'Central de despacho';
}

@Injectable()
export class OperationalMapService {
  constructor(private prisma: PrismaService) {}

  async getMapData(companyId?: string, incidentDays = 90) {
    const where = companyId ? { companyId } : {};
    const since = new Date();
    since.setDate(since.getDate() - incidentDays);

    const [hydrants, meetingPoints, routes, incidents, companies, activeAlarmRows, volunteerRows] = await Promise.all([
      this.prisma.hydrant.findMany({
        where,
        select: {
          id: true,
          code: true,
          type: true,
          status: true,
          address: true,
          latitude: true,
          longitude: true,
          companyId: true,
          company: { select: { name: true, number: true } },
        },
      }),
      this.prisma.meetingPoint.findMany({
        where,
        include: { company: { select: { name: true, number: true } } },
      }),
      this.prisma.evacuationRoute.findMany({
        where,
        include: { company: { select: { name: true, number: true } } },
      }),
      this.prisma.incident.findMany({
        where: {
          ...where,
          OR: [
            { AND: [{ latitude: { not: null } }, { longitude: { not: null } }] },
            { AND: [{ confirmedLatitude: { not: null } }, { confirmedLongitude: { not: null } }] },
          ],
          dispatchedAt: { gte: since },
        },
        select: {
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
          dispatchedAt: true,
          closedAt: true,
          companyId: true,
          company: { select: { name: true, number: true } },
        },
        orderBy: { dispatchedAt: 'desc' },
        take: 200,
      }),
      this.prisma.company.findMany({
        where: companyId ? { id: companyId, isActive: true } : { isActive: true },
        select: {
          id: true,
          name: true,
          number: true,
          city: true,
          region: true,
          address: true,
        },
        orderBy: { number: 'asc' },
      }),
      this.prisma.incident.findMany({
        where: {
          ...where,
          closedAt: null,
        },
        select: {
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
          dispatchedAt: true,
          dispatchSource: true,
          companyId: true,
          company: { select: { name: true, number: true, city: true } },
          guardLogEntries: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { author: { select: { firstName: true, lastName: true } } },
          },
          participants: {
            take: 5,
            select: { user: { select: { firstName: true, lastName: true, role: true } } },
          },
          vehicles: {
            select: { vehicle: { select: { patent: true, type: true } } },
          },
        },
        orderBy: { dispatchedAt: 'desc' },
        take: 50,
      }),
      this.prisma.user.findMany({
        where: {
          isActive: true,
          stationAvailable: true,
          ...(companyId ? { companyId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          stationAvailableAt: true,
          companyId: true,
          company: { select: { id: true, name: true, number: true, city: true } },
        },
        orderBy: [{ stationAvailableAt: 'desc' }, { lastName: 'asc' }],
      }),
    ]);

    const hydrantFeatures = hydrants
      .filter(h => h.latitude != null && h.longitude != null)
      .map(h => ({
        id: h.id,
        code: h.code,
        type: h.type,
        status: h.status,
        address: h.address,
        lat: h.latitude!,
        lng: h.longitude!,
        companyName: h.company.name,
        companyNumber: h.company.number,
      }));

    const meetingFeatures = meetingPoints
      .map(mp => {
        const loc = asPoint(mp.location);
        if (!loc) return null;
        return {
          id: mp.id,
          name: mp.name,
          description: mp.description,
          address: mp.address,
          capacity: mp.capacity,
          lat: loc.lat,
          lng: loc.lng,
          companyName: mp.company.name,
          companyNumber: mp.company.number,
        };
      })
      .filter(Boolean);

    const routeFeatures = routes
      .map(r => {
        const start = asPoint(r.startPoint);
        const end = asPoint(r.endPoint);
        if (!start || !end) return null;
        const waypoints = Array.isArray(r.waypoints)
          ? (r.waypoints as unknown[])
              .map(w => asPoint(w))
              .filter((p): p is LatLng => p !== null)
          : [];
        const path: LatLng[] = [start, ...waypoints, end];
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          buildingId: r.buildingId,
          path,
          companyName: r.company.name,
          companyNumber: r.company.number,
        };
      })
      .filter(Boolean);

    const incidentFeatures = incidents.map(i => {
      const useConfirmed = i.confirmedLatitude != null && i.confirmedLongitude != null;
      const lat = useConfirmed ? i.confirmedLatitude! : i.latitude!;
      const lng = useConfirmed ? i.confirmedLongitude! : i.longitude!;
      return {
      id: i.id,
      code: i.code,
      type: i.type,
      description: i.description,
      address: i.address,
      lat,
      lng,
      dispatchLat: i.latitude,
      dispatchLng: i.longitude,
      fieldLat: i.confirmedLatitude,
      fieldLng: i.confirmedLongitude,
      hasFieldGps: useConfirmed,
      dispatchedAt: i.dispatchedAt,
      closedAt: i.closedAt,
      isOpen: !i.closedAt,
      companyName: i.company.name,
      companyNumber: i.company.number,
    };
    });

    const companyFeatures = companies.map(c => {
      const [lat, lng] = companyCoords(c.city, c.number);
      return {
        id: c.id,
        name: c.name,
        number: c.number,
        city: c.city,
        region: c.region,
        address: c.address,
        lat,
        lng,
        approximate: true,
      };
    });

    const companyById = new Map(companyFeatures.map((c) => [c.id, c]));

    const activeAlarms = activeAlarmRows.map((i) => {
      const companyLoc = companyCoords(i.company.city, i.company.number);
      const hasFieldGps = i.confirmedLatitude != null && i.confirmedLongitude != null;
      const hasDispatchGps = i.latitude != null && i.longitude != null;
      const lat = hasFieldGps ? i.confirmedLatitude! : hasDispatchGps ? i.latitude! : companyLoc[0];
      const lng = hasFieldGps ? i.confirmedLongitude! : hasDispatchGps ? i.longitude! : companyLoc[1];
      const desc = i.description?.trim() ?? '';
      const radioMessage = /SECTOR/i.test(desc) && /CONCURRE/i.test(desc) ? desc : undefined;
      return {
        id: i.id,
        code: i.code,
        type: i.type,
        description: i.description,
        address: i.address,
        lat,
        lng,
        dispatchLat: hasDispatchGps ? i.latitude : null,
        dispatchLng: hasDispatchGps ? i.longitude : null,
        fieldLat: hasFieldGps ? i.confirmedLatitude : null,
        fieldLng: hasFieldGps ? i.confirmedLongitude : null,
        fieldConfirmedAt: i.locationPinAt,
        hasGps: hasFieldGps || hasDispatchGps,
        hasFieldGps,
        approximate: !hasFieldGps && !hasDispatchGps,
        dispatchedAt: i.dispatchedAt,
        alarmBy: resolveAlarmBy(
          i.dispatchSource,
          i.guardLogEntries[0]?.author,
          i.participants,
        ),
        dispatchSource: i.dispatchSource,
        companyName: i.company.name,
        companyNumber: i.company.number,
        vehicles: i.vehicles.map((v) => ({
          patent: v.vehicle.patent,
          type: v.vehicle.type,
        })),
        radioMessage,
        isLive: true,
      };
    });

    const volunteersByCompany = new Map<string, number>();
    const volunteerFeatures = volunteerRows.map((u) => {
      const company = companyById.get(u.companyId);
      const baseLat = company?.lat ?? DEFAULT_CENTER[0];
      const baseLng = company?.lng ?? DEFAULT_CENTER[1];
      const idx = volunteersByCompany.get(u.companyId) ?? 0;
      volunteersByCompany.set(u.companyId, idx + 1);
      const pos = volunteerPosition(baseLat, baseLng, u.id, idx);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role] ?? u.role,
        photoUrl: u.photoUrl,
        stationAvailableAt: u.stationAvailableAt,
        lat: pos.lat,
        lng: pos.lng,
        nearCompany: company
          ? `${company.number}ª ${company.name}`
          : u.company.name,
        companyId: u.companyId,
        approximate: true,
      };
    });

    const allPoints: LatLng[] = [
      ...hydrantFeatures.map(h => ({ lat: h.lat, lng: h.lng })),
      ...meetingFeatures.map((m: any) => ({ lat: m.lat, lng: m.lng })),
      ...routeFeatures.flatMap((r: any) => r.path),
      ...incidentFeatures.map(i => ({ lat: i.lat, lng: i.lng })),
      ...activeAlarms.map((a) => ({ lat: a.lat, lng: a.lng })),
      ...volunteerFeatures.map((v) => ({ lat: v.lat, lng: v.lng })),
      ...companyFeatures.map(c => ({ lat: c.lat, lng: c.lng })),
    ];

    const bounds = buildBounds(allPoints);
    const center: [number, number] = bounds
      ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
      : companyId && companyFeatures[0]
        ? [companyFeatures[0].lat, companyFeatures[0].lng]
        : DEFAULT_CENTER;

    return {
      center,
      bounds,
      incidentDays,
      stats: {
        hydrants: hydrantFeatures.length,
        meetingPoints: meetingFeatures.length,
        routes: routeFeatures.length,
        incidents: incidentFeatures.length,
        companies: companyFeatures.length,
        incidentsOpen: incidentFeatures.filter(i => i.isOpen).length,
        activeAlarms: activeAlarms.length,
        volunteersAvailable: volunteerFeatures.length,
      },
      layers: {
        hydrants: hydrantFeatures,
        meetingPoints: meetingFeatures,
        routes: routeFeatures,
        incidents: incidentFeatures,
        companies: companyFeatures,
        activeAlarms,
        volunteers: volunteerFeatures,
      },
      live: {
        updatedAt: new Date().toISOString(),
        activeAlarms,
        volunteers: volunteerFeatures,
      },
    };
  }
}
