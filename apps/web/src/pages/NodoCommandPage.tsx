import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeftRight, BookOpen, CheckCircle2, ClipboardList, Clock, Crosshair, Flag, Loader2,
  LocateFixed, Maximize2, Minimize2, Plus, Radio, RefreshCw, Wifi, WifiOff, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useEmergencyLiveSocket } from '../hooks/useEmergencyLiveSocket';
import PublicOsmMap, { PARRAL_CENTER, type OsmBaseStyle, type OsmMarker, type OsmPolygon, type OsmPolyline } from '../components/map/PublicOsmMap';
import NodoCommandGlobalResources from '../components/command/NodoCommandGlobalResources';
import { chileResourceKey } from '../lib/chile-bomberos';
import {
  CommandHub,
  CommandSnapshot,
  NOVELTY_CATEGORIES,
  REQUEST_PRIORITIES,
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  SECTOR_PRESETS,
  SECTOR_STATUSES,
  TASK_PRESETS,
  formatClock,
  formatDuration,
  pointKindMeta,
  POINT_KINDS,
  rankFromRole,
  spreadOverlappingMarkers,
  statusLabel,
  taskIconFromMission,
  ZONE_COLORS,
} from '../lib/nodo-command';

type Modal =
  | { type: 'transfer' }
  | { type: 'resource' }
  | { type: 'sector' }
  | { type: 'novelty' }
  | { type: 'request' }
  | { type: 'close' }
  | { type: 'assign'; resourceId: string; sectorId: string; label: string; sectorName: string }
  | { type: 'task'; resourceId: string }
  | { type: 'point'; lat: number; lng: number }
  | { type: 'zone'; path: { lat: number; lng: number }[] }
  | null;

function errMessage(error: unknown) {
  const ax = error as { response?: { data?: { message?: string | string[] } } };
  const message = ax.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message || 'No se pudo completar la acción.';
}

export default function NodoCommandPage() {
  const { incidentId } = useParams();
  if (!incidentId) return <CommandHubView />;
  return <CommandBoard incidentId={incidentId} />;
}

function CommandHubView() {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['command-posts'],
    queryFn: () => api.get<CommandHub>('/command-posts').then((r) => r.data),
    refetchInterval: 8000,
  });

  const active = data?.posts.filter((p) => p.status === 'ACTIVE') ?? [];
  const closed = data?.posts.filter((p) => p.status === 'CLOSED') ?? [];

  return (
    <div className="nodo-command-page flex-1 min-h-0 overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-400">NODO360</p>
            <h1 className="text-2xl font-black tracking-tight">Puesto de Comando</h1>
            <p className="text-sm text-slate-400 mt-1">
              Tablero táctico para emergencias de gran magnitud. Constituye el puesto desde una emergencia activa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Puestos activos</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-slate-500 rounded-2xl border border-white/10 px-4 py-6">
              No hay puestos de comando activos.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {active.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => navigate(`/nodo-command/${post.incident.id}`)}
                  className="text-left rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 hover:bg-red-500/15"
                >
                  <p className="font-mono text-xs font-black text-red-300">{post.incident.code}</p>
                  <p className="text-lg font-black">{post.incident.type}</p>
                  <p className="text-xs text-slate-400 truncate">{post.incident.address}</p>
                  <p className="text-xs mt-2 text-slate-300">
                    Mando: {post.command ? `${post.command.rank ? `${post.command.rank} ` : ''}${post.command.name}` : 'Sin mando'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {post.resourceCount} recursos · {post.sectorCount} sectores
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Emergencias listas para constituir
          </h2>
          {(data?.eligibleIncidents.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 rounded-2xl border border-white/10 px-4 py-6">
              No hay emergencias activas sin puesto de comando.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {data!.eligibleIncidents.map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => navigate(`/nodo-command/${inc.id}`)}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/10"
                >
                  <p className="font-mono text-xs font-black text-red-400">{inc.code}</p>
                  <p className="font-bold">{inc.type}</p>
                  <p className="text-xs text-slate-400 truncate">{inc.address}</p>
                  <p className="text-[11px] text-slate-900 dark:text-amber-300 mt-2 font-semibold">Constituir puesto de comando →</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {closed.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Históricos</h2>
            <div className="space-y-2">
              {closed.slice(0, 8).map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => navigate(`/nodo-command/${post.incident.id}`)}
                  className="w-full text-left rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5"
                >
                  <span className="font-mono text-xs text-slate-400">{post.incident.code}</span>
                  <span className="mx-2 text-slate-300">{post.incident.type}</span>
                  <span className="text-[11px] text-slate-500">finalizado</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CommandBoard({ incidentId }: { incidentId: string }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [commandMode, setCommandMode] = useState(false);
  const [baseStyle, setBaseStyle] = useState<OsmBaseStyle>('osm');
  const [filter, setFilter] = useState<'all' | 'nodo' | 'ext' | 'global'>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [placingPoint, setPlacingPoint] = useState(false);
  const [drawingZone, setDrawingZone] = useState(false);
  const [draftZone, setDraftZone] = useState<{ lat: number; lng: number }[]>([]);
  const [flyToken, setFlyToken] = useState(0);
  const commandModeRef = useRef(commandMode);

  const { data, isLoading, isFetching, refetch, error, dataUpdatedAt } = useQuery({
    queryKey: ['command-post', incidentId],
    queryFn: () => api.get<CommandSnapshot>(`/command-posts/incident/${incidentId}`).then((r) => r.data),
    refetchInterval: 2500,
  });

  useEmergencyLiveSocket({
    enabled: Boolean(token),
    token,
    onEvent: () => void qc.invalidateQueries({ queryKey: ['command-post', incidentId] }),
  });

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (commandModeRef.current === commandMode) return;
    commandModeRef.current = commandMode;
    const t = window.setTimeout(() => setFlyToken((n) => n + 1), 280);
    return () => window.clearTimeout(t);
  }, [commandMode]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const mutate = useMutation({
    mutationFn: async (input: { method: 'post' | 'patch'; path: string; body?: unknown }) => {
      const fn = input.method === 'patch' ? api.patch : api.post;
      return fn(input.path, input.body ?? {}).then((r) => r.data as CommandSnapshot);
    },
    onSuccess: (snapshot) => {
      qc.setQueryData(['command-post', incidentId], snapshot);
      setModal(null);
    },
    onError: (err) => toast.error(errMessage(err)),
  });

  const postId = data?.post?.id;
  const canWrite = Boolean(data?.canWrite);
  const selected = data?.resources.find((r) => r.id === selectedResourceId) ?? null;

  const visibleResources = useMemo(() => {
    const list = data?.resources ?? [];
    if (filter === 'nodo') return list.filter((r) => r.origin === 'NODO360');
    if (filter === 'ext') return list.filter((r) => r.origin === 'EXTERNAL');
    return list;
  }, [data?.resources, filter]);

  const requestedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const resource of data?.resources ?? []) {
      if (resource.institution && resource.label) {
        keys.add(chileResourceKey(resource.institution, resource.label));
      }
    }
    return keys;
  }, [data?.resources]);

  const markers: OsmMarker[] = useMemo(() => {
    if (!data) return [];
    const list: OsmMarker[] = [];
    if (data.incident.latitude && data.incident.longitude) {
      list.push({
        id: 'incident',
        lat: data.incident.latitude,
        lng: data.incident.longitude,
        tone: 'active',
        badge: data.incident.code,
        label: `${data.incident.code} · ${data.incident.type}`,
      });
    }
    if (data.post?.latitude && data.post?.longitude) {
      list.push({
        id: 'pc',
        lat: data.post.latitude,
        lng: data.post.longitude,
        tone: 'poi',
        badge: 'PC',
        label: 'Puesto de Comando',
      });
    }
    const fallbackLat = data.post?.latitude ?? data.incident.latitude;
    const fallbackLng = data.post?.longitude ?? data.incident.longitude;
    for (const resource of data.resources) {
      const lat = resource.latitude ?? fallbackLat;
      const lng = resource.longitude ?? fallbackLng;
      if (!lat || !lng) continue;
      const job = taskIconFromMission(resource.mission);
      list.push({
        id: resource.id,
        lat,
        lng,
        tone: resource.origin === 'EXTERNAL' ? 'company' : 'truck',
        badge: resource.label,
        label: `${resource.label} · ${resource.companyName || resource.institution || ''} · ${resource.staffing} bomberos · ${statusLabel(resource.status)}${resource.mission ? ` · ${resource.mission}` : ''}`,
        draggable: Boolean(data.canWrite) && !placingPoint && !drawingZone,
        job,
        jobTitle: resource.mission,
      });
    }
    for (const point of data.points) {
      const meta = pointKindMeta(point.kind);
      list.push({
        id: point.id,
        lat: point.latitude,
        lng: point.longitude,
        tone: 'ops',
        badge: point.name,
        job: meta.icon,
        jobTitle: meta.label,
        label: `${meta.icon} ${point.name} · ${meta.label}`,
      });
    }
    return spreadOverlappingMarkers(list);
  }, [data, placingPoint, drawingZone]);

  const zonePolygons: OsmPolygon[] = useMemo(() => {
    const saved = (data?.sectors ?? []).flatMap((sector) => {
      const path = (sector.polygon ?? [])
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .map((point) => [point.lat, point.lng] as [number, number]);
      if (path.length < 3) return [];
      return [{
        id: sector.id,
        path,
        color: sector.color || '#dc2626',
        label: `Sector ${sector.name}${sector.mission ? ` · ${sector.mission}` : ''}`,
      }];
    });
    if (draftZone.length >= 3) {
      saved.push({
        id: 'draft-fill',
        path: draftZone.map((point) => [point.lat, point.lng] as [number, number]),
        color: '#dc2626',
        label: 'Zona en dibujo',
      });
    }
    return saved;
  }, [data?.sectors, draftZone]);

  const draftLines: OsmPolyline[] = useMemo(() => {
    if (draftZone.length < 2) return [];
    return [{
      id: 'draft-zone',
      path: draftZone.map((point) => [point.lat, point.lng] as [number, number]),
      color: '#dc2626',
    }];
  }, [draftZone]);

  const mapMarkers = useMemo(() => {
    if (!draftZone.length) return markers;
    return [
      ...markers,
      ...draftZone.map((point, index) => ({
        id: `draft-${index}`,
        lat: point.lat,
        lng: point.lng,
        tone: 'active' as const,
        badge: String(index + 1),
      })),
    ];
  }, [markers, draftZone]);

  const mapCenter: [number, number] = data?.incident.latitude && data?.incident.longitude
    ? [data.incident.latitude, data.incident.longitude]
    : PARRAL_CENTER;

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950 text-slate-300 p-6">
        <p>No se pudo cargar el puesto de comando.</p>
      </div>
    );
  }

  if (!data.post) {
    return (
      <ConstituteView
        snapshot={data}
        busy={mutate.isPending}
        onOpen={(body) => mutate.mutate({ method: 'post', path: '/command-posts', body })}
      />
    );
  }

  const durationMs = (data.post.closedAt ? new Date(data.post.closedAt).getTime() : now) - new Date(data.post.openedAt).getTime();
  const stale = online && now - dataUpdatedAt > 12000;

  const shell = (
    <div className={`nodo-command-page bg-slate-950 text-slate-100 flex flex-col min-h-0 overflow-hidden ${commandMode ? 'fixed inset-0 z-[80]' : 'flex-1'}`}>
      <header className="shrink-0 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/nodo-command" className="keep-on-color w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
            <Flag className="w-4 h-4 text-white" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">NODO360 | Puesto de Comando</p>
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-lg md:text-xl font-black truncate">{data.incident.type}</h1>
              <span className="font-mono text-xs text-slate-400">{data.incident.code}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${online ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-amber-500/15 text-slate-900 dark:text-amber-300'}`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? (stale ? 'Actualizando…' : 'En línea') : 'Sin conexión'}
            </span>
            <span className="hidden sm:inline text-slate-400">{formatClock(new Date(now))}</span>
            <button type="button" onClick={() => void refetch()} className="p-2 rounded-lg border border-white/10">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setCommandMode((v) => !v);
                if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
                else void document.exitFullscreen?.();
              }}
              className="p-2 rounded-lg border border-white/10"
              title="Modo comando / pantalla completa"
            >
              {commandMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-white/10 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Mando actual</p>
            <p className="text-sm font-bold">
              {data.post.command ? `${data.post.command.rank ? `${data.post.command.rank} ` : ''}${data.post.command.name}` : 'Sin mando'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Desde</p>
            <p className="text-sm font-bold">{formatClock(data.post.openedAt)} hrs</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-widest text-red-300">Duración</p>
            <p className="text-sm font-black tabular-nums">{formatDuration(durationMs)}</p>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-1.5 ml-auto">
              <HeaderBtn onClick={() => setModal({ type: 'transfer' })} icon={ArrowLeftRight}>Transferir mando</HeaderBtn>
              <HeaderBtn onClick={() => setModal({ type: 'resource' })} icon={Plus}>Recurso</HeaderBtn>
              <HeaderBtn onClick={() => setModal({ type: 'sector' })} icon={Plus}>Sector</HeaderBtn>
              <HeaderBtn
                onClick={() => {
                  if (!selectedResourceId) {
                    toast.error('Toque un carro, equipo o recurso y luego Asignar tarea.');
                    return;
                  }
                  setModal({ type: 'task', resourceId: selectedResourceId });
                }}
                icon={ClipboardList}
              >
                Tarea
              </HeaderBtn>
              <HeaderBtn onClick={() => setModal({ type: 'novelty' })} icon={Plus}>Novedad</HeaderBtn>
              <HeaderBtn onClick={() => setModal({ type: 'request' })} icon={Radio}>Solicitar</HeaderBtn>
              <HeaderBtn onClick={() => setModal({ type: 'close' })} icon={CheckCircle2} danger>Finalizar</HeaderBtn>
            </div>
          )}
          {data.post.status === 'CLOSED' && (
            <button
              type="button"
              onClick={() => void exportLog(data.post!.id)}
              className="ml-auto text-xs font-bold rounded-xl border border-white/10 px-3 py-2"
            >
              Exportar bitácora
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 md:grid-cols-7 gap-1.5">
          {[
            [data.counters.firefighters, 'Bomberos'],
            [data.counters.units, 'Unidades'],
            [data.counters.companies, 'Compañías'],
            [data.counters.external, 'Externos'],
            [data.counters.sectorsActive, 'Sectores'],
            [data.counters.available, 'Disponibles'],
            [data.counters.inTransit, 'En traslado'],
          ].map(([value, label]) => (
            <div key={String(label)} className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
              <p className="text-lg font-black leading-none">{value}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        {data.alerts.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-thin">
            {data.alerts.map((alert, i) => (
              <span
                key={`${alert.message}-${i}`}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  alert.level === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500/20 text-slate-900 dark:text-amber-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {alert.message}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
        <aside className="shrink-0 xl:w-[280px] max-h-[28vh] xl:max-h-none min-h-0 overflow-y-auto border-b xl:border-b-0 xl:border-r border-white/10 p-3 scrollbar-thin">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recursos</p>
            <div className="flex flex-wrap gap-1 justify-end">
              {([['all', 'Todos'], ['nodo', 'Nodo360'], ['ext', 'Externos'], ['global', 'Global']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md ${filter === id ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filter === 'global' ? (
            <NodoCommandGlobalResources
              canWrite={canWrite}
              busy={mutate.isPending}
              requestedKeys={requestedKeys}
              onRequest={(body) => {
                if (!postId) return;
                toast.success(`${body.label} de ${body.institution} solicitado.`);
                mutate.mutate({ method: 'post', path: `/command-posts/${postId}/resources`, body });
              }}
            />
          ) : (
          <div className="space-y-1.5">
            {visibleResources.map((resource) => (
              <div
                key={resource.id}
                draggable={canWrite}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/resource-id', resource.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => setSelectedResourceId(resource.id)}
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  selectedResourceId === resource.id ? 'border-red-400 bg-red-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black">{resource.label}</p>
                  <span className="text-[10px] font-bold text-slate-400">{statusLabel(resource.status)}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {resource.companyName || resource.institution} · {resource.staffing} bomberos
                </p>
                {resource.mission && (
                  <p className="text-[11px] text-slate-900 dark:text-amber-300 truncate mt-0.5">
                    {taskIconFromMission(resource.mission)} Tarea: {resource.mission}
                  </p>
                )}
                {canWrite && (
                  <>
                    <select
                      value={resource.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        mutate.mutate({
                          method: 'patch',
                          path: `/command-posts/${postId}/resources/${resource.id}`,
                          body: { status: e.target.value },
                        })
                      }
                      className="mt-1 w-full bg-slate-900 border border-white/10 rounded-md text-[11px] px-2 py-1"
                    >
                      {RESOURCE_STATUSES.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedResourceId(resource.id);
                        setModal({ type: 'task', resourceId: resource.id });
                      }}
                      className="mt-1.5 w-full rounded-md bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wide py-1.5"
                    >
                      Asignar tarea
                    </button>
                  </>
                )}
              </div>
            ))}
            {visibleResources.length === 0 && (
              <p className="text-xs text-slate-500 py-8 text-center">Sin recursos en este filtro.</p>
            )}
          </div>
          )}
          {data.requests.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Solicitudes</p>
              <div className="space-y-1.5">
                {data.requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-white/10 px-3 py-2">
                    <p className="text-xs font-bold">{request.quantity} × {request.type}</p>
                    <p className="text-[11px] text-slate-500">{request.priority} · {statusLabel(request.status)}</p>
                    {canWrite && request.status !== 'ARRIBADO' && request.status !== 'CANCELADO' && (
                      <select
                        value={request.status}
                        onChange={(e) =>
                          mutate.mutate({
                            method: 'patch',
                            path: `/command-posts/${postId}/requests/${request.id}`,
                            body: { status: e.target.value },
                          })
                        }
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-md text-[11px] px-2 py-1"
                      >
                        {['SOLICITADO', 'DESPACHADO', 'EN_TRASLADO', 'ARRIBADO', 'CANCELADO'].map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="nodo-command-map relative flex-1 min-h-[220px] xl:min-h-0 overflow-hidden border-b xl:border-b-0 border-white/10">
          <PublicOsmMap
            center={mapCenter}
            markers={mapMarkers}
            polylines={draftLines}
            polygons={zonePolygons}
            zoom={15}
            autoFit={false}
            flyToken={flyToken}
            theme={isDark ? 'dark' : 'light'}
            baseStyle={baseStyle}
            pickActive={placingPoint || drawingZone}
            onPick={(lat, lng) => {
              if (drawingZone) {
                setDraftZone((path) => [...path, { lat, lng }]);
                return;
              }
              if (!placingPoint) return;
              setPlacingPoint(false);
              setModal({ type: 'point', lat, lng });
            }}
            onMarkerClick={(id) => {
              if (data.resources.some((r) => r.id === id)) setSelectedResourceId(id);
            }}
            onMarkerMove={(id, lat, lng) => {
              if (!postId || !data.resources.some((r) => r.id === id)) return;
              qc.setQueryData<CommandSnapshot>(['command-post', incidentId], (current) => {
                if (!current) return current;
                return {
                  ...current,
                  resources: current.resources.map((resource) =>
                    resource.id === id ? { ...resource, latitude: lat, longitude: lng } : resource,
                  ),
                };
              });
              mutate.mutate({
                method: 'patch',
                path: `/command-posts/${postId}/resources/${id}`,
                body: { latitude: lat, longitude: lng },
              });
            }}
            className="absolute inset-0 h-full w-full"
          />
          <div className="nodo-command-map-ui pointer-events-none absolute inset-0 z-[1000]">
            <div className="pointer-events-auto absolute top-3 left-3 flex flex-wrap gap-1 max-w-[min(100%-7.5rem,280px)]">
              {([['osm', 'Mapa'], ['satellite', 'Satélite'], ['terrain', 'Terreno']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBaseStyle(id)}
                  className={`keep-on-color text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md ${
                    baseStyle === id ? 'bg-red-600 text-white' : 'bg-slate-950/90 text-white border border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1 w-[7.25rem]">
              <button
                type="button"
                onClick={() => setFlyToken((n) => n + 1)}
                className="keep-on-color w-full bg-slate-950/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md"
                title="Centrar mapa"
              >
                <LocateFixed className="w-3 h-3 inline mr-1" />
                Centrar
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawingZone(false);
                    setDraftZone([]);
                    setPlacingPoint((v) => !v);
                  }}
                  className={`keep-on-color w-full text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md ${
                    placingPoint ? 'bg-amber-500 text-slate-950' : 'bg-slate-950/90 text-white border border-white/20'
                  }`}
                >
                  <Crosshair className="w-3 h-3 inline mr-1" />
                  Punto
                </button>
              )}
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setPlacingPoint(false);
                    if (drawingZone) {
                      setDrawingZone(false);
                      setDraftZone([]);
                      return;
                    }
                    setDrawingZone(true);
                    setDraftZone([]);
                    toast('Toque el mapa para dibujar la zona roja. Con 3 puntos o más, ciérrela.');
                  }}
                  className={`keep-on-color w-full text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md ${
                    drawingZone ? 'bg-red-600 text-white' : 'bg-slate-950/90 text-white border border-white/20'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Zona
                </button>
              )}
              {drawingZone && (
                <>
                  <p className="keep-on-color w-full rounded-lg bg-red-600 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wide text-white shadow-md">
                    {draftZone.length} pts
                  </p>
                  <button
                    type="button"
                    disabled={draftZone.length === 0}
                    onClick={() => setDraftZone((path) => path.slice(0, -1))}
                    className="keep-on-color w-full bg-slate-950/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md disabled:opacity-40"
                  >
                    Deshacer
                  </button>
                  <button
                    type="button"
                    disabled={draftZone.length < 3}
                    onClick={() => setModal({ type: 'zone', path: draftZone })}
                    className="keep-on-color w-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-lg shadow-md disabled:opacity-40"
                  >
                    Cerrar
                  </button>
                </>
              )}
            </div>
            {canWrite && (
              <p className="keep-on-color pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/90 shadow-md text-center max-w-[90%]">
                {drawingZone
                  ? 'Toque el mapa · 3 puntos o más'
                  : placingPoint
                    ? 'Toque el mapa para marcar el punto'
                    : 'Arrastre 🚒 · Zona para marcar emergencia'}
              </p>
            )}
            {selected && (
              <div className="keep-on-color pointer-events-auto absolute bottom-3 left-3 rounded-xl border border-white/20 bg-slate-950/90 px-3 py-2 max-w-[280px] text-white shadow-lg">
                <p className="font-black text-white">{selected.label}</p>
                <p className="text-xs text-white/80">{selected.companyName || selected.institution}</p>
                <p className="text-xs text-white">{selected.staffing} bomberos · {statusLabel(selected.status)}</p>
                {selected.mission && (
                  <p className="text-xs text-white dark:text-amber-200">
                    {taskIconFromMission(selected.mission)} Tarea: {selected.mission}
                  </p>
                )}
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'task', resourceId: selected.id })}
                    className="mt-2 w-full rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wide py-1.5"
                  >
                    Asignar tarea
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="shrink-0 xl:w-[300px] max-h-[28vh] xl:max-h-none min-h-0 overflow-y-auto border-t xl:border-t-0 xl:border-l border-white/10 p-3 scrollbar-thin">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Sectores operacionales</p>
          <div className="space-y-2">
            {(data.sectors ?? []).map((sector) => {
              const assigned = data.resources.filter((r) => r.sectorId === sector.id);
              const staff = assigned.reduce((sum, r) => sum + r.staffing, 0);
              return (
                <div
                  key={sector.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    const resourceId = e.dataTransfer.getData('text/resource-id');
                    const resource = data.resources.find((r) => r.id === resourceId);
                    if (!resource || !canWrite) return;
                    setModal({ type: 'assign', resourceId, sectorId: sector.id, label: resource.label, sectorName: sector.name });
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: (sector.polygon?.length ?? 0) >= 3 ? (sector.color || '#dc2626') : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black">Sector {sector.name}</p>
                    {canWrite && (
                      <select
                        value={sector.status}
                        onChange={(e) =>
                          mutate.mutate({
                            method: 'patch',
                            path: `/command-posts/${postId}/sectors/${sector.id}`,
                            body: { status: e.target.value },
                          })
                        }
                        className="bg-slate-900 border border-white/10 rounded-md text-[10px] px-1.5 py-1"
                      >
                        {SECTOR_STATUSES.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{sector.mission || 'Sin misión'}</p>
                  {(sector.polygon?.length ?? 0) >= 3 && (
                    <p className="text-[11px] font-bold" style={{ color: sector.color || '#dc2626' }}>
                      Zona marcada en el mapa
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    {sector.responsibleName || 'Sin responsable'} · {assigned.length} unidades · {staff} bomberos
                  </p>
                  <div className="mt-2 space-y-1">
                    {assigned.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedResourceId(r.id);
                          if (canWrite) setModal({ type: 'task', resourceId: r.id });
                        }}
                        className="w-full text-left text-[11px] rounded-md bg-slate-900/80 px-2 py-1"
                      >
                        {r.label} · {r.staffing} bomberos
                        {r.mission ? ` · ${r.mission}` : ''}
                      </button>
                    ))}
                    {assigned.length === 0 && (
                      <p className="text-[11px] text-slate-600">Arrastre un recurso aquí</p>
                    )}
                  </div>
                </div>
              );
            })}
            {data.sectors.length === 0 && (
              <p className="text-xs text-slate-500 py-8 text-center">Cree el primer sector operacional.</p>
            )}
          </div>
        </aside>
        </div>

        <section className="shrink-0 h-[150px] min-h-[150px] overflow-hidden border-t border-white/10 flex flex-col">
          <div className="shrink-0 px-3 py-1.5 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Bitácora en vivo
            </p>
            {postId && (
              <button type="button" onClick={() => void exportLog(postId)} className="text-[10px] font-bold text-slate-400">
                Exportar bitácora
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Hora</th>
                  <th className="py-1 pr-3">Evento</th>
                  <th className="py-1 pr-3 hidden md:table-cell">Detalle</th>
                  <th className="py-1">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="border-t border-white/5">
                    <td className="py-1.5 pr-3 font-mono text-slate-400 whitespace-nowrap">{formatClock(log.occurredAt)}</td>
                    <td className="py-1.5 pr-3 font-semibold">{log.action}</td>
                    <td className="py-1.5 pr-3 hidden md:table-cell text-slate-500">{log.detail || '—'}</td>
                    <td className="py-1.5 text-slate-400">{log.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modal && (
        <ModalShell onClose={() => setModal(null)}>
          {modal.type === 'transfer' && (
            <TransferForm
              current={data.post.command?.name ?? ''}
              defaultRank={rankFromRole(user?.role)}
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/transfer`, body })}
            />
          )}
          {modal.type === 'resource' && (
            <ResourceForm
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/resources`, body })}
            />
          )}
          {modal.type === 'sector' && (
            <SectorForm
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/sectors`, body })}
            />
          )}
          {modal.type === 'novelty' && (
            <NoveltyForm
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/novelties`, body })}
            />
          )}
          {modal.type === 'request' && (
            <RequestForm
              sectors={data.sectors}
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/requests`, body })}
            />
          )}
          {modal.type === 'assign' && (
            <AssignForm
              label={modal.label}
              sectorName={modal.sectorName}
              busy={mutate.isPending}
              onSubmit={(mission) =>
                mutate.mutate({
                  method: 'patch',
                  path: `/command-posts/${postId}/resources/${modal.resourceId}`,
                  body: { sectorId: modal.sectorId, mission, status: 'ASIGNADO' },
                })
              }
            />
          )}
          {modal.type === 'task' && (
            <TaskForm
              resource={data.resources.find((r) => r.id === modal.resourceId)}
              sectors={data.sectors}
              responders={data.responders}
              busy={mutate.isPending}
              onSubmit={(body) =>
                mutate.mutate({
                  method: 'patch',
                  path: `/command-posts/${postId}/resources/${modal.resourceId}`,
                  body,
                })
              }
            />
          )}
          {modal.type === 'point' && (
            <PointForm
              lat={modal.lat}
              lng={modal.lng}
              busy={mutate.isPending}
              onSubmit={(body) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/points`, body })}
            />
          )}
          {modal.type === 'zone' && (
            <ZoneForm
              sectors={data.sectors}
              busy={mutate.isPending}
              onSubmit={(body) => {
                const polygon = modal.path;
                if (body.sectorId) {
                  mutate.mutate({
                    method: 'patch',
                    path: `/command-posts/${postId}/sectors/${body.sectorId}`,
                    body: { polygon, color: body.color },
                  });
                } else {
                  mutate.mutate({
                    method: 'post',
                    path: `/command-posts/${postId}/sectors`,
                    body: {
                      name: body.name,
                      mission: body.mission,
                      polygon,
                      color: body.color,
                    },
                  });
                }
                setDrawingZone(false);
                setDraftZone([]);
              }}
            />
          )}
          {modal.type === 'close' && (
            <CloseForm
              snapshot={data}
              duration={formatDuration(durationMs)}
              busy={mutate.isPending}
              onSubmit={(note) => mutate.mutate({ method: 'post', path: `/command-posts/${postId}/close`, body: { note } })}
            />
          )}
        </ModalShell>
      )}
    </div>
  );

  return shell;
}

function HeaderBtn({
  children,
  onClick,
  icon: Icon,
  danger,
}: {
  children: string;
  onClick: () => void;
  icon: typeof Plus;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        danger ? 'bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <Icon className="w-3 h-3" />
      {children}
    </button>
  );
}

function ConstituteView({
  snapshot,
  busy,
  onOpen,
}: {
  snapshot: CommandSnapshot;
  busy: boolean;
  onOpen: (body: Record<string, unknown>) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [commanderName, setCommanderName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
  const [rank, setRank] = useState(rankFromRole(user?.role));
  const [note, setNote] = useState('');
  const [lat, setLat] = useState<number | ''>(snapshot.incident.latitude ?? '');
  const [lng, setLng] = useState<number | ''>(snapshot.incident.longitude ?? '');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!window.confirm('¿Confirma que asumirá el mando de esta emergencia?')) return;
    onOpen({
      incidentId: snapshot.incident.id,
      commanderName,
      rank,
      note: note || undefined,
      latitude: lat === '' ? undefined : Number(lat),
      longitude: lng === '' ? undefined : Number(lng),
    });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <form onSubmit={submit} className="max-w-xl mx-auto space-y-4">
        <Link to="/nodo-command" className="text-xs text-slate-400">← Volver</Link>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-400">Constituir puesto de comando</p>
        <h1 className="text-2xl font-black">{snapshot.incident.type}</h1>
        <p className="font-mono text-sm text-red-300">{snapshot.incident.code}</p>
        <p className="text-sm text-slate-400">{snapshot.incident.address}</p>
        <Field label="Responsable que asume el mando">
          <input required value={commanderName} onChange={(e) => setCommanderName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Cargo">
          <input required value={rank} onChange={(e) => setRank(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud PC">
            <input value={lat} onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Longitud PC">
            <input value={lng} onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
          </Field>
        </div>
        <Field label="Observación inicial">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Fecha y hora: se registran automáticamente.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="w-full keep-on-color bg-red-600 text-white font-black uppercase tracking-wide rounded-xl py-3"
        >
          {busy ? 'Constituyendo…' : 'Constituir puesto de comando'}
        </button>
      </form>
    </div>
  );
}

const inputClass = 'w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-4 relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 text-slate-400">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function TransferForm({
  current,
  defaultRank,
  busy,
  onSubmit,
}: {
  current: string;
  defaultRank: string;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [commanderName, setCommanderName] = useState('');
  const [rank, setRank] = useState(defaultRank);
  const [note, setNote] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(`¿Transferir el mando a ${commanderName}?`)) return;
        onSubmit({ commanderName, rank, note: note || undefined });
      }}
    >
      <h2 className="font-black text-lg pr-6">Transferir mando</h2>
      <p className="text-xs text-slate-400">Mando actual: {current || '—'}</p>
      <Field label="Nuevo mando"><input required value={commanderName} onChange={(e) => setCommanderName(e.target.value)} className={inputClass} /></Field>
      <Field label="Cargo"><input value={rank} onChange={(e) => setRank(e.target.value)} className={inputClass} /></Field>
      <Field label="Observaciones"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Confirmar transferencia</button>
    </form>
  );
}

function ResourceForm({ busy, onSubmit }: { busy: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const [institution, setInstitution] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('Carro bomba');
  const [responsibleName, setResponsibleName] = useState('');
  const [staffing, setStaffing] = useState(0);
  const [contact, setContact] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ institution, companyName: companyName || undefined, label, type, responsibleName: responsibleName || undefined, staffing, contact: contact || undefined });
      }}
    >
      <h2 className="font-black text-lg pr-6">Registrar recurso externo</h2>
      <Field label="Institución / Cuerpo"><input required value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClass} placeholder="Bomberos de Linares" /></Field>
      <Field label="Compañía"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} /></Field>
      <Field label="Unidad"><input required value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="Z-2" /></Field>
      <Field label="Tipo">
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {RESOURCE_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Responsable"><input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} className={inputClass} /></Field>
      <Field label="Dotación"><input type="number" min={0} value={staffing} onChange={(e) => setStaffing(Number(e.target.value))} className={inputClass} /></Field>
      <Field label="Contacto"><input value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Registrar en emergencia</button>
    </form>
  );
}

function SectorForm({ busy, onSubmit }: { busy: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const [name, setName] = useState('Alfa');
  const [mission, setMission] = useState('Ataque directo');
  const [responsibleName, setResponsibleName] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, mission: mission || undefined, responsibleName: responsibleName || undefined });
      }}
    >
      <h2 className="font-black text-lg pr-6">Nuevo sector</h2>
      <div className="flex flex-wrap gap-1">
        {SECTOR_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setName(preset.name);
              setMission(preset.mission);
            }}
            className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/10"
          >
            {preset.name}
          </button>
        ))}
      </div>
      <Field label="Nombre"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
      <Field label="Misión"><input value={mission} onChange={(e) => setMission(e.target.value)} className={inputClass} /></Field>
      <Field label="Responsable"><input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Crear sector</button>
    </form>
  );
}

function NoveltyForm({ busy, onSubmit }: { busy: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('OPERACIONAL');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ text, category });
      }}
    >
      <h2 className="font-black text-lg pr-6">Registrar novedad</h2>
      <Field label="Categoría">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {NOVELTY_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Novedad"><textarea required value={text} onChange={(e) => setText(e.target.value)} rows={4} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Registrar</button>
    </form>
  );
}

function RequestForm({
  sectors,
  busy,
  onSubmit,
}: {
  sectors: CommandSnapshot['sectors'];
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [type, setType] = useState('Carro aljibe');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('ALTA');
  const [sectorId, setSectorId] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ type, quantity, reason: reason || undefined, priority, sectorId: sectorId || undefined });
      }}
    >
      <h2 className="font-black text-lg pr-6">Solicitar recurso</h2>
      <Field label="Tipo"><input required value={type} onChange={(e) => setType(e.target.value)} className={inputClass} /></Field>
      <Field label="Cantidad"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputClass} /></Field>
      <Field label="Prioridad">
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
          {REQUEST_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Destino / sector">
        <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={inputClass}>
          <option value="">Sin sector</option>
          {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
        </select>
      </Field>
      <Field label="Motivo"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Enviar solicitud</button>
    </form>
  );
}

function TaskForm({
  resource,
  sectors,
  responders,
  busy,
  onSubmit,
}: {
  resource?: CommandSnapshot['resources'][number];
  sectors: CommandSnapshot['sectors'];
  responders: CommandSnapshot['responders'];
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [mission, setMission] = useState(resource?.mission || 'Ataque directo');
  const [sectorId, setSectorId] = useState(resource?.sectorId || '');
  const [staffing, setStaffing] = useState(resource?.staffing ?? 0);
  const [status, setStatus] = useState(resource?.status || 'ASIGNADO');
  const crew = responders.filter((person) => {
    if (!resource?.companyName || !person.companyName) return false;
    return person.companyName === resource.companyName;
  });

  if (!resource) {
    return <p className="text-sm text-slate-400">Seleccione un recurso.</p>;
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          mission: mission.trim() || undefined,
          sectorId: sectorId || null,
          staffing,
          status: status || 'ASIGNADO',
        });
      }}
    >
      <h2 className="font-black text-lg pr-6">Asignar tarea · {resource.label}</h2>
      <p className="text-xs text-slate-400">
        {resource.companyName || resource.institution} · {resource.type}
      </p>
      <Field label="Sector">
        <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={inputClass}>
          <option value="">Sin sector</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>{sector.name}{sector.mission ? ` · ${sector.mission}` : ''}</option>
          ))}
        </select>
      </Field>
      <Field label="Tarea / misión">
        <div className="flex flex-wrap gap-1 mb-2">
          {TASK_PRESETS.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => setMission(task)}
              className={`text-[10px] font-bold px-2 py-1 rounded-md ${mission === task ? 'bg-red-600 text-white' : 'bg-white/10'}`}
            >
              {taskIconFromMission(task)} {task}
            </button>
          ))}
        </div>
        <input value={mission} onChange={(e) => setMission(e.target.value)} className={inputClass} placeholder="Ej: Ataque directo" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dotación">
          <input type="number" min={0} value={staffing} onChange={(e) => setStaffing(Number(e.target.value))} className={inputClass} />
        </Field>
        <Field label="Estado">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {RESOURCE_STATUSES.map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
        </Field>
      </div>
      {crew.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Bomberos NODO360 en esta compañía</p>
          <ul className="text-xs text-slate-300 space-y-0.5 max-h-24 overflow-y-auto">
            {crew.map((person) => (
              <li key={person.userId}>{person.name} · {person.status === 'ON_SCENE' ? 'En lugar' : 'En camino'}</li>
            ))}
          </ul>
        </div>
      )}
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Asignar tarea</button>
    </form>
  );
}

function AssignForm({
  label,
  sectorName,
  busy,
  onSubmit,
}: {
  label: string;
  sectorName: string;
  busy: boolean;
  onSubmit: (mission: string) => void;
}) {
  const [mission, setMission] = useState('Ataque directo');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(mission);
      }}
    >
      <h2 className="font-black text-lg pr-6">Asignar {label} a Sector {sectorName}</h2>
      <div className="flex flex-wrap gap-1">
        {TASK_PRESETS.map((task) => (
          <button
            key={task}
            type="button"
            onClick={() => setMission(task)}
            className={`text-[10px] font-bold px-2 py-1 rounded-md ${mission === task ? 'bg-red-600 text-white' : 'bg-white/10'}`}
          >
            {taskIconFromMission(task)} {task}
          </button>
        ))}
      </div>
      <Field label="Tarea / misión"><input value={mission} onChange={(e) => setMission(e.target.value)} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Confirmar</button>
    </form>
  );
}

function ZoneForm({
  sectors,
  busy,
  onSubmit,
}: {
  sectors: CommandSnapshot['sectors'];
  busy: boolean;
  onSubmit: (body: { name: string; mission?: string; color: string; sectorId?: string }) => void;
}) {
  const [name, setName] = useState('Zona de emergencia');
  const [mission, setMission] = useState('Emergencia de gran magnitud');
  const [color, setColor] = useState('#dc2626');
  const [sectorId, setSectorId] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim() || 'Zona de emergencia',
          mission: mission.trim() || undefined,
          color,
          sectorId: sectorId || undefined,
        });
      }}
    >
      <h2 className="font-black text-lg pr-6">Marcar zona en el mapa</h2>
      <p className="text-xs text-slate-400">El rojo se usa para el área de una emergencia grande.</p>
      <Field label="Color">
        <div className="grid grid-cols-1 gap-1">
          {ZONE_COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setColor(item.id)}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold ${
                color === item.id ? 'ring-2 ring-white' : 'bg-white/5'
              }`}
            >
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: item.id }} />
              {item.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Usar un sector existente">
        <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={inputClass}>
          <option value="">Crear sector nuevo</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>{sector.name}</option>
          ))}
        </select>
      </Field>
      {!sectorId && (
        <>
          <Field label="Nombre del sector">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Misión">
            <input value={mission} onChange={(e) => setMission(e.target.value)} className={inputClass} />
          </Field>
        </>
      )}
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">
        Pintar zona
      </button>
    </form>
  );
}

function PointForm({
  lat,
  lng,
  busy,
  onSubmit,
}: {
  lat: number;
  lng: number;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [kind, setKind] = useState<(typeof POINT_KINDS)[number]['id']>('ABASTECIMIENTO');
  const [name, setName] = useState(pointKindMeta('ABASTECIMIENTO').label);
  const meta = pointKindMeta(kind);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim() || meta.label, kind, latitude: lat, longitude: lng });
      }}
    >
      <h2 className="font-black text-lg pr-6">Punto operacional</h2>
      <p className="text-xs text-slate-400">Toque un tipo. El nombre se puede ajustar.</p>
      <Field label="Tipo">
        <div className="flex flex-wrap gap-1">
          {POINT_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setKind(item.id);
                setName((current) => {
                  const previous = pointKindMeta(kind).label;
                  return !current.trim() || current === previous ? item.label : current;
                });
              }}
              className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                kind === item.id ? 'bg-red-600 text-white' : 'bg-white/10'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Nombre">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <p className="text-[11px] text-slate-500">
        {meta.icon} {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
      <button disabled={busy} className="w-full bg-red-600 text-white font-black rounded-xl py-2.5">Marcar punto</button>
    </form>
  );
}

function CloseForm({
  snapshot,
  duration,
  busy,
  onSubmit,
}: {
  snapshot: CommandSnapshot;
  duration: string;
  busy: boolean;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm('¿Finalizar operación de NodoCommand?')) return;
        onSubmit(note);
      }}
    >
      <h2 className="font-black text-lg pr-6">Finalizar puesto de comando</h2>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>Duración: {duration}</li>
        <li>Compañías: {snapshot.counters.companies}</li>
        <li>Unidades: {snapshot.counters.units}</li>
        <li>Bomberos: {snapshot.counters.firefighters}</li>
        <li>Sectores: {snapshot.sectors.length}</li>
        <li>Recursos externos: {snapshot.counters.external}</li>
        <li>Cambios de mando: {Math.max(0, snapshot.post?.commandHistory.length ? snapshot.post.commandHistory.length - 1 : 0)}</li>
      </ul>
      <Field label="Observación final"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} /></Field>
      <button disabled={busy} className="w-full bg-emerald-600 text-white font-black rounded-xl py-2.5">Finalizar operación</button>
    </form>
  );
}

async function exportLog(postId: string) {
  try {
    const { data } = await api.get<{ filename: string; text: string }>(`/command-posts/${postId}/export`);
    const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'nodo-command.txt';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(errMessage(error));
  }
}
