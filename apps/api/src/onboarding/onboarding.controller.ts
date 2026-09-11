import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OnboardingService } from './onboarding.service';
import { ProvisionCuerpoDto } from './dto/provision-cuerpo.dto';
import { ImportUsersDto } from './dto/import-users.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KODESK')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('status')
  status() {
    return this.onboarding.status();
  }

  @Post('cuerpo')
  provisionCuerpo(@Body() dto: ProvisionCuerpoDto) {
    return this.onboarding.provisionCuerpo(dto);
  }

  @Post('parral')
  provisionParral() {
    return this.onboarding.provisionParral();
  }

  @Post('users/import')
  importUsers(@Body() dto: ImportUsersDto) {
    return this.onboarding.importUsers(dto);
  }
}
