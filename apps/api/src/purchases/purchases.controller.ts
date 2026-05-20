import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private service: PurchasesService) {}

  @Get('purchases/stats')
  getStats(@Query('companyId') companyId?: string) { return this.service.getStats(companyId); }

  // ─── Purchases ────────────────────────────────────────────────────────────

  @Get('purchases')
  findAllPurchases(@Query('companyId') companyId?: string, @Query('status') status?: string) {
    return this.service.findAllPurchases(companyId, status);
  }

  @Get('purchases/:id')
  findPurchaseById(@Param('id') id: string) { return this.service.findPurchaseById(id); }

  @Post('purchases')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  createPurchase(@Body() dto: CreatePurchaseDto) { return this.service.createPurchase(dto); }

  @Put('purchases/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  updatePurchase(@Param('id') id: string, @Body() dto: Partial<CreatePurchaseDto>) {
    return this.service.updatePurchase(id, dto);
  }

  @Delete('purchases/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  deletePurchase(@Param('id') id: string) { return this.service.deletePurchase(id); }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('invoices')
  findAllInvoices(@Query('companyId') companyId?: string) { return this.service.findAllInvoices(companyId); }

  @Get('invoices/:id')
  findInvoiceById(@Param('id') id: string) { return this.service.findInvoiceById(id); }

  @Post('invoices')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO')
  createInvoice(@Body() dto: CreateInvoiceDto) { return this.service.createInvoice(dto); }

  @Put('invoices/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO')
  updateInvoice(@Param('id') id: string, @Body() dto: Partial<CreateInvoiceDto>) {
    return this.service.updateInvoice(id, dto);
  }

  @Delete('invoices/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  deleteInvoice(@Param('id') id: string) { return this.service.deleteInvoice(id); }
}
