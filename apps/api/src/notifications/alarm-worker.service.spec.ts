import { AlarmDeliveryStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AlarmWorkerService } from './alarm-worker.service';

const delivery = {
  id: 'delivery-1',
  notificationId: 'notification-1',
  tokenSnapshot: 'device-token',
  attempts: 2,
  notification: {
    id: 'notification-1',
    title: 'ALARMA 10-4',
    body: 'Incendio',
    data: {},
    expiresAt: new Date(Date.now() + 60_000),
  },
};

describe('AlarmWorkerService retry policy', () => {
  it('requeues transient failures with backoff and keeps the device token', async () => {
    const prisma = {
      alarmDelivery: { update: vi.fn().mockReturnValue('update') },
      alarmDeliveryHistory: { create: vi.fn().mockReturnValue('history') },
      devicePushToken: { deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const config = {
      get: vi.fn((name: string) => {
        if (name === 'ALARM_WORKER_MAX_ATTEMPTS') return '8';
        if (name === 'ALARM_WORKER_BACKOFF_BASE_MS') return '1000';
        return undefined;
      }),
    };
    const worker = new AlarmWorkerService(prisma as never, config as never, {} as never, {} as never);
    const before = Date.now();

    await (worker as unknown as {
      handleFailure(value: typeof delivery, error: unknown): Promise<void>;
    }).handleFailure(delivery, Object.assign(new Error('FCM unavailable'), { code: 'messaging/internal-error' }));

    expect(prisma.alarmDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({
        status: AlarmDeliveryStatus.QUEUED,
        lockedAt: null,
        lastError: 'messaging/internal-error: FCM unavailable',
        nextAttemptAt: expect.any(Date),
      }),
    });
    const update = prisma.alarmDelivery.update.mock.calls[0][0];
    expect(update.data.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 2000);
    expect(prisma.devicePushToken.deleteMany).not.toHaveBeenCalled();
  });

  it('fails permanently invalid tokens and schedules their deletion', async () => {
    const prisma = {
      alarmDelivery: { update: vi.fn().mockReturnValue('update') },
      alarmDeliveryHistory: { create: vi.fn().mockReturnValue('history') },
      devicePushToken: { deleteMany: vi.fn().mockReturnValue('delete-token') },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const config = { get: vi.fn().mockReturnValue(undefined) };
    const worker = new AlarmWorkerService(prisma as never, config as never, {} as never, {} as never);

    await (worker as unknown as {
      handleFailure(value: typeof delivery, error: unknown): Promise<void>;
    }).handleFailure(
      delivery,
      Object.assign(new Error('token gone'), {
        code: 'messaging/registration-token-not-registered',
      }),
    );

    expect(prisma.alarmDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({
        status: AlarmDeliveryStatus.FAILED,
        failedAt: expect.any(Date),
      }),
    });
    expect(prisma.devicePushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'device-token' },
    });
    expect(prisma.$transaction.mock.calls[0][0]).toContain('delete-token');
  });
});
