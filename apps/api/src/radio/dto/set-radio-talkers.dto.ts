import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class SetRadioTalkersDto {
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  userIds: string[];
}
