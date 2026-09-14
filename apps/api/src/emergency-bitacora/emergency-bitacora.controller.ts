import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmergencyBitacoraService } from './emergency-bitacora.service';
import { CreateEmergencyBitacoraDto } from './dto/create-emergency-bitacora.dto';
import { UpdateEmergencyBitacoraDto } from './dto/update-emergency-bitacora.dto';
import { FinalizePublicEmergencyDto } from './dto/finalize-public-emergency.dto';
import { ClosePublicEmergencyDto } from './dto/close-public-emergency.dto';
import { DispatchCentralService } from '../dispatch-central/dispatch-central.service';
import { HeaderRequest } from '../common/sala-token';

const READ_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL', 'AUDITOR'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL'] as const;

@Controller('emergency-bitacora')
export class EmergencyBitacoraController {
  constructor(
    private readonly service: EmergencyBitacoraService,
    private readonly dispatch: DispatchCentralService,
  ) {}

  /** Finalizar emergencia desde sala de máquinas (PIN o JWT) */
  @Post('public/:slug/finalize')
  async finalizePublic(
    @Param('slug') slug: string,
    @Body() dto: FinalizePublicEmergencyDto,
    @Req() req: HeaderRequest,
  ) {
    await this.dispatch.assertPublicSalaAccess(slug, req);
    return this.service.finalizeFromPublic(slug, dto);
  }

  /** Cerrar emergencia sin bitácora (registro pendiente) */
  @Post('public/:slug/close')
  async closePublic(
    @Param('slug') slug: string,
    @Body() dto: ClosePublicEmergencyDto,
    @Req() req: HeaderRequest,
  ) {
    await this.dispatch.assertPublicSalaAccess(slug, req);
    return this.service.closeFromPublic(slug, dto.incidentId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...READ_ROLES)
  findAll(
    @Query('companyId') companyId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any,
  ) {
    return this.service.findAll({
      companyId,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      actor: req.user,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...READ_ROLES)
  findById(@Param('id') id: string, @Req() req: any) {
    return this.service.findById(id, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateEmergencyBitacoraDto, @Req() req: any) {
    return this.service.create(dto, req.user.id, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyBitacoraDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}
