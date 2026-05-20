import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingPointDto } from './create-meeting-point.dto';

export class UpdateMeetingPointDto extends PartialType(CreateMeetingPointDto) {}
