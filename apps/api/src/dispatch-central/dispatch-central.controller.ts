import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DispatchCentralService } from './dispatch-central.service';
import { UpdateDispatchCentralDto } from './dto/update-dispatch-central.dto';
import { ToggleStationAvailabilityDto } from './dto/toggle-station-availability.dto';
import { ToggleByOperativeNumberDto } from './dto/toggle-by-operative-number.dto';
import { ToggleMaquinistaDto } from './dto/toggle-maquinista.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const DISPATCH_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] as const;

@Controller('dispatch')
export class DispatchCentralController {
  constructor(private readonly service: DispatchCentralService) {}

  /** URL pública por cuartel — sin autenticación */
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.service.getPublicBySlug(slug);
  }

  @Patch('public/:slug/availability')
  toggleAvailability(
    @Param('slug') slug: string,
    @Body() dto: ToggleStationAvailabilityDto,
  ) {
    return this.service.toggleStationAvailability(slug, dto.userId, dto.available);
  }

  @Patch('public/:slug/availability/by-number')
  toggleAvailabilityByNumber(
    @Param('slug') slug: string,
    @Body() dto: ToggleByOperativeNumberDto,
  ) {
    return this.service.toggleStationAvailabilityByOperativeNumber(
      slug,
      dto.operativeNumber,
      dto.available,
    );
  }

  @Patch('public/:slug/maquinista')
  toggleMaquinista(
    @Param('slug') slug: string,
    @Body() dto: ToggleMaquinistaDto,
  ) {
    return this.service.toggleMaquinista(slug, dto.userId, {
      available: dto.available,
      principal: dto.principal,
    });
  }

  @Get('central/:companyId/roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getRoster(@Param('companyId') companyId: string) {
    return this.service.getRosterForCompany(companyId);
  }

  @Get('central/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getOverview() {
    return this.service.getCuartelesOverview();
  }

  @Get('central/global')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getGlobal() {
    return this.service.getGlobalDispatch();
  }

  @Get('central/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getConfig(@Query('companyId') companyId: string) {
    return this.service.getConfig(companyId);
  }

  @Patch('central/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateDispatchCentralDto,
  ) {
    return this.service.updateConfig(companyId, dto);
  }

  @Post('central/:companyId/ensure-slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  ensureSlug(@Param('companyId') companyId: string) {
    return this.service.ensureSlug(companyId);
  }
}
