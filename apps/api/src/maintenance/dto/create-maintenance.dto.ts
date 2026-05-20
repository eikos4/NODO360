import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MaintenanceType {
  PREVENTIVA = 'PREVENTIVA',
  CORRECTIVA = 'CORRECTIVA',
  REVISION = 'REVISION',
}

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType) type: MaintenanceType;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsDateString() date: string;
  @IsOptional() @IsString() workshopName?: string;
  @IsString() @IsNotEmpty() vehicleId: string;
}
