import type { QueuedResponse } from '../types';

export type QueueSendResult = { status?: number };

export function replacePendingResponse(
  queue: QueuedResponse[],
  next: QueuedResponse,
): QueuedResponse[] {
  return [...queue.filter((entry) => entry.incidentId !== next.incidentId), next];
}

export async function flushResponseQueue(
  queue: QueuedResponse[],
  send: (item: QueuedResponse) => Promise<void>,
): Promise<QueuedResponse[]> {
  const remaining: QueuedResponse[] = [];
  for (const item of queue) {
    try {
      await send(item);
    } catch (error: unknown) {
      const status = (error as { response?: QueueSendResult }).response?.status;
      if (!status || status >= 500 || status === 429) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
  }
  return remaining;
}
