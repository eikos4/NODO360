import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const TTS_VOICE_IDS = [
  'es-ES-ElviraNeural',
  'es-ES-AlvaroNeural',
  'es-MX-DaliaNeural',
  'es-MX-JorgeNeural',
] as const;

export type TtsVoiceId = (typeof TTS_VOICE_IDS)[number];

export class SynthesizeTtsDto {
  @IsString()
  @MaxLength(2000)
  text!: string;

  @IsIn([...TTS_VOICE_IDS])
  voiceId!: TtsVoiceId;

  @IsOptional()
  @IsNumber()
  @Min(-50)
  @Max(50)
  ratePercent?: number;
}
