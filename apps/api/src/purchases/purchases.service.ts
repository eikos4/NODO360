import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const PURCHASE_INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  invoices: { orderBy: { issuedAt: 'desc' as const } },
};

const INVOICE_INCLUDE = {
  company: { select: { id: true, name: true, number: true } },
  purchase: { select: { id: true, number: true, description: true } },
};

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // ─── Purchases ────────────────────────────────────────────────────────────

  async findAllPurchases(companyId?: string, status?: string) {
    return this.prisma.purchase.findMany({
      where: { ...(companyId ? { companyId } : {}), ...(status ? { status: status as any } : {}) },
      include: PURCHASE_INCLUDE,
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findPurchaseById(id: string) {
    const p = await this.prisma.purchase.findUnique({ where: { id }, include: PURCHASE_INCLUDE });
    if (!p) throw new NotFoundException('Orden de compra no encontrada');
    return p;
  }

  async createPurchase(dto: CreatePurchaseDto) {
    const exists = await this.prisma.purchase.findUnique({ where: { number: dto.number } });
    if (exists) throw new ConflictException(`Número '${dto.number}' ya registrado`);
    return this.prisma.purchase.create({ data: dto, include: PURCHASE_INCLUDE });
  }

  async updatePurchase(id: string, dto: Partial<CreatePurchaseDto>) {
    await this.findPurchaseById(id);
    return this.prisma.purchase.update({ where: { id }, data: dto, include: PURCHASE_INCLUDE });
  }

  async deletePurchase(id: string) {
    await this.findPurchaseById(id);
    return this.prisma.purchase.delete({ where: { id } });
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async findAllInvoices(companyId?: string) {
    return this.prisma.invoice.findMany({
      where: companyId ? { companyId } : {},
      include: INVOICE_INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findInvoiceById(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return inv;
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const exists = await this.prisma.invoice.findUnique({ where: { number: dto.number } });
    if (exists) throw new ConflictException(`Factura '${dto.number}' ya registrada`);
    return this.prisma.invoice.create({ data: dto, include: INVOICE_INCLUDE });
  }

  async updateInvoice(id: string, dto: Partial<CreateInvoiceDto>) {
    await this.findInvoiceById(id);
    return this.prisma.invoice.update({ where: { id }, data: dto, include: INVOICE_INCLUDE });
  }

  async deleteInvoice(id: string) {
    await this.findInvoiceById(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalPurchases, pendingPurchases, totalInvoices, unpaidInvoices, yearSpend] = await Promise.all([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.count({ where: { ...where, status: 'PENDIENTE' } }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.count({ where: { ...where, paidAt: null } }),
      this.prisma.invoice.aggregate({ where: { ...where, issuedAt: { gte: startOfYear } }, _sum: { amount: true } }),
    ]);

    return {
      purchases: { total: totalPurchases, pending: pendingPurchases },
      invoices: { total: totalInvoices, unpaid: unpaidInvoices },
      yearSpend: yearSpend._sum.amount ?? 0,
    };
  }
}
