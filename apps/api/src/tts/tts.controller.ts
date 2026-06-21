import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SynthesizeTtsDto } from './dto/synthesize-tts.dto';
import { TtsService } from './tts.service';

@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('synthesize')
  async synthesize(@Body() dto: SynthesizeTtsDto, @Res() res: Response) {
    const { buffer, mime } = await this.ttsService.synthesize(
      dto.text,
      dto.voiceId,
      dto.ratePercent ?? 0,
    );
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
