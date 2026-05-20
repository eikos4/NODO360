import { IsOptional, IsString } from 'class-validator';

export class CloseGuardLogDto {
  @IsOptional()
  @IsString()
  closingNotes?: string;
}
