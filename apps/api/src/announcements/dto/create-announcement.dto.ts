import { IsString, IsEnum, IsOptional, IsDateString, IsArray, IsBoolean, ArrayMaxSize, MaxLength } from 'class-validator';

export enum AnnouncementType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  OFFICIAL = 'OFFICIAL',
  EVENT = 'EVENT',
  NEWS = 'NEWS',
  URGENT_NOTICE = 'URGENT_NOTICE',
  TRAINING = 'TRAINING',
  CITATION = 'CITATION',
  SAFETY = 'SAFETY',
  FLEET = 'FLEET',
  GUARD = 'GUARD',
  ADMIN = 'ADMIN',
  WELFARE = 'WELFARE',
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
  targetCompanyIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRoles?: string[];

  @IsBoolean()
  @IsOptional()
  requireAck?: boolean;

  @IsString()
  @MaxLength(240)
  @IsOptional()
  pollQuestion?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(6)
  @IsOptional()
  pollOptions?: string[];

  @IsDateString()
  @IsOptional()
  pollClosesAt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
