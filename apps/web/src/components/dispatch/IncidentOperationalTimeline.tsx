import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { timelineTone, TIMELINE_TONE_CLASS } from '../../lib/incident-timeline';
import { useAuthStore } from '../../store/authStore';

export type TimelineEvent = {
  id: string;
  kind: string;
  label: string;
  note?: string | null;
  occurredAt: string;
  author?: { id: string; firstName: string; lastName: string } | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type Props = {
  incidentId: string;
  compact?: boolean;
  canDelete?: boolean;
};

export default function IncidentOperationalTimeline({ incidentId, compact, canDelete }: Props) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['incident-timeline', incidentId],
    queryFn: () => api.get(`/incident-timeline/incident/${incidentId}`).then((r) => r.data),
    enabled: !!incidentId,
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/incident-timeline/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-timeline', incidentId] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Registro eliminado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo eliminar'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando bitácora…
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Aún no hay registros. Usa los botones para ir anotando lo que ocurre.
      </p>
    );
  }

  return (
    <ol className={`relative ${compact ? 'space-y-3' : 'space-y-4'} pl-1`}>
      <div
        className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-red-500/80 via-sky-500/40 to-emerald-500/30 ops-timeline-line"
        aria-hidden
      />
      {events.map((ev, idx) => {
        const tone = TIMELINE_TONE_CLASS[timelineTone(ev.kind)];
        const isLast = idx === events.length - 1;
        const canRemove =
          canDelete &&
          (user?.id === ev.author?.id ||
            ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'].includes(user?.role ?? ''));
        return (
          <li
            key={ev.id}
            className="relative flex gap-3 ops-timeline-item"
            style={{ animationDelay: `${Math.min(idx, 12) * 55}ms` }}
          >
            <div className="relative z-10 shrink-0">
              <span
                className={`flex w-[31px] h-[31px] items-center justify-center rounded-full ring-4 ring-offset-0 ${tone.dot} ${tone.ring} ${
                  isLast ? 'ops-timeline-live' : ''
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white/90" />
              </span>
            </div>
            <div
              className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 ${tone.badge} ${
                isLast ? 'shadow-lg shadow-black/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tabular-nums opacity-80">{fmtTime(ev.occurredAt)}</p>
                  <p className={`font-bold leading-tight ${compact ? 'text-sm' : 'text-sm'}`}>{ev.label}</p>
                </div>
                {canRemove && (
                  <button
                    type="button"
                    title="Eliminar registro"
                    onClick={() => remove.mutate(ev.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-black/20 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {ev.note && (
                <p className="text-xs mt-1 leading-relaxed opacity-90 whitespace-pre-wrap">{ev.note}</p>
              )}
              {ev.author && (
                <p className="text-[10px] mt-1.5 opacity-60">
                  {ev.author.firstName} {ev.author.lastName}
                </p>
              )}
            </div>
          </li>
        );
      })}
      <div ref={bottomRef} />
    </ol>
  );
}
