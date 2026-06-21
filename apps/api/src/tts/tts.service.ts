import { Injectable } from '@nestjs/common';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';
import type { TtsVoiceId } from './dto/synthesize-tts.dto';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

@Injectable()
export class TtsService {
  async synthesize(
    text: string,
    voiceId: TtsVoiceId,
    ratePercent = 0,
  ): Promise<{ buffer: Buffer; mime: string }> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const rate = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
    const { audioStream } = tts.toStream(escapeXml(text.trim()), { rate });
    const buffer = await streamToBuffer(audioStream);
    tts.close();

    return { buffer, mime: 'audio/mpeg' };
  }
}
