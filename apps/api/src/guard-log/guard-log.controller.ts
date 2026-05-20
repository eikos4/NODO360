import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GuardLogService } from './guard-log.service';
import { CreateGuardLogEntryDto } from './dto/create-guard-log-entry.dto';
import { CreateGuardHandoverDto } from './dto/create-guard-handover.dto';
import { CloseGuardLogDto } from './dto/close-guard-log.dto';

@Controller('guard-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuardLogController {
  constructor(private readonly service: GuardLogService) {}

  @Get()
  list(@Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    return this.service.list(companyId, limit ? parseInt(limit, 10) : 30);
  }

  @Get('dashboard')
  getDashboard(
    @Query('companyId') companyId: string,
    @Query('date') date?: string,
    @Req() req?: any,
  ) {
    if (!companyId) throw new BadRequestException('companyId requerido');
    return this.service.getOrOpen(companyId, date, req?.user?.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('open')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'BOMBERO', 'SECRETARIO')
  open(
    @Query('companyId') companyId: string,
    @Query('date') date?: string,
    @Req() req?: any,
  ) {
    return this.service.getOrOpen(companyId, date, req?.user?.id);
  }

  @Post(':id/entries')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'BOMBERO', 'SECRETARIO')
  addEntry(
    @Param('id') id: string,
    @Body() dto: CreateGuardLogEntryDto,
    @Req() req: any,
  ) {
    return this.service.addEntry(id, req.user.id, dto);
  }

  @Delete(':id/entries/:entryId')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  deleteEntry(@Param('id') id: string, @Param('entryId') entryId: string) {
    return this.service.deleteEntry(id, entryId);
  }

  @Post(':id/handovers')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'BOMBERO', 'SECRETARIO')
  addHandover(@Param('id') id: string, @Body() dto: CreateGuardHandoverDto) {
    return this.service.addHandover(id, dto);
  }

  @Patch(':id/close')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  close(@Param('id') id: string, @Body() dto: CloseGuardLogDto, @Req() req: any) {
    return this.service.close(id, req.user.id, dto);
  }

  @Patch(':id/reopen')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }
}
