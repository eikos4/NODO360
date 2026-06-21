import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GuardLogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuardLogEntryDto } from './dto/create-guard-log-entry.dto';
import { CreateGuardHandoverDto } from './dto/create-guard-handover.dto';
import { CloseGuardLogDto } from './dto/close-guard-log.dto';

const USER_SELECT = { id: true, firstName: true, lastName: true, role: true };

const LOG_INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  openedBy: { select: USER_SELECT },
  entries: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: USER_SELECT } },
  },
  handovers: {
    orderBy: { handedAt: 'desc' as const },
    include: {
      fromUser: { select: USER_SELECT },
      toUser: { select: USER_SELECT },
    },
  },
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDay(dateStr?: string): Date {
  if (!dateStr) return startOfDay(new Date());
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
  return startOfDay(d);
}

@Injectable()
export class GuardLogService {
  constructor(private prisma: PrismaService) {}

  async getOrOpen(companyId: string, dateStr?: string, openedById?: string) {
    const day = parseDay(dateStr);
    let log = await this.prisma.guardLog.findUnique({
      where: { companyId_date: { companyId, date: day } },
      include: LOG_INCLUDE,
    });

    if (!log) {
      log = await this.prisma.guardLog.create({
        data: {
          companyId,
          date: day,
          openedById: openedById ?? undefined,
          status: GuardLogStatus.OPEN,
        },
        include: LOG_INCLUDE,
      });
    }

    return this.buildDashboard(log.id);
  }

  async buildDashboard(logId: string) {
    const log = await this.prisma.guardLog.findUnique({
      where: { id: logId },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('Bitácora no encontrada');

    const dayStart = startOfDay(log.date);
    const dayEnd = endOfDay(log.date);

    const [shifts, incidents, vehicles] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          user: { companyId: log.companyId },
        },
        include: { user: { select: USER_SELECT } },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.incident.findMany({
        where: {
          companyId: log.companyId,
          dispatchedAt: { gte: dayStart, lte: dayEnd },
        },
        include: {
          vehicles: { include: { vehicle: { select: { id: true, patent: true, brand: true, model: true } } } },
          participants: { include: { user: { select: USER_SELECT } } },
        },
        orderBy: { dispatchedAt: 'desc' },
      }),
      this.prisma.vehicle.findMany({
        where: { companyId: log.companyId },
        select: { id: true, patent: true, brand: true, model: true, type: true, status: true },
      }),
    ]);

    const presentCount = shifts.filter((s) => s.present).length;
    const openIncidents = incidents.filter((i) => !i.closedAt).length;
    const operativoVehicles = vehicles.filter((v) => v.status === 'OPERATIVO').length;

    return {
      log,
      entries: log.entries,
      handovers: log.handovers,
      shifts,
      incidents,
      vehicles,
      stats: {
        shiftCount: shifts.length,
        presentCount,
        incidentCount: incidents.length,
        openIncidents,
        vehicleOperativo: operativoVehicles,
        vehicleTotal: vehicles.length,
        entryCount: log.entries.length,
        handoverCount: log.handovers.length,
      },
    };
  }

  async findById(id: string) {
    return this.buildDashboard(id);
  }

  async list(companyId?: string, limit = 30) {
    return this.prisma.guardLog.findMany({
      where: companyId ? { companyId } : {},
      include: {
        company: { select: { id: true, name: true, number: true } },
        _count: { select: { entries: true, handovers: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async addEntry(logId: string, authorId: string, dto: CreateGuardLogEntryDto) {
    const log = await this.prisma.guardLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Bitácora no encontrada');
    if (log.status === GuardLogStatus.CLOSED) {
      throw new BadRequestException('La bitácora está cerrada');
    }

    await this.prisma.guardLogEntry.create({
      data: {
        logId,
        authorId,
        type: (dto.type as any) ?? 'NOVEDAD',
        title: dto.title,
        content: dto.content,
      },
    });

    return this.buildDashboard(logId);
  }

  async deleteEntry(logId: string, entryId: string) {
    const entry = await this.prisma.guardLogEntry.findFirst({
      where: { id: entryId, logId },
    });
    if (!entry) throw new NotFoundException('Novedad no encontrada');
    await this.prisma.guardLogEntry.delete({ where: { id: entryId } });
    return this.buildDashboard(logId);
  }

  async addHandover(logId: string, dto: CreateGuardHandoverDto) {
    const log = await this.prisma.guardLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Bitácora no encontrada');

    await this.prisma.guardHandover.create({
      data: {
        logId,
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        summary: dto.summary,
        observations: dto.observations,
        handedAt: dto.handedAt ? new Date(dto.handedAt) : new Date(),
      },
    });

    return this.buildDashboard(logId);
  }

  async close(logId: string, closedById: string, dto: CloseGuardLogDto) {
    const log = await this.prisma.guardLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Bitácora no encontrada');

    await this.prisma.guardLog.update({
      where: { id: logId },
      data: {
        status: GuardLogStatus.CLOSED,
        closedAt: new Date(),
        closedById,
        closingNotes: dto.closingNotes,
      },
    });

    return this.buildDashboard(logId);
  }

  async recordDispatchFromIncident(params: {
    companyId: string;
    incidentId: string;
    code: string;
    type: string;
    address: string;
    description?: string;
    dispatchNotes?: string;
    vehicleLines?: string[];
    participantLines?: string[];
    authorId?: string;
  }) {
    const existing = await this.prisma.guardLogEntry.findFirst({
      where: {
        incidentId: params.incidentId,
        log: { companyId: params.companyId },
      },
    });
    if (existing) {
      return this.buildDashboard(existing.logId);
    }

    const day = parseDay(undefined);
    let log = await this.prisma.guardLog.findUnique({
      where: { companyId_date: { companyId: params.companyId, date: day } },
    });

    if (!log) {
      log = await this.prisma.guardLog.create({
        data: {
          companyId: params.companyId,
          date: day,
          openedById: params.authorId,
          status: GuardLogStatus.OPEN,
        },
      });
    } else if (log.status === GuardLogStatus.CLOSED) {
      await this.prisma.guardLog.update({
        where: { id: log.id },
        data: { status: GuardLogStatus.OPEN, closedAt: null, closedById: null, closingNotes: null },
      });
    }

    let authorId = params.authorId ?? log.openedById;
    if (!authorId) {
      const fallback = await this.prisma.user.findFirst({
        where: { companyId: params.companyId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      authorId = fallback?.id;
    }
    if (!authorId) {
      throw new BadRequestException('No hay usuario disponible para registrar la novedad en bitácora');
    }

    const lines = [
      `Emergencia ${params.code} — ${params.type}`,
      `Dirección: ${params.address}`,
      params.description ? `Detalle: ${params.description}` : null,
      params.vehicleLines?.length ? `Carros: ${params.vehicleLines.join(', ')}` : null,
      params.participantLines?.length ? `Personal: ${params.participantLines.join(', ')}` : null,
      params.dispatchNotes ? `Observaciones botonera: ${params.dispatchNotes}` : null,
      'Registro automático desde despacho integrado (botonera / emergencias).',
    ].filter(Boolean);

    await this.prisma.guardLogEntry.create({
      data: {
        logId: log.id,
        authorId,
        incidentId: params.incidentId,
        type: 'NOVEDAD',
        title: `Despacho ${params.code}`,
        content: lines.join('\n'),
      },
    });

    return this.buildDashboard(log.id);
  }

  async reopen(logId: string) {
    await this.prisma.guardLog.update({
      where: { id: logId },
      data: {
        status: GuardLogStatus.OPEN,
        closedAt: null,
        closedById: null,
        closingNotes: null,
      },
    });
    return this.buildDashboard(logId);
  }
}
