import { IsString, IsEnum, IsOptional, IsInt, IsNumber } from 'class-validator';

export enum HydrantType {
  PIBA = 'PIBA',
  COLUMNAR = 'COLUMNAR',
  SUBTERRANEO = 'SUBTERRANEO',
  OTRO = 'OTRO',
}

export enum HydrantStatus {
  OPERATIVO = 'OPERATIVO',
  NO_OPERATIVO = 'NO_OPERATIVO',
  EN_MANTENCION = 'EN_MANTENCION',
}

export class CreateHydrantDto {
  @IsString()
  code: string;

  @IsEnum(HydrantType)
  @IsOptional()
  type?: HydrantType;

  @IsEnum(HydrantStatus)
  @IsOptional()
  status?: HydrantStatus;

  @IsInt()
  @IsOptional()
  diameter?: number;

  @IsNumber()
  @IsOptional()
  pressure?: number;

  @IsNumber()
  @IsOptional()
  flowRate?: number;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  companyId: string;
}
