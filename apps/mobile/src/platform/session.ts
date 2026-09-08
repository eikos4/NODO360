import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const TOKEN_KEY = 'nodo360.mobile.session';

// El fallback web está deliberadamente aislado aquí. sessionStorage no es
// seguro y existe solo para desarrollo/preview; producción nativa usa
// Keychain (iOS) o Android Keystore + AES-GCM.
const webFallback = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (value: string) => sessionStorage.setItem(TOKEN_KEY, value),
  remove: () => sessionStorage.removeItem(TOKEN_KEY),
};

export async function getSessionToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return webFallback.get();
  try {
    return (await SecureStorage.get(TOKEN_KEY)) as string;
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return webFallback.set(token);
  await SecureStorage.set(TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return webFallback.remove();
  await SecureStorage.remove(TOKEN_KEY);
}
