import { AlarmDeliveryStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AlarmQueueService } from './alarm-queue.service';

const event = {
  incidentId: 'incident-1',
  eventType: 'DISPATCH' as const,
  dedupKey: 'incident:incident-1:dispatch',
  title: 'ALARMA 10-4',
  body: 'Incendio estructural',
  companyIds: ['company-1', 'company-1', ''],
  data: { code: '10-4' },
};

describe('AlarmQueueService', () => {
  it('returns an existing notification without creating duplicate deliveries', async () => {
    const prisma = {
      alarmNotification: {
        findUnique: vi.fn().mockResolvedValue({ id: 'notification-1', status: 'SENT' }),
        create: vi.fn(),
      },
    };
    const service = new AlarmQueueService(prisma as never, { get: vi.fn() } as never);

    await expect(service.enqueue(event)).resolves.toEqual({
      id: 'notification-1',
      status: 'SENT',
      deduplicated: true,
    });
    expect(prisma.alarmNotification.create).not.toHaveBeenCalled();
  });

  it('snapshots each target device once and includes critical routing data', async () => {
    const prisma = {
      alarmNotification: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'notification-1', status: 'QUEUED' }),
      },
      devicePushToken: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'device-1', userId: 'user-1', token: 'token-1', platform: 'android' },
        ]),
      },
    };
    const service = new AlarmQueueService(
      prisma as never,
      { get: vi.fn().mockReturnValue('600') } as never,
    );

    await expect(service.enqueue(event)).resolves.toMatchObject({ deduplicated: false });
    expect(prisma.devicePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { isActive: true, companyId: { in: ['company-1'] } } },
      }),
    );
    expect(prisma.alarmNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dedupKey: event.dedupKey,
        data: expect.objectContaining({
          incidentId: 'incident-1',
          eventType: 'DISPATCH',
          code: '10-4',
          url: '/emergencia-respuesta',
        }),
        deliveries: {
          create: [
            expect.objectContaining({
              tokenSnapshot: 'token-1',
              history: { create: { status: AlarmDeliveryStatus.QUEUED } },
            }),
          ],
        },
      }),
      select: { id: true, status: true },
    });
  });

  it('scopes acknowledgement updates to the authenticated user', async () => {
    const prisma = {
      alarmDelivery: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'delivery-1', status: AlarmDeliveryStatus.SENT },
        ]),
        update: vi.fn().mockReturnValue('update-operation'),
      },
      alarmDeliveryHistory: {
        create: vi.fn().mockReturnValue('history-operation'),
      },
      alarmNotification: { update: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const service = new AlarmQueueService(prisma as never, { get: vi.fn() } as never);
    vi.spyOn(service, 'refreshNotificationStatus').mockResolvedValue();

    await service.markForUser('user-1', 'notification-1', 'ACKNOWLEDGED');

    expect(prisma.alarmDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notificationId: 'notification-1', userId: 'user-1' },
      }),
    );
    expect(prisma.alarmDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: AlarmDeliveryStatus.ACKNOWLEDGED,
          acknowledgedAt: expect.any(Date),
          openedAt: expect.any(Date),
        }),
      }),
    );
  });
});
