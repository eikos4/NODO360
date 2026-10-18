import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import {
  DEFAULT_DISPATCH_TTS_RATE,
  DEFAULT_DISPATCH_TTS_VOICE,
  getDispatchTtsVoice,
  normalizeSpeechText,
  type DispatchTtsVoiceId,
} from '../lib/dispatch-tts-voices';

type Options = {
  voiceId: DispatchTtsVoiceId;
  ratePercent?: number;
};

export function useDispatchTTS({ voiceId, ratePercent = DEFAULT_DISPATCH_TTS_RATE }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const speakWithBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getDispatchTtsVoice(voiceId);
    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.name.toLowerCase().includes(voice.label.replace('Microsoft ', '').toLowerCase()))
      ?? voices.find((v) => v.lang.startsWith(voice.locale))
      ?? voices.find((v) => v.lang.startsWith('es'));
    if (match) utt.voice = match;
    utt.lang = voice.locale;
    utt.rate = 1 + ratePercent / 100;
    utt.pitch = 1;
    utt.volume = 1;
    utt.onend = () => onEnd?.();
    utt.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utt);
  }, [voiceId, ratePercent]);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    const normalized = normalizeSpeechText(text);
    if (!normalized) {
      onEnd?.();
      return;
    }

    stop();
    const voice = getDispatchTtsVoice(voiceId);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.post(
        '/tts/synthesize',
        { text: normalized, voiceId: voice.neuralId, ratePercent },
        { responseType: 'blob', signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        void audio.play().catch(() => resolve());
      });

      onEnd?.();
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const isAbort = err instanceof Error && err.name === 'CanceledError';
      if (!isAbort) {
        speakWithBrowser(normalized, onEnd);
      }
    }
  }, [voiceId, ratePercent, stop, speakWithBrowser]);

  return { speak, stop };
}

export function loadDispatchTtsSettings(): { voiceId: DispatchTtsVoiceId; ratePercent: number } {
  const storedVoice = localStorage.getItem('nodo360_dispatch_tts_voice') as DispatchTtsVoiceId | null;
  const storedRate = localStorage.getItem('nodo360_dispatch_tts_rate');
  const voiceId =
    storedVoice && ['elvira', 'alvaro', 'dalia', 'jorge'].includes(storedVoice)
      ? storedVoice
      : DEFAULT_DISPATCH_TTS_VOICE;
  const ratePercent = storedRate ? Number(storedRate) : DEFAULT_DISPATCH_TTS_RATE;
  return {
    voiceId,
    ratePercent: Number.isFinite(ratePercent) ? ratePercent : DEFAULT_DISPATCH_TTS_RATE,
  };
}

export function saveDispatchTtsSettings(voiceId: DispatchTtsVoiceId, ratePercent: number) {
  localStorage.setItem('nodo360_dispatch_tts_voice', voiceId);
  localStorage.setItem('nodo360_dispatch_tts_rate', String(ratePercent));
}

function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!window.speechSynthesis) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    window.setTimeout(finish, 500);
  });
}

async function playBrowserVoice(text: string, voiceId: DispatchTtsVoiceId, ratePercent: number) {
  if (!window.speechSynthesis) throw new Error('sin voz del navegador');
  window.speechSynthesis.cancel();
  const voice = getDispatchTtsVoice(voiceId);
  const voices = await loadBrowserVoices();
  const needle = voice.label.replace('Microsoft ', '').toLowerCase();
  const match =
    voices.find((v) => v.name.toLowerCase().includes(needle))
    ?? voices.find((v) => v.lang.startsWith(voice.locale))
    ?? voices.find((v) => v.lang.startsWith('es'));
  const utt = new SpeechSynthesisUtterance(text);
  if (match) utt.voice = match;
  utt.lang = voice.locale;
  utt.rate = 1 + ratePercent / 100;
  utt.pitch = 1;
  utt.volume = 1;
  return new Promise<void>((resolve, reject) => {
    utt.onend = () => resolve();
    utt.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve();
        return;
      }
      reject(new Error('voz del navegador'));
    };
    window.speechSynthesis.speak(utt);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  });
}

export async function previewDispatchVoice(voiceId: DispatchTtsVoiceId, ratePercent: number) {
  const sample = '10 2 SECTOR CATILLO CONCURRE BR 12';
  const voice = getDispatchTtsVoice(voiceId);
  try {
    const res = await api.post(
      '/tts/synthesize',
      { text: sample, voiceId: voice.neuralId, ratePercent },
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(res.data);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    try {
      await playBrowserVoice(sample, voiceId, ratePercent);
    } catch {
      toast.error('No se pudo reproducir la voz. Verifica conexión con la API.');
    }
  }
}
