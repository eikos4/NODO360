import { IsBoolean, IsString } from 'class-validator';

export class ToggleStationAvailabilityDto {
  @IsString()
  userId: string;

  @IsBoolean()
  available: boolean;
}
