import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDrillDto } from './dto/create-drill.dto';
import { UpdateDrillDto } from './dto/update-drill.dto';
import { CreateMeetingPointDto } from './dto/create-meeting-point.dto';
import { UpdateMeetingPointDto } from './dto/update-meeting-point.dto';
import { CreateEvacuationRouteDto } from './dto/create-evacuation-route.dto';
import { UpdateEvacuationRouteDto } from './dto/update-evacuation-route.dto';

@Injectable()
export class EvacuationService {
  constructor(private prisma: PrismaService) {}

  async getSummary(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const [drills, meetingPoints, routes] = await Promise.all([
      this.prisma.drill.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.meetingPoint.count({ where }),
      this.prisma.evacuationRoute.count({ where }),
    ]);

    const drillStats = {
      total: drills.reduce((s, d) => s + d._count, 0),
      programado: drills.find(d => d.status === 'PROGRAMADO')?._count ?? 0,
      ejecutado: drills.find(d => d.status === 'EJECUTADO')?._count ?? 0,
      cancelado: drills.find(d => d.status === 'CANCELADO')?._count ?? 0,
    };

    const upcoming = await this.prisma.drill.count({
      where: {
        ...where,
        status: 'PROGRAMADO',
        scheduledAt: { gte: new Date() },
      },
    });

    return {
      drills: drillStats,
      meetingPoints,
      routes,
      upcomingDrills: upcoming,
    };
  }

  // ── Drills ───────────────────────────────────────────────────────────────

  findAllDrills(filters?: { status?: string; companyId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.companyId) where.companyId = filters.companyId;

    return this.prisma.drill.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, number: true } },
        emergencyPlan: { select: { id: true, title: true, emergencyType: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOneDrill(id: string) {
    const drill = await this.prisma.drill.findUnique({
      where: { id },
      include: {
        company: true,
        emergencyPlan: true,
      },
    });
    if (!drill) throw new NotFoundException('Simulacro no encontrado');
    return drill;
  }

  createDrill(dto: CreateDrillDto) {
    return this.prisma.drill.create({
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
        status: dto.status ?? 'PROGRAMADO',
        participants: dto.participants ?? [],
        notes: dto.notes,
        emergencyPlanId: dto.emergencyPlanId || null,
        companyId: dto.companyId,
      },
      include: {
        company: { select: { id: true, name: true, number: true } },
        emergencyPlan: { select: { id: true, title: true } },
      },
    });
  }

  async updateDrill(id: string, dto: UpdateDrillDto) {
    await this.findOneDrill(id);
    return this.prisma.drill.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        executedAt: dto.executedAt ? new Date(dto.executedAt) : dto.executedAt === null ? null : undefined,
        emergencyPlanId: dto.emergencyPlanId === '' ? null : dto.emergencyPlanId,
        participants: dto.participants,
      },
      include: {
        company: { select: { id: true, name: true, number: true } },
        emergencyPlan: { select: { id: true, title: true } },
      },
    });
  }

  async removeDrill(id: string) {
    await this.findOneDrill(id);
    return this.prisma.drill.delete({ where: { id } });
  }

  // ── Meeting points ───────────────────────────────────────────────────────

  findAllMeetingPoints(companyId?: string) {
    return this.prisma.meetingPoint.findMany({
      where: companyId ? { companyId } : {},
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneMeetingPoint(id: string) {
    const point = await this.prisma.meetingPoint.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!point) throw new NotFoundException('Punto de encuentro no encontrado');
    return point;
  }

  createMeetingPoint(dto: CreateMeetingPointDto) {
    return this.prisma.meetingPoint.create({
      data: dto,
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async updateMeetingPoint(id: string, dto: UpdateMeetingPointDto) {
    await this.findOneMeetingPoint(id);
    return this.prisma.meetingPoint.update({
      where: { id },
      data: dto,
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async removeMeetingPoint(id: string) {
    await this.findOneMeetingPoint(id);
    return this.prisma.meetingPoint.delete({ where: { id } });
  }

  // ── Evacuation routes ──────────────────────────────────────────────────────

  findAllRoutes(companyId?: string) {
    return this.prisma.evacuationRoute.findMany({
      where: companyId ? { companyId } : {},
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneRoute(id: string) {
    const route = await this.prisma.evacuationRoute.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!route) throw new NotFoundException('Ruta de evacuación no encontrada');
    return route;
  }

  createRoute(dto: CreateEvacuationRouteDto) {
    return this.prisma.evacuationRoute.create({
      data: {
        name: dto.name,
        description: dto.description,
        startPoint: dto.startPoint,
        endPoint: dto.endPoint,
        waypoints: dto.waypoints ?? undefined,
        buildingId: dto.buildingId,
        companyId: dto.companyId,
      },
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async updateRoute(id: string, dto: UpdateEvacuationRouteDto) {
    await this.findOneRoute(id);
    return this.prisma.evacuationRoute.update({
      where: { id },
      data: dto,
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async removeRoute(id: string) {
    await this.findOneRoute(id);
    return this.prisma.evacuationRoute.delete({ where: { id } });
  }
}
