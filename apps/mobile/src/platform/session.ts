import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const TOKEN_KEY = 'nodo360.mobile.session';

const webFallback = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (value: string) => sessionStorage.setItem(TOKEN_KEY, value),
  remove: () => sessionStorage.removeItem(TOKEN_KEY),
};

async function prefsGet() {
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

export async function getSessionToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return webFallback.get();
  try {
    const secure = (await SecureStorage.get(TOKEN_KEY)) as string | null;
    if (secure) return secure;
  } catch { /* Keystore no disponible: usar Preferences. */ }
  return prefsGet();
}

export async function setSessionToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    webFallback.set(token);
    return;
  }
  try {
    await SecureStorage.set(TOKEN_KEY, token);
  } catch {
    await Preferences.set({ key: TOKEN_KEY, value: token });
  }
}

export async function clearSessionToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    webFallback.remove();
    return;
  }
  try {
    await SecureStorage.remove(TOKEN_KEY);
  } catch { /* ignore */ }
  await Preferences.remove({ key: TOKEN_KEY });
}
