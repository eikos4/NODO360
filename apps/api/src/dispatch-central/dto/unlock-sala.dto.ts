import { IsString, Matches } from 'class-validator';

export class UnlockSalaDto {
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'El PIN debe tener entre 4 y 8 dígitos' })
  pin!: string;
}
