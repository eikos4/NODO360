import { IsOptional, IsString } from 'class-validator';

export class CloseInventoryAuditDto {
  @IsOptional()
  @IsString()
  closingNotes?: string;
}
