import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'nodo360.mobile.session';

const webFallback = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (value: string) => sessionStorage.setItem(TOKEN_KEY, value),
  remove: () => sessionStorage.removeItem(TOKEN_KEY),
};

/** Solo Preferences: SecureStorage en HyperOS/Redmi puede trabar el WebView y dejar la app en azul. */
export async function getSessionToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return webFallback.get();
  try {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    webFallback.set(token);
    return;
  }
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function clearSessionToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    webFallback.remove();
    return;
  }
  try {
    await Preferences.remove({ key: TOKEN_KEY });
  } catch { /* ignore */ }
}
