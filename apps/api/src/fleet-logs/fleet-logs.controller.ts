import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { FleetLogType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FleetLogsService } from './fleet-logs.service';
import { CreateFleetLogDto } from './dto/create-fleet-log.dto';
import { UpdateFleetLogDto } from './dto/update-fleet-log.dto';

@Controller('fleet-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetLogsController {
  constructor(private readonly service: FleetLogsService) {}

  @Get('stats')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  getStats(
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.service.getStats(companyId, vehicleId);
  }

  @Get('consumption-chart')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  getConsumptionChart(
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.service.getConsumptionChart(companyId, vehicleId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  findAll(
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('type') type?: FleetLogType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      companyId,
      vehicleId,
      type,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'CAPITAN', 'BOMBERO')
  create(@Body() dto: CreateFleetLogDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  update(@Param('id') id: string, @Body() dto: UpdateFleetLogDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
