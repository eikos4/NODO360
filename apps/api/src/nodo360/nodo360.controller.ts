import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Nodo360Service } from './nodo360.service';
import { Nodo360ReportsService } from './nodo360-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';

@Controller('nodo360')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
export class Nodo360Controller {
  constructor(
    private readonly service: Nodo360Service,
    private readonly reportsService: Nodo360ReportsService,
  ) {}

  @Get('companies')
  getCompanies(@Req() req: { user: Actor }) {
    return this.service.getCompanies(req.user);
  }

  @Get('company/:id')
  getCompanyPanel(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.getCompanyPanel(id, req.user);
  }

  @Get('reports')
  getReports(
    @Query('year') year: string | undefined,
    @Query('companyId') companyId: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.reportsService.getReports(year ? Number(year) : undefined, companyId || undefined, req.user);
  }
}
