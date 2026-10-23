import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIFE_KINDS, LIFE_PRIORITIES, LIFE_STATUSES } from './create-life-item.dto';

export class UpdateLifeItemDto {
  @IsIn(LIFE_KINDS)
  @IsOptional()
  kind?: (typeof LIFE_KINDS)[number];

  @IsString()
  @MaxLength(180)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;

  @IsIn(LIFE_STATUSES)
  @IsOptional()
  status?: (typeof LIFE_STATUSES)[number];

  @IsIn(LIFE_PRIORITIES)
  @IsOptional()
  priority?: (typeof LIFE_PRIORITIES)[number];

  @IsDateString()
  @IsOptional()
  dueAt?: string | null;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;
}
