import type { QueuedResponse } from '../types';

export type QueueSendResult = { status?: number };

function queueKey(item: Pick<QueuedResponse, 'incidentId' | 'action'>) {
  return `${item.incidentId}:${item.action ?? 'respond'}`;
}

export function replacePendingResponse(
  queue: QueuedResponse[],
  next: QueuedResponse,
): QueuedResponse[] {
  const key = queueKey(next);
  return [...queue.filter((entry) => queueKey(entry) !== key), next];
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
