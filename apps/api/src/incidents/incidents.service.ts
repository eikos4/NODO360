import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DispatchSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuardLogService } from '../guard-log/guard-log.service';
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
        select: { id: true, patent: true, brand: true, model: true, type: true, status: true, imageUrl: true },
      },
    },
  },
};

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private guardLogService: GuardLogService,
  ) {}

  async findAll(companyId?: string) {
    const rows = await this.prisma.incident.findMany({
      where: companyId ? { companyId } : {},
      include: INCLUDE,
      orderBy: { dispatchedAt: 'desc' },
    });
    return rows.map((inc) => this.withChecklistMeta(inc));
  }

  async findById(id: string) {
    const inc = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!inc) throw new NotFoundException('Emergencia no encontrada');
    return this.withChecklistMeta(inc);
  }

  private withChecklistMeta(incident: any) {
    const items = (incident.planChecklist as PlanChecklistItem[]) ?? [];
    return {
      ...incident,
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
        dispatchedAt: new Date().toISOString(),
        companyId: dto.companyId,
        participantIds: dto.participantIds,
        vehicleIds: dto.vehicleIds,
        dispatchSource: dto.dispatchSource ?? 'BOTONERA',
        dispatchNotes: dto.dispatchNotes,
      },
      userId,
    );

    return incident;
  }

  async create(dto: CreateIncidentDto, userId?: string) {
    const { participantIds, vehicleIds, ...data } = dto;
    const exists = await this.prisma.incident.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Código '${dto.code}' ya registrado`);

    const dispatchSource =
      data.dispatchSource === 'BOTONERA' ? DispatchSource.BOTONERA : DispatchSource.MANUAL;

    const match = await this.resolveMatchingPlan(data.companyId, data.type);

    const incident = await this.prisma.incident.create({
      data: {
        code: data.code,
        type: data.type,
        description: data.description,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        dispatchedAt: data.dispatchedAt,
        arrivedAt: data.arrivedAt,
        closedAt: data.closedAt,
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

    const full = await this.findById(incident.id);

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
      return { ...full, guardLogLinked: true, guardLogId: guardLog.log?.id };
    } catch {
      return { ...full, guardLogLinked: false };
    }
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

    return this.findById(id);
  }

  async update(id: string, dto: UpdateIncidentDto) {
    await this.findById(id);
    const { participantIds, vehicleIds, dispatchSource, ...data } = dto;

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
    if (dispatchSource !== undefined) {
      updateData.dispatchSource =
        dispatchSource === 'BOTONERA' ? DispatchSource.BOTONERA : DispatchSource.MANUAL;
    }

    await this.prisma.incident.update({ where: { id }, data: updateData });
    return this.findById(id);
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

  async getStats(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, open, byType, fromBotonera, withPlan] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.count({ where: { ...where, dispatchedAt: { gte: startOfMonth } } }),
      this.prisma.incident.count({ where: { ...where, closedAt: null } }),
      this.prisma.incident.groupBy({ by: ['type'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.incident.count({ where: { ...where, dispatchSource: DispatchSource.BOTONERA } }),
      this.prisma.incident.count({ where: { ...where, emergencyPlanId: { not: null } } }),
    ]);

    return {
      total,
      thisMonth,
      open,
      fromBotonera,
      withPlan,
      byType: byType.map((b) => ({ type: b.type, count: b._count.id })),
    };
  }
}
