import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MembershipService } from './membership.service';
import { CreateMembershipFeeDto } from './dto/create-membership-fee.dto';
import { UpdateMembershipFeeDto } from './dto/update-membership-fee.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { UpsertMemberProfileDto } from './dto/upsert-member-profile.dto';

@Controller('membership')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipController {
  constructor(private readonly service: MembershipService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN')
  getDashboard(
    @Query('companyId') companyId: string | undefined,
    @Query('year') year: string | undefined,
    @Query('month') month: string | undefined,
    @Req() req: any,
  ) {
    return this.service.getDashboard(
      companyId,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      req.user,
    );
  }

  @Get('members')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN')
  getMembers(
    @Query('companyId') companyId: string,
    @Query('feeId') feeId: string | undefined,
    @Query('year') year: string | undefined,
    @Query('month') month: string | undefined,
    @Req() req: any,
  ) {
    return this.service.getMembersRoster(
      companyId,
      feeId,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      req.user,
    );
  }

  @Put('members/:userId/profile')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE')
  upsertProfile(@Param('userId') userId: string, @Body() dto: UpsertMemberProfileDto) {
    return this.service.upsertMemberProfile(userId, dto);
  }

  @Get('fees')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN')
  findFees(@Query('companyId') companyId: string | undefined, @Query('year') year: string | undefined, @Req() req: any) {
    return this.service.findFees(companyId, year ? Number(year) : undefined, req.user);
  }

  @Get('fees/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN')
  findFee(@Param('id') id: string, @Req() req: any) {
    return this.service.findFeeById(id, req.user);
  }

  @Post('fees')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  createFee(@Body() dto: CreateMembershipFeeDto, @Req() req: any) {
    return this.service.createFee(dto, req.user);
  }

  @Put('fees/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  updateFee(@Param('id') id: string, @Body() dto: UpdateMembershipFeeDto) {
    return this.service.updateFee(id, dto);
  }

  @Delete('fees/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  removeFee(@Param('id') id: string) {
    return this.service.removeFee(id);
  }

  @Get('contributions')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN')
  findContributions(
    @Query('companyId') companyId?: string,
    @Query('feeId') feeId?: string,
    @Query('userId') userId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findContributions({
      companyId,
      feeId,
      userId,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Post('contributions')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE')
  createContribution(@Body() dto: CreateContributionDto) {
    return this.service.createContribution(dto);
  }

  @Put('contributions/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE')
  updateContribution(@Param('id') id: string, @Body() dto: UpdateContributionDto) {
    return this.service.updateContribution(id, dto);
  }

  @Delete('contributions/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  removeContribution(@Param('id') id: string) {
    return this.service.removeContribution(id);
  }
}
