import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BookOpen, CheckCircle2, Clock, Droplets, FileDown, HelpCircle, Loader2, Map,
  MapPin, MessageSquarePlus, Navigation, Radio, RefreshCw, Shield, Siren, Truck, Tv, Users, X, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';
import { useEmergencyLiveSocket } from '../hooks/useEmergencyLiveSocket';
import { useQuickDispatch } from '../hooks/useQuickDispatch';
import { EMERGENCY_MAIN_TYPES, familyHasPanel, isEmergencyTypeReadyForDispatch } from '../lib/emergency-codes';
import {
  INCIDENT_TIMELINE_CRITICAL,
  INCIDENT_TIMELINE_GROUPS,
  TIMELINE_TONE_CLASS,
  type IncidentTimelineKind,
} from '../lib/incident-timeline';
import { downloadEmergencyReport } from '../lib/pdf/downloadEmergencyReport';
import EmergencyLiveFeed from '../components/dispatch/EmergencyLiveFeed';
import RadioPttPanel from '../components/radio/RadioPttPanel';
import PublicOsmMap, { PARRAL_CENTER } from '../components/map/PublicOsmMap';
import DoubleDispatchConfirmModal from '../components/dispatch/DoubleDispatchConfirmModal';
import type { CentralParralThemeTokens } from '../lib/central-parral-theme';

const POLL_MS = 8_000;

type IncidentRow = {
  id: string;
  code: string;
  type: string;
  address: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  confirmedLatitude?: number | null;
  confirmedLongitude?: number | null;
  dispatchedAt: string;
  closedAt?: string | null;
  company?: { number: number; name: string };
  vehicles?: { vehicle: { id: string; patent: string; type?: string } }[];
};

type TeamResponse = {
  status: string | null;
  statusLabel: string | null;
  locationMarked?: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    operativeNumber?: number | null;
  };
};

type TeamSummary = {
  going: number;
  notGoing: number;
  notAvailable: number;
  onScene: number;
  total: number;
  responses: TeamResponse[];
};

type TeamDetail = {
  teamSummary?: TeamSummary;
  teamResponses?: {
    status: string | null;
    statusLabel: string | null;
    latitude?: number | null;
    longitude?: number | null;
    user: TeamResponse['user'];
  }[];
};

function elapsed(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

function LiveClock({ className }: { className: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <p className={`font-mono text-lg sm:text-2xl font-bold tabular-nums ${className}`}>
      {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}

function IdleHomeClock({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const dateLabel = now.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="text-center">
      <p
        className={`font-mono font-black tabular-nums tracking-tight leading-none ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
        style={{ fontSize: 'clamp(3.25rem, 12vw, 6.5rem)' }}
      >
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className={`mt-3 text-sm sm:text-base capitalize ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {dateLabel}
      </p>
    </div>
  );
}

const IDLE_SHORTCUTS = [
  { to: '/nodo360-alarms', label: 'Nodo360 Alarms', hint: 'Despacho con mapa', icon: Bell },
  { to: '/despacho360', label: 'Despacho360', hint: 'Botonera completa', icon: Siren },
  { to: '/bitacora360', label: 'Bitácora360', hint: 'Fases e informe', icon: BookOpen },
  { to: '/operational-map', label: 'Mapa 360', hint: 'Terreno y recursos', icon: Map },
  { to: '/hydrants', label: 'Hidrantes', hint: 'Inventario de agua', icon: Droplets },
  { to: '/companias-tv', label: 'Muro TV', hint: 'Cuarteles en vivo', icon: Tv },
  { to: '/central-express', label: 'Central Express', hint: 'Despacho rápido', icon: Zap },
  { to: '/ayuda', label: 'Ayuda', hint: 'Guía NODO360', icon: HelpCircle },
] as const;

function IdleHome({
  th,
  isDark,
  recentClosed,
  onDispatch,
  isFetching,
  onRefresh,
}: {
  th: CentralParralThemeTokens;
  isDark: boolean;
  recentClosed: IncidentRow[];
  onDispatch: () => void;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div
        className={`relative min-h-full px-4 sm:px-8 py-8 sm:py-12 ${
          isDark
            ? 'bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(700px_360px_at_80%_80%,rgba(14,165,233,0.08),transparent_50%)]'
            : 'bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(700px_360px_at_80%_80%,rgba(14,165,233,0.08),transparent_50%)]'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-500">
                Central en espera
              </span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className={`p-2 rounded-lg border ${th.refreshBtn}`}
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="text-center mb-4">
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Hola{user?.firstName ? `, ${user.firstName}` : ''}
            </p>
            <h1 className={`mt-1 text-2xl sm:text-3xl font-black ${th.title}`}>
              Sin novedades
            </h1>
            <p className={`mt-2 text-sm sm:text-base max-w-md mx-auto ${th.subtitle}`}>
              Todo tranquilo. No hay emergencias activas. La central está lista para despachar cuando haga falta.
            </p>
          </div>

          <div className="flex justify-center mb-10 sm:mb-14">
            <IdleHomeClock isDark={isDark} />
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              type="button"
              onClick={onDispatch}
              className="keep-on-color inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-red-600 text-white text-sm font-black uppercase tracking-wide shadow-lg shadow-red-900/25"
            >
              <Siren className="w-5 h-5" />
              Despachar alarma
            </button>
            <Link
              to="/nodo360-alarms"
              className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border text-sm font-bold ${
                isDark
                  ? 'border-white/15 text-slate-200 hover:bg-white/5'
                  : 'border-slate-300 text-slate-800 hover:bg-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              Abrir Alarms
            </Link>
          </div>

          <div className="mb-10">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${th.sectionLabel}`}>
              Accesos directos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {IDLE_SHORTCUTS.map(({ to, label, hint, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`group rounded-2xl border p-3.5 transition ${
                    isDark
                      ? 'border-white/10 bg-white/[0.03] hover:border-emerald-500/35 hover:bg-emerald-500/10'
                      : 'border-slate-200 bg-white/80 hover:border-emerald-400 hover:bg-emerald-50 shadow-sm'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className={`text-sm font-bold leading-tight ${th.title}`}>{label}</p>
                  <p className={`text-[11px] mt-0.5 ${th.subtitle}`}>{hint}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 sm:p-5 ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white/90 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest ${th.sectionLabel}`}>
                Estado operativo
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: 'Emergencias activas', value: '0', ok: true },
                { label: 'Canal de alarma', value: 'En espera', ok: true },
                { label: 'Consola', value: 'Lista', ok: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`rounded-xl border px-3 py-3 ${
                    isDark ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-emerald-300/80' : 'text-emerald-800'}`}>
                      {row.label}
                    </p>
                  </div>
                  <p className={`text-lg font-black ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            {recentClosed.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10" style={{ borderColor: isDark ? undefined : '#e2e8f0' }}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${th.sectionLabel}`}>
                  Últimas cerradas
                </p>
                <div className="space-y-1.5">
                  {recentClosed.map((inc) => (
                    <div
                      key={inc.id}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 border ${
                        isDark ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-slate-500">{inc.code}</p>
                        <p className={`text-xs truncate ${th.title}`}>{inc.type}</p>
                      </div>
                      <p className={`text-[10px] shrink-0 tabular-nums ${th.subtitle}`}>
                        {elapsed(inc.dispatchedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusTone(status: string | null | undefined, isDark: boolean) {
  if (status === 'ON_SCENE') return isDark ? 'bg-sky-500/20 text-sky-200 border-sky-500/40' : 'bg-sky-50 text-sky-900 border-sky-300';
  if (status === 'GOING') return isDark ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' : 'bg-emerald-50 text-emerald-900 border-emerald-300';
  if (status === 'NOT_GOING') return isDark ? 'bg-slate-500/20 text-slate-300 border-slate-500/40' : 'bg-slate-100 text-slate-700 border-slate-300';
  if (status === 'NOT_AVAILABLE') return isDark ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-amber-50 text-amber-900 border-amber-300';
  return isDark ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function CentralEmergenciaActivaPage() {
  const { tokens: th, isDark } = useCentralParralTheme();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get('incidente') ?? '');
  const [note, setNote] = useState('');
  const [showDispatch, setShowDispatch] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const d = useQuickDispatch({
    autoDispatchOnKey: false,
    requireExplicitAddress: true,
    persistImmediately: true,
    dispatchSource: 'MANUAL',
  });

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const { data: incidents = [], isFetching, refetch } = useQuery<IncidentRow[]>({
    queryKey: ['incidents', 'central-emergencia-activa'],
    queryFn: () => api.get('/incidents').then((r) => r.data),
    refetchInterval: POLL_MS,
  });

  useEmergencyLiveSocket({
    token,
    onEvent: () => {
      void refetch();
      void qc.invalidateQueries({ queryKey: ['emergency-response'] });
      void qc.invalidateQueries({ queryKey: ['incident-timeline'] });
    },
  });

  const active = useMemo(
    () =>
      [...incidents]
        .filter((i) => !i.closedAt)
        .sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()),
    [incidents],
  );

  const selected = active.find((i) => i.id === selectedId) ?? active[0] ?? null;

  useEffect(() => {
    if (!selected) {
      if (selectedId) setSelectedId('');
      return;
    }
    if (selected.id !== selectedId) setSelectedId(selected.id);
    if (params.get('incidente') !== selected.id) {
      setParams({ incidente: selected.id }, { replace: true });
    }
  }, [selected?.id]);

  useEffect(() => {
    const last = d.lastDispatchedIncident as { id?: string } | null;
    if (!last?.id) return;
    setSelectedId(last.id);
    setShowDispatch(false);
    void refetch();
  }, [d.lastDispatchedIncident]);

  const recentClosed = useMemo(
    () =>
      [...incidents]
        .filter((i) => i.closedAt)
        .sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime())
        .slice(0, 4),
    [incidents],
  );

  const idleHome = active.length === 0 && !showDispatch;

  const { data: team } = useQuery<TeamDetail | null>({
    queryKey: ['emergency-response', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      try {
        const { data } = await api.get(`/emergency-response/${selected.id}`);
        return data as TeamDetail;
      } catch {
        return null;
      }
    },
    enabled: !!selected?.id,
    refetchInterval: POLL_MS,
  });

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
      toast.success('Registrado en bitácora');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo registrar'),
  });

  const closeIncident = useMutation({
    mutationFn: (id: string) => api.post(`/incidents/${id}/close`),
    onSuccess: async (res, id) => {
      toast.success('Emergencia cerrada');
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incident-timeline', id] });
      await downloadEmergencyReport(id, { pack: res.data });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo cerrar'),
  });

  const pushKind = (kind: IncidentTimelineKind) => {
    if (!selected) {
      toast.error('Selecciona una emergencia');
      return;
    }
    const extra = note.trim();
    if (kind === 'COMENTARIO' && extra.length < 3) {
      toast.error('Escribe una nota para el comentario');
      return;
    }
    add.mutate({ kind, note: extra || undefined });
  };

  const summary = team?.teamSummary;
  const responders = useMemo(() => {
    const fromDetail = team?.teamResponses;
    if (fromDetail?.length) {
      return fromDetail
        .filter((r) => r.status === 'GOING' || r.status === 'ON_SCENE')
        .sort((a, b) => {
          if (a.status === b.status) return a.user.lastName.localeCompare(b.user.lastName);
          return a.status === 'ON_SCENE' ? -1 : 1;
        });
    }
    return (summary?.responses ?? [])
      .filter((r) => r.status === 'GOING' || r.status === 'ON_SCENE')
      .sort((a, b) => {
        if (a.status === b.status) return a.user.lastName.localeCompare(b.user.lastName);
        return a.status === 'ON_SCENE' ? -1 : 1;
      });
  }, [team, summary]);

  const mapLat = selected?.confirmedLatitude ?? selected?.latitude ?? null;
  const mapLng = selected?.confirmedLongitude ?? selected?.longitude ?? null;
  const mapCenter: [number, number] =
    mapLat != null && mapLng != null ? [mapLat, mapLng] : PARRAL_CENTER;

  const mapMarkers = useMemo(() => {
    const markers: { id: string; lat: number; lng: number; active?: boolean; label?: string }[] = [];
    for (const inc of active) {
      const lat = inc.confirmedLatitude ?? inc.latitude;
      const lng = inc.confirmedLongitude ?? inc.longitude;
      if (lat == null || lng == null) continue;
      markers.push({
        id: inc.id,
        lat,
        lng,
        active: inc.id === selected?.id,
        label: `<strong>${inc.code} · ${inc.type}</strong><br/>${inc.address ?? ''}`,
      });
    }
    for (const r of team?.teamResponses ?? []) {
      if (r.latitude == null || r.longitude == null) continue;
      if (r.status !== 'GOING' && r.status !== 'ON_SCENE') continue;
      markers.push({
        id: `resp-${r.user.id}`,
        lat: r.latitude,
        lng: r.longitude,
        active: false,
        label: `<strong>${r.user.firstName} ${r.user.lastName}</strong><br/>${r.statusLabel ?? r.status ?? ''}`,
      });
    }
    return markers;
  }, [active, selected?.id, team?.teamResponses]);

  const vehicles = (d.dispatchableVehicles as { id: string; patent: string; type?: string }[]) ?? [];
  void nowTick;

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden transition-colors ${th.shell}`}>
      <header className={`shrink-0 px-3 sm:px-5 py-3 border-b ${th.shellHeader} ${th.borderSubtle}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${idleHome ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[10px] uppercase tracking-widest font-bold ${
                idleHome ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {idleHome ? 'Central en espera' : 'Consola de emergencia activa'}
              </span>
            </div>
            <h1 className={`text-lg sm:text-xl font-bold truncate ${th.title}`}>
              {selected
                ? `${selected.code} · ${selected.type}`
                : idleHome
                  ? 'Sin novedades'
                  : 'Despacho rápido'}
            </h1>
            <p className={`text-xs mt-0.5 flex items-center gap-1 truncate ${th.subtitle}`}>
              <MapPin className="w-3 h-3 shrink-0" />
              {selected?.address
                || (idleHome
                  ? 'Todo tranquilo · listos para alarmar'
                  : 'Completa clave, dirección y carro')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!idleHome && (
              <div className="text-right hidden sm:block">
                <LiveClock className={th.clock} />
                <p className={`text-[10px] flex items-center justify-end gap-1 mt-0.5 ${th.subtitle}`}>
                  <Clock className="w-3 h-3" />
                  {selected ? `Tiempo · ${elapsed(selected.dispatchedAt)}` : `${active.length} activa(s)`}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowDispatch((v) => !v)}
              className={`keep-on-color flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide ${
                showDispatch ? 'bg-slate-700 text-white' : 'bg-red-600 text-white'
              }`}
            >
              <Siren className="w-3.5 h-3.5" />
              {showDispatch ? (active.length === 0 ? 'Volver al inicio' : 'Ocultar despacho') : 'Despachar'}
            </button>
            {!idleHome && (
              <button
                type="button"
                onClick={() => refetch()}
                className={`p-2 rounded-lg border ${th.refreshBtn}`}
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            )}
            {selected && (
              <>
                <button
                  type="button"
                  onClick={() => downloadEmergencyReport(selected.id)}
                  className={`p-2 rounded-lg border ${th.refreshBtn}`}
                  title="Informe PDF"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={closeIncident.isPending}
                  onClick={() => {
                    if (window.confirm(`¿Cerrar ${selected.code}?`)) closeIncident.mutate(selected.id);
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'border-emerald-500/40 text-emerald-300' : 'border-emerald-600 text-emerald-800'
                  }`}
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {idleHome ? (
        <IdleHome
          th={th}
          isDark={isDark}
          recentClosed={recentClosed}
          onDispatch={() => setShowDispatch(true)}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />
      ) : (
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_340px] gap-0 overflow-hidden">
        {/* Left: emergencias + despacho */}
        <aside className={`min-h-0 flex flex-col border-b xl:border-b-0 xl:border-r overflow-hidden ${th.borderSubtle} ${th.panelAside}`}>
          <div className="shrink-0 px-3 py-2.5 border-b flex items-center justify-between gap-2" style={{ borderColor: 'inherit' }}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${th.sectionLabel}`}>
              Activas · {active.length}
            </p>
            <Link to="/nodo360-alarms" className={`text-[10px] font-bold flex items-center gap-1 ${th.navLink}`}>
              <Bell className="w-3 h-3" /> Alarms
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {active.length === 0 ? (
              <p className={`text-xs text-center py-8 px-3 ${th.subtitle}`}>
                No hay emergencias abiertas. Usa el despacho rápido para alarmar.
              </p>
            ) : (
              active.map((inc) => {
                const on = selected?.id === inc.id;
                return (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(inc.id);
                      setShowDispatch(false);
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2.5 border transition ${
                      on ? th.incidentRowActive : th.incidentRowIdle
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-red-600">{inc.code}</span>
                      <span className={`text-[10px] tabular-nums ${th.subtitle}`}>{elapsed(inc.dispatchedAt)}</span>
                    </div>
                    <p className={`text-xs font-semibold truncate mt-0.5 ${on ? '' : th.title}`}>{inc.type}</p>
                    <p className={`text-[10px] truncate ${th.subtitle}`}>{inc.address}</p>
                    {inc.company && (
                      <p className={`text-[10px] mt-1 font-semibold ${th.subtitle}`}>
                        {inc.company.number}ª {inc.company.name}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {showDispatch && (
            <div className={`shrink-0 border-t p-3 space-y-2 max-h-[46%] overflow-y-auto scrollbar-thin ${th.borderSubtle}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[10px] font-black uppercase tracking-widest ${th.sectionLabel}`}>
                  Despacho rápido
                </p>
                <button type="button" onClick={() => setShowDispatch(false)} className={th.subtitle}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {EMERGENCY_MAIN_TYPES.slice(0, 8).map((t) => {
                  const childSel =
                    t.subdivisions?.some((s) => s.id === d.selectedType)
                    || t.vias?.some((v) => v.id === d.selectedType);
                  const on = d.selectedType === t.id || Boolean(childSel);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => d.handleEmergencyTypeClick(t)}
                      className={`rounded-lg border px-1 py-1.5 text-[10px] font-black ${
                        on
                          ? 'keep-on-color bg-red-600 border-red-500 text-white'
                          : isDark
                            ? 'border-white/10 text-slate-200'
                            : 'border-slate-200 text-slate-800'
                      }`}
                    >
                      {t.code}
                    </button>
                  );
                })}
              </div>
              {d.activeMainWithSubs && familyHasPanel(d.activeMainWithSubs) && (
                <div className="flex flex-wrap gap-1">
                  {d.activeMainWithSubs.subdivisions?.map((s) => {
                    const on = d.selectedType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => d.handleSubdivisionClick(s, d.activeMainWithSubs!)}
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                          on
                            ? 'keep-on-color bg-red-600 text-white border-red-500'
                            : isDark
                              ? 'border-white/10 text-slate-300'
                              : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {s.code}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                value={d.address}
                onChange={(e) => d.setAddress(e.target.value)}
                placeholder="Dirección"
                className={`w-full rounded-xl border px-3 py-2 text-sm ${th.select}`}
              />
              <div className="flex flex-wrap gap-1">
                {vehicles.slice(0, 6).map((v) => {
                  const on = d.selectedVehicles.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => d.toggleVehicle(v.id)}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${
                        on
                          ? isDark
                            ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                            : 'border-sky-500 bg-sky-50 text-sky-900'
                          : isDark
                            ? 'border-white/10 text-slate-300'
                            : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      {v.patent}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={d.dispatching || !d.canDispatch}
                onClick={() => d.handleDispatch()}
                className="keep-on-color w-full py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {d.dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Siren className="w-4 h-4" />}
                {d.dispatching
                  ? 'Enviando…'
                  : !isEmergencyTypeReadyForDispatch(d.selectedType)
                    ? 'Elige clave'
                    : !d.address.trim()
                      ? 'Falta dirección'
                      : d.selectedVehicles.length === 0
                        ? 'Falta carro'
                        : 'Despachar alarma'}
              </button>
              <Link
                to="/nodo360-alarms"
                className={`block text-center text-[11px] font-semibold ${th.navLink}`}
              >
                Abrir consola Alarms completa →
              </Link>
            </div>
          )}
        </aside>

        {/* Center: map + radio + timeline */}
        <section className="min-h-0 flex flex-col overflow-hidden">
          <div className={`relative flex-1 min-h-[240px] border-b ${th.borderSubtle}`}>
            <PublicOsmMap
              theme={th.mapTheme}
              baseStyle={isDark ? 'dark' : 'voyager'}
              center={mapCenter}
              focus={mapLat != null && mapLng != null ? [mapLat, mapLng] : null}
              zoom={selected && mapLat != null ? 15 : 13}
              markers={mapMarkers}
              className="absolute inset-0 h-full w-full"
            />
            {selected && (
              <div className={`absolute top-3 left-3 z-[500] rounded-xl border px-3 py-2 shadow-md backdrop-blur-md max-w-[min(100%,280px)] ${
                isDark ? 'bg-slate-950/80 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <p className="font-mono text-xs font-black text-red-600">{selected.code}</p>
                <p className="text-sm font-bold truncate">{selected.type}</p>
                <p className={`text-[11px] truncate ${th.subtitle}`}>{selected.address}</p>
                {selected.vehicles && selected.vehicles.length > 0 && (
                  <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${th.subtitle}`}>
                    <Truck className="w-3 h-3" />
                    {selected.vehicles.map((v) => v.vehicle.patent).join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className={`shrink-0 border-b px-3 py-2 ${th.borderSubtle}`}>
              <RadioPttPanel
                incidentId={selected.id}
                incidentLabel={`${selected.code} · ${selected.type}`}
                canTalk
                isDark={isDark}
                variant="bar"
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${th.sectionLabel}`}>
                <BookOpen className="w-3.5 h-3.5" />
                Escuchando la emergencia
              </p>
              {selected && (
                <Link
                  to={`/bitacora360?incidente=${selected.id}`}
                  className={`text-[10px] font-bold ${th.navLink}`}
                >
                  Abrir Bitácora360 →
                </Link>
              )}
            </div>
            {selected ? (
              <EmergencyLiveFeed incidentId={selected.id} isDark={isDark} compact />
            ) : (
              <p className={`text-sm text-center py-10 ${th.subtitle}`}>
                La bitácora y la radio aparecen cuando hay una emergencia seleccionada.
              </p>
            )}
          </div>
        </section>

        {/* Right: quién va + acciones bitácora */}
        <aside className={`min-h-0 flex flex-col border-t xl:border-t-0 xl:border-l overflow-hidden ${th.borderSubtle} ${th.panelAside}`}>
          <div className="shrink-0 px-3 py-2.5 border-b" style={{ borderColor: 'inherit' }}>
            <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${th.sectionLabel}`}>
              <Users className="w-3.5 h-3.5" />
              Quién va
            </p>
            {summary && (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Voy', value: summary.going, icon: Navigation },
                  { label: 'Lugar', value: summary.onScene, icon: MapPin },
                  { label: 'Total', value: summary.total, icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className={`rounded-lg border px-2 py-1.5 text-center ${
                      isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Icon className={`w-3 h-3 mx-auto mb-0.5 ${th.subtitle}`} />
                    <p className={`text-base font-black tabular-nums ${th.title}`}>{value}</p>
                    <p className={`text-[9px] font-bold uppercase ${th.subtitle}`}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {!selected ? (
              <p className={`text-xs text-center py-8 ${th.subtitle}`}>Sin emergencia</p>
            ) : responders.length === 0 ? (
              <p className={`text-xs text-center py-8 px-2 ${th.subtitle}`}>
                Aún nadie marcó Voy / En el lugar. Las respuestas del móvil aparecen aquí.
              </p>
            ) : (
              responders.map((r) => (
                <div
                  key={r.user.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${statusTone(r.status, isDark)}`}
                >
                  <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
                    isDark ? 'bg-slate-800' : 'bg-white'
                  }`}>
                    {r.user.photoUrl ? (
                      <img src={r.user.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black">
                        {r.user.firstName[0]}
                        {r.user.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {r.user.operativeNumber != null ? `${r.user.operativeNumber} · ` : ''}
                      {r.user.firstName} {r.user.lastName}
                    </p>
                    <p className="text-[10px] font-semibold opacity-80">
                      {r.statusLabel ?? (r.status === 'ON_SCENE' ? 'En el lugar' : 'En camino')}
                    </p>
                  </div>
                  {r.status === 'ON_SCENE' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-500" />
                  ) : (
                    <Navigation className="w-4 h-4 shrink-0 text-emerald-500" />
                  )}
                </div>
              ))
            )}

            {summary && (summary.notGoing > 0 || summary.notAvailable > 0) && (
              <p className={`text-[10px] px-1 pt-2 ${th.subtitle}`}>
                No van: {summary.notGoing} · No disponibles: {summary.notAvailable}
              </p>
            )}
          </div>

          <div className={`shrink-0 border-t p-3 space-y-2 max-h-[48%] overflow-y-auto scrollbar-thin ${th.borderSubtle}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${th.sectionLabel}`}>
              Registrar en bitácora
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {INCIDENT_TIMELINE_CRITICAL.slice(0, 4).map((action) => {
                const tone = TIMELINE_TONE_CLASS[action.tone];
                return (
                  <button
                    key={action.kind}
                    type="button"
                    disabled={!selected || add.isPending}
                    onClick={() => pushKind(action.kind)}
                    className={`rounded-lg border px-2 py-1.5 text-left disabled:opacity-40 ${tone.btn}`}
                  >
                    <p className="text-[11px] font-black leading-tight">{action.label}</p>
                  </button>
                );
              })}
            </div>
            {INCIDENT_TIMELINE_GROUPS.filter((g) => g.id === 'movimiento' || g.id === 'operacion').map((group) => (
              <div key={group.id}>
                <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${th.subtitle}`}>
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {group.actions.slice(0, 6).map((action) => {
                    const tone = TIMELINE_TONE_CLASS[action.tone];
                    return (
                      <button
                        key={action.kind}
                        type="button"
                        disabled={!selected || add.isPending}
                        onClick={() => pushKind(action.kind)}
                        className={`rounded-lg border px-2 py-1.5 text-left disabled:opacity-40 ${tone.btn}`}
                      >
                        <p className="text-[10px] font-bold leading-tight">{action.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-1.5">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota / comentario…"
                disabled={!selected}
                className={`flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm ${th.select}`}
              />
              <button
                type="button"
                disabled={!selected || add.isPending}
                onClick={() => pushKind('COMENTARIO')}
                className={`shrink-0 p-2 rounded-xl border ${
                  isDark ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'
                }`}
                title="Agregar comentario"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
            </div>
            {selected && (
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                <Radio className={`w-3 h-3 ${th.subtitle}`} />
                <span className={th.subtitle}>Radio PTT arriba del timeline</span>
              </div>
            )}
          </div>
        </aside>
      </div>
      )}

      {d.pendingDoubleDispatch && (
        <DoubleDispatchConfirmModal
          companyName={d.pendingDoubleDispatch.companyName}
          onConfirm={d.pendingDoubleDispatch.onConfirm}
          onCancel={d.cancelDoubleDispatch}
          isDark={isDark}
        />
      )}
    </div>
  );
}
