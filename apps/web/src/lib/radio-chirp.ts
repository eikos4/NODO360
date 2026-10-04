/**
 * Tono de radio NODO360:
 * - `/Audio/nodo-open.mp3`
 * - `/Audio/nodo-close.mp3`
 */

export type RadioChirpKind = 'open' | 'close';

const SRC: Record<RadioChirpKind, string> = {
  open: '/Audio/nodo-open.mp3',
  close: '/Audio/nodo-close.mp3',
};
const MIN_GAP_MS: Record<RadioChirpKind, number> = {
  open: 160,
  close: 320,
};

let ctx: AudioContext | null = null;
const buffers: Partial<Record<RadioChirpKind, AudioBuffer | null>> = {};
const loading: Partial<Record<RadioChirpKind, Promise<AudioBuffer | null>>> = {};
const lastPlayedAt: Partial<Record<RadioChirpKind, number>> = {};
const activeSources: Partial<Record<RadioChirpKind, AudioBufferSourceNode | null>> = {};

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

async function loadBuffer(kind: RadioChirpKind): Promise<AudioBuffer | null> {
  if (buffers[kind]) return buffers[kind] ?? null;
  if (loading[kind]) return loading[kind] ?? null;
  loading[kind] = (async () => {
    try {
      const res = await fetch(SRC[kind]);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const decoded = await getCtx().decodeAudioData(raw.slice(0));
      buffers[kind] = decoded;
      return decoded;
    } catch {
      return null;
    } finally {
      delete loading[kind];
    }
  })();
  return loading[kind] ?? null;
}

function stopActive(kind: RadioChirpKind) {
  const source = activeSources[kind];
  if (!source) return;
  try {
    source.stop();
  } catch {
    /* */
  }
  activeSources[kind] = null;
}

/** Precarga el tono (útil tras un gesto del usuario / al abrir el canal). */
export function prefetchRadioChirp() {
  void Promise.all([loadBuffer('open'), loadBuffer('close')]).then(() => {
    try {
      void getCtx().resume();
    } catch {
      /* */
    }
  });
}

/**
 * Reproduce el tono dedicado de apertura o cierre.
 * Se deduplica para evitar rebotes cuando coinciden eventos locales y del socket.
 */
export async function playRadioChirp(kind: RadioChirpKind) {
  const now = Date.now();
  if (now - (lastPlayedAt[kind] ?? 0) < MIN_GAP_MS[kind]) return;
  lastPlayedAt[kind] = now;

  try {
    const audio = await loadBuffer(kind);
    if (!audio) return;
    const ac = getCtx();
    if (ac.state === 'suspended') await ac.resume();

    if (kind === 'close') stopActive('open');
    stopActive(kind);

    const source = ac.createBufferSource();
    source.buffer = audio;
    const gain = ac.createGain();
    gain.gain.value = 0.85;
    source.connect(gain);
    gain.connect(ac.destination);
    activeSources[kind] = source;
    source.onended = () => {
      if (activeSources[kind] === source) activeSources[kind] = null;
    };
    source.start(0);
  } catch {
    /* autoplay / decode */
  }
}
