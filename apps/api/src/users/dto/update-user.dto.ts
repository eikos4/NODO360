import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Role } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsArray() @IsEnum(Role, { each: true }) roles?: Role[];
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsString() companyId?: string | null;
  @IsOptional() isActive?: boolean;
  @IsOptional() @IsString() photoUrl?: string;
  /** null para quitar el número */
  @IsOptional()
  operativeNumber?: number | null;
  @IsOptional() @IsBoolean() isMaquinista?: boolean;
}
