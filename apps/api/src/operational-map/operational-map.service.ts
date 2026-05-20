import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [-35.6632, -71.4392];

const CITY_COORDS: Record<string, [number, number]> = {
  santiago: [-33.4489, -70.6693],
  valparaiso: [-33.0472, -71.6127],
  'valparaíso': [-33.0472, -71.6127],
  talca: [-35.4264, -71.6554],
  chillan: [-36.6063, -72.1034],
  chillán: [-36.6063, -72.1034],
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

@Injectable()
export class OperationalMapService {
  constructor(private prisma: PrismaService) {}

  async getMapData(companyId?: string, incidentDays = 90) {
    const where = companyId ? { companyId } : {};
    const since = new Date();
    since.setDate(since.getDate() - incidentDays);

    const [hydrants, meetingPoints, routes, incidents, companies] = await Promise.all([
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
          latitude: { not: null },
          longitude: { not: null },
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

    const incidentFeatures = incidents.map(i => ({
      id: i.id,
      code: i.code,
      type: i.type,
      description: i.description,
      address: i.address,
      lat: i.latitude!,
      lng: i.longitude!,
      dispatchedAt: i.dispatchedAt,
      closedAt: i.closedAt,
      isOpen: !i.closedAt,
      companyName: i.company.name,
      companyNumber: i.company.number,
    }));

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

    const allPoints: LatLng[] = [
      ...hydrantFeatures.map(h => ({ lat: h.lat, lng: h.lng })),
      ...meetingFeatures.map((m: any) => ({ lat: m.lat, lng: m.lng })),
      ...routeFeatures.flatMap((r: any) => r.path),
      ...incidentFeatures.map(i => ({ lat: i.lat, lng: i.lng })),
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
      },
      layers: {
        hydrants: hydrantFeatures,
        meetingPoints: meetingFeatures,
        routes: routeFeatures,
        incidents: incidentFeatures,
        companies: companyFeatures,
      },
    };
  }
}
