import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ToggleByOperativeNumberDto {
  @IsInt()
  @Min(1)
  @Max(999)
  operativeNumber: number;

  /** Si se omite, invierte el estado actual */
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
