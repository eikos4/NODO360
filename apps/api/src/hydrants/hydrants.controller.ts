import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HydrantsService } from './hydrants.service';
import { CreateHydrantDto } from './dto/create-hydrant.dto';
import { UpdateHydrantDto } from './dto/update-hydrant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';

const READ_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'OPERADOR_CENTRAL'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL'] as const;

@Controller('hydrants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HydrantsController {
  constructor(private readonly hydrantsService: HydrantsService) {}

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @Query() filters: { type?: string; status?: string; companyId?: string },
    @Req() req: { user: Actor },
  ) {
    return this.hydrantsService.findAll(req.user, filters);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findOne(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.hydrantsService.findOne(id, req.user);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateHydrantDto, @Req() req: { user: Actor }) {
    return this.hydrantsService.create(dto, req.user);
  }

  @Put(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateHydrantDto, @Req() req: { user: Actor }) {
    return this.hydrantsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.hydrantsService.remove(id, req.user);
  }
}
