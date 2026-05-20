import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsString() @IsNotEmpty() number: string;
  @IsString() @IsNotEmpty() supplier: string;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() fileUrl?: string;
  @IsDateString() issuedAt: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() purchaseId?: string;
  @IsString() @IsNotEmpty() companyId: string;
}
