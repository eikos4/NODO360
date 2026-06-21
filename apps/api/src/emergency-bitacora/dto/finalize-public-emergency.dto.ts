import { IsOptional, IsString, MinLength } from 'class-validator';

export class FinalizePublicEmergencyDto {
  @IsString()
  incidentId: string;

  @IsString()
  @MinLength(10)
  summary: string;

  @IsOptional()
  @IsString()
  actionsTaken?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
