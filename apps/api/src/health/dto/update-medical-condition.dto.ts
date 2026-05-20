import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicalConditionDto } from './create-medical-condition.dto';

export class UpdateMedicalConditionDto extends PartialType(CreateMedicalConditionDto) {}
