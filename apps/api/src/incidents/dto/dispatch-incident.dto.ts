import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsEnum } from 'class-validator';

export enum DispatchSourceDto {
  BOTONERA = 'BOTONERA',
  MANUAL = 'MANUAL',
}

export class DispatchIncidentDto {
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() address: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsString() @IsNotEmpty() companyId: string;
  @IsOptional() @IsArray() @IsString({ each: true }) vehicleIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) participantIds?: string[];
  @IsOptional() @IsString() dispatchNotes?: string;
  @IsOptional() @IsEnum(DispatchSourceDto) dispatchSource?: DispatchSourceDto;
}
