import { describe, expect, it, vi } from 'vitest';
import { EmergencyBroadcaster } from './emergency-broadcaster.service';
import { EMERGENCY_EVENT_NAMES } from './emergency-events.contract';
import { EmergencyGateway } from './emergency.gateway';

describe('emergency realtime contract', () => {
  it('emits a versioned, deduplicated envelope to company rooms', () => {
    const gateway = { emitToCompanies: vi.fn() };
    const broadcaster = new EmergencyBroadcaster(gateway as never);

    const envelope = broadcaster.emit({
      event: EMERGENCY_EVENT_NAMES.locationUpdated,
      incidentId: 'incident-1',
      companyIds: ['company-1', 'company-1', 'company-2'],
      snapshotVersion: new Date('2026-09-07T12:00:00.000Z'),
      data: { fieldGps: { latitude: -36.14, longitude: -71.83, confirmedAt: null } },
    });

    expect(envelope).toMatchObject({
      event: 'emergency.location.updated.v1',
      schemaVersion: 1,
      snapshotVersion: '2026-09-07T12:00:00.000Z',
      incidentId: 'incident-1',
      companyIds: ['company-1', 'company-2'],
    });
    expect(envelope.eventId).toEqual(expect.any(String));
    expect(Date.parse(envelope.occurredAt)).not.toBeNaN();
    expect(gateway.emitToCompanies).toHaveBeenCalledWith(envelope);
  });

  it('authorizes an active user only into their active company rooms', async () => {
    const jwt = { verify: vi.fn().mockReturnValue({ sub: 'user-1' }) };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          role: 'BOMBERO',
          isActive: true,
          companyId: 'company-1',
          supportCompanyId: 'company-2',
          company: { isActive: true },
          supportCompany: { isActive: false },
        }),
      },
    };
    const gateway = new EmergencyGateway(jwt as never, prisma as never);
    const client = {
      handshake: { auth: { token: 'signed-token' }, headers: {} },
      data: {},
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(jwt.verify).toHaveBeenCalledWith('signed-token');
    expect(client.join).toHaveBeenCalledWith(['emergency:company:company-1']);
    expect(client.emit).toHaveBeenCalledWith(
      'emergency.ready.v1',
      expect.objectContaining({ schemaVersion: 1, companyIds: ['company-1'] }),
    );
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects unauthenticated sockets without querying users', async () => {
    const jwt = { verify: vi.fn() };
    const prisma = { user: { findUnique: vi.fn() } };
    const gateway = new EmergencyGateway(jwt as never, prisma as never);
    const client = {
      handshake: { auth: {}, headers: {} },
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
