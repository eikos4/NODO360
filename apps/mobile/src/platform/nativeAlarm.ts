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

export type SmsBackupState = {
  permission: boolean;
  receiveEnabled: boolean;
  gatewayEnabled: boolean;
  granted?: boolean;
};

interface NativeAlarmPlugin {
  configure(options?: { apiUrl?: string; token?: string }): Promise<AlarmDiagnostics>;
  configureSmsBackup(options: { apiUrl?: string; token?: string }): Promise<SmsBackupState>;
  getDiagnostics(): Promise<AlarmDiagnostics>;
  requestCriticalAlerts(): Promise<{ granted: boolean }>;
  openDndSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  openFullScreenSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  getSmsBackupState(): Promise<SmsBackupState>;
  requestSmsBackup(): Promise<SmsBackupState>;
  setSmsGateway(options: { enabled: boolean; apiUrl?: string; token?: string }): Promise<SmsBackupState>;
  sendBackupSms(options: { incidentId: string; apiUrl?: string; token?: string }): Promise<SmsBackupState>;
  testSmsAlarm(options?: { code?: string }): Promise<SmsBackupState>;
  testAlarm(options: {
    id?: string;
    code: string;
    title?: string;
    body?: string;
    spoken?: string;
    notificationId?: number;
    repeatCount?: number;
  }): Promise<{
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
