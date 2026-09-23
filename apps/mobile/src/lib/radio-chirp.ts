/**
 * Tono de radio NODO360 (`/Audio/nodo.mp3`):
 * - open  → primera mitad (al empezar a transmitir)
 * - close → segunda mitad (al soltar el PTT)
 */

export type RadioChirpKind = 'open' | 'close';

const SRC = '/Audio/nodo.mp3';

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;
let lastCloseAt = 0;
let activeSource: AudioBufferSourceNode | null = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

async function loadBuffer(): Promise<AudioBuffer | null> {
  if (buffer) return buffer;
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(SRC);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const decoded = await getCtx().decodeAudioData(raw.slice(0));
      buffer = decoded;
      return decoded;
    } catch {
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function prefetchRadioChirp() {
  void loadBuffer().then(() => {
    try {
      void getCtx().resume();
    } catch {
      /* */
    }
  });
}

export async function playRadioChirp(kind: RadioChirpKind) {
  if (kind === 'close') {
    const now = Date.now();
    if (now - lastCloseAt < 400) return;
    lastCloseAt = now;
  }

  try {
    const audio = await loadBuffer();
    if (!audio) return;
    const ac = getCtx();
    if (ac.state === 'suspended') await ac.resume();

    if (activeSource) {
      try {
        activeSource.stop();
      } catch {
        /* */
      }
      activeSource = null;
    }

    const mid = audio.duration / 2;
    const offset = kind === 'open' ? 0 : mid;
    const duration = mid;

    const source = ac.createBufferSource();
    source.buffer = audio;
    const gain = ac.createGain();
    gain.gain.value = 0.85;
    source.connect(gain);
    gain.connect(ac.destination);
    activeSource = source;
    source.onended = () => {
      if (activeSource === source) activeSource = null;
    };
    source.start(0, offset, Math.max(0.05, duration));
  } catch {
    /* autoplay / decode */
  }
}
