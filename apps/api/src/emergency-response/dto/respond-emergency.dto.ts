import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const EMERGENCY_RESPONSE_STATUSES = [
  'GOING',
  'NOT_GOING',
  'NOT_AVAILABLE',
  'ON_SCENE',
] as const;

export type EmergencyResponseStatusDto = (typeof EMERGENCY_RESPONSE_STATUSES)[number];

export class RespondEmergencyDto {
  @IsIn([...EMERGENCY_RESPONSE_STATUSES])
  status: EmergencyResponseStatusDto;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkEmergencyLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  note?: string;
}
