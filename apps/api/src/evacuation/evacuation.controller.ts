import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EvacuationService } from './evacuation.service';
import { CreateDrillDto } from './dto/create-drill.dto';
import { UpdateDrillDto } from './dto/update-drill.dto';
import { CreateMeetingPointDto } from './dto/create-meeting-point.dto';
import { UpdateMeetingPointDto } from './dto/update-meeting-point.dto';
import { CreateEvacuationRouteDto } from './dto/create-evacuation-route.dto';
import { UpdateEvacuationRouteDto } from './dto/update-evacuation-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const EDIT_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;

@Controller('evacuation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvacuationController {
  constructor(private readonly evacuationService: EvacuationService) {}

  @Get('summary')
  getSummary(@Query('companyId') companyId?: string) {
    return this.evacuationService.getSummary(companyId);
  }

  @Get('drills')
  findAllDrills(@Query() filters: { status?: string; companyId?: string }) {
    return this.evacuationService.findAllDrills(filters);
  }

  @Get('drills/:id')
  findOneDrill(@Param('id') id: string) {
    return this.evacuationService.findOneDrill(id);
  }

  @Post('drills')
  @Roles(...EDIT_ROLES)
  createDrill(@Body() dto: CreateDrillDto) {
    return this.evacuationService.createDrill(dto);
  }

  @Put('drills/:id')
  @Roles(...EDIT_ROLES)
  updateDrill(@Param('id') id: string, @Body() dto: UpdateDrillDto) {
    return this.evacuationService.updateDrill(id, dto);
  }

  @Delete('drills/:id')
  @Roles(...EDIT_ROLES)
  removeDrill(@Param('id') id: string) {
    return this.evacuationService.removeDrill(id);
  }

  @Get('meeting-points')
  findAllMeetingPoints(@Query('companyId') companyId?: string) {
    return this.evacuationService.findAllMeetingPoints(companyId);
  }

  @Get('meeting-points/:id')
  findOneMeetingPoint(@Param('id') id: string) {
    return this.evacuationService.findOneMeetingPoint(id);
  }

  @Post('meeting-points')
  @Roles(...EDIT_ROLES)
  createMeetingPoint(@Body() dto: CreateMeetingPointDto) {
    return this.evacuationService.createMeetingPoint(dto);
  }

  @Put('meeting-points/:id')
  @Roles(...EDIT_ROLES)
  updateMeetingPoint(@Param('id') id: string, @Body() dto: UpdateMeetingPointDto) {
    return this.evacuationService.updateMeetingPoint(id, dto);
  }

  @Delete('meeting-points/:id')
  @Roles(...EDIT_ROLES)
  removeMeetingPoint(@Param('id') id: string) {
    return this.evacuationService.removeMeetingPoint(id);
  }

  @Get('routes')
  findAllRoutes(@Query('companyId') companyId?: string) {
    return this.evacuationService.findAllRoutes(companyId);
  }

  @Get('routes/:id')
  findOneRoute(@Param('id') id: string) {
    return this.evacuationService.findOneRoute(id);
  }

  @Post('routes')
  @Roles(...EDIT_ROLES)
  createRoute(@Body() dto: CreateEvacuationRouteDto) {
    return this.evacuationService.createRoute(dto);
  }

  @Put('routes/:id')
  @Roles(...EDIT_ROLES)
  updateRoute(@Param('id') id: string, @Body() dto: UpdateEvacuationRouteDto) {
    return this.evacuationService.updateRoute(id, dto);
  }

  @Delete('routes/:id')
  @Roles(...EDIT_ROLES)
  removeRoute(@Param('id') id: string) {
    return this.evacuationService.removeRoute(id);
  }
}
