import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmergencyResponseService } from './emergency-response.service';
import { MarkEmergencyLocationDto, RespondEmergencyDto } from './dto/respond-emergency.dto';

const RESPONDER_ROLES = ['SUPER_ADMIN', 'BOMBERO', 'CAPITAN', 'COMANDANTE', 'OPERADOR_CENTRAL', 'ENCARGADO_MATERIAL'] as const;

@Controller('emergency-response')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergencyResponseController {
  constructor(private readonly service: EmergencyResponseService) {}

  @Get('active')
  @Roles(...RESPONDER_ROLES)
  listActive(@Req() req: { user: { id: string } }) {
    return this.service.listActive(req.user.id);
  }

  @Get(':incidentId')
  @Roles(...RESPONDER_ROLES)
  getDetail(@Param('incidentId') incidentId: string, @Req() req: { user: { id: string } }) {
    return this.service.getDetail(req.user.id, incidentId);
  }

  @Post(':incidentId/respond')
  @Roles(...RESPONDER_ROLES)
  respond(
    @Param('incidentId') incidentId: string,
    @Body() dto: RespondEmergencyDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.respond(req.user.id, incidentId, dto);
  }

  @Post(':incidentId/mark-location')
  @Roles(...RESPONDER_ROLES)
  markLocation(
    @Param('incidentId') incidentId: string,
    @Body() dto: MarkEmergencyLocationDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.markLocation(req.user.id, incidentId, dto);
  }
}
