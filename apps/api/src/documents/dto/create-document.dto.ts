import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateDocumentDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() fileUrl: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsString() @IsNotEmpty() uploadedBy: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() notes?: string;
}
