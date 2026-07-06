import { useCallback, useEffect, useRef } from 'react';
import { loadDispatchSoundMode } from '../lib/emergency-sounds';
import { useDispatchAudio } from './useDispatchAudio';
import { normalizeSpeechText } from '../lib/dispatch-tts-voices';
import { useDispatchTTS } from './useDispatchTTS';

export type AlarmEmergency = {
  id: string;
  status: 'ACTIVA' | 'CERRADA';
  emergencyCodeId?: string | null;
  radioMessage?: string;
  dispatchedAt: string;
};

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function usePublicDispatchAlarm(
  emergencies: AlarmEmergency[],
  options: { enabled: boolean; muted?: boolean },
) {
  const { playSiren, playEmergencySound } = useDispatchAudio(loadDispatchSoundMode());
  // Use Elvira voice
  const { speak } = useDispatchTTS({ voiceId: 'elvira', ratePercent: 5 });
  
  const announcedRef = useRef<Set<string>>(new Set());
  const playingRef = useRef(false);
  const initializedRef = useRef(false);

  const playAlarmSequence = useCallback(async (emergency: AlarmEmergency) => {
    if (playingRef.current || options.muted || !options.enabled) return;
    playingRef.current = true;
    try {
      const codeId = emergency.emergencyCodeId ?? '10-1';
      await playEmergencySound(codeId);
      await delay(250);
      await playSiren(3000);
      await delay(250);
      if (emergency.radioMessage?.trim()) {
        await new Promise<void>((resolve) => {
          speak(emergency.radioMessage!, resolve);
        });
      }
    } finally {
      playingRef.current = false;
    }
  }, [options.enabled, options.muted, playEmergencySound, playSiren, speak]);

  useEffect(() => {
    if (!options.enabled || options.muted) return;

    const active = emergencies.filter((e) => e.status === 'ACTIVA');

    if (!initializedRef.current) {
      active.forEach((e) => announcedRef.current.add(e.id));
      initializedRef.current = true;
      return;
    }

    for (const e of active) {
      if (announcedRef.current.has(e.id)) continue;
      announcedRef.current.add(e.id);
      void playAlarmSequence(e);
    }
  }, [emergencies, options.enabled, options.muted, playAlarmSequence]);

  const replay = useCallback((emergency: AlarmEmergency) => {
    void playAlarmSequence(emergency);
  }, [playAlarmSequence]);

  return { replay, speak };
}
