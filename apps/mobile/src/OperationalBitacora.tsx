import { useEffect, useRef, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { api } from './lib/api';
import type { TimelineEvent } from './types';

const TONE_CLASS: Record<string, string> = {
  MAYDAY: 'crit',
  BOMBERO_HERIDO: 'crit',
  BOMBERO_ATRAPADO: 'crit',
  VICTIMA_FATAL: 'crit',
  EXPLOSION: 'crit',
  COLAPSO: 'crit',
  SEGUNDA_ALARMA: 'crit',
  TERCERA_ALARMA: 'crit',
  DESPACHO: 'alert',
  EXTINTO: 'alert',
  PROPAGACION: 'alert',
  REBROTE: 'alert',
  PERSONA_ATRAPADA: 'crit',
  EN_LUGAR: 'ok',
  CONTROLADO: 'ok',
  EN_CUARTEL: 'ok',
  DISPONIBLE: 'ok',
  EN_CAMINO: 'info',
  RECONOCIMIENTO: 'info',
  REGRESO: 'info',
  AVISO: 'warn',
  CONFIRMACION: 'warn',
  DIRECCION_ACTUALIZADA: 'warn',
  CAMBIO_CLAVE: 'warn',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function OperationalBitacora({
  incidentId,
  events: provided,
  live = false,
}: {
  incidentId?: string;
  events?: TimelineEvent[];
  live?: boolean;
}) {
  const [fetched, setFetched] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(!provided);
  const bottomRef = useRef<HTMLLIElement | null>(null);
  const events = provided ?? fetched;

  useEffect(() => {
    if (provided || !incidentId) return;
    let cancelled = false;
    const load = () =>
      api.get<TimelineEvent[]>(`/incident-timeline/incident/${incidentId}`)
        .then(({ data }) => {
          if (!cancelled) setFetched(data);
        })
        .catch(() => {
          if (!cancelled) setFetched([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    void load();
    if (!live) return () => { cancelled = true; };
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [incidentId, live, provided]);

  useEffect(() => {
    if (!live || !events.length) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [events.length, live]);

  return (
    <section className="bitacora-card">
      <div className="section-title">
        <span><ClipboardList /> BITÁCORA OPERACIONAL</span>
        {live ? <small className="bitacora-live">En vivo</small> : <small>{events.length || 0} registros</small>}
      </div>
      {loading ? (
        <p className="empty">Cargando bitácora…</p>
      ) : events.length ? (
        <ol className="bitacora-list">
          {events.map((event, index) => {
            const last = index === events.length - 1;
            return (
              <li
                key={event.id}
                ref={last ? bottomRef : undefined}
                className={`bitacora-item ${TONE_CLASS[event.kind] || ''} ${live && last ? 'fresh' : ''}`}
              >
                <i />
                <div>
                  <time>{fmtTime(event.occurredAt)}</time>
                  <b>{event.label}</b>
                  {event.note && <p>{event.note}</p>}
                  {event.author && <small>{event.author.firstName} {event.author.lastName}</small>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty">
          {live
            ? 'La centralista aún no registra movimientos. Se actualiza sola.'
            : 'No hay registros de la central en esta emergencia.'}
        </p>
      )}
    </section>
  );
}
