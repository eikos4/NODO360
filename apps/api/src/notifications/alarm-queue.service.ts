import { Injectable, NotFoundException } from '@nestjs/common';
import { AlarmDeliveryStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type DatabaseClient = Prisma.TransactionClient | PrismaService;

export type AlarmEvent = {
  incidentId: string;
  eventType: 'DISPATCH' | 'LOCATION' | 'CANCELLED' | 'CLOSED' | 'CRITICAL_UPDATE';
  dedupKey: string;
  title: string;
  body: string;
  companyIds: string[];
  data?: Record<string, string>;
};

@Injectable()
export class AlarmQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async enqueue(event: AlarmEvent, client: DatabaseClient = this.prisma) {
    const existing = await client.alarmNotification.findUnique({
      where: { dedupKey: event.dedupKey },
      select: { id: true, status: true },
    });
    if (existing) return { ...existing, deduplicated: true };

    const companyIds = [...new Set(event.companyIds.filter(Boolean))];
    const devices = companyIds.length
      ? await client.devicePushToken.findMany({
          where: { user: { isActive: true, companyId: { in: companyIds } } },
          select: { id: true, userId: true, token: true, platform: true },
        })
      : [];
    const ttlSeconds = this.numberConfig('ALARM_QUEUE_TTL_SECONDS', 86400, 60);
    const now = new Date();
    const status = devices.length ? AlarmDeliveryStatus.QUEUED : AlarmDeliveryStatus.FAILED;

    try {
      const notification = await client.alarmNotification.create({
        data: {
          incidentId: event.incidentId,
          eventType: event.eventType,
          dedupKey: event.dedupKey,
          title: event.title,
          body: event.body,
          status,
          expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
          data: {
            incidentId: event.incidentId,
            eventType: event.eventType,
            url: '/emergencia-respuesta',
            ...(event.data ?? {}),
          },
          deliveries: devices.length
            ? {
                create: devices.map((device) => ({
                  deviceId: device.id,
                  userId: device.userId,
                  tokenSnapshot: device.token,
                  platform: device.platform,
                  history: { create: { status: AlarmDeliveryStatus.QUEUED } },
                })),
              }
            : undefined,
        },
        select: { id: true, status: true },
      });
      return { ...notification, deduplicated: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await client.alarmNotification.findUniqueOrThrow({
          where: { dedupKey: event.dedupKey },
          select: { id: true, status: true },
        });
        return { ...duplicate, deduplicated: true };
      }
      throw error;
    }
  }

  async markForUser(
    userId: string,
    notificationId: string,
    target: 'OPENED' | 'ACKNOWLEDGED',
    token?: string,
  ) {
    const targetStatus = AlarmDeliveryStatus[target];
    const deliveries = await this.prisma.alarmDelivery.findMany({
      where: {
        notificationId,
        userId,
        ...(token ? { tokenSnapshot: token.trim() } : {}),
      },
      select: { id: true, status: true },
    });
    if (!deliveries.length) throw new NotFoundException('Notificación no encontrada');

    const eligible = deliveries.filter((delivery) => {
      if (targetStatus === AlarmDeliveryStatus.ACKNOWLEDGED) {
        return delivery.status !== AlarmDeliveryStatus.ACKNOWLEDGED;
      }
      return (
        delivery.status !== AlarmDeliveryStatus.OPENED &&
        delivery.status !== AlarmDeliveryStatus.ACKNOWLEDGED
      );
    });

    if (eligible.length) {
      const now = new Date();
      await this.prisma.$transaction(
        eligible.flatMap((delivery) => [
          this.prisma.alarmDelivery.update({
            where: { id: delivery.id },
            data: {
              status: targetStatus,
              ...(targetStatus === AlarmDeliveryStatus.OPENED
                ? { openedAt: now }
                : { acknowledgedAt: now, openedAt: now }),
            },
          }),
          this.prisma.alarmDeliveryHistory.create({
            data: { deliveryId: delivery.id, status: targetStatus },
          }),
        ]),
      );
      await this.refreshNotificationStatus(notificationId);
    }
    return { ok: true, notificationId, status: target.toLowerCase() };
  }

  async listOwn(userId: string, take = 50) {
    const rows = await this.prisma.alarmNotification.findMany({
      where: { deliveries: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
      select: {
        id: true,
        incidentId: true,
        eventType: true,
        title: true,
        body: true,
        data: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        deliveries: {
          where: { userId },
          select: {
            id: true,
            platform: true,
            status: true,
            attempts: true,
            sentAt: true,
            openedAt: true,
            acknowledgedAt: true,
            failedAt: true,
            lastError: true,
            history: {
              select: { status: true, detail: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    return rows.map((row) => ({
      ...row,
      status: row.status.toLowerCase(),
      deliveries: row.deliveries.map((delivery) => ({
        ...delivery,
        status: delivery.status.toLowerCase(),
        history: delivery.history.map((entry) => ({
          ...entry,
          status: entry.status.toLowerCase(),
        })),
      })),
    }));
  }

  async refreshNotificationStatus(notificationId: string) {
    const deliveries = await this.prisma.alarmDelivery.findMany({
      where: { notificationId },
      select: { status: true },
    });
    if (!deliveries.length) return;
    const statuses = deliveries.map((delivery) => delivery.status);
    let status: AlarmDeliveryStatus = AlarmDeliveryStatus.FAILED;
    if (statuses.every((value) => value === AlarmDeliveryStatus.ACKNOWLEDGED)) {
      status = AlarmDeliveryStatus.ACKNOWLEDGED;
    } else if (
      statuses.some(
        (value) =>
          value === AlarmDeliveryStatus.OPENED ||
          value === AlarmDeliveryStatus.ACKNOWLEDGED,
      )
    ) {
      status = AlarmDeliveryStatus.OPENED;
    } else if (statuses.some((value) => value === AlarmDeliveryStatus.PROCESSING)) {
      status = AlarmDeliveryStatus.PROCESSING;
    } else if (statuses.some((value) => value === AlarmDeliveryStatus.QUEUED)) {
      status = AlarmDeliveryStatus.QUEUED;
    } else if (statuses.some((value) => value === AlarmDeliveryStatus.SENT)) {
      status = AlarmDeliveryStatus.SENT;
    } else if (statuses.every((value) => value === AlarmDeliveryStatus.EXPIRED)) {
      status = AlarmDeliveryStatus.EXPIRED;
    }
    await this.prisma.alarmNotification.update({
      where: { id: notificationId },
      data: { status },
    });
  }

  private numberConfig(name: string, fallback: number, minimum: number) {
    const value = Number(this.config.get<string>(name));
    return Number.isFinite(value) ? Math.max(Math.floor(value), minimum) : fallback;
  }
}
