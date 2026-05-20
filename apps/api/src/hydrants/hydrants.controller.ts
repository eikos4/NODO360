import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HydrantsService } from './hydrants.service';
import { CreateHydrantDto } from './dto/create-hydrant.dto';
import { UpdateHydrantDto } from './dto/update-hydrant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('hydrants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HydrantsController {
  constructor(private readonly hydrantsService: HydrantsService) {}

  @Get()
  findAll(@Query() filters: { type?: string; status?: string; companyId?: string }) {
    return this.hydrantsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hydrantsService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL')
  create(@Body() dto: CreateHydrantDto) {
    return this.hydrantsService.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL')
  update(@Param('id') id: string, @Body() dto: UpdateHydrantDto) {
    return this.hydrantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL')
  remove(@Param('id') id: string) {
    return this.hydrantsService.remove(id);
  }
}
