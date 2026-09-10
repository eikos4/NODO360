import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Clock, Loader2, MapPin, MessageSquarePlus, Radio, Siren,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';
import IncidentOperationalTimeline from '../components/dispatch/IncidentOperationalTimeline';
import {
  INCIDENT_TIMELINE_CRITICAL,
  INCIDENT_TIMELINE_GROUPS,
  TIMELINE_TONE_CLASS,
  type IncidentTimelineAction,
  type IncidentTimelineKind,
} from '../lib/incident-timeline';

type IncidentRow = {
  id: string;
  code: string;
  type: string;
  address: string;
  status: string;
  dispatchedAt: string;
  closedAt?: string | null;
  company?: { number: number; name: string };
  _count?: { timelineEvents: number };
};

function KindButton({
  action,
  busy,
  onClick,
}: {
  action: IncidentTimelineAction;
  busy: boolean;
  onClick: () => void;
}) {
  const tone = TIMELINE_TONE_CLASS[action.tone];
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-xl border px-2.5 py-2 text-left transition disabled:opacity-50 ${tone.btn}`}
    >
      <p className="text-xs font-bold leading-tight">{action.label}</p>
      <p className="text-[10px] opacity-70 truncate">{action.hint}</p>
    </button>
  );
}

function elapsed(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export default function CentralBitacoraPage() {
  const { tokens: th } = useCentralParralTheme();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState(params.get('incidente') ?? '');

  const { data: incidents = [], isLoading } = useQuery<IncidentRow[]>({
    queryKey: ['incidents', companyId],
    queryFn: () => api.get('/incidents', { params: companyId ? { companyId } : {} }).then((r) => r.data),
    refetchInterval: 10000,
  });

  const sorted = useMemo(() => {
    return [...incidents].sort((a, b) => {
      const aOpen = !a.closedAt ? 0 : 1;
      const bOpen = !b.closedAt ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime();
    });
  }, [incidents]);

  const active = sorted.filter((i) => !i.closedAt);
  const recent = sorted.filter((i) => i.closedAt).slice(0, 12);
  const selected = sorted.find((i) => i.id === selectedId) ?? active[0] ?? sorted[0];

  useEffect(() => {
    if (!selected) return;
    if (selected.id !== selectedId) setSelectedId(selected.id);
    if (params.get('incidente') !== selected.id) {
      setParams({ incidente: selected.id }, { replace: true });
    }
  }, [selected?.id]);

  const add = useMutation({
    mutationFn: (payload: { kind: IncidentTimelineKind; note?: string }) =>
      api.post('/incident-timeline', {
        incidentId: selected?.id,
        kind: payload.kind,
        note: payload.note,
      }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['incident-timeline', selected?.id] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Registrado en la emergencia');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo registrar'),
  });

  const pushKind = (kind: IncidentTimelineKind) => {
    if (!selected) {
      toast.error('Selecciona una emergencia');
      return;
    }
    if (selected.closedAt) {
      toast.error('La emergencia está cerrada');
      return;
    }
    const extra = note.trim();
    add.mutate({ kind, note: extra || undefined });
  };

  const pushComment = () => {
    if (note.trim().length < 3) {
      toast.error('Escribe qué está ocurriendo');
      return;
    }
    pushKind('COMENTARIO');
  };

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden ${th.shell}`}>
      <div className={`shrink-0 px-3 sm:px-5 py-3 border-b ${th.shellHeader} ${th.borderSubtle}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Sala de radio</span>
            </div>
            <h1 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${th.title}`}>
              <BookOpen className="w-5 h-5 text-amber-400" />
              Bitácora operacional
            </h1>
            <p className={`text-xs mt-0.5 ${th.subtitle}`}>
              Línea de tiempo de la emergencia — cada botón queda guardado en el incidente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/central-operativa" className={`text-xs px-3 py-2 rounded-lg ${th.navLink}`}>
              <Radio className="w-3.5 h-3.5 inline mr-1" />
              En vivo
            </Link>
            <span className={`text-xs flex items-center gap-1 ${th.subtitle}`}>
              <Clock className="w-3.5 h-3.5" />
              {active.length} activa{active.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr] overflow-hidden">
        <aside className={`border-b lg:border-b-0 lg:border-r overflow-y-auto ${th.borderSubtle} ${th.panelAside}`}>
          <div className="p-3 space-y-4">
            <section>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${th.sectionLabel}`}>
                Emergencias activas
              </p>
              {isLoading && (
                <p className={`text-xs flex items-center gap-2 ${th.subtitle}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…
                </p>
              )}
              {!isLoading && active.length === 0 && (
                <p className={`text-xs ${th.subtitle}`}>No hay emergencias abiertas.</p>
              )}
              <div className="space-y-1.5">
                {active.map((inc) => {
                  const on = selected?.id === inc.id;
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => setSelectedId(inc.id)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 border transition ${
                        on ? th.incidentRowActive : th.incidentRowIdle
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-red-400">{inc.code}</span>
                        <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          {elapsed(inc.dispatchedAt)}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold truncate mt-0.5 ${th.title}`}>{inc.type}</p>
                      <p className={`text-[11px] truncate flex items-center gap-1 ${th.subtitle}`}>
                        <MapPin className="w-3 h-3 shrink-0" />
                        {inc.address}
                      </p>
                      <p className={`text-[10px] mt-1 ${th.subtitle}`}>
                        {inc._count?.timelineEvents ?? 0} registro{(inc._count?.timelineEvents ?? 0) === 1 ? '' : 's'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {recent.length > 0 && (
              <section>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${th.sectionLabel}`}>
                  Recientes cerradas
                </p>
                <div className="space-y-1">
                  {recent.map((inc) => {
                    const on = selected?.id === inc.id;
                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => setSelectedId(inc.id)}
                        className={`w-full text-left rounded-xl px-3 py-2 border text-xs ${
                          on ? th.incidentRowActive : th.listRow
                        }`}
                      >
                        <span className="font-bold">{inc.code}</span>
                        <span className={`ml-2 ${th.subtitle}`}>{inc.type}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </aside>

        <section className="min-h-0 flex flex-col overflow-hidden">
          {!selected ? (
            <div className={`flex-1 flex items-center justify-center ${th.subtitle}`}>
              <p className="text-sm">Despacha una emergencia para comenzar la bitácora.</p>
            </div>
          ) : (
            <>
              <div className={`shrink-0 px-4 py-3 border-b ${th.borderSubtle}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-red-400 flex items-center gap-1.5">
                      <Siren className="w-3.5 h-3.5" />
                      {selected.code}
                      {!selected.closedAt && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] uppercase tracking-wider">
                          Activa
                        </span>
                      )}
                    </p>
                    <h2 className={`text-base font-bold ${th.title}`}>{selected.type}</h2>
                    <p className={`text-xs ${th.subtitle}`}>{selected.address}</p>
                  </div>
                  <Link
                    to="/incidents"
                    className={`text-[11px] underline-offset-2 hover:underline ${th.linkMuted}`}
                  >
                    Ver ficha de emergencia
                  </Link>
                </div>
              </div>

              {!selected.closedAt && (
                <div className={`shrink-0 border-b ${th.borderSubtle}`}>
                  <div className="max-h-[38vh] overflow-y-auto px-4 py-3 space-y-3">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${th.sectionLabel}`}>
                      Qué está ocurriendo
                    </p>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-1.5">Crítico / personal</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5">
                        {INCIDENT_TIMELINE_CRITICAL.map((action) => (
                          <KindButton key={action.kind} action={action} busy={add.isPending} onClick={() => pushKind(action.kind)} />
                        ))}
                      </div>
                    </div>
                    {INCIDENT_TIMELINE_GROUPS.map((group) => (
                      <div key={group.id}>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${th.sectionLabel}`}>{group.title}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5">
                          {group.actions.map((action) => (
                            <KindButton key={action.kind} action={action} busy={add.isPending} onClick={() => pushKind(action.kind)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 px-4 pb-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Comentario libre (se adjunta al botón o se guarda solo)…"
                      className={`flex-1 rounded-xl px-3 py-2 text-sm resize-none ${th.textarea}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          pushComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={add.isPending}
                      onClick={pushComment}
                      className="shrink-0 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex flex-col items-center justify-center gap-1 min-w-[92px]"
                    >
                      {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
                      Comentar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                <IncidentOperationalTimeline
                  incidentId={selected.id}
                  canDelete={!selected.closedAt}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
