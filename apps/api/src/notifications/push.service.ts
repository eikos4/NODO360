import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';
import { resolveAlarmTone, resolveApnsSound } from './alarm-payload';

export type AlarmPayload = {
  incidentId: string;
  code: string;
  type: string;
  address: string;
  companyIds: string[];
};

export type QueuedAlarmPayload = {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null = null;
  private ready = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw?.trim()) {
      this.logger.warn(
        'Push desactivado: falta FIREBASE_SERVICE_ACCOUNT_JSON. Las alarmas no llegarán con la app cerrada.',
      );
      return;
    }
    try {
      const cred = JSON.parse(raw) as Record<string, string>;
      if (!getApps().length) {
        initializeApp({ credential: cert(cred) });
      }
      this.messaging = getMessaging();
      this.ready = true;
      this.logger.log('Push FCM listo');
    } catch (err) {
      this.logger.error('No se pudo iniciar Firebase Admin', err);
    }
  }

  async registerToken(userId: string, token: string, platform: string) {
    const clean = token.trim();
    if (!clean) return { ok: false };
    await this.prisma.devicePushToken.upsert({
      where: { token: clean },
      create: { token: clean, platform: platform || 'web', userId },
      update: { userId, platform: platform || 'web' },
    });
    return { ok: true };
  }

  async unregisterToken(token: string) {
    const clean = token.trim();
    if (!clean) return { ok: true };
    await this.prisma.devicePushToken.deleteMany({ where: { token: clean } });
    return { ok: true };
  }

  async sendQueuedAlarm(payload: QueuedAlarmPayload) {
    if (!this.ready || !this.messaging) {
      const error = new Error('FCM no está configurado');
      (error as Error & { code?: string }).code = 'fcm/not-configured';
      throw error;
    }
    const tone = resolveAlarmTone(
      payload.data.emergencyCodeId,
      payload.data.code,
      payload.data.type,
      payload.title,
      payload.body,
    );
    return this.messaging.send({
      token: payload.token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: tone.channelId,
          sound: tone.sound,
          priority: 'max',
        },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
        payload: {
          aps: {
            sound: resolveApnsSound(tone.sound, this.config),
            alert: { title: payload.title, body: payload.body },
            contentAvailable: true,
            category: 'NODO360_EMERGENCY',
          },
        },
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          requireInteraction: true,
        },
        fcmOptions: { link: payload.data.url || '/emergencia-respuesta' },
      },
    });
  }

  async notifyDispatch(payload: AlarmPayload) {
    const companyIds = [...new Set(payload.companyIds.filter(Boolean))];
    if (!companyIds.length) return { sent: 0 };

    const devices = await this.prisma.devicePushToken.findMany({
      where: {
        user: {
          isActive: true,
          companyId: { in: companyIds },
        },
      },
      select: { token: true, id: true },
    });

    if (!devices.length) {
      this.logger.log(`Despacho ${payload.code}: 0 tokens registrados`);
      return { sent: 0 };
    }

    if (!this.ready || !this.messaging) {
      this.logger.warn(
        `Despacho ${payload.code}: ${devices.length} teléfonos listos, pero FCM no está configurado`,
      );
      return { sent: 0 };
    }

    const title = `ALARMA ${payload.code}`;
    const body = `${payload.type} — ${payload.address}`;
    const tone = resolveAlarmTone(payload.code, payload.type);
    const tokens = devices.map((d) => d.token);
    const stale: string[] = [];
    let sent = 0;

    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      const res = await this.messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: {
          incidentId: payload.incidentId,
          code: payload.code,
          type: payload.type,
          address: payload.address,
          url: '/emergencia-respuesta',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: tone.channelId,
            sound: tone.sound,
            priority: 'max',
          },
        },
        apns: {
          headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
          payload: {
            aps: {
              sound: resolveApnsSound(tone.sound, this.config),
              alert: { title, body },
              contentAvailable: true,
              category: 'NODO360_EMERGENCY',
            },
          },
        },
        webpush: {
          notification: { title, body, requireInteraction: true },
          fcmOptions: { link: '/emergencia-respuesta' },
        },
      });
      sent += res.successCount;
      res.responses.forEach((r, idx) => {
        if (r.error) {
          const code = r.error.code ?? '';
          if (
            code.includes('registration-token-not-registered') ||
            code.includes('invalid-registration-token')
          ) {
            stale.push(chunk[idx]);
          }
        }
      });
    }

    if (stale.length) {
      await this.prisma.devicePushToken.deleteMany({ where: { token: { in: stale } } });
    }

    this.logger.log(`Despacho ${payload.code}: push ${sent}/${tokens.length}`);
    return { sent };
  }

}
