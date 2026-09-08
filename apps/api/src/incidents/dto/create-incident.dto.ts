import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, IsNumber, IsIn } from 'class-validator';

export class CreateIncidentDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsNotEmpty() address: string;
  @IsOptional() @IsIn(['ACTIVE', 'ARRIVED', 'CLOSED', 'CANCELLED'])
  status?: 'ACTIVE' | 'ARRIVED' | 'CLOSED' | 'CANCELLED';
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() locationPinToken?: string;
  @IsDateString() dispatchedAt: string;
  @IsOptional() @IsDateString() arrivedAt?: string;
  @IsOptional() @IsDateString() closedAt?: string;
  @IsOptional() @IsString() report?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsString() @IsNotEmpty() companyId: string;
  @IsOptional() @IsArray() @IsString({ each: true }) participantIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) vehicleIds?: string[];
  @IsOptional() @IsString() dispatchSource?: string;
  @IsOptional() @IsString() dispatchNotes?: string;
}
