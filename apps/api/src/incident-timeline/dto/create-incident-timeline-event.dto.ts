import { IncidentTimelineKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIncidentTimelineEventDto {
  @IsString()
  @MinLength(1)
  incidentId: string;

  @IsEnum(IncidentTimelineKind)
  kind: IncidentTimelineKind;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
