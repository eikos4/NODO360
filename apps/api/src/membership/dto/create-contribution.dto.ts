import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  DEPOSITO = 'DEPOSITO',
  OTRO = 'OTRO',
}

export enum ContributionStatus {
  PAGADO = 'PAGADO',
  PARCIAL = 'PARCIAL',
  EXONERADO = 'EXONERADO',
}

export class CreateContributionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paidAt: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsEnum(ContributionStatus)
  status?: ContributionStatus;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  userId: string;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  feeId?: string;

  @IsOptional()
  @IsString()
  recordedBy?: string;
}
