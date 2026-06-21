import { EmergencyBitacoraSource } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmergencyBitacoraDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  emergencyType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString()
  occurredAt: string;

  @IsString()
  @MinLength(10)
  summary: string;

  @IsOptional()
  @IsString()
  actionsTaken?: string;

  @IsOptional()
  @IsString()
  personnelNotes?: string;

  @IsOptional()
  @IsString()
  vehicleNotes?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsEnum(EmergencyBitacoraSource)
  source?: EmergencyBitacoraSource;
}
