import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Role } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() isActive?: boolean;
  @IsOptional() @IsString() photoUrl?: string;
  /** null para quitar el número */
  @IsOptional()
  operativeNumber?: number | null;
}
