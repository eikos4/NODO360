import { PartialType } from '@nestjs/mapped-types';
import { CreateMembershipFeeDto } from './create-membership-fee.dto';

export class UpdateMembershipFeeDto extends PartialType(CreateMembershipFeeDto) {}
