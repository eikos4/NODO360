import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Camera, CheckCircle2, Flame, Home, Loader2, MapPin,
  Mic, Navigation, Paperclip, Phone, Radio, Send, Siren, Truck, Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import RadioPttPanel from '../components/radio/RadioPttPanel';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../components/map/PublicOsmMap';
import { vehicleTypeAbbrev } from '../lib/vehicle-types';
import { type IncidentTimelineKind } from '../lib/incident-timeline';
import { ACTION_ICON, BITACORA360_GROUPS, TONE_ICON } from '../lib/bitacora360-actions';

type IncidentListRow = {
  id: string;
  code: string;
  type: string;
  address: string;
  status: string;
  dispatchedAt: string;
  closedAt?: string | null;
  company?: { number: number; name: string };
};

type IncidentDetail = IncidentListRow & {
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confirmedLatitude?: number | null;
  confirmedLongitude?: number | null;
  arrivedAt?: string | null;
  imageUrl?: string | null;
  participants?: { user?: { firstName: string; lastName: string; role: string } }[];
  vehicles?: {
    vehicle?: {
      id: string;
      patent: string;
      brand: string;
      type: string;
      imageUrl?: string | null;
      status?: string;
    };
  }[];
};

type TimelineEvent = {
  id: string;
  kind: string;
  label: string;
  note?: string | null;
  occurredAt: string;
  author?: { firstName: string; lastName: string } | null;
};

const PHASES = [
  { id: 'aviso', label: 'Recepción de llamada', icon: Phone, kinds: ['AVISO', 'CONFIRMACION'] },
  { id: 'despacho', label: 'Emergencia despachada', icon: Siren, kinds: ['DESPACHO'] },
  { id: 'salida', label: 'Sale al lugar', icon: Truck, kinds: ['DESPACHO', 'EN_CAMINO'] },
  { id: 'camino', label: 'En camino', icon: Navigation, kinds: ['EN_CAMINO'] },
  { id: 'lugar', label: 'En el lugar', icon: MapPin, kinds: ['EN_LUGAR'] },
  { id: 'trabajo', label: 'Trabajando', icon: Wrench, kinds: ['RECONOCIMIENTO', 'ATAQUE_INTERIOR', 'ATAQUE_EXTERIOR', 'HIDRANTE', 'RESCATE'] },
  { id: 'control', label: 'Controlada', icon: CheckCircle2, kinds: ['CONTROLADO', 'EXTINTO'] },
  { id: 'cierre', label: 'Cerrada', icon: Home, kinds: [] },
] as const;

const ORG_KINDS: Record<string, string> = {
  CARABINEROS: 'Carabineros',
  SAMU: 'SAMU',
  PDI: 'PDI',
  CONAF: 'CONAF',
  SENAPRED: 'SENAPRED',
  MUNICIPALIDAD: 'Municipalidad',
};

function fmtClock(d: Date) {
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtHm(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function point(inc?: IncidentDetail | null): [number, number] | null {
  if (!inc) return null;
  const lat = inc.confirmedLatitude ?? inc.latitude;
  const lng = inc.confirmedLongitude ?? inc.longitude;
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;
  return [Number(lat), Number(lng)];
}

function unitCode(v: { type?: string; patent?: string }, idx: number) {
  return `${vehicleTypeAbbrev(v.type)}-${idx + 1}`;
}

function phaseIndex(inc: IncidentDetail | undefined, kinds: Set<string>) {
  if (!inc) return 0;
  if (inc.closedAt) return PHASES.length - 1;
  if (kinds.has('CONTROLADO') || kinds.has('EXTINTO') || inc.status === 'CLOSED') return 6;
  if (kinds.has('EN_LUGAR') || inc.status === 'ARRIVED' || inc.arrivedAt) {
    if (['RECONOCIMIENTO', 'ATAQUE_INTERIOR', 'ATAQUE_EXTERIOR', 'HIDRANTE', 'RESCATE', 'BUSQUEDA'].some((k) => kinds.has(k))) {
      return 5;
    }
    return 4;
  }
  if (kinds.has('EN_CAMINO')) return 3;
  if (inc.vehicles?.length || kinds.has('DESPACHO')) return 2;
  if (inc.dispatchedAt) return 1;
  return 0;
}

export default function Bitacora360Page() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState(params.get('incidente') ?? '');

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const { data: incidents = [], isLoading: listLoading } = useQuery<IncidentListRow[]>({
    queryKey: ['incidents', 'bitacora360'],
    queryFn: () => api.get('/incidents').then((r) => r.data),
    refetchInterval: 10000,
  });

  const open = useMemo(
    () => [...incidents].filter((i) => !i.closedAt).sort((a, b) => +new Date(b.dispatchedAt) - +new Date(a.dispatchedAt)),
    [incidents],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = open.length ? open : incidents;
    if (!q) return pool;
    return pool.filter((i) =>
      `${i.code} ${i.type} ${i.address} ${i.company?.name ?? ''}`.toLowerCase().includes(q),
    );
  }, [incidents, open, search]);

  const selectedList = filtered.find((i) => i.id === selectedId) ?? open[0] ?? filtered[0];

  useEffect(() => {
    if (!selectedList) return;
    if (selectedList.id !== selectedId) setSelectedId(selectedList.id);
    if (params.get('incidente') !== selectedList.id) {
      setParams({ incidente: selectedList.id }, { replace: true });
    }
  }, [selectedList?.id]);

  const { data: detail } = useQuery<IncidentDetail>({
    queryKey: ['incident', selectedList?.id],
    queryFn: () => api.get(`/incidents/${selectedList!.id}`).then((r) => r.data),
    enabled: !!selectedList?.id,
    refetchInterval: 8000,
  });

  const { data: events = [] } = useQuery<TimelineEvent[]>({
    queryKey: ['incident-timeline', selectedList?.id],
    queryFn: () => api.get(`/incident-timeline/incident/${selectedList!.id}`).then((r) => r.data),
    enabled: !!selectedList?.id,
    refetchInterval: 5000,
  });

  const inc = detail ?? selectedList;
  const kinds = useMemo(() => new Set(events.map((e) => e.kind)), [events]);
  const currentPhase = phaseIndex(detail, kinds);
  const leadStatus = inc?.closedAt
    ? 'Cerrada'
    : kinds.has('EN_LUGAR') || detail?.arrivedAt
      ? 'En el lugar'
      : kinds.has('EN_CAMINO') || (detail?.vehicles?.length ?? 0) > 0
        ? 'En camino al lugar'
        : 'En cuartel';
  const coords = point(detail);
  const orgs = Object.entries(ORG_KINDS).filter(([k]) => kinds.has(k)).map(([, v]) => v);
  const people = (detail?.participants?.length ?? 0) || (kinds.has('PERSONAS') || kinds.has('VICTIMA') ? 'Reportadas' : '—');

  const markers: OsmMarker[] = [];
  if (coords) {
    markers.push({ id: inc?.id ?? 'e', lat: coords[0], lng: coords[1], label: inc?.code, tone: 'active', active: true });
  }

  const add = useMutation({
    mutationFn: (payload: { kind: IncidentTimelineKind; note?: string }) =>
      api.post('/incident-timeline', {
        incidentId: selectedList?.id,
        kind: payload.kind,
        note: payload.note,
      }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['incident-timeline', selectedList?.id] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Registrado en Bitácora360');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo registrar'),
  });

  const pushKind = (kind: IncidentTimelineKind, extra?: string) => {
    if (!selectedList) return toast.error('Selecciona una emergencia');
    if (selectedList.closedAt) return toast.error('La emergencia está cerrada');
    if (kind === 'COMENTARIO' && !(extra || note).trim()) {
      return toast.error('Escribe el comentario');
    }
    add.mutate({ kind, note: (extra || note).trim() || undefined });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-800">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-slate-900">NODO360</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Centro de control</p>
          </div>
        </div>
        <div className="relative mx-auto hidden max-w-xl flex-1 md:block">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar emergencia, dirección, paciente…"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400"
          />
          {search && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {filtered.slice(0, 8).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => { setSelectedId(row.id); setSearch(''); }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                >
                  <span className="font-bold text-red-600">{row.code}</span>
                  <span className="truncate text-slate-600">{row.type} · {row.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="hidden items-center gap-1.5 text-emerald-600 sm:flex">
            <Radio className="h-3.5 w-3.5" /> Radio conectada
          </span>
          <Mic className="hidden h-4 w-4 text-slate-400 sm:block" />
          <Link
            to={selectedList ? `/central-bitacora/registro?incidente=${selectedList.id}` : '/central-bitacora/registro'}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
          >
            Bitácora botonera
          </Link>
          <div className="text-right">
            <p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-slate-500">Centralista</p>
          </div>
        </div>
      </header>

      {!inc ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          {listLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Despacha una emergencia para abrir Bitácora360.'}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <section className="flex shrink-0 flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                {inc.code} · {inc.closedAt ? 'Cerrada' : 'Activa'}
              </p>
              <h1 className="truncate text-2xl font-black text-slate-900">{inc.type}</h1>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {inc.address}
                {inc.company ? ` · ${inc.company.number}ª ${inc.company.name}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(detail?.vehicles ?? []).map((row, i) => (
                <span key={row.vehicle?.id ?? i} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {unitCode(row.vehicle ?? {}, i)}
                </span>
              ))}
              {orgs.map((org) => (
                <span key={org} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">{org}</span>
              ))}
              <span className="font-mono text-lg font-black text-slate-900">{fmtClock(now)}</span>
            </div>
          </section>

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_280px]">
            <section className="min-w-0 space-y-3">
              {selectedList && (
                <RadioPttPanel
                  variant="bar"
                  incidentId={selectedList.id}
                  incidentLabel={`${inc.code} · ${inc.type}`}
                  enabled
                  canTalk={!inc.closedAt}
                  isDark={false}
                  showListenLog
                  talkHint={inc.closedAt ? 'Solo escucha — emergencia cerrada' : undefined}
                >
                  <ol className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm sm:grid-cols-8">
                    {PHASES.map((phase, idx) => {
                      const done = idx < currentPhase;
                      const on = idx === currentPhase;
                      const Icon = phase.icon;
                      const stamp = phase.kinds.length
                        ? events.find((ev) => (phase.kinds as readonly string[]).includes(ev.kind))
                        : inc.closedAt
                          ? { occurredAt: inc.closedAt }
                          : inc.dispatchedAt && (phase.id === 'aviso' || phase.id === 'despacho')
                            ? { occurredAt: inc.dispatchedAt }
                            : undefined;
                      return (
                        <li key={phase.id} className="relative flex flex-col items-center text-center">
                          {idx < PHASES.length - 1 && (
                            <span className={`absolute left-1/2 top-4 hidden h-0.5 w-full sm:block ${idx < currentPhase ? 'bg-blue-500' : 'bg-slate-200'}`} />
                          )}
                          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${
                            on
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : done
                                ? 'border-blue-200 bg-blue-50 text-blue-600'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <p className={`mt-1.5 text-[10px] leading-tight ${on ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{phase.label}</p>
                          {stamp?.occurredAt && (
                            <p className="font-mono text-[9px] text-slate-400">{fmtHm(stamp.occurredAt)}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </RadioPttPanel>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Acciones rápidas</p>
                <p className="text-[10px] text-slate-500">El comentario se adjunta al botón o se envía solo</p>
              </div>
              {BITACORA360_GROUPS.map((group) => (
                <div key={group.id} className={`rounded-2xl border px-2.5 py-2.5 ${group.band}`}>
                  <p className={`mb-2 text-[10px] font-black uppercase tracking-widest ${group.accent}`}>{group.title}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                    {group.actions.map((action) => {
                      const Icon = ACTION_ICON[action.kind] ?? Flame;
                      const used = kinds.has(action.kind);
                      return (
                        <button
                          key={action.kind}
                          type="button"
                          disabled={add.isPending || !!inc.closedAt}
                          onClick={() => pushKind(action.kind)}
                          className={`rounded-xl border px-2 py-2 text-left transition disabled:opacity-40 ${
                            used
                              ? 'border-blue-200 bg-white shadow-sm'
                              : 'border-white/80 bg-white/80 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <Icon className={`mb-1 h-4 w-4 ${TONE_ICON[action.tone]}`} />
                          <p className="text-xs font-bold leading-tight text-slate-900">{action.label}</p>
                          <p className="truncate text-[10px] text-slate-500">{action.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Comentario (se adjunta al botón o se guarda solo)…"
                  disabled={!!inc.closedAt}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      pushKind('COMENTARIO');
                    }
                  }}
                />
                <button type="button" title="Adjunto" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button type="button" title="Foto" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={add.isPending || !!inc.closedAt}
                  onClick={() => pushKind('COMENTARIO')}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Comentar
                </button>
              </div>
            </section>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-700">Información de la emergencia</p>
                <dl className="space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between gap-2"><dt>ID</dt><dd className="text-slate-800">{inc.code}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Tipo</dt><dd className="text-right text-slate-800">{inc.type}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Dirección</dt><dd className="text-right text-slate-800">{inc.address}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Fecha</dt><dd className="text-slate-800">{fmtDate(inc.dispatchedAt)}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Estado</dt><dd className="text-slate-800">{inc.closedAt ? 'Cerrada' : 'Activa'}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Centralista</dt><dd className="text-slate-800">{user?.firstName} {user?.lastName}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Personal</dt><dd className="text-slate-800">{people}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-700">Unidades despachadas</p>
                {(detail?.vehicles ?? []).length === 0 ? (
                  <p className="text-[11px] text-slate-500">Sin carros asignados.</p>
                ) : (
                  <ul className="space-y-1.5 text-[11px]">
                    {(detail?.vehicles ?? []).map((row, i) => (
                      <li key={row.vehicle?.id ?? i} className="flex items-center justify-between text-slate-800">
                        <span className="font-bold">{unitCode(row.vehicle ?? {}, i)}</span>
                        <span className="text-slate-500">{leadStatus}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <p className="px-3 pt-3 text-xs font-semibold text-slate-700">Mapa</p>
                <div className="h-44">
                  <PublicOsmMap
                    center={coords ?? PARRAL_CENTER}
                    focus={coords}
                    markers={markers}
                    zoom={coords ? 15 : 13}
                    theme="light"
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-700">Archivos y evidencias</p>
                {detail?.imageUrl ? (
                  <img src={detail.imageUrl} alt="Evidencia" className="h-20 w-full rounded-lg object-cover" />
                ) : (
                  <p className="text-[11px] text-slate-500">Sin archivos adjuntos.</p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-700">Bitácora en vivo</p>
                {events.length === 0 ? (
                  <p className="text-[11px] text-slate-500">Aún no hay registros.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {[...events].reverse().slice(0, 10).map((ev) => {
                      const Icon = ACTION_ICON[ev.kind as IncidentTimelineKind] ?? Flame;
                      return (
                        <li key={ev.id} className="flex items-start gap-2 text-[11px]">
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="w-10 shrink-0 font-mono text-slate-400">{fmtHm(ev.occurredAt)}</span>
                          <span className="text-slate-700">{ev.label}{ev.note ? ` — ${ev.note}` : ''}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
