import { MsEdgeTTS } from 'msedge-tts';
import { EDGE_GEC_VERSION, EDGE_TRUSTED_CLIENT_TOKEN, generateSecMsGecV2 } from './edge-gec-v2';

export const EDGE_TTS_HOSTS = ['edgeservices', 'bing'] as const;
export type EdgeTtsHost = (typeof EDGE_TTS_HOSTS)[number];

const WSS_URLS: Record<EdgeTtsHost, string> = {
  edgeservices: 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1',
  bing: 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
};

type EdgeTtsStatics = {
  generateSecMsGec: (trustedClientToken: string) => Promise<string>;
  getSynthUrl: () => Promise<string>;
  generateUUID: () => string;
  _clockOffsetMs?: number;
};

const edge = MsEdgeTTS as unknown as EdgeTtsStatics;
let currentHost: EdgeTtsHost = 'edgeservices';

export function setEdgeTtsHost(host: EdgeTtsHost) {
  currentHost = host;
}

export function setEdgeTtsClockOffset(ms: number) {
  edge._clockOffsetMs = ms;
}

edge.generateSecMsGec = async () => generateSecMsGecV2(EDGE_TRUSTED_CLIENT_TOKEN, edge._clockOffsetMs ?? 0);

edge.getSynthUrl = async () => {
  const reqId = edge.generateUUID();
  const secMsGec = await edge.generateSecMsGec(EDGE_TRUSTED_CLIENT_TOKEN);
  const base = WSS_URLS[currentHost];
  const tokenParam =
    currentHost === 'bing' ? `TrustedClientToken=${EDGE_TRUSTED_CLIENT_TOKEN}` : `Ocp-Apim-Subscription-Key=${EDGE_TRUSTED_CLIENT_TOKEN}`;
  return `${base}?${tokenParam}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${EDGE_GEC_VERSION}&ConnectionId=${reqId}`;
};
