import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Map, Layers, Building2, Droplets, Users, Route, ShieldAlert,
  Maximize2, RefreshCw, ChevronRight, Radio, Siren, UserCheck,
  Sun, Moon, Truck, Navigation, Satellite, Mountain
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useOperationalMapTheme } from '../hooks/useOperationalMapTheme';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import type { OperationalMapThemeTokens } from '../lib/operational-map-theme';

const DEFAULT_CENTER: [number, number] = [-36.1431, -71.8261];
const LIVE_POLL_IDLE = 6_000;
const LIVE_POLL_URGENT = 2_000;

const BASE_LAYERS = {
  streets: {
    label: 'Calles',
    icon: Map,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  satellite: {
    label: 'Satélite',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  dark: {
    label: 'Oscuro',
    icon: Moon,
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  topo: {
    label: 'Topográfico',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
} as const;

type BaseLayerKey = keyof typeof BASE_LAYERS;

const HYDRANT_STATUS: Record<string, { label: string; color: string }> = {
  OPERATIVO: { label: 'Operativo', color: '#0ea5e9' },
  NO_OPERATIVO: { label: 'No operativo', color: '#ef4444' },
  EN_MANTENCION: { label: 'En mantención', color: '#f59e0b' },
};

function divIcon(color: string, shape: 'circle' | 'square' | 'diamond' = 'circle') {
  const radius = shape === 'circle' ? '50%' : '4px';
  const transform = shape === 'diamond' ? 'rotate(45deg)' : 'none';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:${radius};transform:${transform};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function alarmIcon(approximate?: boolean, fieldConfirmed?: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:34px;height:34px">
      <div class="om-alarm-ring" style="position:absolute;inset:0;background:${fieldConfirmed ? '#22c55e' : '#ef4444'};border-radius:50%"></div>
      <div style="position:absolute;inset:7px;background:${fieldConfirmed ? '#16a34a' : '#dc2626'};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(${fieldConfirmed ? '34,197,94' : '220,38,38'},.55)"></div>
      ${approximate ? '<div style="position:absolute;inset:-4px;border:2px dashed #fbbf24;border-radius:50%"></div>' : ''}
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function dispatchPinIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="background:#f97316;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function truckIcon(patent: string) {
  const label = patent.slice(-4);
  return L.divIcon({
    className: '',
    html: `<div style="background:#7c3aed;color:white;font-size:9px;font-weight:800;padding:2px 5px;border-radius:6px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap">${label}</div>`,
    iconSize: [40, 20],
    iconAnchor: [20, 10],
    popupAnchor: [0, -10],
  });
}

function volunteerIcon(photoUrl: string | null) {
  const inner = photoUrl
    ? `<img src="${photoUrl}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:3px solid #22c55e;box-shadow:0 2px 8px rgba(0,0,0,.3)" />`
    : `<div style="background:#22c55e;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`;
  return L.divIcon({
    className: '',
    html: inner,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function vehicleOffset(lat: number, lng: number, index: number, total: number): [number, number] {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  const radius = 0.0018 + (index % 3) * 0.0004;
  return [lat + Math.cos(angle) * radius, lng + Math.sin(angle) * radius];
}

function MapFitBounds({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [48, 48], maxZoom: 16 });
    }
  }, [bounds, map]);
  return null;
}

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.7 });
    }
  }, [target, map]);
  return null;
}

type LayersOn = {
  hydrants: boolean;
  meetingPoints: boolean;
  routes: boolean;
  incidents: boolean;
  companies: boolean;
  activeAlarms: boolean;
  volunteers: boolean;
  dispatchedVehicles: boolean;
};

const LAYER_CONFIG: {
  key: keyof LayersOn;
  label: string;
  icon: typeof Droplets;
  color: string;
  live?: boolean;
  soon?: boolean;
}[] = [
  { key: 'activeAlarms', label: 'Emergencias activas', icon: Siren, color: '#dc2626', live: true },
  { key: 'dispatchedVehicles', label: 'Carros despachados', icon: Truck, color: '#7c3aed', live: true },
  { key: 'volunteers', label: 'Voluntarios disp.', icon: UserCheck, color: '#22c55e', live: true },
  { key: 'companies', label: 'Cuarteles', icon: Building2, color: '#ef4444' },
  { key: 'hydrants', label: 'Hidrantes', icon: Droplets, color: '#0ea5e9' },
  { key: 'meetingPoints', label: 'Puntos encuentro', icon: Users, color: '#10b981' },
  { key: 'routes', label: 'Rutas evacuación', icon: Route, color: '#3b82f6' },
  { key: 'incidents', label: 'Historial emergencias', icon: ShieldAlert, color: '#f97316' },
];

const STAT_KEY: Partial<Record<keyof LayersOn, string>> = {
  meetingPoints: 'meetingPoints',
  activeAlarms: 'activeAlarms',
  volunteers: 'volunteersAvailable',
  dispatchedVehicles: 'activeAlarms',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

export default function OperationalMapPage() {
  const user = useAuthStore((s) => s.user);
  const { tokens: th, toggleTheme, isDark } = useOperationalMapTheme();
  const [baseLayer, setBaseLayer] = useState<BaseLayerKey>('streets');
  
  useEffect(() => {
    setBaseLayer(isDark ? 'dark' : 'streets');
  }, [isDark]);

  const [companyId, setCompanyId] = useState(user?.companyId ?? '');
  const [incidentDays, setIncidentDays] = useState('90');
  const [layers, setLayers] = useState<LayersOn>({
    activeAlarms: true,
    dispatchedVehicles: true,
    volunteers: true,
    hydrants: true,
    meetingPoints: true,
    routes: false,
    incidents: true,
    companies: true,
  });
  const [selected, setSelected] = useState<{ type: string; data: any } | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    const id = 'operational-map-pulse';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes om-alarm-pulse {
        0% { transform: scale(1); opacity: 0.55; }
        100% { transform: scale(2.1); opacity: 0; }
      }
      .om-alarm-ring { animation: om-alarm-pulse 1.6s ease-out infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['operational-map', companyId, incidentDays],
    queryFn: () =>
      api
        .get('/operational-map', {
          params: {
            ...(companyId ? { companyId } : {}),
            incidentDays,
          },
        })
        .then((r) => r.data),
    refetchInterval: (query) => {
      const alarms = query.state.data?.live?.activeAlarms?.length
        ?? query.state.data?.layers?.activeAlarms?.length
        ?? 0;
      return alarms > 0 ? LIVE_POLL_URGENT : LIVE_POLL_IDLE;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    return subscribeAnyDispatchLive(() => { void refetch(); });
  }, [refetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    const onFocus = () => { void refetch(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refetch]);

  const center = useMemo<[number, number]>(() => {
    if (data?.center) return data.center as [number, number];
    return DEFAULT_CENTER;
  }, [data?.center]);

  const liveAlarms = data?.live?.activeAlarms ?? data?.layers?.activeAlarms ?? [];
  const liveVolunteers = data?.live?.volunteers ?? data?.layers?.volunteers ?? [];
  const pollMs = liveAlarms.length > 0 ? LIVE_POLL_URGENT : LIVE_POLL_IDLE;

  const toggleLayer = (key: keyof LayersOn) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const focusOnMap = (lat: number, lng: number, type: string, item: any) => {
    setSelected({ type, data: item });
    setFlyTarget([lat, lng]);
  };

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] min-h-[520px] -m-4 sm:-m-6 transition-colors ${th.page}`}>
      <header className={`shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b ${th.header}`}>
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-0.5">Operaciones</p>
          <h1 className={`text-xl font-bold flex items-center gap-2 flex-wrap ${th.headerTitle}`}>
            <Map className="w-6 h-6 text-red-500" />
            Mapa operativo 360
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${th.badgeLive}`}>
              <Radio className="w-3 h-3 animate-pulse" />
              En vivo
            </span>
          </h1>
          <p className={`text-xs mt-0.5 ${th.headerSub}`}>
            Emergencias activas · voluntarios · carros despachados · actualización cada {pollMs / 1000}s
            {lastUpdate !== '—' && ` · ${lastUpdate}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={companyId}
            onChange={(e) => { setCompanyId(e.target.value); setSelected(null); }}
            className={`rounded-xl px-3 py-2 text-sm min-w-[180px] border ${th.select}`}
          >
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
          <select
            value={incidentDays}
            onChange={(e) => setIncidentDays(e.target.value)}
            className={`rounded-xl px-3 py-2 text-sm border ${th.select}`}
          >
            <option value="30">Historial 30 días</option>
            <option value="90">Historial 90 días</option>
            <option value="180">Historial 180 días</option>
            <option value="365">Historial 1 año</option>
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors ${th.btnGhost}`}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/despacho360"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Siren className="w-4 h-4" />
            Central
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border disabled:opacity-50 ${th.btnGhost}`}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside className={`shrink-0 lg:w-80 border-b lg:border-b-0 lg:border-r p-4 space-y-4 overflow-y-auto max-h-[45vh] lg:max-h-none ${th.aside}`}>
          <LiveAlarmsPanel
            th={th}
            alarms={liveAlarms}
            dataUpdatedAt={dataUpdatedAt}
            onFocus={focusOnMap}
          />

          <div className={`rounded-xl border p-3 ${th.soonBanner}`}>
            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Navigation className="w-3.5 h-3.5" />
              GPS en carros — próximamente
            </p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Hoy se muestran junto a la emergencia los carros despachados. En una próxima versión verás su recorrido en vivo sobre el mapa.
            </p>
          </div>

          <VolunteersPanel th={th} volunteers={liveVolunteers} onFocus={focusOnMap} />

          <BaseLayerPicker th={th} baseLayer={baseLayer} setBaseLayer={setBaseLayer} />

          <LayersPanel th={th} layers={layers} data={data} onToggle={toggleLayer} />

          {data?.stats && (
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-2 border text-center ${th.statCardAlarm}`}>
                <p className="text-lg font-bold">{data.stats.activeAlarms ?? 0}</p>
                <p className={`text-[10px] ${th.headerSub}`}>Activas ahora</p>
              </div>
              <div className={`rounded-xl p-2 border text-center ${th.statCardVolunteer}`}>
                <p className="text-lg font-bold">{data.stats.volunteersAvailable ?? 0}</p>
                <p className={`text-[10px] ${th.headerSub}`}>En cuartel</p>
              </div>
            </div>
          )}

          {selected && (
            <DetailPanel th={th} selected={selected} fmt={fmt} />
          )}
        </aside>

        <div className="flex-1 relative min-h-[400px]">
          {isLoading ? (
            <div className={`absolute inset-0 flex items-center justify-center ${th.loading}`}>
              <RefreshCw className="w-8 h-8 animate-spin mr-2" /> Cargando mapa...
            </div>
          ) : (
            <MapContainer
              key={`${center[0]}-${center[1]}-${companyId}-${isDark ? 'd' : 'l'}`}
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer attribution={BASE_LAYERS[baseLayer].attribution} url={BASE_LAYERS[baseLayer].url} />
              <MapFitBounds bounds={data?.bounds ?? null} />
              <MapFlyTo target={flyTarget} />

              {layers.companies &&
                data?.layers?.companies?.map((c: any) => (
                  <Marker
                    key={`c-${c.id}`}
                    position={[c.lat, c.lng]}
                    icon={divIcon('#ef4444', 'square')}
                    eventHandlers={{ click: () => setSelected({ type: 'company', data: c }) }}
                  >
                    <Popup>
                      <strong>{c.number}ª {c.name}</strong>
                      <p className="text-xs mt-1">{c.address}</p>
                    </Popup>
                  </Marker>
                ))}

              {layers.routes &&
                data?.layers?.routes?.map((r: any) => (
                  <Polyline
                    key={`r-${r.id}`}
                    positions={r.path.map((p: { lat: number; lng: number }) => [p.lat, p.lng])}
                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.75, dashArray: '8 6' }}
                    eventHandlers={{ click: () => setSelected({ type: 'route', data: r }) }}
                  />
                ))}

              {layers.hydrants &&
                data?.layers?.hydrants?.map((h: any) => {
                  const col = HYDRANT_STATUS[h.status]?.color ?? '#0ea5e9';
                  return (
                    <Marker
                      key={`h-${h.id}`}
                      position={[h.lat, h.lng]}
                      icon={divIcon(col)}
                      eventHandlers={{ click: () => setSelected({ type: 'hydrant', data: h }) }}
                    >
                      <Popup>
                        <strong>{h.code}</strong>
                        <p className="text-xs">{h.address}</p>
                      </Popup>
                    </Marker>
                  );
                })}

              {layers.meetingPoints &&
                data?.layers?.meetingPoints?.map((p: any) => (
                  <Marker
                    key={`m-${p.id}`}
                    position={[p.lat, p.lng]}
                    icon={divIcon('#10b981', 'diamond')}
                    eventHandlers={{ click: () => setSelected({ type: 'meeting', data: p }) }}
                  >
                    <Popup>
                      <strong>{p.name}</strong>
                      {p.capacity && <p className="text-xs">Capacidad: {p.capacity}</p>}
                    </Popup>
                  </Marker>
                ))}

              {layers.incidents &&
                data?.layers?.incidents?.map((i: any) => (
                  <Marker
                    key={`i-${i.id}`}
                    position={[i.lat, i.lng]}
                    icon={divIcon(i.isOpen ? '#f97316' : '#94a3b8', 'square')}
                    eventHandlers={{ click: () => setSelected({ type: 'incident', data: i }) }}
                  >
                    <Popup>
                      <strong>{i.code}</strong>
                      <p className="text-xs">{i.type}</p>
                      <p className="text-xs">{i.isOpen ? 'Abierta' : 'Cerrada'}</p>
                    </Popup>
                  </Marker>
                ))}

              {layers.activeAlarms &&
                liveAlarms.map((a: any) => (
                  <Marker
                    key={`live-${a.id}`}
                    position={[a.lat, a.lng]}
                    icon={alarmIcon(a.approximate, a.hasFieldGps)}
                    zIndexOffset={1000}
                    eventHandlers={{ click: () => setSelected({ type: 'alarm', data: a }) }}
                  >
                    <Popup>
                      <strong className={a.hasFieldGps ? 'text-green-600' : 'text-red-600'}>{a.code} — ACTIVA</strong>
                      <p className="text-xs font-medium">{a.type}</p>
                      <p className="text-xs">{a.address}</p>
                      {a.hasFieldGps && (
                        <p className="text-xs text-green-600 font-semibold">GPS confirmado en terreno</p>
                      )}
                      {a.approximate && (
                        <p className="text-xs text-amber-600">Ubicación aproximada (sin GPS)</p>
                      )}
                      {a.vehicles?.length > 0 && (
                        <p className="text-xs mt-1">
                          Carros: {a.vehicles.map((v: any) => v.patent).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Por: {a.alarmBy}</p>
                    </Popup>
                  </Marker>
                ))}

              {layers.activeAlarms &&
                liveAlarms.map((a: any) => {
                  if (a.dispatchLat == null || a.dispatchLng == null || !a.hasFieldGps) return null;
                  const same =
                    Math.abs(a.dispatchLat - a.lat) < 0.00005 &&
                    Math.abs(a.dispatchLng - a.lng) < 0.00005;
                  if (same) return null;
                  return (
                    <Marker
                      key={`dispatch-pin-${a.id}`}
                      position={[a.dispatchLat, a.dispatchLng]}
                      icon={dispatchPinIcon()}
                      zIndexOffset={950}
                    >
                      <Popup>
                        <strong className="text-orange-600">Punto de despacho</strong>
                        <p className="text-xs">{a.code}</p>
                        <p className="text-[10px] text-gray-500">Ubicación inicial en central</p>
                      </Popup>
                    </Marker>
                  );
                })}

              {layers.dispatchedVehicles &&
                liveAlarms.flatMap((a: any) =>
                  (a.vehicles ?? []).map((v: any, idx: number) => {
                    const [vLat, vLng] = vehicleOffset(a.lat, a.lng, idx, a.vehicles.length);
                    return (
                      <Marker
                        key={`veh-${a.id}-${v.patent}`}
                        position={[vLat, vLng]}
                        icon={truckIcon(v.patent)}
                        zIndexOffset={900}
                        eventHandlers={{ click: () => setSelected({ type: 'vehicle', data: { ...v, alarm: a } }) }}
                      >
                        <Popup>
                          <strong>{v.patent}</strong>
                          <p className="text-xs">{v.type}</p>
                          <p className="text-xs text-gray-500">Emergencia {a.code}</p>
                          <p className="text-[10px] text-violet-600 mt-1">Posición junto al despacho · GPS en vivo próximamente</p>
                        </Popup>
                      </Marker>
                    );
                  }),
                )}

              {layers.volunteers &&
                liveVolunteers.map((v: any) => (
                  <Marker
                    key={`v-${v.id}`}
                    position={[v.lat, v.lng]}
                    icon={volunteerIcon(v.photoUrl)}
                    eventHandlers={{ click: () => setSelected({ type: 'volunteer', data: v }) }}
                  >
                    <Popup>
                      <strong>{v.firstName} {v.lastName}</strong>
                      <p className="text-xs">{v.roleLabel}</p>
                      <p className="text-xs text-gray-500">{v.nearCompany}</p>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          )}

          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
            <div className={`rounded-xl px-3 py-2 text-[10px] flex items-center gap-1.5 border pointer-events-auto ${th.overlayLive}`}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {liveAlarms.length} activa{liveAlarms.length !== 1 ? 's' : ''} · {liveVolunteers.length} disp.
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none">
            <div className={`rounded-xl px-3 py-2 text-[10px] flex items-center gap-1 border pointer-events-auto ${th.overlayStats}`}>
              <Maximize2 className="w-3 h-3" />
              {data?.stats
                ? `${(data.stats.activeAlarms ?? 0) + (data.stats.volunteersAvailable ?? 0) + data.stats.hydrants + data.stats.meetingPoints} puntos`
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveAlarmsPanel({
  th,
  alarms,
  dataUpdatedAt,
  onFocus,
}: {
  th: OperationalMapThemeTokens;
  alarms: any[];
  dataUpdatedAt: number;
  onFocus: (lat: number, lng: number, type: string, item: any) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${th.panelAlarm}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1.5">
          <Siren className="w-3.5 h-3.5" />
          Emergencias activas ({alarms.length})
        </p>
        <span className={`text-[10px] ${th.headerSub}`}>
          {dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : '—'}
        </span>
      </div>
      {alarms.length === 0 ? (
        <p className={`text-xs py-2 ${th.headerSub}`}>Sin emergencias abiertas en este momento.</p>
      ) : (
        <ul className="space-y-1.5 max-h-44 overflow-y-auto">
          {alarms.map((a: any) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onFocus(a.lat, a.lng, 'alarm', a)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${th.alarmItem}`}
              >
                <p className={`text-sm font-bold flex items-center gap-1.5 ${th.textPrimary}`}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  {a.code}
                  {a.approximate && (
                    <span className="text-[9px] font-semibold text-amber-600 normal-case">~GPS</span>
                  )}
                </p>
                <p className={`text-[11px] truncate ${th.textMuted}`}>{a.type} · {a.address}</p>
                {a.vehicles?.length > 0 && (
                  <p className="text-[10px] text-violet-600 truncate">
                    {a.vehicles.map((v: any) => v.patent).join(' · ')}
                  </p>
                )}
                <p className={`text-[10px] ${th.headerSub}`}>{a.alarmBy} · {timeAgo(a.dispatchedAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VolunteersPanel({
  th,
  volunteers,
  onFocus,
}: {
  th: OperationalMapThemeTokens;
  volunteers: any[];
  onFocus: (lat: number, lng: number, type: string, item: any) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${th.panelVolunteer}`}>
      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5" />
        Voluntarios en cuartel ({volunteers.length})
      </p>
      {volunteers.length === 0 ? (
        <p className={`text-xs py-2 ${th.headerSub}`}>Nadie marcado como disponible en cuartel.</p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {volunteers.map((v: any) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onFocus(v.lat, v.lng, 'volunteer', v)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${th.volunteerItem}`}
              >
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500/60 shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                    {v.firstName[0]}{v.lastName[0]}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium truncate ${th.textPrimary}`}>{v.firstName} {v.lastName}</span>
                  <span className={`block text-[10px] truncate ${th.headerSub}`}>{v.roleLabel} · {v.nearCompany}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LayersPanel({
  th,
  layers,
  data,
  onToggle,
}: {
  th: OperationalMapThemeTokens;
  layers: LayersOn;
  data: any;
  onToggle: (key: keyof LayersOn) => void;
}) {
  return (
    <div>
      <p className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 mb-2 ${th.panelLayers}`}>
        <Layers className="w-3.5 h-3.5" /> Capas
      </p>
      <div className="space-y-1.5">
        {LAYER_CONFIG.map((layer) => {
          const Icon = layer.icon;
          const on = layers[layer.key];
          const statKey = STAT_KEY[layer.key] ?? layer.key;
          const count = data?.stats?.[statKey] ?? 0;
          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => onToggle(layer.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                on ? th.layerBtnOn : th.layerBtnOff
              }`}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: on ? layer.color : '#94a3b8' }} />
              <Icon className="w-4 h-4 shrink-0" style={{ color: on ? layer.color : undefined }} />
              <span className="flex-1 text-left">{layer.label}</span>
              {layer.live && on && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className={`text-xs ${th.headerSub}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  th,
  selected,
  fmt,
}: {
  th: OperationalMapThemeTokens;
  selected: { type: string; data: any };
  fmt: (d: string) => string;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${th.panelDetail}`}>
      <p className="text-[10px] font-bold text-red-500 uppercase">{selected.type}</p>
      {selected.type === 'alarm' && (
        <>
          <p className={`font-bold flex items-center gap-2 ${th.textPrimary}`}>
            <Siren className="w-4 h-4 text-red-500" />
            {selected.data.code}
          </p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.type}</p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.address}</p>
          {selected.data.approximate && (
            <p className="text-xs text-amber-600">Sin GPS — posición aproximada del cuartel</p>
          )}
          {selected.data.radioMessage && (
            <p className="text-xs font-mono bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg px-2 py-1.5 text-red-800">
              {selected.data.radioMessage}
            </p>
          )}
          <p className={`text-xs ${th.headerSub}`}>Alarma: {selected.data.alarmBy}</p>
          <p className={`text-xs ${th.headerSub}`}>{fmt(selected.data.dispatchedAt)}</p>
          {selected.data.vehicles?.length > 0 && (
            <p className="text-xs text-violet-600">
              Carros: {selected.data.vehicles.map((v: any) => v.patent).join(', ')}
            </p>
          )}
          <Link to="/despacho360" className="text-xs text-red-500 flex items-center gap-1">
            Ir a central <ChevronRight className="w-3 h-3" />
          </Link>
        </>
      )}
      {selected.type === 'vehicle' && (
        <>
          <p className={`font-bold flex items-center gap-2 ${th.textPrimary}`}>
            <Truck className="w-4 h-4 text-violet-600" />
            {selected.data.patent}
          </p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.type}</p>
          <p className={`text-xs ${th.textMuted}`}>Emergencia {selected.data.alarm?.code}</p>
          <p className="text-[10px] text-violet-600">Seguimiento GPS en vivo — próximamente</p>
        </>
      )}
      {selected.type === 'volunteer' && (
        <>
          <div className="flex items-center gap-2">
            {selected.data.photoUrl ? (
              <img src={selected.data.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                {selected.data.firstName[0]}{selected.data.lastName[0]}
              </span>
            )}
            <div>
              <p className={`font-bold ${th.textPrimary}`}>{selected.data.firstName} {selected.data.lastName}</p>
              <p className={`text-xs ${th.textMuted}`}>{selected.data.roleLabel}</p>
            </div>
          </div>
          <p className={`text-xs ${th.headerSub}`}>{selected.data.nearCompany}</p>
        </>
      )}
      {selected.type === 'hydrant' && (
        <>
          <p className={`font-bold ${th.textPrimary}`}>{selected.data.code}</p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.address}</p>
          <Link to="/hydrants" className="text-xs text-red-500 flex items-center gap-1">Ver hidrantes <ChevronRight className="w-3 h-3" /></Link>
        </>
      )}
      {selected.type === 'meeting' && (
        <>
          <p className={`font-bold ${th.textPrimary}`}>{selected.data.name}</p>
          <Link to="/evacuation" className="text-xs text-red-500 flex items-center gap-1">Ver evacuación <ChevronRight className="w-3 h-3" /></Link>
        </>
      )}
      {selected.type === 'route' && (
        <>
          <p className={`font-bold ${th.textPrimary}`}>{selected.data.name}</p>
          <Link to="/evacuation" className="text-xs text-red-500 flex items-center gap-1">Ver rutas <ChevronRight className="w-3 h-3" /></Link>
        </>
      )}
      {selected.type === 'incident' && (
        <>
          <p className={`font-bold ${th.textPrimary}`}>{selected.data.code}</p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.type}</p>
          <Link to="/incidents" className="text-xs text-red-500 flex items-center gap-1">Ver emergencias <ChevronRight className="w-3 h-3" /></Link>
        </>
      )}
      {selected.type === 'company' && (
        <>
          <p className={`font-bold ${th.textPrimary}`}>{selected.data.number}ª {selected.data.name}</p>
          <p className={`text-xs ${th.textMuted}`}>{selected.data.address}</p>
          <Link to="/nodo360" className="text-xs text-red-500 flex items-center gap-1">Panel NODO360 <ChevronRight className="w-3 h-3" /></Link>
        </>
      )}
    </div>
  );
}

export function BaseLayerPicker({
  th,
  baseLayer,
  setBaseLayer,
}: {
  th: OperationalMapThemeTokens;
  baseLayer: BaseLayerKey;
  setBaseLayer: (key: BaseLayerKey) => void;
}) {
  return (
    <div className="mb-4">
      <p className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 mb-2 ${th.panelLayers}`}>
        <Layers className="w-3.5 h-3.5" /> Mapa base
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(BASE_LAYERS) as BaseLayerKey[]).map(key => {
          const cfg = BASE_LAYERS[key];
          const Icon = cfg.icon;
          const on = baseLayer === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setBaseLayer(key)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] font-bold border transition-colors ${
                on 
                  ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300' 
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
