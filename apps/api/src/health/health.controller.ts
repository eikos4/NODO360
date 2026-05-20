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

const EDIT_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;

@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('summary')
  getSummary(@Query('companyId') companyId?: string) {
    return this.healthService.getSummary(companyId);
  }

  @Get('expiring')
  getExpiring(
    @Query('companyId') companyId?: string,
    @Query('days') days?: string,
  ) {
    return this.healthService.findExpiring(
      companyId,
      days ? Number(days) : undefined,
    );
  }

  @Get('roster')
  getRoster(@Query('companyId') companyId: string) {
    return this.healthService.rosterByCompany(companyId);
  }

  @Get('records/:userId')
  getRecord(@Param('userId') userId: string) {
    return this.healthService.getRecordByUserId(userId);
  }

  @Post('records/:userId')
  @Roles(...EDIT_ROLES)
  createRecord(
    @Param('userId') userId: string,
    @Body() dto: CreateHealthRecordDto,
  ) {
    return this.healthService.upsertRecord(userId, dto);
  }

  @Patch('records/:userId')
  @Roles(...EDIT_ROLES)
  updateRecord(
    @Param('userId') userId: string,
    @Body() dto: UpdateHealthRecordDto,
  ) {
    return this.healthService.updateRecord(userId, dto);
  }

  @Delete('records/:userId')
  @Roles(...EDIT_ROLES)
  deleteRecord(@Param('userId') userId: string) {
    return this.healthService.deleteRecord(userId);
  }

  @Post('records/:userId/ensure')
  @Roles(...EDIT_ROLES)
  ensureRecord(
    @Param('userId') userId: string,
    @Body('companyId') companyId: string,
  ) {
    return this.healthService.ensureRecordForUser(userId, companyId);
  }

  @Post('records/:userId/exams')
  @Roles(...EDIT_ROLES)
  addExam(@Param('userId') userId: string, @Body() dto: CreateMedicalExamDto) {
    return this.healthService.addExam(userId, dto);
  }

  @Patch('exams/:id')
  @Roles(...EDIT_ROLES)
  updateExam(@Param('id') id: string, @Body() dto: UpdateMedicalExamDto) {
    return this.healthService.updateExam(id, dto);
  }

  @Delete('exams/:id')
  @Roles(...EDIT_ROLES)
  removeExam(@Param('id') id: string) {
    return this.healthService.removeExam(id);
  }

  @Post('records/:userId/conditions')
  @Roles(...EDIT_ROLES)
  addCondition(
    @Param('userId') userId: string,
    @Body() dto: CreateMedicalConditionDto,
  ) {
    return this.healthService.addCondition(userId, dto);
  }

  @Patch('conditions/:id')
  @Roles(...EDIT_ROLES)
  updateCondition(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalConditionDto,
  ) {
    return this.healthService.updateCondition(id, dto);
  }

  @Delete('conditions/:id')
  @Roles(...EDIT_ROLES)
  removeCondition(@Param('id') id: string) {
    return this.healthService.removeCondition(id);
  }

  @Post('records/:userId/allergies')
  @Roles(...EDIT_ROLES)
  addAllergy(@Param('userId') userId: string, @Body() dto: CreateAllergyDto) {
    return this.healthService.addAllergy(userId, dto);
  }

  @Patch('allergies/:id')
  @Roles(...EDIT_ROLES)
  updateAllergy(@Param('id') id: string, @Body() dto: UpdateAllergyDto) {
    return this.healthService.updateAllergy(id, dto);
  }

  @Delete('allergies/:id')
  @Roles(...EDIT_ROLES)
  removeAllergy(@Param('id') id: string) {
    return this.healthService.removeAllergy(id);
  }

  @Post('records/:userId/medications')
  @Roles(...EDIT_ROLES)
  addMedication(
    @Param('userId') userId: string,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.healthService.addMedication(userId, dto);
  }

  @Patch('medications/:id')
  @Roles(...EDIT_ROLES)
  updateMedication(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.healthService.updateMedication(id, dto);
  }

  @Delete('medications/:id')
  @Roles(...EDIT_ROLES)
  removeMedication(@Param('id') id: string) {
    return this.healthService.removeMedication(id);
  }

  @Post('records/:userId/vaccinations')
  @Roles(...EDIT_ROLES)
  addVaccination(
    @Param('userId') userId: string,
    @Body() dto: CreateVaccinationDto,
  ) {
    return this.healthService.addVaccination(userId, dto);
  }

  @Patch('vaccinations/:id')
  @Roles(...EDIT_ROLES)
  updateVaccination(
    @Param('id') id: string,
    @Body() dto: UpdateVaccinationDto,
  ) {
    return this.healthService.updateVaccination(id, dto);
  }

  @Delete('vaccinations/:id')
  @Roles(...EDIT_ROLES)
  removeVaccination(@Param('id') id: string) {
    return this.healthService.removeVaccination(id);
  }
}
