import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

const LIVE_EVENTS = [
  'emergency.dispatch.created.v1',
  'emergency.response.updated.v1',
  'emergency.location.updated.v1',
  'emergency.incident.updated.v1',
  'emergency.incident.cancelled.v1',
  'emergency.incident.closed.v1',
  'emergency.standby.v1',
] as const;

function socketOrigin() {
  const api = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  if (api) return api.replace(/\/api\/?$/, '');
  return window.location.origin;
}

/** Socket de emergencias: JWT (teléfono/web logueado) o slug público (sala de máquinas). */
export function useEmergencyLiveSocket(opts: {
  enabled?: boolean;
  token?: string | null;
  slug?: string | null;
  salaToken?: string | null;
  onEvent: () => void;
}) {
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;

  useEffect(() => {
    const enabled = opts.enabled !== false;
    const token = opts.token?.trim() || '';
    const slug = opts.slug?.trim() || '';
    const salaToken = opts.salaToken?.trim() || '';
    if (!enabled || (!token && !slug)) return;

    const socket: Socket = io(`${socketOrigin()}/emergencies`, {
      auth: token
        ? { token }
        : { slug, ...(salaToken ? { salaToken } : {}) },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    const handle = () => onEventRef.current();
    LIVE_EVENTS.forEach((name) => socket.on(name, handle));

    return () => {
      LIVE_EVENTS.forEach((name) => socket.off(name, handle));
      socket.disconnect();
    };
  }, [opts.enabled, opts.token, opts.slug, opts.salaToken]);
}
