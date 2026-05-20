import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  EquipmentStatus,
  InventoryAuditItemKind,
  InventoryAuditItemResult,
  InventoryAuditStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryAuditDto } from './dto/create-inventory-audit.dto';
import { VerifyAuditItemDto } from './dto/verify-audit-item.dto';
import { CloseInventoryAuditDto } from './dto/close-inventory-audit.dto';

const USER_SELECT = { id: true, firstName: true, lastName: true, role: true };

const AUDIT_INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  auditor: { select: USER_SELECT },
  items: {
    orderBy: [{ kind: 'asc' as const }, { expectedLabel: 'asc' as const }],
    include: {
      vehicle: { select: { id: true, patent: true, brand: true, model: true, type: true, status: true } },
      equipment: { select: { id: true, code: true, name: true, category: true, status: true, quantity: true } },
    },
  },
} satisfies Prisma.InventoryAuditInclude;

@Injectable()
export class InventoryAuditsService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;
    const last = await this.prisma.inventoryAudit.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    });
    const n = last ? parseInt(last.code.replace(prefix, ''), 10) + 1 : 1;
    return `${prefix}${String(n).padStart(3, '0')}`;
  }

  private computeResult(
    found: boolean,
    expectedStatus: EquipmentStatus | null | undefined,
    expectedQty: number,
    physicalStatus?: EquipmentStatus,
    physicalQty?: number,
    forced?: InventoryAuditItemResult,
  ): InventoryAuditItemResult {
    if (forced && forced !== InventoryAuditItemResult.PENDIENTE) return forced;
    if (!found) return InventoryAuditItemResult.NO_ENCONTRADO;
    const statusDiff = physicalStatus && expectedStatus && physicalStatus !== expectedStatus;
    const qtyDiff = physicalQty != null && physicalQty !== expectedQty;
    if (statusDiff || qtyDiff) return InventoryAuditItemResult.DIFERENCIA;
    return InventoryAuditItemResult.CONFORME;
  }

  private buildSummary(items: { result: InventoryAuditItemResult; kind: InventoryAuditItemKind }[]) {
    const total = items.length;
    const verified = items.filter((i) => i.result !== InventoryAuditItemResult.PENDIENTE).length;
    const conforme = items.filter((i) => i.result === InventoryAuditItemResult.CONFORME).length;
    const noEncontrado = items.filter((i) => i.result === InventoryAuditItemResult.NO_ENCONTRADO).length;
    const diferencia = items.filter((i) => i.result === InventoryAuditItemResult.DIFERENCIA).length;
    const observacion = items.filter((i) => i.result === InventoryAuditItemResult.OBSERVACION).length;
    const vehiculos = items.filter((i) => i.kind === InventoryAuditItemKind.VEHICULO).length;
    const equipos = items.filter((i) => i.kind === InventoryAuditItemKind.EQUIPO).length;
    return {
      total,
      verified,
      pending: total - verified,
      conforme,
      noEncontrado,
      diferencia,
      observacion,
      vehiculos,
      equipos,
      progressPct: total ? Math.round((verified / total) * 100) : 0,
    };
  }

  async create(dto: CreateInventoryAuditDto, auditorId?: string) {
    const includeVehicles = dto.includeVehicles !== false;
    const includeEquipment = dto.includeEquipment !== false;
    if (!includeVehicles && !includeEquipment) {
      throw new BadRequestException('Debe incluir vehículos y/o equipamiento');
    }

    const [vehicles, equipment] = await Promise.all([
      includeVehicles
        ? this.prisma.vehicle.findMany({ where: { companyId: dto.companyId }, orderBy: { patent: 'asc' } })
        : [],
      includeEquipment
        ? this.prisma.equipment.findMany({ where: { companyId: dto.companyId }, orderBy: { code: 'asc' } })
        : [],
    ]);

    if (!vehicles.length && !equipment.length) {
      throw new BadRequestException('No hay ítems de inventario para auditar en esta compañía');
    }

    const code = await this.nextCode(dto.companyId);
    const itemsData: Prisma.InventoryAuditItemCreateWithoutAuditInput[] = [
      ...vehicles.map((v) => ({
        kind: InventoryAuditItemKind.VEHICULO,
        vehicleId: v.id,
        expectedLabel: `${v.patent} — ${v.brand} ${v.model}`,
        expectedStatus: v.status,
        expectedQty: 1,
      })),
      ...equipment.map((e) => ({
        kind: InventoryAuditItemKind.EQUIPO,
        equipmentId: e.id,
        expectedLabel: `${e.code} — ${e.name}`,
        expectedStatus: e.status,
        expectedQty: e.quantity ?? 1,
      })),
    ];

    return this.prisma.inventoryAudit.create({
      data: {
        code,
        title: dto.title?.trim() || `Auditoría física ${code}`,
        companyId: dto.companyId,
        auditorId: auditorId ?? undefined,
        status: InventoryAuditStatus.BORRADOR,
        items: { create: itemsData },
      },
      include: AUDIT_INCLUDE,
    });
  }

  async findAll(companyId?: string, status?: InventoryAuditStatus) {
    const audits = await this.prisma.inventoryAudit.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        company: { select: { id: true, name: true, number: true } },
        auditor: { select: USER_SELECT },
        _count: { select: { items: true } },
        items: { select: { result: true, kind: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return audits.map((a) => ({
      ...a,
      summary: this.buildSummary(a.items),
      items: undefined,
    }));
  }

  async findById(id: string) {
    const audit = await this.prisma.inventoryAudit.findUnique({
      where: { id },
      include: AUDIT_INCLUDE,
    });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    return { ...audit, summary: this.buildSummary(audit.items) };
  }

  async start(id: string) {
    const audit = await this.prisma.inventoryAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    if (audit.status === InventoryAuditStatus.CERRADA) {
      throw new BadRequestException('La auditoría ya está cerrada');
    }
    if (audit.status === InventoryAuditStatus.CANCELADA) {
      throw new BadRequestException('La auditoría fue cancelada');
    }

    await this.prisma.inventoryAudit.update({
      where: { id },
      data: {
        status: InventoryAuditStatus.EN_PROCESO,
        startedAt: audit.startedAt ?? new Date(),
      },
    });
    return this.findById(id);
  }

  async verifyItem(auditId: string, itemId: string, dto: VerifyAuditItemDto) {
    const audit = await this.prisma.inventoryAudit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    if (audit.status === InventoryAuditStatus.CERRADA) {
      throw new BadRequestException('No se puede modificar una auditoría cerrada');
    }
    if (audit.status === InventoryAuditStatus.CANCELADA) {
      throw new BadRequestException('La auditoría fue cancelada');
    }

    const item = await this.prisma.inventoryAuditItem.findFirst({
      where: { id: itemId, auditId },
    });
    if (!item) throw new NotFoundException('Ítem no encontrado');

    const physicalStatus = dto.physicalStatus ?? item.expectedStatus ?? undefined;
    const physicalQty = dto.physicalQty ?? (dto.found ? item.expectedQty : 0);
    const result = this.computeResult(
      dto.found,
      item.expectedStatus,
      item.expectedQty,
      physicalStatus,
      physicalQty,
      dto.result,
    );

    if (audit.status === InventoryAuditStatus.BORRADOR) {
      await this.prisma.inventoryAudit.update({
        where: { id: auditId },
        data: { status: InventoryAuditStatus.EN_PROCESO, startedAt: new Date() },
      });
    }

    await this.prisma.inventoryAuditItem.update({
      where: { id: itemId },
      data: {
        found: dto.found,
        physicalStatus: dto.found ? physicalStatus : null,
        physicalQty: dto.found ? physicalQty : 0,
        result: dto.observations?.trim() && result === InventoryAuditItemResult.CONFORME
          ? InventoryAuditItemResult.OBSERVACION
          : result,
        observations: dto.observations?.trim() || null,
        verifiedAt: new Date(),
      },
    });

    return this.findById(auditId);
  }

  async close(id: string, dto: CloseInventoryAuditDto) {
    const audit = await this.prisma.inventoryAudit.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    if (audit.status === InventoryAuditStatus.CERRADA) {
      throw new BadRequestException('La auditoría ya está cerrada');
    }
    if (audit.status === InventoryAuditStatus.CANCELADA) {
      throw new BadRequestException('La auditoría fue cancelada');
    }

    const pending = audit.items.filter((i) => i.result === InventoryAuditItemResult.PENDIENTE).length;
    if (pending > 0) {
      throw new BadRequestException(`Quedan ${pending} ítems sin verificar`);
    }

    await this.prisma.inventoryAudit.update({
      where: { id },
      data: {
        status: InventoryAuditStatus.CERRADA,
        completedAt: new Date(),
        closingNotes: dto.closingNotes?.trim() || null,
      },
    });
    return this.findById(id);
  }

  async cancel(id: string) {
    const audit = await this.prisma.inventoryAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    if (audit.status === InventoryAuditStatus.CERRADA) {
      throw new BadRequestException('No se puede cancelar una auditoría cerrada');
    }
    await this.prisma.inventoryAudit.update({
      where: { id },
      data: { status: InventoryAuditStatus.CANCELADA },
    });
    return this.findById(id);
  }

  async remove(id: string) {
    const audit = await this.prisma.inventoryAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Auditoría no encontrada');
    if (audit.status !== InventoryAuditStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden eliminar auditorías en borrador');
    }
    await this.prisma.inventoryAudit.delete({ where: { id } });
    return { ok: true };
  }
}
