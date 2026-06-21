import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEmergencyBitacoraDto } from './create-emergency-bitacora.dto';

export class UpdateEmergencyBitacoraDto extends PartialType(
  OmitType(CreateEmergencyBitacoraDto, ['companyId', 'incidentId', 'source'] as const),
) {}
