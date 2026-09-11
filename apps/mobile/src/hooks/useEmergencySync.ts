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
        const path = item.action === 'mark-location'
          ? `/emergency-response/${item.incidentId}/mark-location`
          : `/emergency-response/${item.incidentId}/respond`;
        await api.post(
          path,
          {
            ...(item.action === 'mark-location' ? {} : { status: item.status }),
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
      action: 'respond',
      ...position,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const queue = await localStore.getQueue();
    await localStore.setQueue(replacePendingResponse(queue, item));
    setPendingCount(replacePendingResponse(queue, item).length);
    setSnapshot((current) => current ? {
      ...current,
      incidents: current.incidents.map((incident) => {
        if (incident.id !== incidentId) return incident;
        const prev = incident.myResponse?.status;
        const goingDelta = (status === 'GOING' && prev !== 'GOING' ? 1 : 0) - (prev === 'GOING' && status !== 'GOING' ? 1 : 0);
        const onSceneDelta = (status === 'ON_SCENE' && prev !== 'ON_SCENE' ? 1 : 0) - (prev === 'ON_SCENE' && status !== 'ON_SCENE' ? 1 : 0);
        const notGoingDelta = (status === 'NOT_GOING' && prev !== 'NOT_GOING' ? 1 : 0) - (prev === 'NOT_GOING' && status !== 'NOT_GOING' ? 1 : 0);
        const holdDelta = (status === 'NOT_AVAILABLE' && prev !== 'NOT_AVAILABLE' ? 1 : 0) - (prev === 'NOT_AVAILABLE' && status !== 'NOT_AVAILABLE' ? 1 : 0);
        return {
          ...incident,
          myResponse: { status, statusLabel: current.statusLabels[status] || status },
          teamSummary: {
            ...incident.teamSummary,
            going: Math.max(0, incident.teamSummary.going + goingDelta),
            onScene: Math.max(0, incident.teamSummary.onScene + onSceneDelta),
            notGoing: Math.max(0, incident.teamSummary.notGoing + notGoingDelta),
            notAvailable: Math.max(0, incident.teamSummary.notAvailable + holdDelta),
          },
        };
      }),
    } : current);
    if (navigator.onLine) await flushQueue();
  }, [flushQueue]);

  const markLocation = useCallback(async (
    incidentId: string,
    position: { latitude: number; longitude: number },
  ) => {
    const item: QueuedResponse = {
      id: crypto.randomUUID(),
      incidentId,
      status: 'ON_SCENE',
      action: 'mark-location',
      ...position,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const queue = await localStore.getQueue();
    await localStore.setQueue(replacePendingResponse(queue, item));
    setPendingCount(replacePendingResponse(queue, item).length);
    setSnapshot((current) => current ? {
      ...current,
      incidents: current.incidents.map((incident) => incident.id === incidentId
        ? {
            ...incident,
            fieldGps: { latitude: position.latitude, longitude: position.longitude, confirmedAt: new Date().toISOString() },
            mapLat: position.latitude,
            mapLng: position.longitude,
          }
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
    markLocation,
    markNotification,
  };
}
