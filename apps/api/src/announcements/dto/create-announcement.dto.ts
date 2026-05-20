import { IsString, IsEnum, IsOptional, IsDateString, IsArray, IsBoolean } from 'class-validator';

export enum AnnouncementType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  OFFICIAL = 'OFFICIAL',
  EVENT = 'EVENT',
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AnnouncementTargetAudience {
  ALL = 'ALL',
  OFFICERS = 'OFFICERS',
  ALL_PERSONNEL = 'ALL_PERSONNEL',
}

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(AnnouncementType)
  @IsOptional()
  type?: AnnouncementType;

  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority;

  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @IsString()
  @IsOptional()
  eventLocation?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(AnnouncementTargetAudience)
  @IsOptional()
  targetAudience?: AnnouncementTargetAudience;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsString()
  @IsOptional()
  companyId?: string;
}
