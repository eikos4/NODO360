import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Siren, Users, Truck, RefreshCw, Radio, MapPin, Clock,
  ExternalLink, AlertTriangle, CheckCircle2, Flame, Moon, Sun, BookOpen, Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';
import { type PublicEmergency } from '../components/dispatch/DispatchEmergenciesPanel';
import PublicEmergencyBanner from '../components/dispatch/PublicEmergencyBanner';
import RadioPttPanel from '../components/radio/RadioPttPanel';
import PublicOsmMap, { PARRAL_CENTER, type OsmBaseStyle } from '../components/map/PublicOsmMap';

const POLL_MS = 10_000;
const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

const MAP_STYLES: { id: OsmBaseStyle; label: string }[] = [
  { id: 'voyager', label: 'Calles' },
  { id: 'osm', label: 'OSM' },
  { id: 'dark', label: 'Oscuro' },
];

type PublicCentral = {
  slug: string;
  name: string;
  number: number;
  city: string;
  address: string;
  status: 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';
  roster: { stats: { total: number; available: number; unavailable: number } };
  maquinistas: { stats: { total: number; available: number } };
  fleet: { stats: { total: number; operativo: number }; vehicles: { patent: string; type: string; statusLabel: string }[] };
  recentEmergencies: PublicEmergency[];
  emergencyStats: { active: number; total: number };
};

function LiveClock({ className }: { className: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={`font-mono text-lg sm:text-2xl font-bold tabular-nums ${className}`}>
      {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}

function mapIncidentToPublic(inc: {
  id: string;
  code: string;
  type: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dispatchedAt: string;
  closedAt?: string | null;
  dispatchNotes?: string | null;
}): PublicEmergency | null {
  if (inc.latitude == null || inc.longitude == null) return null;
  return {
    id: inc.id,
    code: inc.code,
    type: inc.type,
    description: inc.description ?? '',
    address: inc.address ?? 'Sin dirección',
    latitude: inc.latitude,
    longitude: inc.longitude,
    dispatchedAt: inc.dispatchedAt,
    closedAt: inc.closedAt,
    status: inc.closedAt ? 'CERRADA' : 'ACTIVA',
    alarmBy: inc.dispatchNotes ?? 'Central de despacho',
  };
}

export default function CentralOperativaPage() {
  const user = useAuthStore((s) => s.user);
  const { tokens: th, toggleTheme, isDark } = useCentralParralTheme();
  const companyId = user?.companyId ?? '';
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<OsmBaseStyle>(isDark ? 'dark' : 'voyager');

  useEffect(() => {
    setMapStyle(isDark ? 'dark' : 'voyager');
  }, [isDark]);

  const { data: config } = useQuery({
    queryKey: ['dispatch-config', companyId],
    queryFn: () => api.get('/dispatch/central/config', { params: { companyId } }).then((r) => r.data),
    enabled: !!companyId,
  });

  const slug = config?.dispatchSlug as string | undefined;

  const { data: live, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['central-live', slug],
    queryFn: async () => {
      if (slug) {
        const res = await fetch(`${apiBase}/dispatch/public/${slug}`);
        if (!res.ok) throw new Error('No se pudo cargar la central');
        return res.json() as Promise<PublicCentral>;
      }
      return null;
    },
    enabled: !!slug,
    refetchInterval: POLL_MS,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', companyId],
    queryFn: () => api.get('/incidents', { params: { companyId } }).then((r) => r.data),
    enabled: !!companyId,
    refetchInterval: POLL_MS,
  });

  const activeIncidents = useMemo(
    () => (incidents as { closedAt?: string | null }[]).filter((i) => !i.closedAt),
    [incidents],
  );

  const mapEmergencies = useMemo(() => {
    if (live?.recentEmergencies?.length) return live.recentEmergencies;
    return (incidents as Parameters<typeof mapIncidentToPublic>[0][])
      .map(mapIncidentToPublic)
      .filter((e): e is PublicEmergency => e != null)
      .slice(0, 8);
  }, [live, incidents]);

  const activeForBanner = mapEmergencies.find((e) => e.status === 'ACTIVA' && e.id !== dismissedBannerId) ?? null;
  const focused = mapEmergencies.find((e) => e.id === focusId);

  const mapMarkers = mapEmergencies
    .filter((e) => e.hasCoordinates !== false && e.latitude && e.longitude)
    .map((e) => ({
      id: e.id,
      lat: e.latitude,
      lng: e.longitude,
      active: e.status === 'ACTIVA',
      label: `<strong>${e.code ? `${e.code} · ` : ''}${e.type}</strong><br/>${e.address ?? ''}`,
    }));

  const mapCenter: [number, number] = mapMarkers[0]
    ? [mapMarkers[0].lat, mapMarkers[0].lng]
    : PARRAL_CENTER;
  const mapFocus: [number, number] | null =
    focused && focused.latitude && focused.longitude
      ? [focused.latitude, focused.longitude]
      : null;

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const activeCount = live?.emergencyStats?.active ?? activeIncidents.length;

  return (
    <div className={`central-operativa-page flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-300 ${th.shell}`}>
      <div className={`shrink-0 px-3 sm:px-5 py-3 border-b ${th.shellHeader} ${th.borderSubtle}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Central en vivo</span>
            </div>
            <h1 className={`text-lg sm:text-xl font-bold ${th.title}`}>
              {live?.name ?? config?.name ?? 'Central de Despacho'}
            </h1>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${th.subtitle}`}>
              <MapPin className="w-3 h-3" />
              {live?.address ?? 'Monitoreo operativo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <LiveClock className={th.clock} />
              <p className={`text-[10px] flex items-center justify-end gap-1 mt-0.5 ${th.subtitle}`}>
                <Clock className="w-3 h-3" />
                Actualizado {lastUpdate}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${th.btnGhost}`}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className={`p-2 rounded-lg border transition-colors ${th.refreshBtn}`}
              title="Actualizar ahora"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {activeForBanner && (
        <div className="shrink-0 px-3 sm:px-5 pt-3 space-y-3">
          <PublicEmergencyBanner
            emergency={activeForBanner}
            onFinalize={() => setDismissedBannerId(activeForBanner.id)}
          />
          <RadioPttPanel
            incidentId={activeForBanner.id}
            incidentLabel={`${activeForBanner.code} · ${activeForBanner.type}`}
            canTalk
            isDark={isDark}
          />
        </div>
      )}

      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 px-3 sm:px-5 py-3">
        {[
          {
            label: 'Emergencias activas',
            value: activeCount,
            icon: Siren,
            accent: isDark ? 'text-red-400 bg-red-600/15 border-red-600/25' : 'text-red-700 bg-red-50 border-red-200',
            alert: activeCount > 0,
          },
          {
            label: 'Voluntarios en cuartel',
            value: live?.roster?.stats?.available ?? '—',
            icon: Users,
            accent: isDark ? 'text-emerald-400 bg-emerald-600/15 border-emerald-600/25' : 'text-emerald-800 bg-emerald-50 border-emerald-300',
          },
          {
            label: 'Carros operativos',
            value: live?.fleet?.stats?.operativo ?? '—',
            sub: live?.fleet?.stats?.total ? `de ${live.fleet.stats.total}` : undefined,
            icon: Truck,
            accent: isDark ? 'text-blue-400 bg-blue-600/15 border-blue-600/25' : 'text-blue-800 bg-blue-50 border-blue-300',
          },
          {
            label: 'Estado central',
            value: live?.status === 'DISPONIBLE' ? 'Disponible' : live?.status ?? '—',
            icon: CheckCircle2,
            accent: live?.status === 'DISPONIBLE'
              ? isDark ? 'text-emerald-400 bg-emerald-600/15 border-emerald-600/25' : 'text-emerald-800 bg-emerald-50 border-emerald-300'
              : isDark ? 'text-amber-300 bg-amber-600/20 border-amber-500/40' : 'text-amber-950 bg-amber-100 border-amber-400',
          },
        ].map(({ label, value, sub, icon: Icon, accent, alert }) => (
          <div
            key={label}
            className={`rounded-xl border p-3 sm:p-4 ${accent} ${alert ? 'ring-1 ring-red-500/40' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-4 h-4 opacity-80" />
              {alert && <span className="text-[9px] font-bold uppercase text-red-600 animate-pulse">Alerta</span>}
            </div>
            <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${th.kpiValue}`}>
              {value}
              {sub && <span className={`text-sm font-normal ml-1 ${th.subtitle}`}>{sub}</span>}
            </p>
            <p className={`text-[10px] sm:text-xs mt-1 font-medium ${th.kpiLabel}`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-3 px-3 sm:px-5 pb-3 overflow-hidden">
        <div className={`relative min-h-[340px] sm:min-h-[420px] lg:min-h-0 rounded-2xl border overflow-hidden ${th.operativaPanel}`}>
          <PublicOsmMap
            theme={th.mapTheme}
            baseStyle={mapStyle}
            center={mapCenter}
            focus={mapFocus}
            zoom={14}
            markers={mapMarkers}
            className="absolute inset-0 h-full w-full"
          />

          <div className={`absolute top-3 left-3 z-[500] flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 shadow-md backdrop-blur-md ${
            isDark ? 'bg-slate-950/75 border-white/10' : 'bg-white/90 border-slate-200'
          }`}>
            <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            {MAP_STYLES.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setMapStyle(layer.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  mapStyle === layer.id
                    ? 'bg-red-600 keep-on-color text-white'
                    : isDark
                      ? 'text-slate-300 hover:bg-white/10'
                      : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className={`absolute bottom-8 left-3 z-[500] flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 shadow-md backdrop-blur-md ${
            isDark ? 'bg-slate-950/75 border-white/10 text-slate-200' : 'bg-white/90 border-slate-200 text-slate-800'
          }`}>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white shadow" />
              Activa
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-2 ring-white shadow" />
              Cerrada
            </span>
            <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              OSM · CARTO
            </span>
          </div>
        </div>

        <aside className="min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className={`min-h-0 flex-1 flex flex-col rounded-2xl border overflow-hidden ${th.operativaPanel}`}>
            <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-2 ${th.operativaPanelHeader}`}>
              <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
              <h2 className={`text-sm font-bold ${th.title}`}>Emergencias</h2>
              <span className={`ml-auto text-[10px] font-medium ${th.subtitle}`}>
                {mapEmergencies.length} · {POLL_MS / 1000}s
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {mapEmergencies.length === 0 ? (
                <p className={`text-sm text-center py-8 ${th.subtitle}`}>Sin emergencias registradas</p>
              ) : (
                mapEmergencies.slice(0, 12).map((inc) => {
                  const active = inc.status === 'ACTIVA';
                  const selected = focusId === inc.id;
                  const mainVehicle = inc.vehicles?.[0]?.patent;
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => setFocusId(inc.id === focusId ? null : inc.id)}
                      className={`relative w-full text-left overflow-hidden p-3 rounded-xl border transition-colors ${
                        selected
                          ? isDark
                            ? 'border-red-500 bg-red-950/50 ring-1 ring-red-500/40'
                            : 'border-red-400 bg-red-50 ring-1 ring-red-200'
                          : active
                            ? th.incidentRowActive
                            : th.incidentRowIdle
                      }`}
                    >
                      {mainVehicle && (
                        <div className="absolute -right-2 -bottom-4 text-[60px] font-black italic opacity-[0.03] dark:opacity-5 pointer-events-none select-none tracking-tighter uppercase whitespace-nowrap">
                          {mainVehicle}
                        </div>
                      )}
                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-mono ${th.subtitle}`}>{inc.code}</p>
                          <p className={`text-sm font-semibold mt-0.5 ${th.title}`}>{inc.type}</p>
                          <p className={`text-xs mt-1 line-clamp-1 ${th.subtitle}`}>{inc.address ?? '—'}</p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            active
                              ? 'bg-red-600 keep-on-color text-white shadow-sm'
                              : isDark
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {active ? 'Activa' : 'Cerrada'}
                        </span>
                      </div>
                      <p className={`relative z-10 text-[10px] mt-2 ${th.subtitle}`}>
                        {new Date(inc.dispatchedAt).toLocaleString('es-CL')}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-2 gap-2">
            <Link
              to="/despacho360"
              className="keep-on-color flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-red-600/20"
            >
              <Siren className="w-4 h-4" />
              Despacho360
            </Link>
            <Link
              to="/operational-map"
              className={`flex items-center justify-center gap-2 font-semibold text-sm py-3 rounded-xl transition-colors ${th.btnSecondary}`}
            >
              <Flame className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
              Mapa 360
            </Link>
            <Link
              to="/central-bitacora"
              className={`col-span-2 flex items-center justify-center gap-2 font-semibold text-sm py-3 rounded-xl transition-colors ${th.btnSecondary}`}
            >
              <BookOpen className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
              Bitácora operacional
            </Link>
            {slug && (
              <a
                href={`/central/${slug}`}
                target="_blank"
                rel="noreferrer"
                className={`col-span-2 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl transition-colors ${th.btnSecondary}`}
              >
                <Radio className="w-3.5 h-3.5" />
                Vista pública del cuartel
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            )}
          </div>

          {live?.fleet?.vehicles?.length ? (
            <div className={`shrink-0 rounded-xl border p-3 ${th.card} ${th.borderSubtle}`}>
              <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${th.label}`}>Flota</p>
              <div className="flex flex-wrap gap-1.5">
                {live.fleet.vehicles.slice(0, 6).map((v) => (
                  <span
                    key={v.patent}
                    className={`text-[10px] font-mono px-2 py-1 rounded-lg border ${
                      v.statusLabel === 'Operativo'
                        ? isDark ? 'border-emerald-600/30 text-emerald-400 bg-emerald-600/10' : 'border-emerald-400 text-emerald-800 bg-emerald-50'
                        : isDark ? 'border-slate-600 text-slate-400 bg-slate-800/50' : 'border-slate-300 text-slate-700 bg-slate-50'
                    }`}
                  >
                    {v.patent}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
