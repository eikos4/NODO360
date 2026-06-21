import { IsString } from 'class-validator';

export class ClosePublicEmergencyDto {
  @IsString()
  incidentId: string;
}
