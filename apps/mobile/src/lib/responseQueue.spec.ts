import { describe, expect, it, vi } from 'vitest';
import type { QueuedResponse } from '../types';
import { flushResponseQueue, replacePendingResponse } from './responseQueue';

const queued = (id: string, incidentId: string): QueuedResponse => ({
  id,
  incidentId,
  status: 'GOING',
  createdAt: '2026-09-07T12:00:00.000Z',
  attempts: 0,
});

describe('offline response queue', () => {
  it('keeps only the latest pending response for each incident', () => {
    const first = queued('request-1', 'incident-1');
    const other = queued('request-2', 'incident-2');
    const replacement = { ...queued('request-3', 'incident-1'), status: 'ON_SCENE' as const };

    expect(replacePendingResponse([first, other], replacement)).toEqual([other, replacement]);
  });

  it('keeps respond and mark-location as separate pending items', () => {
    const respond = queued('r1', 'incident-1');
    const pin = { ...queued('m1', 'incident-1'), action: 'mark-location' as const, latitude: -36.1, longitude: -71.8 };
    expect(replacePendingResponse([respond], pin)).toEqual([respond, pin]);
  });

  it('removes successful and terminal 4xx responses, retaining retryable failures', async () => {
    const success = queued('success', 'incident-1');
    const serverFailure = queued('server', 'incident-2');
    const rateLimited = queued('rate', 'incident-3');
    const invalid = queued('invalid', 'incident-4');
    const offline = queued('offline', 'incident-5');
    const send = vi.fn(async (item: QueuedResponse) => {
      if (item.id === 'server') throw { response: { status: 503 } };
      if (item.id === 'rate') throw { response: { status: 429 } };
      if (item.id === 'invalid') throw { response: { status: 400 } };
      if (item.id === 'offline') throw new Error('network unavailable');
    });

    const remaining = await flushResponseQueue(
      [success, serverFailure, rateLimited, invalid, offline],
      send,
    );

    expect(send).toHaveBeenCalledTimes(5);
    expect(remaining.map(({ id, attempts }) => ({ id, attempts }))).toEqual([
      { id: 'server', attempts: 1 },
      { id: 'rate', attempts: 1 },
      { id: 'offline', attempts: 1 },
    ]);
  });

  it('resends the stable idempotency id unchanged on later attempts', async () => {
    const item = { ...queued('stable-key', 'incident-1'), attempts: 3 };
    const send = vi.fn().mockRejectedValue({ response: { status: 500 } });

    await expect(flushResponseQueue([item], send)).resolves.toEqual([
      { ...item, attempts: 4 },
    ]);
    expect(send).toHaveBeenCalledWith(item);
  });
});
