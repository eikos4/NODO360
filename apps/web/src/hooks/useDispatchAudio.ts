import { useCallback, useRef } from 'react';
import {
  emergencySoundFileUrl,
  dispatchSirenFileUrl,
  getEmergencySoundPattern,
  hasEmergencyAudioFile,
  loadDispatchSoundMode,
  type DispatchSoundMode,
  type EmergencyBeep,
} from '../lib/emergency-sounds';

function scheduleBeeps(ctx: AudioContext, beeps: EmergencyBeep[], startAt = ctx.currentTime) {
  let t = startAt;
  for (const b of beeps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = b.wave ?? 'square';
    osc.frequency.value = b.freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + b.durationMs / 1000);
    osc.start(t);
    osc.stop(t + b.durationMs / 1000);
    t += b.durationMs / 1000 + (b.gapAfterMs ?? 0) / 1000;
  }
}

async function playSoundFile(url: string): Promise<boolean> {
  try {
    const audio = new Audio(url);
    audio.preload = 'auto';
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('audio error'));
      void audio.play().catch(reject);
    });
    return true;
  } catch {
    return false;
  }
}

function syntheticDurationMs(code: string): number {
  return getEmergencySoundPattern(code).reduce(
    (acc, b) => acc + b.durationMs + (b.gapAfterMs ?? 0),
    0,
  );
}

export function useDispatchAudio(soundMode: DispatchSoundMode = loadDispatchSoundMode()) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playSiren = useCallback(async (_durationMs = 3000) => {
    const useFiles = soundMode === 'files' || soundMode === 'auto';
    if (useFiles) {
      const played = await playSoundFile(dispatchSirenFileUrl());
      if (played) return;
      if (soundMode === 'files') return;
    }

    const durationMs = _durationMs;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    const cycles = Math.floor(durationMs / 600);
    for (let i = 0; i < cycles; i++) {
      const t = now + i * 0.6;
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.3);
      osc.frequency.linearRampToValueAtTime(600, t + 0.6);
    }
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    await new Promise((r) => setTimeout(r, durationMs));
  }, [getCtx, soundMode]);

  const playBeep = useCallback((freq = 880, durationMs = 180) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  }, [getCtx]);

  const playSyntheticPattern = useCallback((code: string) => {
    const ctx = getCtx();
    scheduleBeeps(ctx, getEmergencySoundPattern(code));
  }, [getCtx]);

  /** Solo archivos MP3 en public/Audio/ (10_0 … 10_9 y extras mapeados). */
  const playEmergencyKeyTone = useCallback(async (code: string) => {
    if (!hasEmergencyAudioFile(code)) return;
    await playSoundFile(emergencySoundFileUrl(code));
  }, []);

  const playEmergencySound = useCallback(async (code: string) => {
    const useFiles = soundMode === 'files' || soundMode === 'auto';
    if (useFiles) {
      const played = await playSoundFile(emergencySoundFileUrl(code));
      if (played) return;
      if (soundMode === 'files') return;
    }
    playSyntheticPattern(code);
    await new Promise((r) => setTimeout(r, syntheticDurationMs(code)));
  }, [soundMode, playSyntheticPattern]);

  return { playSiren, playBeep, playEmergencySound, playEmergencyKeyTone, playSyntheticPattern };
}
