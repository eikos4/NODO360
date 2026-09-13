import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EmergencyResponseService } from './emergency-response.service';

const user = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Rojas',
  role: 'BOMBERO',
  companyId: 'company-1',
  photoUrl: null,
  operativeNumber: 7,
  stationAvailable: true,
  isActive: true,
  company: { isActive: true },
};

const response = {
  id: 'response-1',
  incidentId: 'incident-1',
  userId: 'user-1',
  status: 'GOING',
  latitude: null,
  longitude: null,
  markerLatitude: null,
  markerLongitude: null,
  onSceneAt: null,
  locationMarkedAt: null,
  note: null,
  respondedAt: new Date('2026-09-07T12:00:00.000Z'),
  updatedAt: new Date('2026-09-07T12:00:00.000Z'),
  user,
};

function makeService(prisma: Record<string, unknown>) {
  const alarms = { enqueue: vi.fn() };
  const broadcaster = { emit: vi.fn() };
  return {
    service: new EmergencyResponseService(
      prisma as never,
      {} as never,
      alarms as never,
      broadcaster as never,
    ),
    alarms,
    broadcaster,
  };
}

describe('EmergencyResponseService operational contract', () => {
  it('rejects LOCATION_MARKED through the assistance endpoint', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      incident: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'incident-1',
          companyId: 'company-1',
          closedAt: null,
        }),
      },
    };
    const { service } = makeService(prisma);

    await expect(
      service.respond('user-1', 'incident-1', { status: 'LOCATION_MARKED' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays an identical idempotent response without writing or broadcasting twice', async () => {
    const tx = {
      incidentEmergencyResponseHistory: {
        findUnique: vi.fn().mockResolvedValue({
          eventType: 'RESPONSE',
          status: 'GOING',
          latitude: null,
          longitude: null,
          note: null,
        }),
        create: vi.fn(),
      },
      incidentEmergencyResponse: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(response),
        upsert: vi.fn(),
      },
      user: { update: vi.fn() },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      incident: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'incident-1',
          companyId: 'company-1',
          closedAt: null,
        }),
        findUnique: vi.fn().mockResolvedValue({
          companyId: 'company-1',
          vehicles: [],
        }),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const { service, broadcaster } = makeService(prisma);

    await expect(
      service.respond('user-1', 'incident-1', {
        status: 'GOING',
        idempotencyKey: 'stable-request-id',
      }),
    ).resolves.toMatchObject({ ok: true, replayed: true });
    expect(tx.incidentEmergencyResponseHistory.create).not.toHaveBeenCalled();
    expect(tx.incidentEmergencyResponse.upsert).not.toHaveBeenCalled();
    expect(broadcaster.emit).not.toHaveBeenCalled();
  });

  it('marks location without replacing the responder assistance status', async () => {
    const updatedAt = new Date('2026-09-07T12:05:00.000Z');
    const markedResponse = {
      ...response,
      markerLatitude: -36.14,
      markerLongitude: -71.83,
      locationMarkedAt: updatedAt,
      updatedAt,
    };
    const tx = {
      incidentEmergencyResponseHistory: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      incidentEmergencyResponse: {
        upsert: vi.fn().mockResolvedValue(markedResponse),
      },
      incident: {
        update: vi.fn().mockResolvedValue({ updatedAt, locationPinAt: updatedAt }),
      },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      incident: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'incident-1',
          code: '10-4',
          type: 'Incendio',
          address: 'Parral',
          companyId: 'company-1',
          latitude: null,
          longitude: null,
          closedAt: null,
        }),
        findUnique: vi.fn().mockResolvedValue({
          companyId: 'company-1',
          vehicles: [],
        }),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const { service, alarms, broadcaster } = makeService(prisma);

    await expect(
      service.markLocation('user-1', 'incident-1', {
        latitude: -36.14,
        longitude: -71.83,
        idempotencyKey: 'location-request-id',
      }),
    ).resolves.toMatchObject({
      replayed: false,
      response: { status: 'GOING', locationMarked: true },
    });
    expect(tx.incidentEmergencyResponse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({ status: expect.anything() }),
      }),
    );
    expect(alarms.enqueue).toHaveBeenCalledTimes(1);
    expect(broadcaster.emit).toHaveBeenCalledTimes(1);
  });

  it('returns the operational recap for a closed emergency the firefighter attended', async () => {
    const occurredAt = new Date('2026-09-12T20:10:00.000Z');
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          role: 'BOMBERO',
          companyId: 'company-1',
          isActive: true,
        }),
      },
      incident: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'incident-1',
          code: 'E-1',
          type: '10-0 — Incendio estructural',
          description: 'Casa habitación',
          address: 'Aníbal Pinto 100',
          status: 'CLOSED',
          dispatchedAt: new Date('2026-09-12T20:00:00.000Z'),
          closedAt: new Date('2026-09-12T21:00:00.000Z'),
          companyId: 'company-1',
          vehicles: [],
          bitacoraEntry: {
            id: 'bit-1',
            title: 'Incendio controlado',
            emergencyType: '10-0',
            address: 'Aníbal Pinto 100',
            occurredAt,
            summary: 'Fuego en techumbre, sin heridos.',
            actionsTaken: 'Ataque interior y ventilación.',
            personnelNotes: null,
            vehicleNotes: null,
            outcome: 'Extinto',
            observations: null,
            author: { firstName: 'Ana', lastName: 'Central' },
          },
          timelineEvents: [
            {
              id: 't1',
              kind: 'DESPACHO',
              label: 'Despacho',
              note: null,
              occurredAt,
              author: { id: 'c1', firstName: 'Ana', lastName: 'Central' },
            },
          ],
        }),
      },
      incidentEmergencyResponse: { findUnique: vi.fn().mockResolvedValue(response) },
    };
    const { service } = makeService(prisma);

    await expect(service.getRecap('user-1', 'incident-1')).resolves.toMatchObject({
      incident: { id: 'incident-1', code: '10-0', address: 'Aníbal Pinto 100' },
      myResponse: { status: 'GOING' },
      timeline: [{ kind: 'DESPACHO', label: 'Despacho' }],
      report: { title: 'Incendio controlado', outcome: 'Extinto' },
    });
  });
});
