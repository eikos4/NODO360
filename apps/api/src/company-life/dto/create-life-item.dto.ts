import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const LIFE_KINDS = ['ASEO', 'TAREA', 'REUNION', 'RECORDATORIO', 'CUMPLE'] as const;
export const LIFE_STATUSES = ['OPEN', 'DONE'] as const;
export const LIFE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export class CreateLifeItemDto {
  @IsIn(LIFE_KINDS)
  kind: (typeof LIFE_KINDS)[number];

  @IsString()
  @MaxLength(180)
  title: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;

  @IsIn(LIFE_PRIORITIES)
  @IsOptional()
  priority?: (typeof LIFE_PRIORITIES)[number];

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
