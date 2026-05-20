import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

const INCLUDE = {
  vehicle: { select: { id: true, patent: true, brand: true, model: true, companyId: true } },
};

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(vehicleId?: string, companyId?: string) {
    return this.prisma.maintenance.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(companyId ? { vehicle: { companyId } } : {}),
      },
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  async findById(id: string) {
    const m = await this.prisma.maintenance.findUnique({ where: { id }, include: INCLUDE });
    if (!m) throw new NotFoundException('Mantención no encontrada');
    return m;
  }

  async create(dto: CreateMaintenanceDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    const m = await this.prisma.maintenance.create({ data: dto, include: INCLUDE });

    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: { lastMaintenanceAt: new Date(dto.date) },
    });

    return m;
  }

  async update(id: string, dto: UpdateMaintenanceDto) {
    await this.findById(id);
    return this.prisma.maintenance.update({ where: { id }, data: dto, include: INCLUDE });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.maintenance.delete({ where: { id } });
  }

  async getStats(companyId?: string) {
    const where = companyId ? { vehicle: { companyId } } : {};
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, thisYear, totalCost, byType] = await Promise.all([
      this.prisma.maintenance.count({ where }),
      this.prisma.maintenance.count({ where: { ...where, date: { gte: startOfYear } } }),
      this.prisma.maintenance.aggregate({ where, _sum: { cost: true } }),
      this.prisma.maintenance.groupBy({ by: ['type'], where, _count: { id: true }, _sum: { cost: true } }),
    ]);

    return {
      total,
      thisYear,
      totalCost: totalCost._sum.cost ?? 0,
      byType: byType.map(b => ({ type: b.type, count: b._count.id, cost: b._sum.cost ?? 0 })),
    };
  }
}
