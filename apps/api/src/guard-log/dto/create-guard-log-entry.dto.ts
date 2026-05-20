import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum GuardLogEntryTypeDto {
  NOVEDAD = 'NOVEDAD',
  REVISION = 'REVISION',
  VISITA = 'VISITA',
  COMUNICACION = 'COMUNICACION',
  MANTENIMIENTO = 'MANTENIMIENTO',
  OTRO = 'OTRO',
}

export class CreateGuardLogEntryDto {
  @IsOptional()
  @IsEnum(GuardLogEntryTypeDto)
  type?: GuardLogEntryTypeDto;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
