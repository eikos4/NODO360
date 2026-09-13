import { useEffect, useState } from 'react';
import { ChevronLeft, Clock3, Flame, MapPin } from 'lucide-react';
import { api } from './lib/api';
import { OperationalBitacora } from './OperationalBitacora';
import type { EmergencyRecap } from './types';

function fmtDateTime(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleString('es-CL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
}

export function EmergencyRecapScreen({
  incidentId,
  onBack,
}: {
  incidentId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<EmergencyRecap | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    void api.get<EmergencyRecap>(`/emergency-response/${incidentId}/recap`)
      .then(({ data: next }) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar lo ocurrido en esta emergencia.');
      });
    return () => { cancelled = true; };
  }, [incidentId]);

  const report = data?.report;
  const incident = data?.incident;

  return (
    <article className="recap-screen">
      <button type="button" className="announce-back" onClick={onBack}>
        <ChevronLeft /> Volver
      </button>

      {error && <p className="empty">{error}</p>}
      {!error && !data && <p className="empty">Cargando emergencia…</p>}

      {incident && data && (
        <>
          <section className="recap-hero">
            <span className="code">{incident.code}</span>
            <h2>{incident.type}</h2>
            <p className="address"><MapPin /> {incident.address}</p>
            <div className="recap-times">
              <span><Clock3 /> Despacho {fmtDateTime(incident.dispatchedAt)}</span>
              {incident.closedAt && <span>Cierre {fmtDateTime(incident.closedAt)}</span>}
            </div>
            {data.myResponse?.statusLabel && (
              <em className={`recap-mine ${data.myResponse.status ?? ''}`}>
                Tu respuesta: {data.myResponse.statusLabel}
              </em>
            )}
          </section>

          <OperationalBitacora events={data.timeline} />

          {report && (
            <section className="recap-report">
              <div className="section-title">
                <span><Flame /> INFORME DE CIERRE</span>
              </div>
              <div className="recap-report-body">
                <b>{report.title}</b>
                {report.summary && <p>{report.summary}</p>}
                {report.actionsTaken && (
                  <p><strong>Acciones.</strong> {report.actionsTaken}</p>
                )}
                {report.outcome && (
                  <p><strong>Resultado.</strong> {report.outcome}</p>
                )}
                {report.personnelNotes && (
                  <p><strong>Personal.</strong> {report.personnelNotes}</p>
                )}
                {report.vehicleNotes && (
                  <p><strong>Material mayor.</strong> {report.vehicleNotes}</p>
                )}
                {report.observations && (
                  <p><strong>Observaciones.</strong> {report.observations}</p>
                )}
                {report.author && (
                  <small>
                    {report.author.firstName} {report.author.lastName} · {fmtDateTime(report.occurredAt)}
                  </small>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </article>
  );
}
