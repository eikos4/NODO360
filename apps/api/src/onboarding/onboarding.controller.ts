import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OnboardingService } from './onboarding.service';
import { ProvisionCuerpoDto } from './dto/provision-cuerpo.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { CreateCentralistasDto } from './dto/create-centralistas.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { AddCompanyDto } from './dto/add-company.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KODESK')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('status')
  status() {
    return this.onboarding.status();
  }

  @Get('logs')
  logs() {
    return this.onboarding.listLogs();
  }

  @Post('cuerpo')
  provisionCuerpo(@Body() dto: ProvisionCuerpoDto) {
    return this.onboarding.provisionCuerpo(dto);
  }

  @Post('cuerpo/:id/companies')
  addCompany(@Param('id') id: string, @Body() dto: AddCompanyDto) {
    return this.onboarding.addCompany(id, dto);
  }

  @Delete('cuerpo/:id')
  removeCuerpo(@Param('id') id: string) {
    return this.onboarding.deactivateCuerpo(id);
  }

  @Delete('companies/:id')
  removeCompany(@Param('id') id: string) {
    return this.onboarding.deactivateCompany(id);
  }

  @Post('dedupe')
  dedupe() {
    return this.onboarding.dedupeCuerpos();
  }

  @Post('parral')
  provisionParral() {
    return this.onboarding.provisionParral();
  }

  @Post('users/import')
  importUsers(@Body() dto: ImportUsersDto) {
    return this.onboarding.importUsers(dto);
  }

  @Post('centralistas')
  createCentralistas(@Body() dto: CreateCentralistasDto) {
    return this.onboarding.createCentralistas(dto);
  }

  @Post('users/:id/password')
  resetUserPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.onboarding.resetUserPassword(id, dto.password);
  }

  @Post('reset')
  resetPlatform(@Body() body: { confirm?: string }) {
    if (body?.confirm !== 'RESET') {
      throw new BadRequestException('Escribí RESET para confirmar el borrado');
    }
    return this.onboarding.resetPlatform();
  }
}
