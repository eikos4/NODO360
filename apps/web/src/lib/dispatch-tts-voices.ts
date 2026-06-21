export type DispatchTtsVoiceId = 'elvira' | 'alvaro' | 'dalia' | 'jorge';

export type DispatchTtsVoice = {
  id: DispatchTtsVoiceId;
  label: string;
  neuralId: string;
  locale: string;
  gender: string;
  hint: string;
};

export const DISPATCH_TTS_VOICES: DispatchTtsVoice[] = [
  {
    id: 'elvira',
    label: 'Microsoft Elvira',
    neuralId: 'es-ES-ElviraNeural',
    locale: 'es-ES',
    gender: 'Femenina',
    hint: 'Muy clara',
  },
  {
    id: 'alvaro',
    label: 'Microsoft Álvaro',
    neuralId: 'es-ES-AlvaroNeural',
    locale: 'es-ES',
    gender: 'Masculina',
    hint: 'Tono de operador',
  },
  {
    id: 'dalia',
    label: 'Microsoft Dalia',
    neuralId: 'es-MX-DaliaNeural',
    locale: 'es-MX',
    gender: 'Femenina',
    hint: 'Ideal para emergencias',
  },
  {
    id: 'jorge',
    label: 'Microsoft Jorge',
    neuralId: 'es-MX-JorgeNeural',
    locale: 'es-MX',
    gender: 'Masculina',
    hint: 'Fuerte y profesional',
  },
];

export const DISPATCH_TTS_VOICE_KEY = 'nodo360_dispatch_tts_voice';
export const DISPATCH_TTS_RATE_KEY = 'nodo360_dispatch_tts_rate';
export const DISPATCH_VOICE_ENABLED_KEY = 'nodo360_dispatch_voice_enabled';
export const DEFAULT_DISPATCH_TTS_VOICE: DispatchTtsVoiceId = 'dalia';
export const DEFAULT_DISPATCH_TTS_RATE = 8;

export function loadDispatchVoiceEnabled(): boolean {
  const stored = localStorage.getItem(DISPATCH_VOICE_ENABLED_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function saveDispatchVoiceEnabled(enabled: boolean): void {
  localStorage.setItem(DISPATCH_VOICE_ENABLED_KEY, String(enabled));
}

export function getDispatchTtsVoice(id: DispatchTtsVoiceId): DispatchTtsVoice {
  return DISPATCH_TTS_VOICES.find((v) => v.id === id) ?? DISPATCH_TTS_VOICES[2];
}

export function normalizeSpeechText(text: string): string {
  return text.replace(/-/g, ' ').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}
