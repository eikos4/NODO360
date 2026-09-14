import { io, Socket } from 'socket.io-client';

export type RadioChannelState = {
  channelId: string;
  listeners: number;
  participants: { userId: string; firstName: string; lastName: string; role: string }[];
  talker: { userId: string; socketId: string; speakerName: string; since: number } | null;
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
};

export function radioSocketOrigin(): string {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  if (!api) return window.location.origin;
  return api.replace(/\/api\/?$/, '') || window.location.origin;
}

let shared: Socket | null = null;

export function getRadioSocket(token: string): Socket {
  if (shared) {
    shared.auth = { token };
    if (!shared.connected) shared.connect();
    return shared;
  }
  shared = io(`${radioSocketOrigin()}/radio`, {
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
