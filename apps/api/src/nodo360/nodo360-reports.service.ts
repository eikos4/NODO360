import { Injectable } from '@nestjs/common';
import { FleetLogType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type FleetLogRow = {
  companyId: string;
  vehicleId: string;
  type: FleetLogType;
  date: Date;
  odometerKm: number;
  fuelLiters: number | null;
  fuelCost: number | null;
  vehicle?: { patent: string };
};

@Injectable()
export class Nodo360ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReports(year?: number, companyId?: string) {
    const y = year ?? new Date().getFullYear();
    const now = new Date();
    const startOfYear = new Date(y, 0, 1);
    const endOfYear = new Date(y + 1, 0, 1);
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const companies = await this.prisma.company.findMany({
      where: { isActive: true, ...(companyId ? { id: companyId } : {}) },
      orderBy: { number: 'asc' },
    });

    const companyIds = companies.map((c) => c.id);
    const whereCompany = companyIds.length ? { companyId: { in: companyIds } } : {};

    const [
      users,
      vehicles,
      equipment,
      incidents,
      budgets,
      purchases,
      contributions,
      hydrants,
      maintenances,
      documents,
      emergencyPlans,
      guardLogs,
      guardEntries,
      fleetLogs,
      inventoryAudits,
      certifications,
      drills,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId: { in: companyIds }, role: { not: 'SUPER_ADMIN' } },
        select: { id: true, companyId: true, role: true, isActive: true },
      }),
      this.prisma.vehicle.findMany({
        where: whereCompany,
        select: { id: true, companyId: true, status: true, type: true, nextMaintenanceAt: true, patent: true },
      }),
      this.prisma.equipment.findMany({
        where: whereCompany,
        select: { id: true, companyId: true, status: true, category: true, quantity: true, expiresAt: true },
      }),
      this.prisma.incident.findMany({
        where: { ...whereCompany, dispatchedAt: { gte: startOfYear, lt: endOfYear } },
        select: {
          id: true, companyId: true, type: true, code: true, address: true,
          dispatchedAt: true, closedAt: true, dispatchSource: true, emergencyPlanId: true,
        },
        orderBy: { dispatchedAt: 'desc' },
      }),
      this.prisma.budget.findMany({
        where: { ...whereCompany, year: y },
        select: { companyId: true, category: true, planned: true, executed: true },
      }),
      this.prisma.purchase.findMany({
        where: { ...whereCompany, requestedAt: { gte: startOfYear, lt: endOfYear } },
        select: { companyId: true, status: true, totalAmount: true, requestedAt: true },
      }),
      this.prisma.socialContribution.findMany({
        where: { ...whereCompany, paidAt: { gte: startOfYear, lt: endOfYear }, status: { not: 'EXONERADO' } },
        select: { companyId: true, amount: true, paidAt: true },
      }),
      this.prisma.hydrant.findMany({
        where: whereCompany,
        select: { companyId: true, status: true },
      }),
      this.prisma.maintenance.findMany({
        where: { vehicle: whereCompany, date: { gte: startOfYear, lt: endOfYear } },
        select: { cost: true, date: true, vehicle: { select: { companyId: true, patent: true } } },
      }),
      this.prisma.document.findMany({
        where: whereCompany,
        select: { companyId: true, category: true, expiresAt: true },
      }),
      this.prisma.emergencyPlan.findMany({
        where: whereCompany,
        select: { companyId: true, severity: true, emergencyType: true, status: true },
      }),
      this.prisma.guardLog.findMany({
        where: { ...whereCompany, date: { gte: startOfYear, lt: endOfYear } },
        include: { _count: { select: { entries: true, handovers: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.guardLogEntry.findMany({
        where: {
          log: { companyId: { in: companyIds } },
          createdAt: { gte: startOfYear, lt: endOfYear },
        },
        select: { id: true, type: true, createdAt: true, title: true, log: { select: { companyId: true } } },
      }),
      this.prisma.fleetLog.findMany({
        where: { ...whereCompany, date: { gte: startOfYear, lt: endOfYear } },
        include: { vehicle: { select: { patent: true, companyId: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.inventoryAudit.findMany({
        where: {
          ...whereCompany,
          OR: [
            { createdAt: { gte: startOfYear, lt: endOfYear } },
            { completedAt: { gte: startOfYear, lt: endOfYear } },
          ],
        },
        include: { items: { select: { result: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberCertification.findMany({
        where: whereCompany,
        select: { id: true, companyId: true, category: true, name: true, expiresAt: true, userId: true },
      }),
      this.prisma.drill.findMany({
        where: { companyId: { in: companyIds }, scheduledAt: { gte: startOfYear, lt: endOfYear } },
        select: { companyId: true, status: true, scheduledAt: true, title: true },
      }),
    ]);

    const allIncidentsHistory = companyId
      ? await this.prisma.incident.findMany({
          where: { companyId },
          select: { type: true, dispatchedAt: true, closedAt: true, emergencyPlanId: true },
        })
      : await this.prisma.incident.findMany({
          where: whereCompany,
          select: { type: true, dispatchedAt: true, closedAt: true, companyId: true, emergencyPlanId: true },
        });

    const companyReports = companies.map((company) => {
      const cid = company.id;
      const cUsers = users.filter((u) => u.companyId === cid);
      const cVehicles = vehicles.filter((v) => v.companyId === cid);
      const cEquip = equipment.filter((e) => e.companyId === cid);
      const cIncYear = incidents.filter((i) => i.companyId === cid);
      const cIncAll = allIncidentsHistory.filter((i: any) => !i.companyId || i.companyId === cid);
      const cBudgets = budgets.filter((b) => b.companyId === cid);
      const cPurchases = purchases.filter((p) => p.companyId === cid);
      const cContrib = contributions.filter((c) => c.companyId === cid);
      const cHydrants = hydrants.filter((h) => h.companyId === cid);
      const cMaint = maintenances.filter((m) => m.vehicle.companyId === cid);
      const cDocs = documents.filter((d) => d.companyId === cid);
      const cPlans = emergencyPlans.filter((p) => p.companyId === cid);
      const cGuardLogs = guardLogs.filter((g) => g.companyId === cid);
      const cGuardEntries = guardEntries.filter((e) => e.log.companyId === cid);
      const cFleetLogs = fleetLogs.filter((f) => f.companyId === cid) as FleetLogRow[];
      const cAudits = inventoryAudits.filter((a) => a.companyId === cid);
      const cCerts = certifications.filter((c) => c.companyId === cid);
      const cDrills = drills.filter((d) => d.companyId === cid);

      const totalPlanned = cBudgets.reduce((s, b) => s + b.planned, 0);
      const totalExecuted = cBudgets.reduce((s, b) => s + b.executed, 0);
      const vTotal = cVehicles.length;
      const vOp = cVehicles.filter((v) => v.status === 'OPERATIVO').length;

      const certsExpired = cCerts.filter((c) => c.expiresAt && c.expiresAt < now).length;
      const certsSoon = cCerts.filter(
        (c) => c.expiresAt && c.expiresAt >= now && c.expiresAt <= in30days,
      ).length;

      const auditDiscrepancies = cAudits.reduce(
        (s, a) => s + a.items.filter((i) => i.result === 'DIFERENCIA' || i.result === 'NO_ENCONTRADO').length,
        0,
      );

      const fleetFuel = this.computeFleetFuelStats(cFleetLogs);
      const alerts =
        cVehicles.filter((v) => v.nextMaintenanceAt && v.nextMaintenanceAt < now).length +
        cVehicles.filter((v) => v.nextMaintenanceAt && v.nextMaintenanceAt >= now && v.nextMaintenanceAt <= in30days).length +
        cEquip.filter((e) => e.expiresAt && e.expiresAt < now).length +
        cEquip.filter((e) => e.expiresAt && e.expiresAt >= now && e.expiresAt <= in30days).length +
        cDocs.filter((d) => d.expiresAt && d.expiresAt < now).length +
        certsExpired +
        certsSoon;

      return {
        id: company.id,
        number: company.number,
        name: company.name,
        city: company.city,
        region: company.region,
        snapshot: {
          personnel: { total: cUsers.length, active: cUsers.filter((u) => u.isActive).length },
          fleet: {
            total: vTotal,
            operativo: vOp,
            enReparacion: cVehicles.filter((v) => v.status === 'EN_REPARACION').length,
            fueraDeServicio: cVehicles.filter((v) => v.status === 'FUERA_DE_SERVICIO').length,
            operativeRate: vTotal > 0 ? Math.round((vOp / vTotal) * 100) : 0,
          },
          equipment: {
            total: cEquip.length,
            operativo: cEquip.filter((e) => e.status === 'OPERATIVO').length,
            expired: cEquip.filter((e) => e.expiresAt && e.expiresAt < now).length,
          },
          incidents: {
            year: cIncYear.length,
            open: cIncAll.filter((i) => !i.closedAt).length,
            thisMonth: cIncAll.filter((i) => {
              const d = new Date(i.dispatchedAt);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,
            withPlan: cIncYear.filter((i) => i.emergencyPlanId).length,
            fromBotonera: cIncYear.filter((i) => i.dispatchSource === 'BOTONERA').length,
          },
          finance: {
            planned: totalPlanned,
            executed: totalExecuted,
            execRate: totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0,
          },
          social: {
            collected: cContrib.reduce((s, c) => s + c.amount, 0),
            payments: cContrib.length,
          },
          hydrants: {
            total: cHydrants.length,
            operativo: cHydrants.filter((h) => h.status === 'OPERATIVO').length,
          },
          purchases: {
            total: cPurchases.length,
            amount: cPurchases.reduce((s, p) => s + p.totalAmount, 0),
            pending: cPurchases.filter((p) => p.status === 'PENDIENTE').length,
          },
          maintenance: { count: cMaint.length, cost: cMaint.reduce((s, m) => s + (m.cost ?? 0), 0) },
          emergencyPlans: cPlans.length,
          guardLog: {
            days: cGuardLogs.length,
            entries: cGuardEntries.length,
            handovers: cGuardLogs.reduce((s, g) => s + g._count.handovers, 0),
            openDays: cGuardLogs.filter((g) => g.status === 'OPEN').length,
          },
          fleetLog: fleetFuel,
          inventoryAudit: {
            total: cAudits.length,
            closed: cAudits.filter((a) => a.status === 'CERRADA').length,
            inProgress: cAudits.filter((a) => a.status === 'EN_PROCESO').length,
            discrepancies: auditDiscrepancies,
          },
          training: {
            total: cCerts.length,
            expired: certsExpired,
            expiringSoon: certsSoon,
          },
          drills: {
            total: cDrills.length,
            executed: cDrills.filter((d) => d.status === 'EJECUTADO').length,
            scheduled: cDrills.filter((d) => d.status === 'PROGRAMADO').length,
          },
          alerts,
        },
        charts: {
          incidentsByMonth: this.monthlyCounts(cIncAll, y),
          incidentsByType: this.countByField(cIncYear, 'type'),
          roles: this.countByField(cUsers, 'role'),
          fleetStatus: [
            { name: 'Operativo', value: cVehicles.filter((v) => v.status === 'OPERATIVO').length, fill: '#10b981' },
            { name: 'En reparación', value: cVehicles.filter((v) => v.status === 'EN_REPARACION').length, fill: '#eab308' },
            { name: 'Fuera de servicio', value: cVehicles.filter((v) => v.status === 'FUERA_DE_SERVICIO').length, fill: '#ef4444' },
          ],
          equipmentByCategory: Object.entries(
            cEquip.reduce((acc, e) => {
              acc[e.category] = (acc[e.category] ?? 0) + (e.quantity ?? 1);
              return acc;
            }, {} as Record<string, number>),
          ).map(([name, value]) => ({ name, value })),
          budgetByCategory: cBudgets.map((b) => ({
            category: b.category,
            planned: b.planned,
            executed: b.executed,
          })),
          contributionsByMonth: this.monthlySum(
            cContrib.map((c) => ({ date: c.paidAt, amount: c.amount })),
            y,
          ),
          purchasesByStatus: this.countByField(cPurchases, 'status'),
          maintenanceByMonth: this.monthlySum(
            cMaint.map((m) => ({ date: m.date, amount: m.cost ?? 0 })),
            y,
          ),
          hydrantStatus: [
            { name: 'Operativo', value: cHydrants.filter((h) => h.status === 'OPERATIVO').length, fill: '#10b981' },
            { name: 'No operativo', value: cHydrants.filter((h) => h.status === 'NO_OPERATIVO').length, fill: '#ef4444' },
            { name: 'Mantención', value: cHydrants.filter((h) => h.status === 'EN_MANTENCION').length, fill: '#f59e0b' },
          ],
          planSeverity: this.countByField(cPlans, 'severity'),
          guardEntriesByMonth: this.monthlyCountsGeneric(
            cGuardEntries.map((e) => ({ date: e.createdAt })),
            y,
          ),
          fleetFuelByMonth: this.monthlySum(
            cFleetLogs
              .filter((f) => f.type === FleetLogType.COMBUSTIBLE)
              .map((f) => ({ date: f.date, amount: f.fuelLiters ?? 0 })),
            y,
          ),
          fleetCostByMonth: this.monthlySum(
            cFleetLogs
              .filter((f) => f.type === FleetLogType.COMBUSTIBLE)
              .map((f) => ({ date: f.date, amount: f.fuelCost ?? 0 })),
            y,
          ),
          auditByResult: this.countAuditResults(cAudits),
          certByCategory: this.countByField(cCerts, 'category'),
          drillByStatus: this.countByField(cDrills, 'status'),
          fleetConsumptionByVehicle: fleetFuel.byVehicle.slice(0, 8),
        },
        tables: {
          recentIncidents: cIncYear.slice(0, 12).map((i) => ({
            code: i.code,
            type: i.type,
            address: i.address,
            dispatchedAt: i.dispatchedAt,
            closedAt: i.closedAt,
            hasPlan: !!i.emergencyPlanId,
            fromBotonera: i.dispatchSource === 'BOTONERA',
          })),
          recentFleetLogs: cFleetLogs.slice(0, 15).map((f) => ({
            date: f.date,
            patent: f.vehicle?.patent ?? '—',
            type: f.type,
            odometerKm: f.odometerKm,
            fuelLiters: f.fuelLiters,
            fuelCost: f.fuelCost,
          })),
          recentAudits: cAudits.slice(0, 10).map((a) => ({
            code: a.code,
            title: a.title,
            status: a.status,
            items: a.items.length,
            discrepancies: a.items.filter((i) => i.result === 'DIFERENCIA' || i.result === 'NO_ENCONTRADO').length,
            completedAt: a.completedAt,
          })),
          guardLogDays: cGuardLogs.slice(0, 12).map((g) => ({
            date: g.date,
            status: g.status,
            entries: g._count.entries,
            handovers: g._count.handovers,
          })),
          expiringCerts: cCerts
            .filter((c) => c.expiresAt)
            .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime())
            .slice(0, 12)
            .map((c) => ({
              name: c.name,
              category: c.category,
              expiresAt: c.expiresAt,
              expired: c.expiresAt! < now,
            })),
        },
      };
    });

    const globalIncidents = incidents;
    const globalComparison = companyReports.map((c) => ({
      id: c.id,
      label: `Cía. ${c.number}`,
      name: c.name,
      personnel: c.snapshot.personnel.active,
      fleet: c.snapshot.fleet.total,
      fleetOperativePct: c.snapshot.fleet.operativeRate,
      incidents: c.snapshot.incidents.year,
      incidentsMonth: c.snapshot.incidents.thisMonth,
      budgetExecRate: c.snapshot.finance.execRate,
      socialCollected: c.snapshot.social.collected,
      alerts: c.snapshot.alerts,
      hydrants: c.snapshot.hydrants.total,
      maintenanceCost: c.snapshot.maintenance.cost,
      guardEntries: c.snapshot.guardLog.entries,
      fleetLiters: c.snapshot.fleetLog.totalLiters,
      auditsClosed: c.snapshot.inventoryAudit.closed,
      certsExpired: c.snapshot.training.expired,
    }));

    const allFleetFuel = this.computeFleetFuelStats(fleetLogs as FleetLogRow[]);

    return {
      year: y,
      generatedAt: now.toISOString(),
      global: {
        companiesCount: companies.length,
        totals: {
          personnel: users.filter((u) => u.isActive).length,
          fleet: vehicles.length,
          equipment: equipment.length,
          incidentsYear: globalIncidents.length,
          incidentsWithPlan: globalIncidents.filter((i) => i.emergencyPlanId).length,
          budgetPlanned: budgets.reduce((s, b) => s + b.planned, 0),
          budgetExecuted: budgets.reduce((s, b) => s + b.executed, 0),
          socialCollected: contributions.reduce((s, c) => s + c.amount, 0),
          purchasesAmount: purchases.reduce((s, p) => s + p.totalAmount, 0),
          maintenanceCost: maintenances.reduce((s, m) => s + (m.cost ?? 0), 0),
          hydrants: hydrants.length,
          guardLogEntries: guardEntries.length,
          fleetLogs: fleetLogs.length,
          fleetLiters: allFleetFuel.totalLiters,
          fleetCost: allFleetFuel.totalCost,
          auditsClosed: inventoryAudits.filter((a) => a.status === 'CERRADA').length,
          certsExpired: certifications.filter((c) => c.expiresAt && c.expiresAt < now).length,
          drillsExecuted: drills.filter((d) => d.status === 'EJECUTADO').length,
          alerts: companyReports.reduce((s, c) => s + c.snapshot.alerts, 0),
        },
        incidentsByMonth: this.monthlyCounts(
          allIncidentsHistory.filter((i: any) => {
            const d = new Date(i.dispatchedAt);
            return d >= startOfYear && d < endOfYear;
          }),
          y,
        ),
        incidentsByType: this.countByField(globalIncidents, 'type'),
        fleetStatus: [
          { name: 'Operativo', value: vehicles.filter((v) => v.status === 'OPERATIVO').length, fill: '#10b981' },
          { name: 'En reparación', value: vehicles.filter((v) => v.status === 'EN_REPARACION').length, fill: '#eab308' },
          { name: 'Fuera de servicio', value: vehicles.filter((v) => v.status === 'FUERA_DE_SERVICIO').length, fill: '#ef4444' },
        ],
        budgetByCategory: Object.values(
          budgets.reduce((acc, b) => {
            if (!acc[b.category]) acc[b.category] = { category: b.category, planned: 0, executed: 0 };
            acc[b.category].planned += b.planned;
            acc[b.category].executed += b.executed;
            return acc;
          }, {} as Record<string, { category: string; planned: number; executed: number }>),
        ),
        contributionsByMonth: this.monthlySum(
          contributions.map((c) => ({ date: c.paidAt, amount: c.amount })),
          y,
        ),
        guardEntriesByMonth: this.monthlyCountsGeneric(
          guardEntries.map((e) => ({ date: e.createdAt })),
          y,
        ),
        fleetFuelByMonth: this.monthlySum(
          fleetLogs
            .filter((f) => f.type === FleetLogType.COMBUSTIBLE)
            .map((f) => ({ date: f.date, amount: f.fuelLiters ?? 0 })),
          y,
        ),
        companiesComparison: globalComparison,
        stackedIncidentsByCompany: MONTHS_ES.map((month, idx) => {
          const row: Record<string, string | number> = { month };
          companyReports.forEach((c) => {
            row[`Cía. ${c.number}`] = c.charts.incidentsByMonth[idx]?.count ?? 0;
          });
          return row;
        }),
      },
      companies: companyReports,
    };
  }

  private computeFleetFuelStats(logs: FleetLogRow[]) {
    const fuelLogs = logs.filter((l) => l.type === FleetLogType.COMBUSTIBLE);
    const totalLiters = Math.round(fuelLogs.reduce((s, l) => s + (l.fuelLiters ?? 0), 0) * 10) / 10;
    const totalCost = Math.round(fuelLogs.reduce((s, l) => s + (l.fuelCost ?? 0), 0));

    const byVehicle = new Map<string, { patent: string; liters: number; consumptions: number[] }>();
    const sorted = [...fuelLogs].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const log of sorted) {
      const cur = byVehicle.get(log.vehicleId) ?? {
        patent: log.vehicle?.patent ?? '—',
        liters: 0,
        consumptions: [],
      };
      cur.liters += log.fuelLiters ?? 0;
      byVehicle.set(log.vehicleId, cur);
    }

    for (const [vid, vehicleLogs] of Object.entries(
      fuelLogs.reduce((acc, l) => {
        (acc[l.vehicleId] ??= []).push(l);
        return acc;
      }, {} as Record<string, FleetLogRow[]>),
    )) {
      const arr = vehicleLogs.sort((a, b) => a.odometerKm - b.odometerKm);
      const consumptions: number[] = [];
      for (let i = 1; i < arr.length; i++) {
        const km = arr[i].odometerKm - arr[i - 1].odometerKm;
        const liters = arr[i].fuelLiters ?? 0;
        if (km > 0 && liters > 0) consumptions.push(Math.round((liters / km) * 100 * 10) / 10);
      }
      const entry = byVehicle.get(vid);
      if (entry) entry.consumptions = consumptions;
    }

    const byVehicleList = Array.from(byVehicle.entries()).map(([vehicleId, v]) => ({
      vehicleId,
      patent: v.patent,
      liters: Math.round(v.liters * 10) / 10,
      avgConsumptionLper100km:
        v.consumptions.length > 0
          ? Math.round((v.consumptions.reduce((s, x) => s + x, 0) / v.consumptions.length) * 10) / 10
          : null,
    }));

    let kmTraveled = 0;
    if (fuelLogs.length >= 2) {
      const odometers = fuelLogs.map((l) => l.odometerKm).sort((a, b) => a - b);
      kmTraveled = odometers[odometers.length - 1] - odometers[0];
    }
    const avgConsumption =
      kmTraveled > 0 && totalLiters > 0
        ? Math.round((totalLiters / kmTraveled) * 100 * 10) / 10
        : null;

    return {
      totalLogs: logs.length,
      fuelLogs: fuelLogs.length,
      serviceLogs: logs.filter((l) => l.type === FleetLogType.SERVICIO).length,
      totalLiters,
      totalCost,
      avgConsumptionLper100km: avgConsumption,
      byVehicle: byVehicleList.sort((a, b) => b.liters - a.liters),
    };
  }

  private countAuditResults(audits: { items: { result: string }[] }[]) {
    const counts: Record<string, number> = {};
    for (const audit of audits) {
      for (const item of audit.items) {
        counts[item.result] = (counts[item.result] ?? 0) + 1;
      }
    }
    const labels: Record<string, string> = {
      CONFORME: 'Conforme',
      DIFERENCIA: 'Diferencia',
      NO_ENCONTRADO: 'No encontrado',
      OBSERVACION: 'Observación',
      PENDIENTE: 'Pendiente',
    };
    return Object.entries(counts)
      .map(([name, value]) => ({ name: labels[name] ?? name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private monthlyCountsGeneric(items: { date: Date }[], year: number) {
    return MONTHS_ES.map((month, idx) => ({
      month,
      count: items.filter((i) => {
        const d = new Date(i.date);
        return d.getFullYear() === year && d.getMonth() === idx;
      }).length,
    }));
  }

  private monthlyCounts(items: { dispatchedAt: Date }[], year: number) {
    return MONTHS_ES.map((month, idx) => ({
      month,
      count: items.filter((i) => {
        const d = new Date(i.dispatchedAt);
        return d.getFullYear() === year && d.getMonth() === idx;
      }).length,
    }));
  }

  private monthlySum(items: { date: Date; amount: number }[], year: number) {
    return MONTHS_ES.map((month, idx) => ({
      month,
      amount: items
        .filter((i) => {
          const d = new Date(i.date);
          return d.getFullYear() === year && d.getMonth() === idx;
        })
        .reduce((s, i) => s + i.amount, 0),
    }));
  }

  private countByField<T extends Record<string, any>>(items: T[], field: keyof T) {
    const counts = items.reduce((acc, item) => {
      const key = String(item[field] ?? 'Otro');
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }
}
