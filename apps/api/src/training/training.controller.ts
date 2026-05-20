import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TrainingService } from './training.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const EDIT_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('summary')
  getSummary(@Query('companyId') companyId?: string) {
    return this.trainingService.getSummary(companyId);
  }

  @Get('expiring')
  getExpiring(@Query('companyId') companyId?: string, @Query('days') days?: string) {
    return this.trainingService.findExpiring(companyId, days ? Number(days) : undefined);
  }

  @Get('roster')
  getRoster(@Query('companyId') companyId: string) {
    return this.trainingService.rosterByCompany(companyId);
  }

  @Get('certifications')
  findAll(
    @Query() filters: { companyId?: string; userId?: string; category?: string; status?: string },
  ) {
    return this.trainingService.findAll(filters as any);
  }

  @Get('certifications/:id')
  findOne(@Param('id') id: string) {
    return this.trainingService.findOne(id);
  }

  @Post('certifications')
  @Roles(...EDIT_ROLES)
  create(@Body() dto: CreateCertificationDto) {
    return this.trainingService.create(dto);
  }

  @Put('certifications/:id')
  @Roles(...EDIT_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateCertificationDto) {
    return this.trainingService.update(id, dto);
  }

  @Delete('certifications/:id')
  @Roles(...EDIT_ROLES)
  remove(@Param('id') id: string) {
    return this.trainingService.remove(id);
  }
}
