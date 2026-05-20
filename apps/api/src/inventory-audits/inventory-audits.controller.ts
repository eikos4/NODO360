import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { InventoryAuditStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryAuditsService } from './inventory-audits.service';
import { CreateInventoryAuditDto } from './dto/create-inventory-audit.dto';
import { VerifyAuditItemDto } from './dto/verify-audit-item.dto';
import { CloseInventoryAuditDto } from './dto/close-inventory-audit.dto';

@Controller('inventory-audits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryAuditsController {
  constructor(private readonly service: InventoryAuditsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  list(
    @Query('companyId') companyId?: string,
    @Query('status') status?: InventoryAuditStatus,
  ) {
    return this.service.findAll(companyId, status);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR')
  create(@Body() dto: CreateInventoryAuditDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  @Patch(':id/start')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR')
  start(@Param('id') id: string) {
    return this.service.start(id);
  }

  @Patch(':id/items/:itemId')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR')
  verifyItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: VerifyAuditItemDto,
  ) {
    return this.service.verifyItem(id, itemId, dto);
  }

  @Patch(':id/close')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR')
  close(@Param('id') id: string, @Body() dto: CloseInventoryAuditDto) {
    return this.service.close(id, dto);
  }

  @Patch(':id/cancel')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
