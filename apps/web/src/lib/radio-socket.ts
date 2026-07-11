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

function socketOrigin(): string {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  if (!api) return window.location.origin;
  // VITE_API_URL suele ser .../api → origen sin /api
  return api.replace(/\/api\/?$/, '') || window.location.origin;
}

let shared: Socket | null = null;

export function getRadioSocket(token: string): Socket {
  if (shared?.connected) return shared;
  if (shared) {
    shared.auth = { token };
    shared.connect();
    return shared;
  }
  shared = io(`${socketOrigin()}/radio`, {
    auth: { token },
    transports: ['websocket', 'polling'],
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
