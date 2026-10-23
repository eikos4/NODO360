import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestLinkDto {
  @IsString()
  toCuerpoId: string;

  @IsString()
  @IsOptional()
  fromCuerpoId?: string;

  @IsString()
  @IsOptional()
  incidentId?: string;

  @IsString()
  @MaxLength(280)
  @IsOptional()
  note?: string;
}
