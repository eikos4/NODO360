import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, IncidentTimelineKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentAuthUser, IncidentsService } from '../incidents/incidents.service';
import { CreateIncidentTimelineEventDto } from './dto/create-incident-timeline-event.dto';
import { INCIDENT_TIMELINE_LABELS } from './incident-timeline.kinds';
import { hasAnyRole } from '../common/user-roles';

const INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.IncidentTimelineEventInclude;

@Injectable()
export class IncidentTimelineService {
  constructor(
    private prisma: PrismaService,
    private incidents: IncidentsService,
  ) {}

  async listByIncident(incidentId: string, user: IncidentAuthUser) {
    await this.incidents.findByIdAuthorized(incidentId, user);
    return this.prisma.incidentTimelineEvent.findMany({
      where: { incidentId },
      include: INCLUDE,
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateIncidentTimelineEventDto, user: IncidentAuthUser) {
    if (!hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL')) {
      throw new ForbiddenException('No puede registrar en la bitácora operacional');
    }
    await this.incidents.assertCanManage(dto.incidentId, user);

    const note = dto.note?.trim() || null;
    if (dto.kind === IncidentTimelineKind.COMENTARIO && (!note || note.length < 3)) {
      throw new BadRequestException('Escribe el comentario (mínimo 3 caracteres)');
    }

    const occurredAt = new Date();
    const event = await this.prisma.incidentTimelineEvent.create({
      data: {
        incidentId: dto.incidentId,
        kind: dto.kind,
        label: INCIDENT_TIMELINE_LABELS[dto.kind],
        note,
        occurredAt,
        authorId: user.id,
      },
      include: INCLUDE,
    });

    if (dto.kind === IncidentTimelineKind.EN_LUGAR) {
      await this.prisma.incident.updateMany({
        where: { id: dto.incidentId, arrivedAt: null, status: IncidentStatus.ACTIVE },
        data: { arrivedAt: occurredAt, status: IncidentStatus.ARRIVED },
      });
    }

    return event;
  }

  private static readonly SALA_CARRO_KINDS: IncidentTimelineKind[] = [
    IncidentTimelineKind.EN_CAMINO,
    IncidentTimelineKind.EN_LUGAR,
    IncidentTimelineKind.HIDRANTE,
    IncidentTimelineKind.RECONOCIMIENTO,
    IncidentTimelineKind.ATAQUE_INTERIOR,
    IncidentTimelineKind.ATAQUE_EXTERIOR,
    IncidentTimelineKind.CONTROLADO,
  ];

  private async companyBySlug(slug: string) {
    const company = await this.prisma.company.findFirst({
      where: { dispatchSlug: slug, isActive: true },
      select: { id: true, dispatchSlug: true, number: true, name: true },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');
    return company;
  }

  private async assertIncidentInCompany(incidentId: string, companyId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: {
        id: incidentId,
        OR: [
          { companyId },
          { vehicles: { some: { vehicle: { companyId } } } },
        ],
      },
      select: { id: true },
    });
    if (!incident) throw new ForbiddenException('La emergencia no corresponde a esta compañía');
    return incident;
  }

  async listPublicBySlug(slug: string, incidentId: string) {
    const company = await this.companyBySlug(slug);
    await this.assertIncidentInCompany(incidentId, company.id);
    return this.prisma.incidentTimelineEvent.findMany({
      where: { incidentId },
      include: INCLUDE,
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createFromSala(slug: string, dto: CreateIncidentTimelineEventDto, vehicleNote?: string) {
    if (!IncidentTimelineService.SALA_CARRO_KINDS.includes(dto.kind)) {
      throw new BadRequestException('Este estado no se registra desde el carro');
    }
    const company = await this.companyBySlug(slug);
    await this.assertIncidentInCompany(dto.incidentId, company.id);

    const extra = vehicleNote?.trim();
    const note = [dto.note?.trim(), extra].filter(Boolean).join(' · ') || null;
    const occurredAt = new Date();
    const event = await this.prisma.incidentTimelineEvent.create({
      data: {
        incidentId: dto.incidentId,
        kind: dto.kind,
        label: INCIDENT_TIMELINE_LABELS[dto.kind],
        note,
        occurredAt,
        authorId: null,
      },
      include: INCLUDE,
    });

    if (dto.kind === IncidentTimelineKind.EN_LUGAR) {
      await this.prisma.incident.updateMany({
        where: { id: dto.incidentId, arrivedAt: null, status: IncidentStatus.ACTIVE },
        data: { arrivedAt: occurredAt, status: IncidentStatus.ARRIVED },
      });
    }

    return event;
  }

  async remove(id: string, user: IncidentAuthUser) {
    const row = await this.prisma.incidentTimelineEvent.findUnique({
      where: { id },
      select: { id: true, incidentId: true, authorId: true },
    });
    if (!row) throw new NotFoundException('Evento de bitácora no encontrado');

    await this.incidents.assertCanManage(row.incidentId, user);

    const canDeleteAny = hasAnyRole(user, 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL');
    const isAuthor = row.authorId === user.id;
    if (!canDeleteAny && !isAuthor) {
      throw new ForbiddenException('Solo puede borrar sus propios registros');
    }

    await this.prisma.incidentTimelineEvent.delete({ where: { id } });
    return { ok: true };
  }
}
