import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Nodo360Service {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanies() {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
      select: { id: true, name: true, number: true, city: true, region: true, logoUrl: true },
    });
  }

  async getCompanyPanel(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);
    const in30days     = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    /* ── Personal ── */
    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
    const activeUsers   = users.filter(u => u.isActive).length;
    const roleCounts    = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; }, {} as Record<string, number>);

    /* ── Vehículos ── */
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      include: { maintenances: { orderBy: { date: 'desc' }, take: 1 } },
    });
    const vehicleStats = {
      total:           vehicles.length,
      operativo:       vehicles.filter(v => v.status === 'OPERATIVO').length,
      enReparacion:    vehicles.filter(v => v.status === 'EN_REPARACION').length,
      fueraDeServicio: vehicles.filter(v => v.status === 'FUERA_DE_SERVICIO').length,
      byType:          vehicles.reduce((acc, v) => { acc[v.type] = (acc[v.type] ?? 0) + 1; return acc; }, {} as Record<string, number>),
      expiredMaint:    vehicles.filter(v => v.nextMaintenanceAt && v.nextMaintenanceAt < now).length,
      soonMaint:       vehicles.filter(v => v.nextMaintenanceAt && v.nextMaintenanceAt >= now && v.nextMaintenanceAt <= in30days).length,
    };

    /* ── Equipamiento ── */
    const equipment = await this.prisma.equipment.findMany({ where: { companyId } });
    const equipStats = {
      total:           equipment.length,
      operativo:       equipment.filter(e => e.status === 'OPERATIVO').length,
      enReparacion:    equipment.filter(e => e.status === 'EN_REPARACION').length,
      fueraDeServicio: equipment.filter(e => e.status === 'FUERA_DE_SERVICIO').length,
      byCategory:      equipment.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + (e.quantity ?? 1); return acc; }, {} as Record<string, number>),
      expired:         equipment.filter(e => e.expiresAt && e.expiresAt < now).length,
      expiringSoon:    equipment.filter(e => e.expiresAt && e.expiresAt >= now && e.expiresAt <= in30days).length,
    };

    /* ── Emergencias ── */
    const incidents = await this.prisma.incident.findMany({
      where: { companyId },
      orderBy: { dispatchedAt: 'desc' },
      take: 10,
      include: { participants: { include: { user: { select: { firstName: true, lastName: true, role: true } } } } },
    });
    const allIncidents = await this.prisma.incident.findMany({ where: { companyId }, select: { type: true, dispatchedAt: true, closedAt: true, arrivedAt: true } });
    const incidentStats = {
      total:     allIncidents.length,
      thisMonth: allIncidents.filter(i => i.dispatchedAt >= startOfMonth).length,
      thisYear:  allIncidents.filter(i => i.dispatchedAt >= startOfYear).length,
      open:      allIncidents.filter(i => !i.closedAt).length,
      byType:    allIncidents.reduce((acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; }, {} as Record<string, number>),
      byMonth:   this.incidentsByMonth(allIncidents),
    };

    /* ── Mantenciones ── */
    const maintenances = await this.prisma.maintenance.findMany({
      where: { vehicle: { companyId } },
      orderBy: { date: 'desc' },
      take: 5,
      include: { vehicle: { select: { patent: true, brand: true, model: true } } },
    });
    const allMaint = await this.prisma.maintenance.findMany({
      where: { vehicle: { companyId } },
      select: { cost: true, date: true },
    });
    const maintenanceStats = {
      total:    allMaint.length,
      thisYear: allMaint.filter(m => m.date >= startOfYear).length,
      totalCost: allMaint.reduce((s, m) => s + (m.cost ?? 0), 0),
      yearCost:  allMaint.filter(m => m.date >= startOfYear).reduce((s, m) => s + (m.cost ?? 0), 0),
    };

    /* ── Turnos/Guardia ── */
    const shifts = await this.prisma.shift.findMany({
      where: { user: { companyId } },
      orderBy: { date: 'desc' },
      take: 5,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
    });
    const upcomingShifts = await this.prisma.shift.findMany({
      where: { user: { companyId }, date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 5,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    /* ── Finanzas ── */
    const budgets = await this.prisma.budget.findMany({ where: { companyId, year: now.getFullYear() } });
    const invoices = await this.prisma.invoice.findMany({ where: { companyId }, select: { amount: true, paidAt: true, issuedAt: true } });
    const totalPlanned  = budgets.reduce((s, b) => s + b.planned, 0);
    const totalExecuted = budgets.reduce((s, b) => s + b.executed, 0);
    const financeStats = {
      totalPlanned,
      totalExecuted,
      remaining:   totalPlanned - totalExecuted,
      execRate:    totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0,
      byCategory:  budgets.map(b => ({ category: b.category, planned: b.planned, executed: b.executed })),
      invoiceCount: invoices.length,
      invoiceAmount: invoices.reduce((s, i) => s + i.amount, 0),
    };

    /* ── Documentos ── */
    const documents = await this.prisma.document.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, category: true, createdAt: true, expiresAt: true },
    });
    const expiredDocs = await this.prisma.document.count({ where: { companyId, expiresAt: { lt: now } } });

    /* ── Compras ── */
    const purchases = await this.prisma.purchase.findMany({
      where: { companyId },
      orderBy: { requestedAt: 'desc' },
      take: 5,
      select: { id: true, number: true, description: true, status: true, totalAmount: true, requestedAt: true },
    });
    const purchaseStats = {
      total:     await this.prisma.purchase.count({ where: { companyId } }),
      pending:   await this.prisma.purchase.count({ where: { companyId, status: 'PENDIENTE' } }),
      approved:  await this.prisma.purchase.count({ where: { companyId, status: 'APROBADA' } }),
      totalAmount: (await this.prisma.purchase.aggregate({ where: { companyId }, _sum: { totalAmount: true } }))._sum.totalAmount ?? 0,
    };

    /* ── Alertas ── */
    const criticalAlerts = {
      expiredVehicles:   vehicleStats.expiredMaint,
      soonVehicles:      vehicleStats.soonMaint,
      expiredEquipment:  equipStats.expired,
      soonEquipment:     equipStats.expiringSoon,
      expiredDocuments:  expiredDocs,
      total:             vehicleStats.expiredMaint + vehicleStats.soonMaint + equipStats.expired + equipStats.expiringSoon + expiredDocs,
    };

    return {
      company,
      users:        { list: users, stats: { total: users.length, active: activeUsers, roleCounts } },
      vehicles:     { list: vehicles, stats: vehicleStats },
      equipment:    { list: equipment, stats: equipStats },
      incidents:    { recent: incidents, stats: incidentStats },
      maintenances: { recent: maintenances, stats: maintenanceStats },
      shifts:       { recent: shifts, upcoming: upcomingShifts },
      finance:      { budgets, stats: financeStats },
      documents:    { recent: documents },
      purchases:    { recent: purchases, stats: purchaseStats },
      alerts:       criticalAlerts,
    };
  }

  private incidentsByMonth(incidents: any[]): { month: string; count: number }[] {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(new Date().getFullYear(), i, 1);
      return { month: d.toLocaleString('es-CL', { month: 'short' }), count: 0 };
    });
    incidents.forEach(inc => {
      const m = new Date(inc.dispatchedAt).getMonth();
      months[m].count++;
    });
    return months;
  }
}
