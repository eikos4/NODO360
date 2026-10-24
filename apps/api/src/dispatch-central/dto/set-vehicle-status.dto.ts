import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EquipmentStatus } from '@prisma/client';

export class SetVehicleStatusDto {
  @IsEnum(EquipmentStatus)
  status: EquipmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  availableAt?: string;
}
