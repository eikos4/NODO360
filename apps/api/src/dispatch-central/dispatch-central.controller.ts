import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DispatchCentralService } from './dispatch-central.service';
import { UpdateDispatchCentralDto } from './dto/update-dispatch-central.dto';
import { ToggleStationAvailabilityDto } from './dto/toggle-station-availability.dto';
import { ToggleByOperativeNumberDto } from './dto/toggle-by-operative-number.dto';
import { ToggleMaquinistaDto } from './dto/toggle-maquinista.dto';
import { ToggleMyAvailabilityDto } from './dto/toggle-my-availability.dto';
import { UnlockSalaDto } from './dto/unlock-sala.dto';
import { SetVehicleStatusDto } from './dto/set-vehicle-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';
import { HeaderRequest } from '../common/sala-token';

const DISPATCH_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] as const;

@Controller('dispatch')
export class DispatchCentralController {
  constructor(private readonly service: DispatchCentralService) {}

  /** Vista pública por cuartel — PIN de sala o JWT de operador */
  @Get('public/:slug')
  async getPublic(@Param('slug') slug: string, @Req() req: HeaderRequest) {
    const access = await this.service.peekPublicAccess(slug, req);
    if (access === 'locked') return this.service.getPublicLocked(slug);
    return this.service.getPublicBySlug(slug, { includePii: access === 'sala' || access === 'user' });
  }

  @Post('public/:slug/unlock')
  unlockPublic(@Param('slug') slug: string, @Body() dto: UnlockSalaDto) {
    return this.service.unlockPublic(slug, dto.pin);
  }

  @Get('public/:slug/search-operative/:number')
  async searchOperative(
    @Param('slug') slug: string,
    @Param('number') operativeNumber: string,
    @Req() req: HeaderRequest,
  ) {
    await this.service.assertPublicWriteAccess(slug, req);
    return this.service.searchOperativeGlobally(slug, parseInt(operativeNumber, 10));
  }

  @Patch('public/:slug/availability')
  async toggleAvailability(
    @Param('slug') slug: string,
    @Body() dto: ToggleStationAvailabilityDto,
    @Req() req: HeaderRequest,
  ) {
    await this.service.assertPublicWriteAccess(slug, req);
    return this.service.toggleStationAvailability(slug, dto.userId, dto.available);
  }

  @Patch('public/:slug/availability/by-number')
  async toggleAvailabilityByNumber(
    @Param('slug') slug: string,
    @Body() dto: ToggleByOperativeNumberDto,
    @Req() req: HeaderRequest,
  ) {
    await this.service.assertPublicWriteAccess(slug, req);
    return this.service.toggleStationAvailabilityByOperativeNumber(
      slug,
      dto.operativeNumber,
      dto.available,
    );
  }

  @Patch('public/:slug/maquinista')
  async toggleMaquinista(
    @Param('slug') slug: string,
    @Body() dto: ToggleMaquinistaDto,
    @Req() req: HeaderRequest,
  ) {
    await this.service.assertPublicWriteAccess(slug, req);
    return this.service.toggleMaquinista(slug, dto.userId, {
      available: dto.available,
      principal: dto.principal,
    });
  }

  @Patch('me/availability')
  @UseGuards(JwtAuthGuard)
  toggleMine(
    @Body() dto: ToggleMyAvailabilityDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.toggleMyStationAvailability(req.user.id, dto.available);
  }

  @Patch('me/maquinista')
  @UseGuards(JwtAuthGuard)
  toggleMyMaquinista(
    @Body() dto: ToggleMyAvailabilityDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.toggleMyMaquinistaAvailability(req.user.id, dto.available);
  }

  @Get('central/:companyId/roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getRoster(@Param('companyId') companyId: string, @Req() req: { user: Actor }) {
    return this.service.getRosterForCompany(companyId, req.user);
  }

  @Get('central/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getOverview(@Req() req: { user: Actor }) {
    return this.service.getCuartelesOverview(req.user);
  }

  @Get('central/global')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getGlobal(@Req() req: { user: Actor }) {
    return this.service.getGlobalDispatch(req.user);
  }

  @Patch('central/vehicles/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  setVehicleStatus(
    @Param('id') id: string,
    @Body() dto: SetVehicleStatusDto,
    @Req() req: { user: Actor },
  ) {
    return this.service.setVehicleStatus(id, dto.status, req.user);
  }

  @Get('central/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  getConfig(@Query('companyId') companyId: string, @Req() req: { user: Actor }) {
    return this.service.getConfig(companyId, req.user);
  }

  @Patch('central/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateDispatchCentralDto,
    @Req() req: { user: Actor },
  ) {
    return this.service.updateConfig(companyId, dto, req.user);
  }

  @Post('central/:companyId/ensure-slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  ensureSlug(@Param('companyId') companyId: string, @Req() req: { user: Actor }) {
    return this.service.ensureSlug(companyId, req.user);
  }

  @Post('central/:companyId/standby')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DISPATCH_ROLES)
  triggerStandby(
    @Param('companyId') companyId: string,
    @Body() body: { message?: string },
    @Req() req: { user: Actor },
  ) {
    return this.service.triggerStandby(companyId, body?.message, req.user);
  }
}
