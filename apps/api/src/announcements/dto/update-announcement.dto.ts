import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnouncementDto, AnnouncementType, AnnouncementPriority, AnnouncementTargetAudience } from './create-announcement.dto';
import { IsString, IsEnum, IsOptional, IsDateString, IsArray, IsBoolean } from 'class-validator';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

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
