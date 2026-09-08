import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AlarmDeliveryStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AlarmQueueService } from './alarm-queue.service';
import { PushService } from './push.service';

@Injectable()
export class AlarmWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly push: PushService,
    private readonly queue: AlarmQueueService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('ALARM_WORKER_ENABLED') === 'false') {
      this.logger.warn('Worker de alarmas desactivado');
      return;
    }
    const interval = this.numberConfig('ALARM_WORKER_INTERVAL_MS', 3000, 500);
    this.timer = setInterval(() => void this.tick(), interval);
    void this.tick();
    this.logger.log(`Worker de alarmas activo cada ${interval}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.expireOverdue();
      await this.recoverStaleLocks();
      const batchSize = this.numberConfig('ALARM_WORKER_BATCH_SIZE', 25, 1);
      for (let processed = 0; processed < batchSize; processed += 1) {
        const delivery = await this.claimNext();
        if (!delivery) break;
        await this.deliver(delivery);
      }
    } catch (error) {
      this.logger.error('Error en worker de alarmas', error);
    } finally {
      this.running = false;
    }
  }

  private async claimNext() {
    const now = new Date();
    const candidate = await this.prisma.alarmDelivery.findFirst({
      where: {
        status: AlarmDeliveryStatus.QUEUED,
        nextAttemptAt: { lte: now },
        notification: { expiresAt: { gt: now } },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!candidate) return null;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.alarmDelivery.updateMany({
        where: { id: candidate.id, status: AlarmDeliveryStatus.QUEUED },
        data: {
          status: AlarmDeliveryStatus.PROCESSING,
          lockedAt: now,
          attempts: { increment: 1 },
        },
      });
      if (!claimed.count) return null;
      await tx.alarmDeliveryHistory.create({
        data: {
          deliveryId: candidate.id,
          status: AlarmDeliveryStatus.PROCESSING,
        },
      });
      return tx.alarmDelivery.findUniqueOrThrow({
        where: { id: candidate.id },
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              body: true,
              data: true,
              expiresAt: true,
            },
          },
        },
      });
    });
  }

  private async deliver(
    delivery: NonNullable<Awaited<ReturnType<AlarmWorkerService['claimNext']>>>,
  ) {
    try {
      await this.push.sendQueuedAlarm({
        token: delivery.tokenSnapshot,
        title: delivery.notification.title,
        body: delivery.notification.body,
        data: {
          ...this.stringData(delivery.notification.data),
          notificationId: delivery.notification.id,
          deliveryId: delivery.id,
        },
      });
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.alarmDelivery.update({
          where: { id: delivery.id },
          data: {
            status: AlarmDeliveryStatus.SENT,
            sentAt: now,
            lockedAt: null,
            lastError: null,
          },
        }),
        this.prisma.alarmDeliveryHistory.create({
          data: { deliveryId: delivery.id, status: AlarmDeliveryStatus.SENT },
        }),
      ]);
    } catch (error) {
      await this.handleFailure(delivery, error);
    }
    await this.queue.refreshNotificationStatus(delivery.notificationId);
  }

  private async handleFailure(
    delivery: NonNullable<Awaited<ReturnType<AlarmWorkerService['claimNext']>>>,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : String(error);
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    const permanent =
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token') ||
      code.includes('invalid-argument');
    const maxAttempts = this.numberConfig('ALARM_WORKER_MAX_ATTEMPTS', 8, 1);
    const terminal =
      permanent ||
      delivery.attempts >= maxAttempts ||
      delivery.notification.expiresAt <= new Date();
    const status =
      delivery.notification.expiresAt <= new Date()
        ? AlarmDeliveryStatus.EXPIRED
        : terminal
          ? AlarmDeliveryStatus.FAILED
          : AlarmDeliveryStatus.QUEUED;
    const delay = this.backoffMs(delivery.attempts);
    const detail = code ? `${code}: ${message}` : message;

    await this.prisma.$transaction([
      this.prisma.alarmDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          lockedAt: null,
          lastError: detail,
          ...(status === AlarmDeliveryStatus.QUEUED
            ? { nextAttemptAt: new Date(Date.now() + delay) }
            : { failedAt: new Date() }),
        },
      }),
      this.prisma.alarmDeliveryHistory.create({
        data: { deliveryId: delivery.id, status, detail },
      }),
      ...(permanent
        ? [
            this.prisma.devicePushToken.deleteMany({
              where: { token: delivery.tokenSnapshot },
            }),
          ]
        : []),
    ]);
    if (terminal) {
      this.logger.warn(`Entrega ${delivery.id} terminada tras ${delivery.attempts} intentos`);
    }
  }

  private async expireOverdue() {
    const rows = await this.prisma.alarmDelivery.findMany({
      where: {
        status: { in: [AlarmDeliveryStatus.QUEUED, AlarmDeliveryStatus.PROCESSING] },
        notification: { expiresAt: { lte: new Date() } },
      },
      select: { id: true, notificationId: true },
      take: 100,
    });
    for (const row of rows) {
      await this.prisma.$transaction([
        this.prisma.alarmDelivery.update({
          where: { id: row.id },
          data: {
            status: AlarmDeliveryStatus.EXPIRED,
            lockedAt: null,
            failedAt: new Date(),
            lastError: 'Notificación expirada',
          },
        }),
        this.prisma.alarmDeliveryHistory.create({
          data: {
            deliveryId: row.id,
            status: AlarmDeliveryStatus.EXPIRED,
            detail: 'Notificación expirada',
          },
        }),
      ]);
      await this.queue.refreshNotificationStatus(row.notificationId);
    }
  }

  private async recoverStaleLocks() {
    const lockSeconds = this.numberConfig('ALARM_WORKER_LOCK_TIMEOUT_SECONDS', 120, 10);
    const staleBefore = new Date(Date.now() - lockSeconds * 1000);
    const rows = await this.prisma.alarmDelivery.findMany({
      where: {
        status: AlarmDeliveryStatus.PROCESSING,
        lockedAt: { lt: staleBefore },
      },
      select: { id: true },
      take: 100,
    });
    for (const row of rows) {
      await this.prisma.$transaction([
        this.prisma.alarmDelivery.update({
          where: { id: row.id },
          data: {
            status: AlarmDeliveryStatus.QUEUED,
            lockedAt: null,
            nextAttemptAt: new Date(),
          },
        }),
        this.prisma.alarmDeliveryHistory.create({
          data: {
            deliveryId: row.id,
            status: AlarmDeliveryStatus.QUEUED,
            detail: 'Lock PROCESSING recuperado',
          },
        }),
      ]);
    }
  }

  private backoffMs(attempt: number) {
    const base = this.numberConfig('ALARM_WORKER_BACKOFF_BASE_MS', 5000, 100);
    return Math.min(base * 2 ** Math.max(attempt - 1, 0), 30 * 60 * 1000);
  }

  private stringData(value: Prisma.JsonValue): Record<string, string> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'string' ? entry : JSON.stringify(entry),
      ]),
    );
  }

  private numberConfig(name: string, fallback: number, minimum: number) {
    const value = Number(this.config.get<string>(name));
    return Number.isFinite(value) ? Math.max(Math.floor(value), minimum) : fallback;
  }
}
