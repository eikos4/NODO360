import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CommandNoveltyCategory,
  CommandRequestPriority,
  CommandRequestStatus,
  CommandResourceStatus,
  CommandSectorStatus,
} from '@prisma/client';

const POINT_KIND_VALUES = [
  'ABASTECIMIENTO',
  'FUENTE_AGUA',
  'HIDRANTE',
  'SEGURIDAD',
  'PUESTO_MEDICO',
  'REHABILITACION',
  'HELIPUERTO',
  'EVACUACION',
  'PUNTO_ENCUENTRO',
  'ACCESO',
  'AREA_ESPERA',
  'PELIGRO',
  'CORTAFUEGO',
  'LOGISTICA',
  'COMUNICACIONES',
  'ALBERGUE',
  'OTRO',
] as const;

export class OpenCommandPostDto {
  @IsString()
  incidentId: string;

  @IsString()
  @MaxLength(120)
  commanderName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  rank?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class TransferCommandDto {
  @IsString()
  @MaxLength(120)
  commanderName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  rank?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateExternalResourceDto {
  @IsString()
  @MaxLength(160)
  institution: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsString()
  @MaxLength(80)
  label: string;

  @IsString()
  @MaxLength(80)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  staffing?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  contact?: string;

  @IsOptional()
  @IsEnum(CommandResourceStatus)
  status?: CommandResourceStatus;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsEnum(CommandResourceStatus)
  status?: CommandResourceStatus;

  @IsOptional()
  @IsString()
  sectorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mission?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  staffing?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}

export class SectorPointDto {
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;
}

export class CreateSectorDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => SectorPointDto)
  polygon?: SectorPointDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @IsEnum(CommandSectorStatus)
  status?: CommandSectorStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => SectorPointDto)
  polygon?: SectorPointDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class CreateNoveltyDto {
  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsEnum(CommandNoveltyCategory)
  category?: CommandNoveltyCategory;
}

export class CreateRequestDto {
  @IsString()
  @MaxLength(120)
  type: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(CommandRequestPriority)
  priority?: CommandRequestPriority;

  @IsOptional()
  @IsString()
  sectorId?: string;
}

export class UpdateRequestDto {
  @IsEnum(CommandRequestStatus)
  status: CommandRequestStatus;
}

export class CreatePointDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsIn(POINT_KIND_VALUES)
  kind?: (typeof POINT_KIND_VALUES)[number];

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;
}

export class CloseCommandPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
