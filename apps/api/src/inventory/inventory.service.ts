import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Equipment ────────────────────────────────────────────────────────────

  async findAllEquipment(companyId?: string, category?: string) {
    return this.prisma.equipment.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(category ? { category } : {}),
      },
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findEquipmentById(id: string) {
    const eq = await this.prisma.equipment.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true, number: true } } },
    });
    if (!eq) throw new NotFoundException('Equipo no encontrado');
    return eq;
  }

  async createEquipment(dto: CreateEquipmentDto) {
    const exists = await this.prisma.equipment.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Código de equipo '${dto.code}' ya registrado`);
    return this.prisma.equipment.create({ data: dto });
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto) {
    await this.findEquipmentById(id);
    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async deleteEquipment(id: string) {
    await this.findEquipmentById(id);
    return this.prisma.equipment.delete({ where: { id } });
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  async findAllVehicles(companyId?: string) {
    return this.prisma.vehicle.findMany({
      where: companyId ? { companyId } : {},
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: { patent: 'asc' },
    });
  }

  async findVehicleById(id: string) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, number: true } },
        maintenances: { orderBy: { date: 'desc' }, take: 5 },
      },
    });
    if (!v) throw new NotFoundException('Vehículo no encontrado');
    return v;
  }

  async createVehicle(dto: CreateVehicleDto) {
    const exists = await this.prisma.vehicle.findUnique({ where: { patent: dto.patent } });
    if (exists) throw new ConflictException(`Patente '${dto.patent}' ya registrada`);
    const data: any = { ...dto };
    if (dto.lastMaintenanceAt) data.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    if (dto.nextMaintenanceAt) data.nextMaintenanceAt = new Date(dto.nextMaintenanceAt);
    return this.prisma.vehicle.create({ data });
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto) {
    await this.findVehicleById(id);
    const data: any = { ...dto };
    if (dto.lastMaintenanceAt) data.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    if (dto.nextMaintenanceAt) data.nextMaintenanceAt = new Date(dto.nextMaintenanceAt);
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async deleteVehicle(id: string) {
    await this.findVehicleById(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }

  // ─── Alerts / Vencimientos ────────────────────────────────────────────────

  async getAlerts(companyId?: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expiredEquipment, expiringEquipment, overdueVehicles, upcomingVehicles] =
      await Promise.all([
        this.prisma.equipment.findMany({
          where: {
            expiresAt: { lt: now },
            ...(companyId ? { companyId } : {}),
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.equipment.findMany({
          where: {
            expiresAt: { gte: now, lte: in30 },
            ...(companyId ? { companyId } : {}),
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.vehicle.findMany({
          where: {
            nextMaintenanceAt: { lt: now },
            ...(companyId ? { companyId } : {}),
          },
          include: { company: { select: { name: true, number: true } } },
        }),
        this.prisma.vehicle.findMany({
          where: {
            nextMaintenanceAt: { gte: now, lte: in30 },
            ...(companyId ? { companyId } : {}),
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

  async getDashboardStats(companyId?: string) {
    const where = companyId ? { companyId } : {};

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
      this.getAlerts(companyId),
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
