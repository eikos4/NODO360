import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';
import type { TtsVoiceId } from './dto/synthesize-tts.dto';
import {
  EDGE_TTS_HOSTS,
  setEdgeTtsClockOffset,
  setEdgeTtsHost,
} from './patch-msedge-tts';

const COOLDOWN_MS = 2 * 60 * 1000;
const CLOCK_OFFSETS_MS = [0, 300_000, -300_000];

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

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'TTS no disponible');
}

function isForbidden(error: unknown): boolean {
  return /403|unexpected server response/i.test(errorText(error));
}

function withQuietEdgeErrors<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map((arg) => String(arg)).join(' ');
    if (text.includes('Edge TTS WebSocket error')) return;
    original.apply(console, args as []);
  };
  return fn().finally(() => {
    console.error = original;
  });
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private cooldownUntil = 0;
  private lastWarnAt = 0;

  async synthesize(
    text: string,
    voiceId: TtsVoiceId,
    ratePercent = 0,
  ): Promise<{ buffer: Buffer; mime: string }> {
    if (Date.now() < this.cooldownUntil) {
      throw new ServiceUnavailableException(
        'El servicio de voz de Microsoft no está disponible ahora. El despacho sigue funcionando sin audio.',
      );
    }

    let lastError: unknown;
    for (const host of EDGE_TTS_HOSTS) {
      setEdgeTtsHost(host);
      for (const offset of CLOCK_OFFSETS_MS) {
        setEdgeTtsClockOffset(offset);
        try {
          return await withQuietEdgeErrors(() => this.synthesizeOnce(text, voiceId, ratePercent));
        } catch (error) {
          lastError = error;
          if (!isForbidden(error)) break;
        }
      }
    }

    this.cooldownUntil = Date.now() + COOLDOWN_MS;
    const message = errorText(lastError);
    if (Date.now() - this.lastWarnAt > COOLDOWN_MS) {
      this.lastWarnAt = Date.now();
      this.logger.warn(`TTS no disponible: ${message}`);
    }

    throw new ServiceUnavailableException(
      message.includes('429')
        ? 'El servicio de voz está ocupado. Reintentá en unos segundos.'
        : isForbidden(lastError)
          ? 'El servicio de voz de Microsoft rechazó la conexión. El despacho sigue funcionando sin audio.'
          : 'No se pudo generar la voz de despacho.',
    );
  }

  private async synthesizeOnce(
    text: string,
    voiceId: TtsVoiceId,
    ratePercent: number,
  ): Promise<{ buffer: Buffer; mime: string }> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const rate = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
      const { audioStream } = tts.toStream(escapeXml(text.trim()), { rate });
      const buffer = await streamToBuffer(audioStream);
      return { buffer, mime: 'audio/mpeg' };
    } finally {
      tts.close();
    }
  }
}
