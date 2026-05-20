import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum EquipmentStatus {
  OPERATIVO = 'OPERATIVO',
  EN_REPARACION = 'EN_REPARACION',
  FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO',
}

export class CreateVehicleDto {
  @IsString() @IsNotEmpty() patent: string;
  @IsString() @IsNotEmpty() brand: string;
  @IsString() @IsNotEmpty() model: string;
  @Type(() => Number) @IsInt() year: number;
  @IsString() @IsNotEmpty() type: string;
  @IsOptional() @IsEnum(EquipmentStatus) status?: EquipmentStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) kilometers?: number;
  @IsOptional() @Type(() => Date) lastMaintenanceAt?: Date;
  @IsOptional() @Type(() => Date) nextMaintenanceAt?: Date;
  @IsOptional() @IsString() imageUrl?: string;
  @IsString() @IsNotEmpty() companyId: string;
}
