import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OperationalMapService } from './operational-map.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('operational-map')
@UseGuards(JwtAuthGuard)
export class OperationalMapController {
  constructor(private readonly service: OperationalMapService) {}

  @Get()
  getMapData(
    @Query('companyId') companyId?: string,
    @Query('incidentDays') incidentDays?: string,
  ) {
    return this.service.getMapData(
      companyId || undefined,
      incidentDays ? Number(incidentDays) : undefined,
    );
  }
}
