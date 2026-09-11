import { IsBoolean } from 'class-validator';

export class ToggleMyAvailabilityDto {
  @IsBoolean()
  available: boolean;
}
