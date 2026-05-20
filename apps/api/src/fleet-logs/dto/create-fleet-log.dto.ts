import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { FleetLogType } from '@prisma/client';

export class CreateFleetLogDto {
  @IsEnum(FleetLogType)
  type: FleetLogType;

  @IsDateString()
  date: string;

  @IsUUID()
  vehicleId: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsInt()
  @Min(0)
  odometerKm: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelLiters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelCost?: number;

  @IsOptional()
  @IsString()
  fuelStation?: string;

  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;

  @IsOptional()
  @IsString()
  serviceLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
