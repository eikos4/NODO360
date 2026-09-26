import type { IncidentTimelineKind } from './incident-timeline';

const QUEUE_KEY = 'nodo360_carro_timeline_queue';

export type PendingTimelineHit = {
  id: string;
  slug: string;
  incidentId: string;
  kind: IncidentTimelineKind;
  note?: string;
  createdAt: string;
};

function readAll(): PendingTimelineHit[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PendingTimelineHit[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-40)));
}

export function enqueueTimelineHit(
  hit: Omit<PendingTimelineHit, 'id' | 'createdAt'>,
): PendingTimelineHit {
  const item: PendingTimelineHit = {
    ...hit,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function listPendingHits(slug?: string): PendingTimelineHit[] {
  const all = readAll();
  return slug ? all.filter((h) => h.slug === slug) : all;
}

export function removePendingHit(id: string) {
  writeAll(readAll().filter((h) => h.id !== id));
}

export async function flushTimelineQueue(
  apiBase: string,
  headersFor: (slug: string) => HeadersInit,
): Promise<{ sent: number; failed: number }> {
  if (!navigator.onLine) return { sent: 0, failed: 0 };
  const pending = readAll();
  let sent = 0;
  let failed = 0;
  for (const hit of pending) {
    try {
      const res = await fetch(`${apiBase}/incident-timeline/public/${hit.slug}`, {
        method: 'POST',
        headers: {
          ...headersFor(hit.slug),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentId: hit.incidentId,
          kind: hit.kind,
          note: hit.note,
        }),
      });
      if (!res.ok) {
        failed += 1;
        continue;
      }
      removePendingHit(hit.id);
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
