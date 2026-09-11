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

const socketOrigin = API_URL.replace(/\/api\/?$/, '') || window.location.origin;

let shared: Socket | null = null;

export function getRadioSocket(token: string): Socket {
  if (shared?.connected) return shared;
  if (shared) {
    shared.auth = { token };
    shared.connect();
    return shared;
  }
  shared = io(`${socketOrigin}/radio`, {
    auth: { token },
    transports: ['websocket', 'polling'],
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

export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}
