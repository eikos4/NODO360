import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECIBIDA = 'RECIBIDA',
  RECHAZADA = 'RECHAZADA',
}

export class CreatePurchaseDto {
  @IsString() @IsNotEmpty() number: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsNotEmpty() supplier: string;
  @IsOptional() @IsEnum(PurchaseStatus) status?: PurchaseStatus;
  @Type(() => Number) @IsNumber() @Min(0) totalAmount: number;
  @IsOptional() @IsDateString() approvedAt?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsString() @IsNotEmpty() companyId: string;
}
