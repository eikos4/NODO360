import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';

export class CreateShiftDto {
  @IsDateString() date: string;
  @IsString() @IsNotEmpty() startTime: string;
  @IsString() @IsNotEmpty() endTime: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) userIds?: string[];
}
