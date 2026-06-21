import { findEmergencyEntry, EMERGENCY_MAIN_TYPES } from './emergency-codes';

export type EmergencyBeep = {
  freq: number;
  durationMs: number;
  wave?: OscillatorType;
  gapAfterMs?: number;
};

export type EmergencySoundDef = {
  code: string;
  description: string;
  beeps: EmergencyBeep[];
};

/**
 * Patrón sintético único por clave principal (Web Audio API).
 * Cada clave tiene ritmo y frecuencias distintas para identificarla al oído.
 */
export const EMERGENCY_SOUND_PATTERNS: Record<string, EmergencySoundDef> = {
  '10-0': {
    code: '10-0',
    description: '3 pitidos agudos — incendio estructural',
    beeps: [
      { freq: 988, durationMs: 190, gapAfterMs: 70, wave: 'square' },
      { freq: 988, durationMs: 190, gapAfterMs: 70, wave: 'square' },
      { freq: 1175, durationMs: 260, wave: 'square' },
    ],
  },
  '10-1': {
    code: '10-1',
    description: '2 medios + 1 agudo — fuego vehicular',
    beeps: [
      { freq: 740, durationMs: 170, gapAfterMs: 90, wave: 'sawtooth' },
      { freq: 740, durationMs: 170, gapAfterMs: 90, wave: 'sawtooth' },
      { freq: 988, durationMs: 230, wave: 'sawtooth' },
    ],
  },
  '10-2': {
    code: '10-2',
    description: 'Alternancia grave/agudo — pastizal/forestal',
    beeps: [
      { freq: 520, durationMs: 160, gapAfterMs: 60, wave: 'triangle' },
      { freq: 880, durationMs: 160, gapAfterMs: 60, wave: 'triangle' },
      { freq: 520, durationMs: 160, gapAfterMs: 60, wave: 'triangle' },
      { freq: 880, durationMs: 220, wave: 'triangle' },
    ],
  },
  '10-3': {
    code: '10-3',
    description: '2 largos — rescate personas',
    beeps: [
      { freq: 660, durationMs: 320, gapAfterMs: 100, wave: 'sine' },
      { freq: 784, durationMs: 320, wave: 'sine' },
    ],
  },
  '10-4': {
    code: '10-4',
    description: 'Ráfaga rápida — rescate vehicular',
    beeps: [
      { freq: 700, durationMs: 110, gapAfterMs: 50, wave: 'square' },
      { freq: 700, durationMs: 110, gapAfterMs: 50, wave: 'square' },
      { freq: 700, durationMs: 110, gapAfterMs: 50, wave: 'square' },
      { freq: 932, durationMs: 200, wave: 'square' },
    ],
  },
  '10-5': {
    code: '10-5',
    description: 'Tono modulado — HazMat',
    beeps: [
      { freq: 600, durationMs: 140, gapAfterMs: 40, wave: 'sawtooth' },
      { freq: 900, durationMs: 140, gapAfterMs: 40, wave: 'sawtooth' },
      { freq: 600, durationMs: 140, gapAfterMs: 40, wave: 'sawtooth' },
      { freq: 900, durationMs: 140, gapAfterMs: 40, wave: 'sawtooth' },
      { freq: 1100, durationMs: 180, wave: 'sawtooth' },
    ],
  },
  '10-6': {
    code: '10-6',
    description: 'Ascendente — emergencia aérea',
    beeps: [
      { freq: 620, durationMs: 150, gapAfterMs: 30, wave: 'sine' },
      { freq: 780, durationMs: 150, gapAfterMs: 30, wave: 'sine' },
      { freq: 940, durationMs: 150, gapAfterMs: 30, wave: 'sine' },
      { freq: 1100, durationMs: 200, wave: 'sine' },
    ],
  },
  '10-7': {
    code: '10-7',
    description: 'Doble grave — ferroviaria',
    beeps: [
      { freq: 440, durationMs: 280, gapAfterMs: 80, wave: 'triangle' },
      { freq: 440, durationMs: 280, gapAfterMs: 80, wave: 'triangle' },
      { freq: 554, durationMs: 240, wave: 'triangle' },
    ],
  },
  '10-8': {
    code: '10-8',
    description: 'Un pitido largo — otros',
    beeps: [{ freq: 587, durationMs: 450, wave: 'sine' }],
  },
  '10-9': {
    code: '10-9',
    description: '2 graves cortos — falsa alarma',
    beeps: [
      { freq: 392, durationMs: 200, gapAfterMs: 120, wave: 'sine' },
      { freq: 392, durationMs: 200, wave: 'sine' },
    ],
  },
  '10-10': {
    code: '10-10',
    description: '3 medios — apoyo cuerpos',
    beeps: [
      { freq: 698, durationMs: 160, gapAfterMs: 70, wave: 'square' },
      { freq: 698, durationMs: 160, gapAfterMs: 70, wave: 'square' },
      { freq: 880, durationMs: 200, wave: 'square' },
    ],
  },
  '10-11': {
    code: '10-11',
    description: 'Caída de tono — derrumbe',
    beeps: [
      { freq: 880, durationMs: 180, gapAfterMs: 50, wave: 'sawtooth' },
      { freq: 660, durationMs: 180, gapAfterMs: 50, wave: 'sawtooth' },
      { freq: 440, durationMs: 280, wave: 'sawtooth' },
    ],
  },
  '10-12': {
    code: '10-12',
    description: '4 cortos — apoyo externo',
    beeps: [
      { freq: 784, durationMs: 100, gapAfterMs: 55, wave: 'square' },
      { freq: 784, durationMs: 100, gapAfterMs: 55, wave: 'square' },
      { freq: 784, durationMs: 100, gapAfterMs: 55, wave: 'square' },
      { freq: 988, durationMs: 180, wave: 'square' },
    ],
  },
};

/** Pitidos extra para subdivisiones (10-0-1, 10-2-4, etc.) */
function subdivisionBeeps(code: string): EmergencyBeep[] {
  const sub = code.split('-').pop();
  const n = parseInt(sub ?? '0', 10);
  if (!n || Number.isNaN(n)) return [];
  return Array.from({ length: Math.min(n, 5) }, (_, i) => ({
    freq: 1320 + i * 55,
    durationMs: 95,
    gapAfterMs: 55,
    wave: 'sine' as OscillatorType,
  }));
}

export function getMainCodeForSound(code: string): string {
  const entry = findEmergencyEntry(code);
  if (!entry) return code;
  return entry.parentCode ?? entry.code;
}

/**
 * Tonos oficiales de central — archivos en apps/web/public/Audio/
 * Nombres 10_0 … 10_9 para claves principales; extras para 10-10 … 10-12.
 */
export const EMERGENCY_AUDIO_FILES: Record<string, { file: string; label: string }> = {
  '10-0': { file: '10_0.mp3', label: 'Incendio estructural' },
  '10-1': { file: '10_1.mp3', label: 'Fuego vehicular' },
  '10-2': { file: '10_2.mp3', label: 'Pastizal / forestal' },
  '10-3': { file: '10_3.mp3', label: 'Rescate personas' },
  '10-4': { file: '10_4.mp3', label: 'Rescate vehicular' },
  '10-5': { file: '10_5.mp3', label: 'HazMat' },
  '10-6': { file: '10_6.mp3', label: 'Emergencia aérea' },
  '10-7': { file: '10_7.mp3', label: 'Ferroviaria' },
  '10-8': { file: '10_8.mp3', label: 'Otros' },
  '10-9': { file: '10_9.mp3', label: 'Falsa alarma' },
  '10-10': { file: 'Alarma general 001.mp3', label: 'Apoyo cuerpos' },
  '10-11': { file: 'Alarma de incendio 0001.mp3', label: 'Derrumbe' },
  '10-12': { file: 'Llamado de comandancia 001.mp3', label: 'Apoyo externo' },
};

/** Sirena entre tono de clave y mensaje de voz */
export const DISPATCH_SIREN_FILE = 'Central A 04.mp3';

const AUDIO_BASE = '/Audio';

export function dispatchSirenFileUrl(): string {
  return `${AUDIO_BASE}/${encodeURIComponent(DISPATCH_SIREN_FILE)}`;
}

export type BotoneraAudioEntry = {
  id: string;
  code: string;
  label: string;
  file: string | null;
  isSubdivision: boolean;
  parentCode?: string;
};

/** Todas las claves de la botonera con su archivo de tono (subdivisiones → tono del padre). */
export function listBotoneraAudioEntries(): BotoneraAudioEntry[] {
  const rows: BotoneraAudioEntry[] = [];
  for (const main of EMERGENCY_MAIN_TYPES) {
    const mainFile = EMERGENCY_AUDIO_FILES[main.id]?.file ?? null;
    rows.push({
      id: main.id,
      code: main.code,
      label: main.shortLabel,
      file: mainFile,
      isSubdivision: false,
    });
    for (const sub of main.subdivisions ?? []) {
      rows.push({
        id: sub.id,
        code: sub.code,
        label: sub.shortLabel,
        file: mainFile,
        isSubdivision: true,
        parentCode: main.code,
      });
    }
  }
  return rows;
}

export function hasEmergencyAudioFile(code: string): boolean {
  const main = getMainCodeForSound(code);
  return !!EMERGENCY_AUDIO_FILES[main]?.file;
}

export function emergencySoundFileUrl(code: string): string {
  const main = getMainCodeForSound(code);
  const mapped = EMERGENCY_AUDIO_FILES[main];
  if (mapped) {
    return `${AUDIO_BASE}/${encodeURIComponent(mapped.file)}`;
  }
  const fallback = `${main.replace(/-/g, '_')}.mp3`;
  return `${AUDIO_BASE}/${encodeURIComponent(fallback)}`;
}

export function getEmergencyAudioLabel(code: string): string {
  const main = getMainCodeForSound(code);
  return EMERGENCY_AUDIO_FILES[main]?.label ?? main;
}

export function getEmergencySoundPattern(code: string): EmergencyBeep[] {
  const main = getMainCodeForSound(code);
  const base = EMERGENCY_SOUND_PATTERNS[main]?.beeps ?? [
    { freq: 880, durationMs: 180, gapAfterMs: 70, wave: 'square' as OscillatorType },
    { freq: 880, durationMs: 180, gapAfterMs: 70, wave: 'square' as OscillatorType },
    { freq: 880, durationMs: 180, wave: 'square' as OscillatorType },
  ];
  const entry = findEmergencyEntry(code);
  if (entry?.parentCode) {
    return [...base, ...subdivisionBeeps(code)];
  }
  return base;
}

export const DISPATCH_SOUND_MODE_KEY = 'nodo360_dispatch_sound_mode';
export type DispatchSoundMode = 'synthetic' | 'files' | 'auto';

export function loadDispatchSoundMode(): DispatchSoundMode {
  const v = localStorage.getItem(DISPATCH_SOUND_MODE_KEY);
  if (v === 'synthetic' || v === 'files' || v === 'auto') return v;
  return 'files';
}

export function saveDispatchSoundMode(mode: DispatchSoundMode) {
  localStorage.setItem(DISPATCH_SOUND_MODE_KEY, mode);
}
