import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class CreateEvacuationRouteDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  startPoint: { lat: number; lng: number };

  @IsObject()
  endPoint: { lat: number; lng: number };

  @IsArray()
  @IsOptional()
  waypoints?: { lat: number; lng: number }[];

  @IsString()
  @IsOptional()
  buildingId?: string;

  @IsString()
  companyId: string;
}
