import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { CreateMedicalExamDto } from './dto/create-medical-exam.dto';
import { UpdateMedicalExamDto } from './dto/update-medical-exam.dto';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';
import { UpdateMedicalConditionDto } from './dto/update-medical-condition.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { UpdateVaccinationDto } from './dto/update-vaccination.dto';
import { Actor } from '../common/cuerpo-scope';

const EDIT_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;
const READ_ROLES = [...EDIT_ROLES] as const;

@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('summary')
  @Roles(...READ_ROLES)
  getSummary(@Query('companyId') companyId: string | undefined, @Req() req: { user: Actor }) {
    return this.healthService.getSummary(req.user, companyId);
  }

  @Get('expiring')
  @Roles(...READ_ROLES)
  getExpiring(
    @Query('companyId') companyId: string | undefined,
    @Query('days') days: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.findExpiring(req.user, companyId, days ? Number(days) : undefined);
  }

  @Get('roster')
  @Roles(...READ_ROLES)
  getRoster(@Query('companyId') companyId: string, @Req() req: { user: Actor }) {
    return this.healthService.rosterByCompany(req.user, companyId);
  }

  @Get('records/:userId')
  getRecord(@Param('userId') userId: string, @Req() req: { user: Actor & { id: string } }) {
    return this.healthService.getRecordByUserId(userId, req.user);
  }

  @Post('records/:userId')
  @Roles(...EDIT_ROLES)
  createRecord(
    @Param('userId') userId: string,
    @Body() dto: CreateHealthRecordDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.upsertRecord(userId, dto, req.user);
  }

  @Patch('records/:userId')
  @Roles(...EDIT_ROLES)
  updateRecord(
    @Param('userId') userId: string,
    @Body() dto: UpdateHealthRecordDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.updateRecord(userId, dto, req.user);
  }

  @Delete('records/:userId')
  @Roles(...EDIT_ROLES)
  deleteRecord(@Param('userId') userId: string, @Req() req: { user: Actor }) {
    return this.healthService.deleteRecord(userId, req.user);
  }

  @Post('records/:userId/ensure')
  @Roles(...EDIT_ROLES)
  ensureRecord(
    @Param('userId') userId: string,
    @Body('companyId') companyId: string,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.ensureRecordForUser(userId, companyId, req.user);
  }

  @Post('records/:userId/exams')
  @Roles(...EDIT_ROLES)
  addExam(@Param('userId') userId: string, @Body() dto: CreateMedicalExamDto, @Req() req: { user: Actor }) {
    return this.healthService.addExam(userId, dto, req.user);
  }

  @Patch('exams/:id')
  @Roles(...EDIT_ROLES)
  updateExam(@Param('id') id: string, @Body() dto: UpdateMedicalExamDto, @Req() req: { user: Actor }) {
    return this.healthService.updateExam(id, dto, req.user);
  }

  @Delete('exams/:id')
  @Roles(...EDIT_ROLES)
  removeExam(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.healthService.removeExam(id, req.user);
  }

  @Post('records/:userId/conditions')
  @Roles(...EDIT_ROLES)
  addCondition(
    @Param('userId') userId: string,
    @Body() dto: CreateMedicalConditionDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.addCondition(userId, dto, req.user);
  }

  @Patch('conditions/:id')
  @Roles(...EDIT_ROLES)
  updateCondition(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalConditionDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.updateCondition(id, dto, req.user);
  }

  @Delete('conditions/:id')
  @Roles(...EDIT_ROLES)
  removeCondition(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.healthService.removeCondition(id, req.user);
  }

  @Post('records/:userId/allergies')
  @Roles(...EDIT_ROLES)
  addAllergy(@Param('userId') userId: string, @Body() dto: CreateAllergyDto, @Req() req: { user: Actor }) {
    return this.healthService.addAllergy(userId, dto, req.user);
  }

  @Patch('allergies/:id')
  @Roles(...EDIT_ROLES)
  updateAllergy(@Param('id') id: string, @Body() dto: UpdateAllergyDto, @Req() req: { user: Actor }) {
    return this.healthService.updateAllergy(id, dto, req.user);
  }

  @Delete('allergies/:id')
  @Roles(...EDIT_ROLES)
  removeAllergy(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.healthService.removeAllergy(id, req.user);
  }

  @Post('records/:userId/medications')
  @Roles(...EDIT_ROLES)
  addMedication(
    @Param('userId') userId: string,
    @Body() dto: CreateMedicationDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.addMedication(userId, dto, req.user);
  }

  @Patch('medications/:id')
  @Roles(...EDIT_ROLES)
  updateMedication(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.updateMedication(id, dto, req.user);
  }

  @Delete('medications/:id')
  @Roles(...EDIT_ROLES)
  removeMedication(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.healthService.removeMedication(id, req.user);
  }

  @Post('records/:userId/vaccinations')
  @Roles(...EDIT_ROLES)
  addVaccination(
    @Param('userId') userId: string,
    @Body() dto: CreateVaccinationDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.addVaccination(userId, dto, req.user);
  }

  @Patch('vaccinations/:id')
  @Roles(...EDIT_ROLES)
  updateVaccination(
    @Param('id') id: string,
    @Body() dto: UpdateVaccinationDto,
    @Req() req: { user: Actor },
  ) {
    return this.healthService.updateVaccination(id, dto, req.user);
  }

  @Delete('vaccinations/:id')
  @Roles(...EDIT_ROLES)
  removeVaccination(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.healthService.removeVaccination(id, req.user);
  }
}
