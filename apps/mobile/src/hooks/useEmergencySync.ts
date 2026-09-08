import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { EmergencyEventEnvelope, EmergencyResponseStatus } from '@nodo360/shared';
import { API_URL, api } from '../lib/api';
import { localStore } from '../lib/localStore';
import { flushResponseQueue, replacePendingResponse } from '../lib/responseQueue';
import { getSessionToken } from '../platform/session';
import type {
  AlarmHistoryItem,
  ConnectionState,
  EmergencySnapshot,
  QueuedResponse,
} from '../types';

const POLL_ACTIVE_MS = 12_000;
const POLL_IDLE_MS = 45_000;
const socketOrigin = API_URL.replace(/\/api\/?$/, '') || window.location.origin;

export function useEmergencySync(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<EmergencySnapshot | null>(null);
  const [history, setHistory] = useState<AlarmHistoryItem[]>([]);
  const [connection, setConnection] = useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline',
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const refreshingRef = useRef(false);

  const loadLocal = useCallback(async () => {
    const [cached, cachedHistory, queue] = await Promise.all([
      localStore.getSnapshot(),
      localStore.getHistory(),
      localStore.getQueue(),
    ]);
    setSnapshot(cached);
    setHistory(cachedHistory);
    setPendingCount(queue.length);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !navigator.onLine || refreshingRef.current) return;
    refreshingRef.current = true;
    setConnection('syncing');
    try {
      const [{ data: next }, { data: notifications }] = await Promise.all([
        api.get<EmergencySnapshot>('/emergency-response/snapshot'),
        api.get<AlarmHistoryItem[]>('/notifications/mine?take=12'),
      ]);
      setSnapshot(next);
      setHistory(notifications);
      await Promise.all([localStore.setSnapshot(next), localStore.setHistory(notifications)]);
      setLastError(null);
      setConnection('online');
    } catch {
      setLastError('No fue posible actualizar; se muestran datos guardados.');
      setConnection(navigator.onLine ? 'online' : 'offline');
    } finally {
      refreshingRef.current = false;
    }
  }, [enabled]);

  const flushQueue = useCallback(async () => {
    if (!enabled || !navigator.onLine) return;
    let queue = await localStore.getQueue();
    if (!queue.length) return;
    setConnection('syncing');
    queue = await flushResponseQueue(queue, async (item) => {
        await api.post(
          `/emergency-response/${item.incidentId}/respond`,
          {
            status: item.status,
            latitude: item.latitude,
            longitude: item.longitude,
            idempotencyKey: item.id,
          },
          { headers: { 'Idempotency-Key': item.id } },
        );
    });
    await localStore.setQueue(queue);
    setPendingCount(queue.length);
    setConnection(navigator.onLine ? 'online' : 'offline');
    if (!queue.length) await refresh();
  }, [enabled, refresh]);

  const respond = useCallback(async (
    incidentId: string,
    status: EmergencyResponseStatus,
    position?: { latitude: number; longitude: number },
  ) => {
    const item: QueuedResponse = {
      id: crypto.randomUUID(),
      incidentId,
      status,
      ...position,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const queue = await localStore.getQueue();
    await localStore.setQueue(replacePendingResponse(queue, item));
    setPendingCount(queue.filter((entry) => entry.incidentId !== incidentId).length + 1);
    setSnapshot((current) => current ? {
      ...current,
      incidents: current.incidents.map((incident) => incident.id === incidentId
        ? { ...incident, myResponse: { status, statusLabel: current.statusLabels[status] || status } }
        : incident),
    } : current);
    if (navigator.onLine) await flushQueue();
  }, [flushQueue]);

  const markNotification = useCallback(async (
    notificationId: string,
    state: 'opened' | 'acknowledged',
  ) => {
    try {
      await api.post(`/notifications/${notificationId}/${state}`, {});
      await refresh();
    } catch {
      // La siguiente sincronización conserva el contexto de la alarma;
      // estos marcadores son telemetría, no bloquean la respuesta operativa.
    }
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    void loadLocal().then(refresh).then(flushQueue);

    const online = () => {
      setConnection('syncing');
      void flushQueue().then(refresh);
    };
    const offline = () => setConnection('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    let timer: number;
    const schedulePoll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await refresh();
        schedulePoll();
      }, snapshot?.incidents.length ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    schedulePoll();

    void getSessionToken().then((token) => {
      if (!token) return;
      const socket = io(`${socketOrigin}/emergencies`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;
      const onEvent = (_event: EmergencyEventEnvelope) => void refresh();
      [
        'emergency.dispatch.created.v1',
        'emergency.response.updated.v1',
        'emergency.location.updated.v1',
        'emergency.incident.updated.v1',
        'emergency.incident.cancelled.v1',
        'emergency.incident.closed.v1',
      ].forEach((name) => socket.on(name, onEvent));
      socket.on('connect_error', () => setLastError('Tiempo real interrumpido; polling activo.'));
    });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, flushQueue, loadLocal, refresh, snapshot?.incidents.length]);

  return {
    snapshot,
    history,
    connection,
    pendingCount,
    lastError,
    refresh,
    respond,
    markNotification,
  };
}
