import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Nodo360Service } from './nodo360.service';
import { Nodo360ReportsService } from './nodo360-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('nodo360')
@UseGuards(JwtAuthGuard)
export class Nodo360Controller {
  constructor(
    private readonly service: Nodo360Service,
    private readonly reportsService: Nodo360ReportsService,
  ) {}

  @Get('companies')
  getCompanies() {
    return this.service.getCompanies();
  }

  @Get('company/:id')
  getCompanyPanel(@Param('id') id: string) {
    return this.service.getCompanyPanel(id);
  }

  @Get('reports')
  getReports(@Query('year') year?: string, @Query('companyId') companyId?: string) {
    return this.reportsService.getReports(year ? Number(year) : undefined, companyId || undefined);
  }
}
