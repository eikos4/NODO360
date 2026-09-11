import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddCompanyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  number: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}
