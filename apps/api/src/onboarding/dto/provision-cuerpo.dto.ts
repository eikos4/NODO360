import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProvisionCompanyRowDto {
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

export class ProvisionCuerpoDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @IsOptional()
  @IsString()
  bodyName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  enablePublicDispatch?: boolean;

  @IsOptional()
  @IsBoolean()
  createCommandStaff?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  defaultPassword?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProvisionCompanyRowDto)
  companies: ProvisionCompanyRowDto[];
}
