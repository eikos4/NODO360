import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';

export enum DrillStatusDto {
  PROGRAMADO = 'PROGRAMADO',
  EJECUTADO = 'EJECUTADO',
  CANCELADO = 'CANCELADO',
}

export class CreateDrillDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  scheduledAt: string;

  @IsDateString()
  @IsOptional()
  executedAt?: string;

  @IsEnum(DrillStatusDto)
  @IsOptional()
  status?: DrillStatusDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  emergencyPlanId?: string;

  @IsString()
  companyId: string;
}
