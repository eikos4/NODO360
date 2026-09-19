import { IsArray, IsString } from 'class-validator';

export class AssignIncidentVehiclesDto {
  @IsArray()
  @IsString({ each: true })
  vehicleIds: string[];
}
