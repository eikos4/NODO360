import { IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export enum Role {
  KODESK = 'KODESK',
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMANDANTE = 'COMANDANTE',
  CAPITAN = 'CAPITAN',
  OPERADOR_CENTRAL = 'OPERADOR_CENTRAL',
  ENCARGADO_MATERIAL = 'ENCARGADO_MATERIAL',
  SECRETARIO = 'SECRETARIO',
  TESORERO = 'TESORERO',
  BOMBERO = 'BOMBERO',
  BOMBERO_HONORARIO = 'BOMBERO_HONORARIO',
  BOMBERO_INICIAL = 'BOMBERO_INICIAL',
  BOMBERO_PROFESIONAL = 'BOMBERO_PROFESIONAL',
  AUDITOR = 'AUDITOR',
}

export class CreateUserDto {
  @IsString() @IsNotEmpty() rut: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsArray() @IsEnum(Role, { each: true }) roles?: Role[];
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsInt() @Min(1) @Max(999) operativeNumber?: number;
}
