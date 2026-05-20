import { PartialType } from '@nestjs/mapped-types';
import { CreateHealthRecordDto } from './create-health-record.dto';
import { BloodType } from '@prisma/client';

export class UpdateHealthRecordDto extends PartialType(CreateHealthRecordDto) {
  bloodType?: BloodType;
}
