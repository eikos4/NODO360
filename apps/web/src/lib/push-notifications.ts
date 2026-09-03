import { Capacitor } from '@capacitor/core';
import { api } from './api';

export type PushStatus = 'idle' | 'ready' | 'denied' | 'unavailable' | 'error';

const TOKEN_KEY = 'nodo360_push_token';

type WebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function storedPushToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function sendToken(token: string, platform: string) {
  saveToken(token);
  await api.post('/notifications/register', { token, platform });
}

export async function unregisterPushToken() {
  const token = storedPushToken();
  if (!token) return;
  try {
    await api.delete('/notifications/register', { data: { token } });
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function registerNative(): Promise<PushStatus> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return 'denied';

  await PushNotifications.register();

  PushNotifications.addListener('registration', (t) => {
    void sendToken(t.value, Capacitor.getPlatform());
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const url = (event.notification.data as { url?: string } | undefined)?.url;
    window.location.href = url || '/emergencia-respuesta';
  });

  return 'ready';
}

async function registerWeb(): Promise<PushStatus> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unavailable';

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';

  const cfg = await api.get<WebConfig>('/notifications/web-config').then((r) => r.data);
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId || !cfg.vapidKey || !cfg.messagingSenderId) {
    return 'unavailable';
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const { getMessaging, getToken, onMessage, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return 'unavailable';

  const app = getApps()[0] ?? initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });

  const qs = new URLSearchParams({
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
    authDomain: cfg.authDomain || '',
    storageBucket: cfg.storageBucket || '',
  });
  const sw = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs.toString()}`, {
    scope: '/',
  });
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: cfg.vapidKey, serviceWorkerRegistration: sw });
  if (!token) return 'error';
  await sendToken(token, 'web');

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'ALARMA NODO360';
    const body = payload.notification?.body || 'Nueva emergencia';
    void new Notification(title, { body, requireInteraction: true });
  });

  return 'ready';
}

export async function enablePushNotifications(): Promise<PushStatus> {
  try {
    if (Capacitor.isNativePlatform()) return await registerNative();
    return await registerWeb();
  } catch (err) {
    console.warn('[nodo360] push', err);
    return 'error';
  }
}
