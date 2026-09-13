import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IncidentAuthUser } from '../incidents/incidents.service';
import { CreateIncidentTimelineEventDto } from './dto/create-incident-timeline-event.dto';
import { IncidentTimelineService } from './incident-timeline.service';

const READ_ROLES = [
  'SUPER_ADMIN',
  'COMANDANTE',
  'CAPITAN',
  'SECRETARIO',
  'OPERADOR_CENTRAL',
  'AUDITOR',
  'ENCARGADO_MATERIAL',
  'BOMBERO',
  'BOMBERO_HONORARIO',
  'BOMBERO_INICIAL',
  'BOMBERO_PROFESIONAL',
] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL'] as const;

@Controller('incident-timeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentTimelineController {
  constructor(private readonly service: IncidentTimelineService) {}

  @Get('incident/:incidentId')
  @Roles(...READ_ROLES)
  list(@Param('incidentId') incidentId: string, @Req() req: { user: IncidentAuthUser }) {
    return this.service.listByIncident(incidentId, req.user);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateIncidentTimelineEventDto, @Req() req: { user: IncidentAuthUser }) {
    return this.service.create(dto, req.user);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(@Param('id') id: string, @Req() req: { user: IncidentAuthUser }) {
    return this.service.remove(id, req.user);
  }
}
