import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EquipmentStatus } from '@prisma/client';
import { InventoryAuditItemResult } from '@prisma/client';

export class VerifyAuditItemDto {
  @IsBoolean()
  found: boolean;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  physicalStatus?: EquipmentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  physicalQty?: number;

  @IsOptional()
  @IsEnum(InventoryAuditItemResult)
  result?: InventoryAuditItemResult;

  @IsOptional()
  @IsString()
  observations?: string;
}
