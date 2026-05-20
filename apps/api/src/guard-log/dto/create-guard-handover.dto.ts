import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateGuardHandoverDto {
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsDateString()
  handedAt?: string;
}
