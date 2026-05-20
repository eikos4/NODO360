import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicalExamDto } from './create-medical-exam.dto';
import { MedicalExamStatus } from '@prisma/client';

export class UpdateMedicalExamDto extends PartialType(CreateMedicalExamDto) {
  status?: MedicalExamStatus;
}
