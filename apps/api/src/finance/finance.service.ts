import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, companyIdWhere, companyIdsForActor } from '../common/cuerpo-scope';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async findBudgets(actor: Actor, companyId?: string, year?: number) {
    const scope = companyIdWhere(await companyIdsForActor(this.prisma, actor, companyId));
    return this.prisma.budget.findMany({
      where: {
        ...scope,
        ...(year ? { year } : {}),
      },
      include: { company: { select: { id: true, name: true, number: true } } },
      orderBy: [{ year: 'desc' }, { category: 'asc' }],
    });
  }

  async findBudgetById(id: string, actor: Actor) {
    const b = await this.prisma.budget.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true, number: true } } },
    });
    if (!b) throw new NotFoundException('Presupuesto no encontrado');
    await assertCompanyAccess(this.prisma, actor, b.companyId);
    return b;
  }

  async createBudget(dto: CreateBudgetDto, actor: Actor) {
    await assertCompanyAccess(this.prisma, actor, dto.companyId);
    const exists = await this.prisma.budget.findUnique({
      where: { companyId_year_category: { companyId: dto.companyId, year: dto.year, category: dto.category } },
    });
    if (exists) throw new ConflictException(`Ya existe presupuesto para ${dto.category} en ${dto.year}`);
    return this.prisma.budget.create({
      data: dto,
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async updateBudget(id: string, dto: Partial<CreateBudgetDto>, actor: Actor) {
    await this.findBudgetById(id, actor);
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);
    return this.prisma.budget.update({
      where: { id },
      data: dto,
      include: { company: { select: { id: true, name: true, number: true } } },
    });
  }

  async deleteBudget(id: string, actor: Actor) {
    await this.findBudgetById(id, actor);
    return this.prisma.budget.delete({ where: { id } });
  }

  async getDashboard(actor: Actor, companyId?: string) {
    const now = new Date();
    const year = now.getFullYear();
    const where = companyIdWhere(await companyIdsForActor(this.prisma, actor, companyId));

    const [budgets, invoiceStats, purchaseStats] = await Promise.all([
      this.prisma.budget.findMany({
        where: { ...where, year },
        include: { company: { select: { name: true, number: true } } },
      }),
      this.prisma.invoice.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
      this.prisma.purchase.aggregate({ where, _sum: { totalAmount: true }, _count: { id: true } }),
    ]);

    const totalPlanned = budgets.reduce((s, b) => s + b.planned, 0);
    const totalExecuted = budgets.reduce((s, b) => s + b.executed, 0);
    const executionRate = totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0;

    return {
      year,
      budget: { totalPlanned, totalExecuted, executionRate },
      invoices: { total: invoiceStats._count.id, amount: invoiceStats._sum.amount ?? 0 },
      purchases: { total: purchaseStats._count.id, amount: purchaseStats._sum.totalAmount ?? 0 },
      byCategory: budgets.map(b => ({
        category: b.category, planned: b.planned, executed: b.executed,
        rate: b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0,
      })),
    };
  }
}
