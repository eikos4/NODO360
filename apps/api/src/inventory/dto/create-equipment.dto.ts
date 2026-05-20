import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum EquipmentStatus {
  OPERATIVO = 'OPERATIVO',
  EN_REPARACION = 'EN_REPARACION',
  FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO',
}

export class CreateEquipmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() category: string;
  @IsOptional() @IsEnum(EquipmentStatus) status?: EquipmentStatus;
  @IsOptional() @IsString() serial?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsString() @IsNotEmpty() companyId: string;
}
