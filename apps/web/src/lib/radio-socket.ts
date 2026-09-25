import { io, Socket } from 'socket.io-client';

export type RadioChannelState = {
  channelId: string;
  listeners: number;
  participants: { userId: string; firstName: string; lastName: string; role: string; operativeNumber?: number | null }[];
  talker: { userId: string; socketId: string; speakerName: string; since: number; operativeNumber?: number | null } | null;
  recent: RadioTx[];
};

export type RadioTx = {
  id: string;
  channelId: string;
  userId: string;
  speakerName: string;
  role: string;
  audioUrl: string;
  durationMs: number;
  at: number;
  operativeNumber?: number | null;
};

export function radioSpeakerParts(tx: { speakerName: string; operativeNumber?: number | null }) {
  const match = String(tx.speakerName || '').match(/^N[°º]?\s*(\d+)\s*[·\-–]\s*(.+)$/i);
  const number = tx.operativeNumber ?? (match ? Number(match[1]) : null);
  const name = (match?.[2] || tx.speakerName || 'Bombero').trim();
  return { number: Number.isFinite(number as number) ? number : null, name };
}

export function radioSocketOrigin(): string {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  if (!api) return window.location.origin;
  return api.replace(/\/api\/?$/, '') || window.location.origin;
}

let shared: Socket | null = null;
let sharedAuthKey = '';

export function getRadioSocket(token: string, opts?: { salaToken?: string }): Socket {
  const salaToken = opts?.salaToken?.trim() || '';
  const authKey = `${salaToken ? 'sala' : 'jwt'}:${salaToken || token}`;
  if (shared && sharedAuthKey === authKey) {
    shared.auth = salaToken ? { salaToken } : { token };
    if (!shared.connected) shared.connect();
    return shared;
  }
  if (shared) {
    shared.disconnect();
    shared = null;
  }
  sharedAuthKey = authKey;
  shared = io(`${radioSocketOrigin()}/radio`, {
    auth: salaToken ? { salaToken } : { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    autoConnect: true,
  });
  return shared;
}

export function disconnectRadioSocket() {
  if (!shared) return;
  shared.disconnect();
  shared = null;
}

export function incidentChannelId(incidentId: string) {
  return `incident:${incidentId}`;
}

export function companyChannelId(companyId: string) {
  return `company:${companyId}`;
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
      try { recorder.requestData(); } catch { /* */ }
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

export function resolveRadioAudioUrl(audioUrl?: string | null): string {
  const raw = String(audioUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
  const origin = radioSocketOrigin().replace(/\/$/, '');
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
