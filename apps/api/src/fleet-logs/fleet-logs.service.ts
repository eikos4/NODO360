import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FleetLogType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFleetLogDto } from './dto/create-fleet-log.dto';
import { UpdateFleetLogDto } from './dto/update-fleet-log.dto';

const USER_SELECT = { id: true, firstName: true, lastName: true, role: true };
const VEHICLE_SELECT = {
  id: true, patent: true, brand: true, model: true, type: true, status: true, kilometers: true, companyId: true,
};

const LOG_INCLUDE = {
  vehicle: { select: VEHICLE_SELECT },
  company: { select: { id: true, name: true, number: true } },
  driver: { select: USER_SELECT },
  registeredBy: { select: USER_SELECT },
} satisfies Prisma.FleetLogInclude;

@Injectable()
export class FleetLogsService {
  constructor(private prisma: PrismaService) {}

  private async syncVehicleKm(vehicleId: string, odometerKm: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle && odometerKm > vehicle.kilometers) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { kilometers: odometerKm },
      });
    }
  }

  async findAll(params: {
    companyId?: string;
    vehicleId?: string;
    type?: FleetLogType;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const dateFilter: Prisma.DateTimeFilter | undefined =
      params.from || params.to
        ? {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(params.to) } : {}),
          }
        : undefined;

    return this.prisma.fleetLog.findMany({
      where: {
        ...(params.companyId ? { companyId: params.companyId } : {}),
        ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
        ...(params.type ? { type: params.type } : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      include: LOG_INCLUDE,
      orderBy: { date: 'desc' },
      take: params.limit ?? 200,
    });
  }

  async findById(id: string) {
    const log = await this.prisma.fleetLog.findUnique({
      where: { id },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('Registro no encontrado');
    return log;
  }

  async getConsumptionChart(companyId?: string, vehicleId?: string) {
    const logs = await this.prisma.fleetLog.findMany({
      where: {
        type: FleetLogType.COMBUSTIBLE,
        ...(companyId ? { companyId } : {}),
        ...(vehicleId ? { vehicleId } : {}),
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        vehicleId: true,
        odometerKm: true,
        fuelLiters: true,
        vehicle: { select: { patent: true, brand: true } },
      },
    });

    const byVehicle = new Map<string, typeof logs>();
    for (const log of logs) {
      const arr = byVehicle.get(log.vehicleId) ?? [];
      arr.push(log);
      byVehicle.set(log.vehicleId, arr);
    }

    const series: {
      date: string;
      vehicleId: string;
      patent: string;
      consumptionLper100km: number;
      kmSegment: number;
      liters: number;
    }[] = [];

    const summary: {
      vehicleId: string;
      patent: string;
      avgConsumptionLper100km: number | null;
      segments: number;
    }[] = [];

    for (const [vid, vehicleLogs] of byVehicle.entries()) {
      const sorted = [...vehicleLogs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const segmentConsumptions: number[] = [];

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        const km = cur.odometerKm - prev.odometerKm;
        const liters = cur.fuelLiters ?? 0;
        if (km <= 0 || liters <= 0) continue;

        const consumption = Math.round((liters / km) * 100 * 10) / 10;
        segmentConsumptions.push(consumption);
        series.push({
          date: cur.date.toISOString(),
          vehicleId: vid,
          patent: cur.vehicle?.patent ?? '—',
          consumptionLper100km: consumption,
          kmSegment: km,
          liters: Math.round(liters * 10) / 10,
        });
      }

      const avg =
        segmentConsumptions.length > 0
          ? Math.round(
              (segmentConsumptions.reduce((s, v) => s + v, 0) / segmentConsumptions.length) * 10,
            ) / 10
          : null;

      summary.push({
        vehicleId: vid,
        patent: sorted[0]?.vehicle?.patent ?? '—',
        avgConsumptionLper100km: avg,
        segments: segmentConsumptions.length,
      });
    }

    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    summary.sort((a, b) => (a.patent > b.patent ? 1 : -1));

    return { series, summary, totalSegments: series.length };
  }

  async getStats(companyId?: string, vehicleId?: string) {
    const where: Prisma.FleetLogWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(vehicleId ? { vehicleId } : {}),
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [logs, monthFuel] = await Promise.all([
      this.prisma.fleetLog.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
          id: true, type: true, date: true, vehicleId: true,
          odometerKm: true, fuelLiters: true, fuelCost: true,
          vehicle: { select: { patent: true } },
        },
      }),
      this.prisma.fleetLog.findMany({
        where: { ...where, type: FleetLogType.COMBUSTIBLE, date: { gte: startOfMonth } },
        select: { fuelLiters: true, fuelCost: true, odometerKm: true, vehicleId: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const fuelLogs = logs.filter((l) => l.type === FleetLogType.COMBUSTIBLE);
    const totalLiters = fuelLogs.reduce((s, l) => s + (l.fuelLiters ?? 0), 0);
    const totalCost = fuelLogs.reduce((s, l) => s + (l.fuelCost ?? 0), 0);
    const monthLiters = monthFuel.reduce((s, l) => s + (l.fuelLiters ?? 0), 0);
    const monthCost = monthFuel.reduce((s, l) => s + (l.fuelCost ?? 0), 0);

    let kmTraveled = 0;
    if (vehicleId && fuelLogs.length >= 2) {
      const sorted = [...fuelLogs].sort((a, b) => a.odometerKm - b.odometerKm);
      kmTraveled = sorted[sorted.length - 1].odometerKm - sorted[0].odometerKm;
    }

    const avgConsumption =
      kmTraveled > 0 && totalLiters > 0
        ? Math.round((totalLiters / kmTraveled) * 100 * 10) / 10
        : null;

    const byVehicle = new Map<string, { patent: string; liters: number; cost: number; logs: number }>();
    for (const l of fuelLogs) {
      const key = l.vehicleId;
      const cur = byVehicle.get(key) ?? {
        patent: (l as { vehicle?: { patent: string } }).vehicle?.patent ?? '—',
        liters: 0,
        cost: 0,
        logs: 0,
      };
      cur.liters += l.fuelLiters ?? 0;
      cur.cost += l.fuelCost ?? 0;
      cur.logs += 1;
      byVehicle.set(key, cur);
    }

    return {
      totalLogs: logs.length,
      fuelLogs: fuelLogs.length,
      serviceLogs: logs.filter((l) => l.type === FleetLogType.SERVICIO).length,
      operationLogs: logs.filter((l) => l.type === FleetLogType.OPERACION).length,
      totalLiters: Math.round(totalLiters * 10) / 10,
      totalCost: Math.round(totalCost),
      monthLiters: Math.round(monthLiters * 10) / 10,
      monthCost: Math.round(monthCost),
      kmTraveled,
      avgConsumptionLper100km: avgConsumption,
      byVehicle: Array.from(byVehicle.entries()).map(([vehicleId, v]) => ({
        vehicleId,
        ...v,
      })),
    };
  }

  async create(dto: CreateFleetLogDto, registeredById: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    if (dto.type === FleetLogType.COMBUSTIBLE && (dto.fuelLiters == null || dto.fuelLiters <= 0)) {
      throw new BadRequestException('Indique litros cargados para registro de combustible');
    }

    if (dto.odometerKm < vehicle.kilometers - 500) {
      throw new BadRequestException(
        `El odómetro (${dto.odometerKm} km) es muy inferior al registro actual (${vehicle.kilometers} km)`,
      );
    }

    const log = await this.prisma.fleetLog.create({
      data: {
        type: dto.type,
        date: new Date(dto.date),
        vehicleId: dto.vehicleId,
        companyId: vehicle.companyId,
        driverId: dto.driverId,
        registeredById,
        odometerKm: dto.odometerKm,
        fuelLiters: dto.fuelLiters,
        fuelCost: dto.fuelCost,
        fuelStation: dto.fuelStation?.trim() || null,
        fullTank: dto.fullTank ?? false,
        serviceLabel: dto.serviceLabel?.trim() || null,
        description: dto.description?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: LOG_INCLUDE,
    });

    await this.syncVehicleKm(dto.vehicleId, dto.odometerKm);
    return log;
  }

  async update(id: string, dto: UpdateFleetLogDto) {
    const existing = await this.findById(id);
    const vehicleId = dto.vehicleId ?? existing.vehicleId;
    const odometerKm = dto.odometerKm ?? existing.odometerKm;

    if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!v) throw new NotFoundException('Vehículo no encontrado');
    }

    const log = await this.prisma.fleetLog.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.driverId !== undefined ? { driverId: dto.driverId || null } : {}),
        ...(dto.odometerKm !== undefined ? { odometerKm: dto.odometerKm } : {}),
        ...(dto.fuelLiters !== undefined ? { fuelLiters: dto.fuelLiters } : {}),
        ...(dto.fuelCost !== undefined ? { fuelCost: dto.fuelCost } : {}),
        ...(dto.fuelStation !== undefined ? { fuelStation: dto.fuelStation?.trim() || null } : {}),
        ...(dto.fullTank !== undefined ? { fullTank: dto.fullTank } : {}),
        ...(dto.serviceLabel !== undefined ? { serviceLabel: dto.serviceLabel?.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: LOG_INCLUDE,
    });

    await this.syncVehicleKm(vehicleId, odometerKm);
    return log;
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.fleetLog.delete({ where: { id } });
  }
}
