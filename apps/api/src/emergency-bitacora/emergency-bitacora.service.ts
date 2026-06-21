import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmergencyBitacoraSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmergencyBitacoraDto } from './dto/create-emergency-bitacora.dto';
import { UpdateEmergencyBitacoraDto } from './dto/update-emergency-bitacora.dto';
import { FinalizePublicEmergencyDto } from './dto/finalize-public-emergency.dto';

const INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  incident: {
    select: {
      id: true, code: true, type: true, address: true, dispatchedAt: true, closedAt: true,
    },
  },
  author: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.EmergencyBitacoraEntryInclude;

@Injectable()
export class EmergencyBitacoraService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    companyId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const where: Prisma.EmergencyBitacoraEntryWhereInput = {};
    if (params.companyId) where.companyId = params.companyId;
    if (params.from || params.to) {
      where.occurredAt = {};
      if (params.from) where.occurredAt.gte = new Date(params.from);
      if (params.to) where.occurredAt.lte = new Date(params.to);
    }

    return this.prisma.emergencyBitacoraEntry.findMany({
      where,
      include: INCLUDE,
      orderBy: { occurredAt: 'desc' },
      take: params.limit ?? 100,
    });
  }

  async findById(id: string) {
    const row = await this.prisma.emergencyBitacoraEntry.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) throw new NotFoundException('Entrada de bitácora no encontrada');
    return row;
  }

  async create(dto: CreateEmergencyBitacoraDto, authorId?: string) {
    await this.assertCompany(dto.companyId);
    if (dto.incidentId) {
      await this.assertIncidentForCompany(dto.incidentId, dto.companyId);
      const existing = await this.prisma.emergencyBitacoraEntry.findUnique({
        where: { incidentId: dto.incidentId },
      });
      if (existing) {
        throw new BadRequestException('Ya existe bitácora para esta emergencia');
      }
    }

    return this.prisma.emergencyBitacoraEntry.create({
      data: {
        companyId: dto.companyId,
        incidentId: dto.incidentId,
        title: dto.title.trim(),
        emergencyType: dto.emergencyType?.trim(),
        address: dto.address?.trim(),
        occurredAt: new Date(dto.occurredAt),
        summary: dto.summary.trim(),
        actionsTaken: dto.actionsTaken?.trim(),
        personnelNotes: dto.personnelNotes?.trim(),
        vehicleNotes: dto.vehicleNotes?.trim(),
        outcome: dto.outcome?.trim(),
        observations: dto.observations?.trim(),
        source: dto.source ?? EmergencyBitacoraSource.MANUAL,
        authorId,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateEmergencyBitacoraDto) {
    await this.findById(id);
    return this.prisma.emergencyBitacoraEntry.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        emergencyType: dto.emergencyType?.trim(),
        address: dto.address?.trim(),
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        summary: dto.summary?.trim(),
        actionsTaken: dto.actionsTaken?.trim(),
        personnelNotes: dto.personnelNotes?.trim(),
        vehicleNotes: dto.vehicleNotes?.trim(),
        outcome: dto.outcome?.trim(),
        observations: dto.observations?.trim(),
      },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.emergencyBitacoraEntry.delete({ where: { id } });
  }

  async finalizeFromPublic(slug: string, dto: FinalizePublicEmergencyDto) {
    const { company, incident } = await this.resolvePublicIncident(slug, dto.incidentId);
    const vehicleNotes = this.vehicleNotesForCompany(incident, company.id);

    const now = new Date();
    const existing = await this.prisma.emergencyBitacoraEntry.findUnique({
      where: { incidentId: incident.id },
    });

    const [bitacora] = await this.prisma.$transaction([
      existing
        ? this.prisma.emergencyBitacoraEntry.update({
            where: { id: existing.id },
            data: {
              summary: dto.summary.trim(),
              actionsTaken: dto.actionsTaken?.trim(),
              outcome: dto.outcome?.trim(),
              observations: dto.observations?.trim(),
              vehicleNotes: vehicleNotes || existing.vehicleNotes,
            },
            include: INCLUDE,
          })
        : this.prisma.emergencyBitacoraEntry.create({
            data: {
              companyId: company.id,
              incidentId: incident.id,
              title: `${incident.type} — ${incident.code}`,
              emergencyType: incident.type,
              address: incident.address,
              occurredAt: incident.dispatchedAt,
              summary: dto.summary.trim(),
              actionsTaken: dto.actionsTaken?.trim(),
              outcome: dto.outcome?.trim(),
              observations: dto.observations?.trim(),
              vehicleNotes: vehicleNotes || undefined,
              source: EmergencyBitacoraSource.SALA_MAQUINAS,
            },
            include: INCLUDE,
          }),
      this.prisma.incident.update({
        where: { id: incident.id },
        data: { closedAt: incident.closedAt ?? now },
      }),
    ]);

    return bitacora;
  }

  async closeFromPublic(slug: string, incidentId: string) {
    const { incident } = await this.resolvePublicIncident(slug, incidentId);
    const now = new Date();
    await this.prisma.incident.update({
      where: { id: incident.id },
      data: { closedAt: incident.closedAt ?? now },
    });
    return {
      incidentId: incident.id,
      closedAt: incident.closedAt ?? now,
      hasBitacora: !!incident.bitacoraEntry,
    };
  }

  private async resolvePublicIncident(slug: string, incidentId: string) {
    const company = await this.prisma.company.findFirst({
      where: { dispatchSlug: slug, dispatchPublicEnabled: true, isActive: true },
    });
    if (!company) throw new NotFoundException('Central pública no disponible');

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        vehicles: { include: { vehicle: { select: { patent: true, companyId: true } } } },
        bitacoraEntry: { select: { id: true } },
      },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada');

    const involvesCompany =
      incident.companyId === company.id ||
      incident.vehicles.some((v) => v.vehicle.companyId === company.id);
    if (!involvesCompany) {
      throw new BadRequestException('Esta emergencia no corresponde a la compañía');
    }

    return { company, incident };
  }

  private vehicleNotesForCompany(
    incident: {
      companyId: string;
      vehicles: { vehicle: { patent: string; companyId: string } }[];
    },
    companyId: string,
  ) {
    return incident.vehicles
      .filter((v) => incident.companyId === companyId || v.vehicle.companyId === companyId)
      .map((v) => v.vehicle.patent)
      .join(', ');
  }

  private async assertCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Compañía no encontrada');
  }

  private async assertIncidentForCompany(incidentId: string, companyId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { vehicles: { include: { vehicle: { select: { companyId: true } } } } },
    });
    if (!incident) throw new NotFoundException('Emergencia no encontrada');
    const ok =
      incident.companyId === companyId ||
      incident.vehicles.some((v) => v.vehicle.companyId === companyId);
    if (!ok) throw new BadRequestException('La emergencia no pertenece a esta compañía');
  }
}
