import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type AppBuildInfo = {
  name: string;
  version: string;
  build: string;
  platform: string;
};

/** Versión visible para el bombero (APK / web). */
export async function getAppBuildInfo(): Promise<AppBuildInfo> {
  const platform = Capacitor.getPlatform();
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return {
        name: info.name || 'Nodo360',
        version: info.version || '—',
        build: info.build || '—',
        platform,
      };
    } catch {
      /* fallthrough */
    }
  }
  return {
    name: 'Nodo360',
    version: import.meta.env.VITE_APP_VERSION || 'web',
    build: import.meta.env.VITE_APP_BUILD || 'dev',
    platform,
  };
}
