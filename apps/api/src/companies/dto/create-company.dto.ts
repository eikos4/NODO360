import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() name: string;
  @IsInt() number: number;
  @IsString() @IsNotEmpty() region: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() address: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() headquartersImageUrl?: string;
}
