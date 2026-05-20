import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Map, Layers, Building2, Droplets, Users, Route, ShieldAlert,
  Maximize2, RefreshCw, ChevronRight, MapPin,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const DEFAULT_CENTER: [number, number] = [-35.6632, -71.4392];

const HYDRANT_STATUS: Record<string, { label: string; color: string }> = {
  OPERATIVO: { label: 'Operativo', color: '#0ea5e9' },
  NO_OPERATIVO: { label: 'No operativo', color: '#ef4444' },
  EN_MANTENCION: { label: 'En mantención', color: '#f59e0b' },
};

function divIcon(color: string, shape: 'circle' | 'square' | 'diamond' = 'circle') {
  const radius = shape === 'circle' ? '50%' : shape === 'square' ? '4px' : '4px';
  const transform = shape === 'diamond' ? 'rotate(45deg)' : 'none';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:${radius};transform:${transform};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
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

type LayersOn = {
  hydrants: boolean;
  meetingPoints: boolean;
  routes: boolean;
  incidents: boolean;
  companies: boolean;
};

const LAYER_CONFIG: { key: keyof LayersOn; label: string; icon: typeof Droplets; color: string }[] = [
  { key: 'companies', label: 'Cuarteles', icon: Building2, color: '#ef4444' },
  { key: 'hydrants', label: 'Hidrantes', icon: Droplets, color: '#0ea5e9' },
  { key: 'meetingPoints', label: 'Puntos encuentro', icon: Users, color: '#10b981' },
  { key: 'routes', label: 'Rutas evacuación', icon: Route, color: '#3b82f6' },
  { key: 'incidents', label: 'Emergencias', icon: ShieldAlert, color: '#f97316' },
];

export default function OperationalMapPage() {
  const user = useAuthStore(s => s.user);
  const [companyId, setCompanyId] = useState(user?.companyId ?? '');
  const [incidentDays, setIncidentDays] = useState('90');
  const [layers, setLayers] = useState<LayersOn>({
    hydrants: true,
    meetingPoints: true,
    routes: true,
    incidents: true,
    companies: true,
  });
  const [selected, setSelected] = useState<{ type: string; data: any } | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['operational-map', companyId, incidentDays],
    queryFn: () =>
      api
        .get('/operational-map', {
          params: {
            ...(companyId ? { companyId } : {}),
            incidentDays,
          },
        })
        .then(r => r.data),
  });

  const center = useMemo<[number, number]>(() => {
    if (data?.center) return data.center as [number, number];
    return DEFAULT_CENTER;
  }, [data?.center]);

  const toggleLayer = (key: keyof LayersOn) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-[520px] -m-4 sm:-m-6">
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-0.5">Operaciones</p>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-red-400" />
            Mapa operativo 360
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Vista unificada: cuarteles, hidrantes, evacuación y emergencias
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={companyId}
            onChange={e => { setCompanyId(e.target.value); setSelected(null); }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 min-w-[180px]"
          >
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
          <select
            value={incidentDays}
            onChange={e => setIncidentDays(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
          >
            <option value="30">Emergencias 30 días</option>
            <option value="90">Emergencias 90 días</option>
            <option value="180">Emergencias 180 días</option>
            <option value="365">Emergencias 1 año</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside className="shrink-0 lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Layers className="w-3.5 h-3.5" /> Capas
            </p>
            <div className="space-y-1.5">
              {LAYER_CONFIG.map(layer => {
                const Icon = layer.icon;
                const on = layers[layer.key];
                const count = data?.stats?.[layer.key === 'meetingPoints' ? 'meetingPoints' : layer.key] ?? 0;
                return (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => toggleLayer(layer.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                      on ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: on ? layer.color : '#475569' }} />
                    <Icon className="w-4 h-4 shrink-0" style={{ color: on ? layer.color : undefined }} />
                    <span className="flex-1 text-left">{layer.label}</span>
                    <span className="text-xs text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {data?.stats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 text-center">
                <p className="text-lg font-bold text-white">{data.stats.incidentsOpen}</p>
                <p className="text-[10px] text-slate-500">Emerg. abiertas</p>
              </div>
              <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 text-center">
                <p className="text-lg font-bold text-white">{data.stats.hydrants}</p>
                <p className="text-[10px] text-slate-500">Hidrantes</p>
              </div>
            </div>
          )}

          {selected && (
            <div className="bg-slate-950 border border-red-600/30 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-red-400 uppercase">{selected.type}</p>
              {selected.type === 'hydrant' && (
                <>
                  <p className="font-bold text-white">{selected.data.code}</p>
                  <p className="text-xs text-slate-400">{selected.data.address}</p>
                  <p className="text-xs text-slate-500">{HYDRANT_STATUS[selected.data.status]?.label}</p>
                  <Link to="/hydrants" className="text-xs text-red-400 flex items-center gap-1">Ver hidrantes <ChevronRight className="w-3 h-3" /></Link>
                </>
              )}
              {selected.type === 'meeting' && (
                <>
                  <p className="font-bold text-white">{selected.data.name}</p>
                  {selected.data.address && <p className="text-xs text-slate-400">{selected.data.address}</p>}
                  <Link to="/evacuation" className="text-xs text-red-400 flex items-center gap-1">Ver evacuación <ChevronRight className="w-3 h-3" /></Link>
                </>
              )}
              {selected.type === 'route' && (
                <>
                  <p className="font-bold text-white">{selected.data.name}</p>
                  <Link to="/evacuation" className="text-xs text-red-400 flex items-center gap-1">Ver rutas <ChevronRight className="w-3 h-3" /></Link>
                </>
              )}
              {selected.type === 'incident' && (
                <>
                  <p className="font-bold text-white">{selected.data.code}</p>
                  <p className="text-xs text-slate-400">{selected.data.type}</p>
                  <p className="text-xs text-slate-500">{fmt(selected.data.dispatchedAt)}</p>
                  <Link to="/incidents" className="text-xs text-red-400 flex items-center gap-1">Ver emergencias <ChevronRight className="w-3 h-3" /></Link>
                </>
              )}
              {selected.type === 'company' && (
                <>
                  <p className="font-bold text-white">{selected.data.number}ª {selected.data.name}</p>
                  <p className="text-xs text-slate-400">{selected.data.address}</p>
                  {selected.data.approximate && (
                    <p className="text-[10px] text-amber-500/90">Ubicación aproximada por ciudad</p>
                  )}
                  <Link to="/nodo360" className="text-xs text-red-400 flex items-center gap-1">Panel NODO360 <ChevronRight className="w-3 h-3" /></Link>
                </>
              )}
            </div>
          )}
        </aside>

        <div className="flex-1 relative min-h-[400px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mr-2" /> Cargando mapa...
            </div>
          ) : (
            <MapContainer
              key={`${center[0]}-${center[1]}-${companyId}`}
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFitBounds bounds={data?.bounds ?? null} />

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
                    icon={divIcon(i.isOpen ? '#ef4444' : '#94a3b8', 'square')}
                    eventHandlers={{ click: () => setSelected({ type: 'incident', data: i }) }}
                  >
                    <Popup>
                      <strong>{i.code}</strong>
                      <p className="text-xs">{i.type}</p>
                      <p className="text-xs">{i.isOpen ? 'Abierta' : 'Cerrada'}</p>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          )}

          <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
            <div className="bg-slate-950/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-2 text-[10px] text-slate-400 flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              {data?.stats
                ? `${data.stats.hydrants + data.stats.meetingPoints + data.stats.incidents} puntos en mapa`
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
