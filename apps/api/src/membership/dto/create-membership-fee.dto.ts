import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsInt, Min, Max, IsDateString } from 'class-validator';

export enum FeeFrequency {
  MENSUAL = 'MENSUAL',
  ANUAL = 'ANUAL',
  EXTRAORDINARIA = 'EXTRAORDINARIA',
}

export class CreateMembershipFeeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(FeeFrequency)
  frequency: FeeFrequency;

  @IsInt()
  year: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  companyId: string;
}
