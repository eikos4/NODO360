import { Preferences } from '@capacitor/preferences';
import type { AlarmHistoryItem, EmergencySnapshot, QueuedResponse } from '../types';

const SNAPSHOT_KEY = 'nodo360.mobile.snapshot.v1';
const QUEUE_KEY = 'nodo360.mobile.response-queue.v1';
const HISTORY_KEY = 'nodo360.mobile.history.v1';
const ACTIVATED_KEY = 'nodo360.mobile.activated.v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export const localStore = {
  getSnapshot: () => readJson<EmergencySnapshot | null>(SNAPSHOT_KEY, null),
  setSnapshot: (value: EmergencySnapshot) => writeJson(SNAPSHOT_KEY, value),
  getQueue: () => readJson<QueuedResponse[]>(QUEUE_KEY, []),
  setQueue: (value: QueuedResponse[]) => writeJson(QUEUE_KEY, value),
  getHistory: () => readJson<AlarmHistoryItem[]>(HISTORY_KEY, []),
  setHistory: (value: AlarmHistoryItem[]) => writeJson(HISTORY_KEY, value.slice(0, 20)),
  isActivated: async () => (await Preferences.get({ key: ACTIVATED_KEY })).value === '1',
  setActivated: () => Preferences.set({ key: ACTIVATED_KEY, value: '1' }),
  clearUserData: () => Promise.all([
    Preferences.remove({ key: SNAPSHOT_KEY }),
    Preferences.remove({ key: QUEUE_KEY }),
    Preferences.remove({ key: HISTORY_KEY }),
    Preferences.remove({ key: ACTIVATED_KEY }),
  ]),
};
