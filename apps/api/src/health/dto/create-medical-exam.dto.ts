import { MedicalExamType, MedicalExamStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateMedicalExamDto {
  @IsEnum(MedicalExamType)
  type: MedicalExamType;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  examDate: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsEnum(MedicalExamStatus)
  @IsOptional()
  status?: MedicalExamStatus;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
