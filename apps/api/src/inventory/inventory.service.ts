import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, companyIdWhere, companyIdsForActor } from '../common/cuerpo-scope';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async scope(actor: Actor, companyId?: string) {
    return companyIdWhere(await companyIdsForActor(this.prisma, actor, companyId));
  }

  // ─── Equipment ────────────────────────────────────────────────────────────

  async findAllEquipment(actor: Actor, companyId?: string, category?: string) {
    const scope = await this.scope(actor, companyId);
    return this.prisma.equipment.findMany({
      where: {
        ...scope,
        ...(category ? { category } : {}),
      },
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findEquipmentById(id: string, actor: Actor) {
    const eq = await this.prisma.equipment.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true, number: true } } },
    });
    if (!eq) throw new NotFoundException('Equipo no encontrado');
    await assertCompanyAccess(this.prisma, actor, eq.companyId);
    return eq;
  }

  async createEquipment(dto: CreateEquipmentDto, actor: Actor) {
    await assertCompanyAccess(this.prisma, actor, dto.companyId);
    const exists = await this.prisma.equipment.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Código de equipo '${dto.code}' ya registrado`);
    return this.prisma.equipment.create({ data: dto });
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto, actor: Actor) {
    const current = await this.findEquipmentById(id, actor);
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);
    else await assertCompanyAccess(this.prisma, actor, current.companyId);
    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async deleteEquipment(id: string, actor: Actor) {
    await this.findEquipmentById(id, actor);
    return this.prisma.equipment.delete({ where: { id } });
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  async findAllVehicles(actor: Actor, companyId?: string) {
    const scope = await this.scope(actor, companyId);
    return this.prisma.vehicle.findMany({
      where: scope,
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { patent: 'asc' },
    });
  }

  async findVehicleById(id: string, actor: Actor) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, number: true } },
        maintenances: { orderBy: { date: 'desc' }, take: 5 },
      },
    });
    if (!v) throw new NotFoundException('Vehículo no encontrado');
    await assertCompanyAccess(this.prisma, actor, v.companyId);
    return v;
  }

  async createVehicle(dto: CreateVehicleDto, actor: Actor) {
    await assertCompanyAccess(this.prisma, actor, dto.companyId);
    const exists = await this.prisma.vehicle.findUnique({ where: { patent: dto.patent } });
    if (exists) throw new ConflictException(`Patente '${dto.patent}' ya registrada`);
    const data: any = { ...dto };
    if (dto.lastMaintenanceAt) data.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    if (dto.nextMaintenanceAt) data.nextMaintenanceAt = new Date(dto.nextMaintenanceAt);
    return this.prisma.vehicle.create({ data });
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto, actor: Actor) {
    const current = await this.findVehicleById(id, actor);
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);
    else await assertCompanyAccess(this.prisma, actor, current.companyId);
    const data: any = { ...dto };
    if (dto.lastMaintenanceAt) data.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    if (dto.nextMaintenanceAt) data.nextMaintenanceAt = new Date(dto.nextMaintenanceAt);
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async deleteVehicle(id: string, actor: Actor) {
    await this.findVehicleById(id, actor);
    return this.prisma.vehicle.delete({ where: { id } });
  }

  // ─── Alerts / Vencimientos ────────────────────────────────────────────────

  async getAlerts(actor: Actor, companyId?: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const scope = await this.scope(actor, companyId);

    const [expiredEquipment, expiringEquipment, overdueVehicles, upcomingVehicles] =
      await Promise.all([
        this.prisma.equipment.findMany({
          where: {
            expiresAt: { lt: now },
            ...scope,
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.equipment.findMany({
          where: {
            expiresAt: { gte: now, lte: in30 },
            ...scope,
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.vehicle.findMany({
          where: {
            nextMaintenanceAt: { lt: now },
            ...scope,
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.vehicle.findMany({
          where: {
            nextMaintenanceAt: { gte: now, lte: in30 },
            ...scope,
          },
          include: { company: { select: { name: true, number: true } } },
        }),
      ]);

    return {
      expired: {
        equipment: expiredEquipment,
        vehicles: overdueVehicles,
      },
      expiringSoon: {
        equipment: expiringEquipment,
        vehicles: upcomingVehicles,
      },
      summary: {
        totalExpired: expiredEquipment.length + overdueVehicles.length,
        totalExpiringSoon: expiringEquipment.length + upcomingVehicles.length,
      },
    };
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(actor: Actor, companyId?: string) {
    const where = await this.scope(actor, companyId);

    const [
      totalCompanies,
      totalUsers,
      totalVehicles,
      operativeVehicles,
      totalEquipment,
      operativeEquipment,
      alerts,
    ] = await Promise.all([
      this.prisma.company.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, ...where } }),
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count({ where: { ...where, status: 'OPERATIVO' } }),
      this.prisma.equipment.count({ where }),
      this.prisma.equipment.count({ where: { ...where, status: 'OPERATIVO' } }),
      this.getAlerts(actor, companyId),
    ]);

    return {
      companies: totalCompanies,
      users: totalUsers,
      vehicles: { total: totalVehicles, operative: operativeVehicles },
      equipment: { total: totalEquipment, operative: operativeEquipment },
      alerts: alerts.summary,
    };
  }
}
