import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';
import type { TtsVoiceId } from './dto/synthesize-tts.dto';
import './patch-msedge-tts';

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
    try {
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const rate = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
      const { audioStream } = tts.toStream(escapeXml(text.trim()), { rate });
      const buffer = await streamToBuffer(audioStream);
      return { buffer, mime: 'audio/mpeg' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS no disponible';
      throw new ServiceUnavailableException(
        message.includes('429')
          ? 'El servicio de voz está ocupado. Reintentá en unos segundos.'
          : message.includes('403')
            ? 'El servicio de voz de Microsoft rechazó la conexión. Reintentá en unos segundos.'
            : 'No se pudo generar la voz de despacho.',
      );
    } finally {
      tts.close();
    }
  }
}
