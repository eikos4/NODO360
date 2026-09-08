import { Capacitor, registerPlugin } from '@capacitor/core';

export type AlarmChannelDiagnostic = {
  id: string;
  code: string;
  exists: boolean;
  importance?: number;
  sound?: string | null;
  vibration?: boolean;
  bypassDnd?: boolean;
};

export type AlarmDiagnostics = {
  platform: 'android' | 'ios' | 'web';
  notificationsGranted: boolean;
  notificationPolicyAccess?: boolean;
  fullScreenIntentAllowed?: boolean;
  batteryOptimized?: boolean;
  criticalAlertsEnabled?: boolean;
  criticalAlertsAuthorized?: boolean;
  channels?: AlarmChannelDiagnostic[];
  note?: string;
};

interface NativeAlarmPlugin {
  configure(): Promise<AlarmDiagnostics>;
  getDiagnostics(): Promise<AlarmDiagnostics>;
  requestCriticalAlerts(): Promise<{ granted: boolean }>;
  openDndSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  openFullScreenSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  testAlarm(options: { code: string; title?: string; body?: string }): Promise<{
    code: string;
    channelId?: string;
    fullScreenRequested?: boolean;
  }>;
}

export const NativeAlarm = registerPlugin<NativeAlarmPlugin>('NativeAlarm');

export async function configureNativeAlarms(): Promise<AlarmDiagnostics | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await NativeAlarm.configure();
  } catch {
    return null;
  }
}
