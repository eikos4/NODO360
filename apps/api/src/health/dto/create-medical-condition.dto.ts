import { HealthConditionSeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class CreateMedicalConditionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  diagnosedAt?: string;

  @IsEnum(HealthConditionSeverity)
  @IsOptional()
  severity?: HealthConditionSeverity;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
