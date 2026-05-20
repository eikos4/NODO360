import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateVaccinationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  vaccineType?: string;

  @IsString()
  @IsOptional()
  dose?: string;

  @IsDateString()
  @IsOptional()
  administeredAt?: string;

  @IsDateString()
  @IsOptional()
  nextDoseAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
