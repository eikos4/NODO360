import { Preferences } from '@capacitor/preferences';

export type AlarmToneMode = 'official' | 'nodo';

const ALARM_TONE_MODE_KEY = 'nodo360.mobile.alarmToneMode';

export async function getAlarmToneMode(): Promise<AlarmToneMode> {
  const { value } = await Preferences.get({ key: ALARM_TONE_MODE_KEY });
  return value === 'nodo' ? 'nodo' : 'official';
}

export async function setAlarmToneMode(mode: AlarmToneMode): Promise<void> {
  await Preferences.set({ key: ALARM_TONE_MODE_KEY, value: mode });
}
