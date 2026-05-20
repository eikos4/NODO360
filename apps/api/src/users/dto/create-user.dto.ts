import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMANDANTE = 'COMANDANTE',
  CAPITAN = 'CAPITAN',
  ENCARGADO_MATERIAL = 'ENCARGADO_MATERIAL',
  SECRETARIO = 'SECRETARIO',
  TESORERO = 'TESORERO',
  BOMBERO = 'BOMBERO',
  AUDITOR = 'AUDITOR',
}

export class CreateUserDto {
  @IsString() @IsNotEmpty() rut: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsString() companyId?: string;
}
