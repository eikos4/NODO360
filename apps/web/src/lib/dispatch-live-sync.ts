/** Sincronización inmediata sala pública ↔ central de despacho (misma máquina / pestañas). */

export type DispatchLiveEvent = {
  type: 'dispatch';
  companyIds: string[];
  incidentId?: string;
  at: number;
};

const CHANNEL = 'nodo360-dispatch-live';
const STORAGE_KEY = 'nodo360_last_dispatch';

export function notifyDispatchLive(payload: Omit<DispatchLiveEvent, 'type' | 'at'> & { type?: 'dispatch' }) {
  const event: DispatchLiveEvent = {
    type: 'dispatch',
    companyIds: payload.companyIds,
    incidentId: payload.incidentId,
    at: Date.now(),
  };

  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(event);
    bc.close();
  } catch {
    /* BroadcastChannel no disponible */
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    /* storage lleno / privado */
  }
}

export function companyIdsFromDispatchResponse(data: {
  companyId?: string;
  vehicles?: { vehicle?: { companyId?: string } }[];
}): string[] {
  const ids = new Set<string>();
  if (data.companyId) ids.add(data.companyId);
  for (const row of data.vehicles ?? []) {
    if (row.vehicle?.companyId) ids.add(row.vehicle.companyId);
  }
  return [...ids];
}

export function subscribeDispatchLive(
  companyId: string | undefined,
  onRefresh: () => void,
  onDispatch?: (event: DispatchLiveEvent) => void,
): () => void {
  if (!companyId) return () => {};

  const handle = (event: DispatchLiveEvent) => {
    if (event.companyIds.includes(companyId)) {
      onDispatch?.(event);
      onRefresh();
    }
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev: MessageEvent<DispatchLiveEvent>) => {
      if (ev.data?.type === 'dispatch') handle(ev.data);
    };
  } catch {
    /* noop */
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== STORAGE_KEY || !ev.newValue) return;
    try {
      const parsed = JSON.parse(ev.newValue) as DispatchLiveEvent;
      if (parsed.type === 'dispatch') handle(parsed);
    } catch {
      /* noop */
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}

export function subscribeAnyDispatchLive(onRefresh: () => void): () => void {
  const handle = () => onRefresh();

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev: MessageEvent<DispatchLiveEvent>) => {
      if (ev.data?.type === 'dispatch') handle();
    };
  } catch {
    /* noop */
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== STORAGE_KEY || !ev.newValue) return;
    try {
      const parsed = JSON.parse(ev.newValue) as DispatchLiveEvent;
      if (parsed.type === 'dispatch') handle();
    } catch {
      /* noop */
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}

/** Intervalo de polling en sala pública (ms). */
export const PUBLIC_POLL_MS_IDLE = 4000;
export const PUBLIC_POLL_MS_URGENT = 1500;
