import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

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
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
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
