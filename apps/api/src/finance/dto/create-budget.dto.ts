import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum BudgetCategory {
  EQUIPAMIENTO = 'EQUIPAMIENTO',
  VEHICULOS = 'VEHICULOS',
  PERSONAL = 'PERSONAL',
  OPERACIONAL = 'OPERACIONAL',
  INFRAESTRUCTURA = 'INFRAESTRUCTURA',
  CAPACITACION = 'CAPACITACION',
  OTRO = 'OTRO',
}

export class CreateBudgetDto {
  @Type(() => Number) @IsInt() @Min(2000) year: number;
  @IsEnum(BudgetCategory) category: BudgetCategory;
  @IsString() @IsNotEmpty() description: string;
  @Type(() => Number) @IsNumber() @Min(0) planned: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) executed?: number;
  @IsOptional() @IsString() notes?: string;
  @IsString() @IsNotEmpty() companyId: string;
}
