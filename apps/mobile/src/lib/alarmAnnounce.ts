import { Capacitor } from '@capacitor/core';
import { NativeAlarm } from '../platform/nativeAlarm';
import { getAlarmToneMode } from './alarm-tone-preference';
import { api } from './api';

/** Misma voz que NodoTrack / sala al despachar. */
const DISPATCH_VOICE_ID = 'es-ES-ElviraNeural';
const DISPATCH_VOICE_RATE = 5;

const CODE_LABELS: Record<string, string> = {
  '10-0': 'Incendio estructural',
  '10-1': 'Fuego en vehículo',
  '10-2': 'Pastizales, basura o forestal',
  '10-3': 'Rescate de personas',
  '10-4': 'Rescate vehicular',
  '10-5': 'Materiales peligrosos',
  '10-6': 'Emergencia aérea',
  '10-7': 'Emergencia ferroviaria',
  '10-8': 'Otros llamados de emergencia',
  '10-9': 'Falsa alarma',
  '10-10': 'Apoyo a otros cuerpos',
  '10-11': 'Derrumbe o colapso estructural',
  '10-12': 'Apoyo bomberil externo',
};

const DIGITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

const played = new Map<string, number>();
const PLAYED_TTL_MS = 10 * 60 * 1000;

export type AlarmAnnounceInput = {
  id?: string;
  code?: string;
  type?: string;
  address?: string;
  radioMessage?: string;
  emergencyCodeId?: string | null;
  goingCompanies?: string;
  title?: string;
  body?: string;
  kind?: string;
};

export function isStandbyAlarm(input: Pick<AlarmAnnounceInput, 'kind' | 'code' | 'type' | 'title' | 'body'>) {
  const text = [input.kind, input.code, input.type, input.title, input.body].filter(Boolean).join(' ');
  return /\b(NODO|STANDBY|PREAVISO)\b/i.test(text);
}

export function normalizeAlarmCode(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(' ');
  if (/\b(NODO|STANDBY|PREAVISO)\b/i.test(text)) return 'NODO';
  const viaTone =
    text.match(/\bpor\s+10[-_ ]?(\d+)\b/i) ||
    text.match(/\b10[-_ ]?\d+\s*x\s*10[-_ ]?(\d+)\b/i);
  if (viaTone) return `10-${viaTone[1]}`;
  const match = text.match(/\b10[-_ ]?(1[0-2]|\d)\b/i);
  return `10-${match?.[1] ?? '0'}`;
}

export function spokenCode(code: string) {
  const via = code.match(/10[-_ ]?(\d+)\s+por\s+10[-_ ]?(\d+)/i);
  if (via) {
    return `diez ${DIGITS[Number(via[1])] ?? via[1]} por diez ${DIGITS[Number(via[2])] ?? via[2]}`;
  }
  const match = code.match(/10[-_ ]?(\d+)/i);
  const n = Number(match?.[1] ?? 0);
  return `diez ${DIGITS[n] ?? n}`;
}

export function alarmLabel(code: string, type?: string) {
  return CODE_LABELS[code] || type?.replace(/^10[-_ ]?\d+\s*/i, '').trim() || 'Emergencia';
}

export function buildAlarmSpeech(input: AlarmAnnounceInput) {
  if (isStandbyAlarm(input)) {
    const spoken = input.radioMessage?.trim()
      || input.body?.trim()
      || 'Atención. Nodo 360. Se viene una emergencia. Estén atentos.';
    return {
      code: 'NODO',
      title: input.title || 'NODO360 · Atención',
      body: input.body || spoken,
      spoken,
    };
  }
  const code = normalizeAlarmCode(input.emergencyCodeId, input.code, input.type, input.title);
  const displayMatch = [input.emergencyCodeId, input.code, input.type, input.title]
    .filter(Boolean)
    .join(' ')
    .match(/\b10[-_ ]?\d+\s+por\s+10[-_ ]?\d+\b/i);
  const displayCode = displayMatch?.[0]?.replace(/_/g, '-') ?? code;
  const label = alarmLabel(code, input.type);
  const address = input.address?.trim();
  const radio = input.radioMessage?.trim();
  const going = input.goingCompanies?.trim();
  const van = going ? `Van ${going}.` : '';
  const spoken = radio
    ? `Atención. ${spokenCode(displayCode)}. ${van && !/compa[nñ][ií]a/i.test(radio) ? `${van} ` : ''}${radio}`
    : ['Atención.', spokenCode(displayCode) + '.', van, label + '.', address].filter(Boolean).join(' ');
  return {
    code,
    title: input.title || `ALARMA ${displayCode.toUpperCase()}`,
    body: input.body || [label, address].filter(Boolean).join(' · ') || 'Despacho operativo Nodo360',
    spoken,
  };
}

function stillFresh(id: string) {
  const at = played.get(id);
  if (!at) return false;
  if (Date.now() - at > PLAYED_TTL_MS) {
    played.delete(id);
    return false;
  }
  return true;
}

function normalizeSpeechText(text: string) {
  return text.replace(/-/g, ' ').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function speakWithDevice(text: string) {
  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* sin voz del dispositivo */ }
}

async function fetchDispatchVoice(text: string): Promise<Blob | null> {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return null;
  try {
    const res = await api.post(
      '/tts/synthesize',
      { text: normalized, voiceId: DISPATCH_VOICE_ID, ratePercent: DISPATCH_VOICE_RATE },
      { responseType: 'blob', timeout: 20_000 },
    );
    if (!res.data || (res.data as Blob).size < 200) return null;
    return res.data as Blob;
  } catch {
    return null;
  }
}

async function playVoiceBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve) => {
      const audio = new Audio(url);
      audio.setAttribute('playsinline', 'true');
      audio.volume = 1;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Voz neuronal Elvira, la misma que suena en NodoTrack al despachar. */
export async function speakDispatchVoice(text: string) {
  const blob = await fetchDispatchVoice(text);
  if (blob) {
    await playVoiceBlob(blob);
    return true;
  }
  speakWithDevice(text);
  return false;
}

export async function playEmergencyAlarm(input: AlarmAnnounceInput) {
  if (input.kind === 'ANNOUNCEMENT' || input.kind === 'RADIO_TX') return;
  const id = input.id || `${input.emergencyCodeId || input.code || 'alarm'}:${input.address || input.title || Date.now()}`;
  if (stillFresh(id)) return;
  played.set(id, Date.now());

  const speech = buildAlarmSpeech(input);
  const voiceTask = fetchDispatchVoice(speech.spoken);

  if (Capacitor.isNativePlatform()) {
    const toneMode = await getAlarmToneMode();
    const notificationId = Math.abs(hashId(id)) % 900_000 + 10_000;
    await NativeAlarm.testAlarm({
      id,
      code: toneMode === 'nodo' ? 'NODO' : speech.code,
      title: speech.title,
      body: speech.body,
      spoken: '',
      notificationId,
      repeatCount: toneMode === 'nodo' ? 3 : 1,
    });
    await delay(toneMode === 'nodo' ? 4200 : 3200);
  }

  const blob = await voiceTask;
  if (blob) {
    await playVoiceBlob(blob);
    return;
  }
  speakWithDevice(speech.spoken);
}

function hashId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return hash;
}
