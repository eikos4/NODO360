import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EmergencyPlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmergencyPlanDto } from './dto/create-emergency-plan.dto';
import { UpdateEmergencyPlanDto } from './dto/update-emergency-plan.dto';
import { mapIncidentTypeToEmergencyType, snapshotPlanChecklist } from '../incidents/incident-plan.util';

const PLAN_INCLUDE = {
  company: true,
  drills: { orderBy: { scheduledAt: 'desc' as const }, take: 5 },
  attachments: { orderBy: { uploadedAt: 'desc' as const } },
  versions: { orderBy: { version: 'desc' as const }, take: 15 },
};

@Injectable()
export class EmergencyPlansService {
  constructor(private prisma: PrismaService) {}

  private normalizeChecklist(checklist: unknown): Prisma.InputJsonValue {
    if (!checklist) return [];
    if (Array.isArray(checklist)) return checklist as Prisma.InputJsonValue;
    return [];
  }

  private async snapshotVersion(planId: string, changedBy?: string) {
    const plan = await this.prisma.emergencyPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    await this.prisma.emergencyPlanVersion.create({
      data: {
        planId: plan.id,
        version: plan.version,
        title: plan.title,
        description: plan.description,
        emergencyType: plan.emergencyType,
        severity: plan.severity,
        status: plan.status,
        procedures: plan.procedures as Prisma.InputJsonValue,
        checklist: plan.checklist as Prisma.InputJsonValue,
        changedBy,
      },
    });
  }

  async findAll(filters?: { emergencyType?: string; severity?: string; companyId?: string; status?: string }) {
    const where: Prisma.EmergencyPlanWhereInput = {};
    if (filters?.emergencyType) where.emergencyType = filters.emergencyType as any;
    if (filters?.severity) where.severity = filters.severity as any;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.status) where.status = filters.status as EmergencyPlanStatus;

    return this.prisma.emergencyPlan.findMany({
      where,
      include: {
        company: true,
        attachments: { take: 3, orderBy: { uploadedAt: 'desc' } },
        _count: { select: { versions: true, attachments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async matchForIncident(companyId: string, incidentType: string) {
    if (!companyId || !incidentType) {
      throw new BadRequestException('companyId e incidentType son requeridos');
    }
    const emergencyType = mapIncidentTypeToEmergencyType(incidentType);
    const plan = await this.prisma.emergencyPlan.findFirst({
      where: { companyId, emergencyType, status: EmergencyPlanStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, number: true } },
        attachments: { take: 3, orderBy: { uploadedAt: 'desc' } },
      },
    });
    return {
      matched: !!plan,
      emergencyType,
      plan: plan
        ? {
            id: plan.id,
            title: plan.title,
            severity: plan.severity,
            version: plan.version,
            status: plan.status,
            company: plan.company,
          }
        : null,
      checklist: plan ? snapshotPlanChecklist(plan.checklist) : [],
    };
  }

  async findOne(id: string) {
    const plan = await this.prisma.emergencyPlan.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Plan de emergencia no encontrado');
    return plan;
  }

  async create(dto: CreateEmergencyPlanDto, changedBy?: string) {
    const plan = await this.prisma.emergencyPlan.create({
      data: {
        title: dto.title,
        description: dto.description,
        emergencyType: dto.emergencyType,
        severity: dto.severity,
        procedures: dto.procedures,
        checklist: this.normalizeChecklist(dto.checklist),
        status: (dto.status as EmergencyPlanStatus) ?? EmergencyPlanStatus.DRAFT,
        companyId: dto.companyId,
        version: 1,
      },
      include: PLAN_INCLUDE,
    });
    await this.snapshotVersion(plan.id, changedBy);
    return plan;
  }

  async update(id: string, dto: UpdateEmergencyPlanDto, changedBy?: string) {
    const current = await this.findOne(id);

    const data: Prisma.EmergencyPlanUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.emergencyType !== undefined) data.emergencyType = dto.emergencyType;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.procedures !== undefined) data.procedures = dto.procedures;
    if (dto.checklist !== undefined) data.checklist = this.normalizeChecklist(dto.checklist);
    if (dto.status !== undefined) data.status = dto.status as EmergencyPlanStatus;
    if (dto.companyId !== undefined) data.company = { connect: { id: dto.companyId } };

    const contentChanged =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.emergencyType !== undefined ||
      dto.severity !== undefined ||
      dto.procedures !== undefined ||
      dto.checklist !== undefined ||
      dto.status !== undefined;

    if (contentChanged) {
      data.version = current.version + 1;
    }

    const plan = await this.prisma.emergencyPlan.update({
      where: { id },
      data,
      include: PLAN_INCLUDE,
    });

    if (contentChanged) {
      await this.snapshotVersion(plan.id, changedBy);
    }

    return plan;
  }

  async addAttachment(
    planId: string,
    payload: { name: string; fileUrl: string; mimeType?: string; sizeBytes?: number },
  ) {
    await this.findOne(planId);
    return this.prisma.emergencyPlanAttachment.create({
      data: {
        planId,
        name: payload.name,
        fileUrl: payload.fileUrl,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
      },
    });
  }

  async removeAttachment(planId: string, attachmentId: string) {
    const att = await this.prisma.emergencyPlanAttachment.findFirst({
      where: { id: attachmentId, planId },
    });
    if (!att) throw new NotFoundException('Adjunto no encontrado');
    return this.prisma.emergencyPlanAttachment.delete({ where: { id: attachmentId } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.emergencyPlan.delete({ where: { id } });
  }
}
