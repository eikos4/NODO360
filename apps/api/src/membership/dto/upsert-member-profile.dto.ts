import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum MembershipStatus {
  ACTIVO = 'ACTIVO',
  MOROSO = 'MOROSO',
  SUSPENDIDO = 'SUSPENDIDO',
  INACTIVO = 'INACTIVO',
}

export class UpsertMemberProfileDto {
  @IsOptional()
  @IsString()
  memberNumber?: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  companyId: string;
}
