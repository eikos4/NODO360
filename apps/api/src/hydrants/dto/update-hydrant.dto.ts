import { PartialType } from '@nestjs/mapped-types';
import { CreateHydrantDto, HydrantType, HydrantStatus } from './create-hydrant.dto';
import { IsString, IsEnum, IsOptional, IsInt, IsNumber, IsDateString } from 'class-validator';

export class UpdateHydrantDto extends PartialType(CreateHydrantDto) {
  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(HydrantType)
  @IsOptional()
  type?: HydrantType;

  @IsEnum(HydrantStatus)
  @IsOptional()
  status?: HydrantStatus;

  @IsInt()
  @IsOptional()
  diameter?: number;

  @IsNumber()
  @IsOptional()
  pressure?: number;

  @IsNumber()
  @IsOptional()
  flowRate?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsDateString()
  @IsOptional()
  lastInspectionAt?: string;

  @IsDateString()
  @IsOptional()
  nextInspectionAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
