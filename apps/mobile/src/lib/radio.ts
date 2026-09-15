import { Capacitor } from '@capacitor/core';
import { io, type Socket } from 'socket.io-client';
import { api, API_URL } from './api';

export type RadioTx = {
  id: string;
  channelId: string;
  userId: string;
  speakerName: string;
  role: string;
  audioUrl: string;
  durationMs: number;
  at: number;
};

export type RadioChannelState = {
  channelId: string;
  listeners: number;
  participants: { userId: string; firstName: string; lastName: string; role: string }[];
  talker: { userId: string; socketId: string; speakerName: string; since: number } | null;
  recent: RadioTx[];
};

export const radioSocketOrigin = API_URL.replace(/\/api\/?$/, '') || window.location.origin;

let shared: Socket | null = null;

export function getRadioSocket(token: string): Socket {
  if (shared) {
    shared.auth = { token };
    if (!shared.connected) shared.connect();
    return shared;
  }
  shared = io(`${radioSocketOrigin}/radio`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    autoConnect: true,
  });
  return shared;
}

export function disconnectRadioSocket() {
  shared?.disconnect();
  shared = null;
}

export function incidentChannelId(incidentId: string) {
  return `incident:${incidentId}`;
}

export function companyChannelId(companyId: string) {
  return `company:${companyId}`;
}

export function resolveRadioAudioUrl(audioUrl?: string | null): string {
  const raw = String(audioUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
  const origin = radioSocketOrigin.replace(/\/$/, '');
  return raw.startsWith('/') ? `${origin}${raw}` : `${origin}/${raw}`;
}

export function mergeRadioTx(
  prev: RadioChannelState | null,
  tx: RadioTx,
  channelId: string,
): RadioChannelState {
  const base =
    prev?.channelId === channelId
      ? prev
      : {
          channelId,
          listeners: prev?.listeners ?? 0,
          participants: prev?.participants ?? [],
          talker: prev?.talker ?? null,
          recent: [],
        };
  return {
    ...base,
    recent: [tx, ...(base.recent ?? []).filter((item) => item.id !== tx.id)].slice(0, 16),
  };
}

export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const android = /Android/i.test(navigator.userAgent);
  const types = android
    ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function radioFileMeta(mime: string) {
  const m = (mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) {
    return { ext: 'm4a', type: mime || 'audio/mp4' };
  }
  if (m.includes('mpeg') || m.includes('mp3')) return { ext: 'mp3', type: mime || 'audio/mpeg' };
  if (m.includes('3gp')) return { ext: '3gp', type: mime || 'audio/3gpp' };
  if (m.includes('ogg')) return { ext: 'ogg', type: mime || 'audio/ogg' };
  return { ext: 'webm', type: mime || 'audio/webm' };
}

export function radioUploadFile(blob: Blob, mime: string) {
  const meta = radioFileMeta(mime || blob.type);
  const name = `radio-${Date.now()}.${meta.ext}`;
  try {
    return new File([blob], name, { type: meta.type });
  } catch {
    return blob;
  }
}

export async function stopRadioRecorder(recorder: MediaRecorder, chunks: Blob[]) {
  if (recorder.state !== 'inactive') {
    if (recorder.state === 'recording') {
      try { recorder.requestData(); } catch { /* Android WebView */ }
      await new Promise((r) => setTimeout(r, 60));
    }
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      recorder.addEventListener('stop', done, { once: true });
      try {
        recorder.stop();
      } catch {
        done();
      }
    });
  }
  return new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el audio'));
    reader.readAsDataURL(blob);
  });
}

/** En Android, CapacitorHttp rompe FormData/multipart. El JSON en base64 sí llega al API. */
export async function uploadRadioClip(blob: Blob, mime: string): Promise<string> {
  const meta = radioFileMeta(mime || blob.type);
  const filename = `radio-${Date.now()}.${meta.ext}`;
  if (Capacitor.isNativePlatform()) {
    const audio = await blobToBase64(blob);
    if (!audio) throw new Error('El teléfono no grabó audio');
    const { data } = await api.post<{ audioUrl: string }>('/radio/upload-base64', {
      audio,
      mimeType: meta.type,
      filename,
    });
    if (!data?.audioUrl) throw new Error('El servidor no devolvió audio');
    return data.audioUrl;
  }
  const form = new FormData();
  const file = radioUploadFile(blob, mime);
  form.append('file', file, file instanceof File ? file.name : filename);
  const { data } = await api.post<{ audioUrl: string }>('/radio/upload', form);
  if (!data?.audioUrl) throw new Error('El servidor no devolvió audio');
  return data.audioUrl;
}

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

export function prepareRadioAudio(audio: HTMLAudioElement) {
  audio.setAttribute('playsinline', 'true');
  (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  audio.preload = 'auto';
}

export async function unlockRadioAudio(audio: HTMLAudioElement) {
  prepareRadioAudio(audio);
  const previous = audio.src;
  try {
    audio.src = SILENT_WAV;
    await audio.play();
    audio.pause();
  } catch {
    /* el gesto del usuario igual habilita el elemento */
  }
  if (previous && previous !== SILENT_WAV) audio.src = previous;
}
