import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMANDANTE = 'COMANDANTE',
  CAPITAN = 'CAPITAN',
  OPERADOR_CENTRAL = 'OPERADOR_CENTRAL',
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
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsInt() @Min(1) @Max(999) operativeNumber?: number;
}
