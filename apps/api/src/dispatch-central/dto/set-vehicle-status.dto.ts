import { IsEnum } from 'class-validator';
import { EquipmentStatus } from '@prisma/client';

export class SetVehicleStatusDto {
  @IsEnum(EquipmentStatus)
  status: EquipmentStatus;
}
