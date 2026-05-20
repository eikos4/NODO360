import { IsString, IsOptional, IsInt, IsObject, IsNumber } from 'class-validator';

export class CreateMeetingPointDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  location: { lat: number; lng: number };

  @IsString()
  @IsOptional()
  address?: string;

  @IsInt()
  @IsOptional()
  capacity?: number;

  @IsString()
  companyId: string;
}
