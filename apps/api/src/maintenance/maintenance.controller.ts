import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Get('stats')
  getStats(@Query('companyId') companyId?: string) {
    return this.service.getStats(companyId);
  }

  @Get()
  findAll(
    @Query('vehicleId') vehicleId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.findAll(vehicleId, companyId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  create(@Body() dto: CreateMaintenanceDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
