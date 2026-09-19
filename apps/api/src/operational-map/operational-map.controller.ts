import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { OperationalMapService } from './operational-map.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';

@Controller('operational-map')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationalMapController {
  constructor(private readonly service: OperationalMapService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'SECRETARIO', 'OPERADOR_CENTRAL')
  getMapData(
    @Query('companyId') companyId: string | undefined,
    @Query('incidentDays') incidentDays: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.service.getMapData(
      req.user,
      companyId || undefined,
      incidentDays ? Number(incidentDays) : undefined,
    );
  }
}
