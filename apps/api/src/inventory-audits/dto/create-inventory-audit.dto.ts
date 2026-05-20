import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInventoryAuditDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  includeVehicles?: boolean;

  @IsOptional()
  @IsBoolean()
  includeEquipment?: boolean;
}
