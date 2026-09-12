import { Capacitor } from '@capacitor/core';
import { NativeAlarm } from '../platform/nativeAlarm';

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
  title?: string;
  body?: string;
};

export function normalizeAlarmCode(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(' ');
  const match = text.match(/\b10[-_ ]?(1[0-2]|\d)\b/i);
  return `10-${match?.[1] ?? '0'}`;
}

export function spokenCode(code: string) {
  const match = code.match(/10[-_ ]?(\d+)/i);
  const n = Number(match?.[1] ?? 0);
  return `diez ${DIGITS[n] ?? n}`;
}

export function alarmLabel(code: string, type?: string) {
  return CODE_LABELS[code] || type?.replace(/^10[-_ ]?\d+\s*/i, '').trim() || 'Emergencia';
}

export function buildAlarmSpeech(input: AlarmAnnounceInput) {
  const code = normalizeAlarmCode(input.emergencyCodeId, input.code, input.type, input.title);
  const label = alarmLabel(code, input.type);
  const address = input.address?.trim();
  const radio = input.radioMessage?.trim();
  const spoken = radio
    ? `Atención. ${spokenCode(code)}. ${radio}`
    : ['Atención.', spokenCode(code) + '.', label + '.', address].filter(Boolean).join(' ');
  return {
    code,
    title: input.title || `ALARMA ${code}`,
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

export async function playEmergencyAlarm(input: AlarmAnnounceInput) {
  const id = input.id || `${input.emergencyCodeId || input.code || 'alarm'}:${input.address || input.title || Date.now()}`;
  if (stillFresh(id)) return;
  played.set(id, Date.now());

  const speech = buildAlarmSpeech(input);
  if (!Capacitor.isNativePlatform()) {
    try {
      const utter = new SpeechSynthesisUtterance(speech.spoken);
      utter.lang = 'es-CL';
      utter.rate = 0.92;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch { /* preview web */ }
    return;
  }

  const notificationId = Math.abs(hashId(id)) % 900_000 + 10_000;
  await NativeAlarm.testAlarm({
    code: speech.code,
    title: speech.title,
    body: speech.body,
    spoken: speech.spoken,
    notificationId,
  });
}

function hashId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return hash;
}
