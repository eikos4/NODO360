import { PartialType } from '@nestjs/mapped-types';
import {
  CreateEmergencyPlanDto,
  EmergencyType,
  EmergencySeverity,
  EmergencyPlanStatusDto,
} from './create-emergency-plan.dto';
import { IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';

export class UpdateEmergencyPlanDto extends PartialType(CreateEmergencyPlanDto) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EmergencyType)
  @IsOptional()
  emergencyType?: EmergencyType;

  @IsEnum(EmergencySeverity)
  @IsOptional()
  severity?: EmergencySeverity;

  @IsObject()
  @IsOptional()
  procedures?: any;

  @IsOptional()
  @IsArray()
  checklist?: any[];

  @IsOptional()
  @IsEnum(EmergencyPlanStatusDto)
  status?: EmergencyPlanStatusDto;

  @IsString()
  @IsOptional()
  companyId?: string;
}
