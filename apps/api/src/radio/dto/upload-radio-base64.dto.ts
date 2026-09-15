import { IsOptional, IsString } from 'class-validator';

export class UploadRadioBase64Dto {
  @IsString()
  audio: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  filename?: string;
}
