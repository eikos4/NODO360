import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConfirmIncidentLocationDto {
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
