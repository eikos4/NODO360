import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ToggleMaquinistaDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
