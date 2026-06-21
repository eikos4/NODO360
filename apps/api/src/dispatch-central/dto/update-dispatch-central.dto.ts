import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateDispatchCentralDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede usar minúsculas, números y guiones',
  })
  dispatchSlug?: string;

  @IsOptional()
  @IsBoolean()
  dispatchPublicEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dispatchAvailable?: boolean;
}
