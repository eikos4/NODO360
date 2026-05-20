import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum CertificationCategoryDto {
  LICENCIA = 'LICENCIA',
  EPP = 'EPP',
  MEDICO = 'MEDICO',
  CURSO = 'CURSO',
  HABILITACION = 'HABILITACION',
  OTRO = 'OTRO',
}

export class CreateCertificationDto {
  @IsString()
  name: string;

  @IsEnum(CertificationCategoryDto)
  @IsOptional()
  category?: CertificationCategoryDto;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsDateString()
  @IsOptional()
  issuedAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  userId: string;

  @IsString()
  companyId: string;
}
