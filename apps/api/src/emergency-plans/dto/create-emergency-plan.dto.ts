import { IsString, IsEnum, IsObject, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export enum EmergencyType {
  INCENDIO = 'INCENDIO',
  TERREMOTO = 'TERREMOTO',
  INUNDACION = 'INUNDACION',
  DERRUMBE = 'DERRUMBE',
  ACCIDENTE = 'ACCIDENTE',
  OTRO = 'OTRO',
}

export enum EmergencySeverity {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum EmergencyPlanStatusDto {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateEmergencyPlanDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(EmergencyType)
  emergencyType: EmergencyType;

  @IsEnum(EmergencySeverity)
  severity: EmergencySeverity;

  @IsObject()
  procedures: any;

  @IsOptional()
  @IsArray()
  checklist?: any[];

  @IsOptional()
  @IsEnum(EmergencyPlanStatusDto)
  status?: EmergencyPlanStatusDto;

  @IsString()
  companyId: string;
}
