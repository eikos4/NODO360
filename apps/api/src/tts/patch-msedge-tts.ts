import { MsEdgeTTS } from 'msedge-tts';
import { EDGE_GEC_VERSION, EDGE_TRUSTED_CLIENT_TOKEN, generateSecMsGecV2 } from './edge-gec-v2';

const WSS_URL = 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1';

type EdgeTtsStatics = {
  generateSecMsGec: (trustedClientToken: string) => Promise<string>;
  getSynthUrl: () => Promise<string>;
  generateUUID: () => string;
  _clockOffsetMs?: number;
};

const edge = MsEdgeTTS as unknown as EdgeTtsStatics;

edge.generateSecMsGec = async () => generateSecMsGecV2(EDGE_TRUSTED_CLIENT_TOKEN, edge._clockOffsetMs ?? 0);

edge.getSynthUrl = async () => {
  const reqId = edge.generateUUID();
  const secMsGec = await edge.generateSecMsGec(EDGE_TRUSTED_CLIENT_TOKEN);
  return `${WSS_URL}?Ocp-Apim-Subscription-Key=${EDGE_TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${EDGE_GEC_VERSION}&ConnectionId=${reqId}`;
};
