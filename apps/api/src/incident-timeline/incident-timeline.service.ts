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
