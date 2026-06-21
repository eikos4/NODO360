import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Droplets, MapPin, Filter, X,
  Map, List, Layers, Maximize2, Satellite, Moon, Mountain, Crosshair, Sun,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useHydrantsTheme } from '../hooks/useHydrantsTheme';
import type { HydrantsThemeTokens, StatusKey, StatusStyle } from '../lib/hydrants-theme';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TYPE_LABELS: Record<string, string> = {
  PIBA: 'Piba',
  COLUMNAR: 'Columnar',
  SUBTERRANEO: 'Subterráneo',
  OTRO: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  OPERATIVO: 'Operativo',
  NO_OPERATIVO: 'No operativo',
  EN_MANTENCION: 'En mantención',
};

const TYPE_MARKER_SHAPE: Record<string, string> = {
  PIBA: '12px',
  COLUMNAR: '50%',
  SUBTERRANEO: '4px',
  OTRO: '50%',
};

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

const DEFAULT_CENTER: [number, number] = [-35.6632, -71.4392];

const DROPLET_SVG = (color: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`;

function createHydrantIcon(type: string, status: string, statusColors: Record<StatusKey, StatusStyle>) {
  const color = statusColors[status as StatusKey]?.markerColor ?? '#0ea5e9';
  const borderRadius = TYPE_MARKER_SHAPE[type] ?? '50%';
  const size = type === 'PIBA' ? 26 : 28;
  return L.divIcon({
    className: 'hydrant-map-icon',
    html: `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:${size}px;height:${size}px;
        background:linear-gradient(145deg, ${color} 0%, ${color}dd 100%);
        border-radius:${borderRadius};
        border:3px solid white;
        box-shadow:0 3px 12px rgba(0,0,0,0.45);
        transform:translate(-50%,-50%);
      ">${DROPLET_SVG('#ffffff', type === 'PIBA' ? 14 : 16)}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [56, 56], maxZoom: 17 });
    }
  }, [points, map]);
  return null;
}

function MapRecenter({ center, zoom = 15 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);
  return null;
}

function MapClickPicker({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DraftLocationMarker({
  latitude,
  longitude,
  type,
  status,
  statusColors,
}: {
  latitude: string;
  longitude: string;
  type: string;
  status: string;
  statusColors: Record<StatusKey, StatusStyle>;
}) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return (
    <Marker
      position={[lat, lng]}
      icon={createHydrantIcon(type, status, statusColors)}
      zIndexOffset={1000}
    />
  );
}

type LocationPickerMapProps = {
  center: [number, number];
  pickOnMap: boolean;
  onPick: (lat: number, lng: number) => void;
  form: typeof EMPTY;
  hydrantsOnMap: { id: string; latitude: number; longitude: number; type: string; status: string }[];
  th: HydrantsThemeTokens;
  statusColors: Record<StatusKey, StatusStyle>;
};

function LocationPickerMap({ center, pickOnMap, onPick, form, hydrantsOnMap, th, statusColors }: LocationPickerMapProps) {
  return (
    <div className={`relative rounded-xl overflow-hidden border h-[min(380px,55vh)] ${th.mapPickerWrap}`}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        className={`z-0 ${pickOnMap ? 'cursor-crosshair' : ''}`}
      >
        <TileLayer
          attribution={BASE_LAYERS.streets.attribution}
          url={th.pickerMapTile}
        />
        <MapRecenter center={center} />
        <MapClickPicker active={pickOnMap} onPick={onPick} />
        <DraftLocationMarker
          latitude={form.latitude}
          longitude={form.longitude}
          type={form.type}
          status={form.status}
          statusColors={statusColors}
        />
        {hydrantsOnMap.map(h => (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={createHydrantIcon(h.type, h.status, statusColors)}
            opacity={0.45}
          />
        ))}
      </MapContainer>
      {pickOnMap && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <span className="bg-sky-600 !text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
            Clic en el mapa para marcar el hidrante
          </span>
        </div>
      )}
      {form.latitude && form.longitude && !pickOnMap && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-emerald-600/90 !text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">
          Ubicación definida
        </div>
      )}
    </div>
  );
}

const EMPTY = {
  code: '',
  type: 'COLUMNAR',
  status: 'OPERATIVO',
  diameter: '',
  pressure: '',
  flowRate: '',
  address: '',
  location: '',
  latitude: '',
  longitude: '',
  notes: '',
  companyId: '',
};

export default function HydrantsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const { tokens: th, toggleTheme, isDark, statusColors } = useHydrantsTheme();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [editing, setEditing] = useState<any>(null);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKey>(th.defaultMapTile as BaseLayerKey);
  const [statusLayers, setStatusLayers] = useState<Record<StatusKey, boolean>>({
    OPERATIVO: true,
    NO_OPERATIVO: true,
    EN_MANTENCION: true,
  });
  const [pickOnMap, setPickOnMap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => {
    setBaseLayer(th.defaultMapTile as BaseLayerKey);
  }, [th.defaultMapTile]);

  const { data: hydrants, isLoading } = useQuery({
    queryKey: ['hydrants', filterType, filterStatus],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      return api.get('/hydrants', { params }).then(r => r.data);
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const filteredForMap = useMemo(() => {
    if (!hydrants) return [];
    return hydrants.filter((h: any) => {
      if (companyFilter && h.companyId !== companyFilter) return false;
      if (!statusLayers[h.status as StatusKey]) return false;
      return h.latitude != null && h.longitude != null;
    });
  }, [hydrants, companyFilter, statusLayers]);

  const withoutCoords = useMemo(
    () => (hydrants ?? []).filter((h: any) => !h.latitude || !h.longitude),
    [hydrants],
  );

  const mapPoints = useMemo(
    () => filteredForMap.map((h: any) => [h.latitude, h.longitude] as [number, number]),
    [filteredForMap],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (mapPoints.length) {
      const lat = mapPoints.reduce((s, p) => s + p[0], 0) / mapPoints.length;
      const lng = mapPoints.reduce((s, p) => s + p[1], 0) / mapPoints.length;
      return [lat, lng];
    }
    return DEFAULT_CENTER;
  }, [mapPoints]);

  const create = useMutation({
    mutationFn: (d: unknown) => api.post('/hydrants', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hydrants'] }); toast.success('Hidrante creado'); reset(); },
    onError: () => toast.error('Error al crear hidrante'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.put(`/hydrants/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hydrants'] }); toast.success('Hidrante actualizado'); reset(); },
    onError: () => toast.error('Error al actualizar hidrante'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/hydrants/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hydrants'] }); toast.success('Hidrante eliminado'); },
    onError: () => toast.error('Error al eliminar hidrante'),
  });

  const reset = () => { setShowForm(false); setForm(EMPTY); setEditing(null); setPickOnMap(false); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: typeof EMPTY) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      toast.error('Selecciona la ubicación en el mapa antes de guardar');
      setPickOnMap(true);
      return;
    }
    const payload = {
      ...form,
      diameter: form.diameter ? Number(form.diameter) : undefined,
      pressure: form.pressure ? Number(form.pressure) : undefined,
      flowRate: form.flowRate ? Number(form.flowRate) : undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    };
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload);
  };

  const openEdit = (h: { id: string; code: string; type: string; status: string; diameter?: number; pressure?: number; flowRate?: number; address: string; location?: string; latitude?: number; longitude?: number; notes?: string; companyId: string }) => {
    setEditing(h);
    setSelectedId(h.id);
    setForm({
      code: h.code,
      type: h.type,
      status: h.status,
      diameter: h.diameter ?? '',
      pressure: h.pressure ?? '',
      flowRate: h.flowRate ?? '',
      address: h.address,
      location: h.location ?? '',
      latitude: h.latitude ?? '',
      longitude: h.longitude ?? '',
      notes: h.notes ?? '',
      companyId: h.companyId,
    });
    setShowForm(true);
    setViewMode('map');
    setPickOnMap(false);
  };

  const onMapPick = useCallback((lat: number, lng: number) => {
    setForm((f: typeof EMPTY) => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    toast.success('Ubicación seleccionada en el mapa');
  }, []);

  const openNewHydrant = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      companyId: companyFilter || user?.companyId || '',
    });
    setShowForm(true);
    setViewMode('map');
    setPickOnMap(true);
    setSelectedId(null);
  };

  const pickerCenter = useMemo<[number, number]>(() => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    return mapCenter;
  }, [form.latitude, form.longitude, mapCenter]);

  const toggleStatusLayer = (status: StatusKey) => {
    setStatusLayers(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const base = BASE_LAYERS[baseLayer];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl font-bold ${th.title}`}>Hidrantes y red de agua</h1>
          <p className={`text-sm mt-0.5 ${th.subtitle}`}>Inventario georreferenciado con mapa por capas e iconos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex border rounded-xl p-1 ${th.viewToggleWrap}`}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? th.viewToggleActive : th.viewToggleIdle}`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === 'map' ? th.viewToggleActive : th.viewToggleIdle}`}
            >
              <Map className="w-4 h-4" /> Mapa
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors ${th.themeBtn}`}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={openNewHydrant}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 !text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Nuevo hidrante
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className={`w-4 h-4 ${th.filterIcon}`} />
        <div className={`flex flex-wrap border rounded-xl p-1 gap-0.5 ${th.filterWrap}`}>
          {(['all', 'PIBA', 'COLUMNAR', 'SUBTERRANEO', 'OTRO'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterType === t ? th.filterTypeActive : th.filterTypeIdle}`}
            >
              {t === 'all' ? 'Tipo: todos' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className={`flex flex-wrap border rounded-xl p-1 gap-0.5 ${th.filterWrap}`}>
          {(['all', 'OPERATIVO', 'NO_OPERATIVO', 'EN_MANTENCION'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? th.filterStatusActive : th.filterStatusIdle}`}
            >
              {s === 'all' ? 'Estado: todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className={`border rounded-2xl overflow-hidden ${th.formCard}`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 p-4 border-b ${th.formHeader}`}>
            <div>
              <h2 className={`text-sm font-semibold ${th.formTitle}`}>{editing ? 'Editar hidrante' : 'Nuevo hidrante'}</h2>
              <p className={`text-xs mt-0.5 ${th.formSubtitle}`}>Haz clic en el mapa para fijar la ubicación (obligatorio)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickOnMap(!pickOnMap)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                  pickOnMap ? th.pickBtnOn : th.pickBtnOff
                }`}
              >
                <Crosshair className="w-4 h-4" />
                {pickOnMap ? 'Seleccionando…' : 'Seleccionar en mapa'}
              </button>
              <button type="button" onClick={reset} className={`p-2 rounded-lg ${th.closeBtn}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 xl:grid-cols-2 gap-0 xl:divide-x ${th.formDivider}`}>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Código</label>
                  <input value={form.code} onChange={set('code')} required className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Tipo</label>
                  <select value={form.type} onChange={set('type')} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Estado</label>
                  <select value={form.status} onChange={set('status')} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Compañía</label>
                  <select value={form.companyId} onChange={set('companyId')} required className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`}>
                    <option value="">Seleccionar...</option>
                    {companies?.map((c: { id: string; number: number; name: string }) => (
                      <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Latitud</label>
                  <input type="number" step="any" value={form.latitude} onChange={set('latitude')} readOnly={pickOnMap} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.inputReadonly}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Longitud</label>
                  <input type="number" step="any" value={form.longitude} onChange={set('longitude')} readOnly={pickOnMap} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.inputReadonly}`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Dirección</label>
                  <input value={form.address} onChange={set('address')} required className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-medium mb-1 ${th.label}`}>Ubicación (descripción)</label>
                  <input value={form.location} onChange={set('location')} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.input}`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" disabled={create.isPending || update.isPending} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 !text-white text-sm font-medium px-5 py-2 rounded-lg">
                  {editing ? 'Actualizar' : 'Crear hidrante'}
                </button>
                <button type="button" onClick={reset} className={`text-sm px-4 py-2 rounded-lg ${th.cancelBtn}`}>
                  Cancelar
                </button>
              </div>
            </form>

            <div className={`p-4 sm:p-6 ${th.mapPickerSide}`}>
              <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${th.label}`}>
                <MapPin className="w-3.5 h-3.5 text-sky-500" />
                Ubicación en mapa
              </p>
              <LocationPickerMap
                center={pickerCenter}
                pickOnMap={pickOnMap}
                onPick={onMapPick}
                form={form}
                hydrantsOnMap={filteredForMap}
                th={th}
                statusColors={statusColors}
              />
              <p className={`text-[10px] mt-2 ${th.mapPickerHint}`}>
                Los hidrantes existentes se muestran atenuados. El marcador resaltado es la nueva ubicación.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className={`text-sm ${th.loading}`}>Cargando hidrantes...</p>
      ) : !hydrants?.length && !showForm ? (
        <div className={`text-center py-16 border rounded-2xl ${th.empty}`}>
          <Droplets className={`w-12 h-12 mx-auto mb-3 ${th.emptyIcon}`} />
          <p className={th.emptyText}>Sin hidrantes registrados</p>
          <button
            type="button"
            onClick={openNewHydrant}
            className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 !text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Registrar primer hidrante
          </button>
        </div>
      ) : !hydrants?.length && showForm ? null : viewMode === 'map' ? (
        <div className={`flex flex-col lg:flex-row gap-0 min-h-[min(680px,75vh)] border rounded-2xl overflow-hidden ${th.mapShell}`}>
          <aside className={`lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r p-4 space-y-4 ${th.aside}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 mb-2 ${th.asideLabel}`}>
                <Layers className="w-3.5 h-3.5" /> Mapa base
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(BASE_LAYERS) as BaseLayerKey[]).map(key => {
                  const cfg = BASE_LAYERS[key];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBaseLayer(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold border transition-colors ${
                        baseLayer === key ? th.baseLayerOn : th.baseLayerOff
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${th.asideLabel}`}>Capa hidrantes (estado)</p>
              <div className="space-y-1">
                {(Object.keys(STATUS_LABELS) as StatusKey[]).map(status => {
                  const meta = statusColors[status];
                  const on = statusLayers[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatusLayer(status)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        on ? th.statusLayerOn : th.statusLayerOff
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md border-2 border-white shadow-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: on ? meta.markerColor : '#94a3b8', borderRadius: TYPE_MARKER_SHAPE.COLUMNAR }}
                      >
                        <Droplets className="w-3 h-3 !text-white" />
                      </span>
                      {STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${th.asideLabel}`}>Leyenda tipo</p>
              <div className={`space-y-1.5 text-[10px] ${th.legendText}`}>
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 border-2 border-white shadow-sm shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: '#0ea5e9', borderRadius: TYPE_MARKER_SHAPE[type] }}
                    >
                      <Droplets className="w-2.5 h-2.5 !text-white" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wide mb-1 block ${th.asideLabel}`}>Compañía en mapa</label>
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-xs ${th.select}`}
              >
                <option value="">Todas</option>
                {companies?.map((c: { id: string; number: number; name: string }) => (
                  <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
                ))}
              </select>
            </div>

            <p className={`text-[10px] ${th.statsText}`}>
              <Maximize2 className="w-3 h-3 inline mr-1" />
              {filteredForMap.length} en mapa · {withoutCoords.length} sin GPS
            </p>
          </aside>

          <div className="flex-1 relative min-h-[400px]">
            <MapContainer
              key={baseLayer}
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', minHeight: 'min(680px,75vh)', width: '100%' }}
              className={`z-0 ${pickOnMap ? 'cursor-crosshair' : ''}`}
            >
              <TileLayer attribution={base.attribution} url={base.url} />
              <MapFitBounds points={mapPoints} />
              <MapClickPicker active={pickOnMap} onPick={onMapPick} />

              {filteredForMap.map((h: { id: string; code: string; type: string; status: string; address: string; location?: string; diameter?: number; pressure?: number; flowRate?: number; latitude: number; longitude: number; company?: { number: number; name: string } }) => (
                <Marker
                  key={h.id}
                  position={[h.latitude, h.longitude]}
                  icon={createHydrantIcon(h.type, h.status, statusColors)}
                  eventHandlers={{
                    click: () => setSelectedId(h.id),
                  }}
                  opacity={selectedId && selectedId !== h.id ? 0.65 : 1}
                >
                  <Popup className="hydrant-popup">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-8 h-8 flex items-center justify-center border-2 border-white shadow"
                          style={{ backgroundColor: statusColors[h.status as StatusKey].markerColor, borderRadius: TYPE_MARKER_SHAPE[h.type] }}
                        >
                          <Droplets className="w-4 h-4 !text-white" />
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{h.code}</h3>
                          <p className="text-[10px] text-slate-600">{TYPE_LABELS[h.type]}</p>
                        </div>
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${statusColors[h.status as StatusKey].bg} ${statusColors[h.status as StatusKey].text}`}>
                        {STATUS_LABELS[h.status]}
                      </span>
                      <p className="text-xs text-slate-700 mb-1">{h.address}</p>
                      {h.location && <p className="text-[10px] text-slate-500 mb-2">{h.location}</p>}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {h.diameter && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Ø{h.diameter}mm</span>}
                        {h.pressure && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{h.pressure} PSI</span>}
                        {h.flowRate && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{h.flowRate} LPM</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">Cía. {h.company?.number} — {h.company?.name}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(h as Parameters<typeof openEdit>[0])} className="text-xs bg-sky-600 !text-white px-2.5 py-1 rounded-lg hover:bg-sky-700">
                          Editar
                        </button>
                        <button type="button" onClick={() => remove.mutate(h.id)} className="text-xs bg-red-600 !text-white px-2.5 py-1 rounded-lg hover:bg-red-700">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {pickOnMap && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-sky-600 !text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
                Haz clic en el mapa para ubicar el hidrante
              </div>
            )}
          </div>

          <aside className={`lg:w-56 shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto max-h-[280px] lg:max-h-none ${th.listAside}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wide px-3 py-2 border-b sticky top-0 ${th.listAsideHeader}`}>
              En mapa ({filteredForMap.length})
            </p>
            <ul className={`divide-y ${th.listDivider}`}>
              {filteredForMap.map((h: { id: string; code: string; status: string; type: string; address: string }) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(h.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${th.listItem} ${selectedId === h.id ? th.listItemActive : ''}`}
                  >
                    <span className={`font-bold ${th.listItemCode}`}>{h.code}</span>
                    <span className={`ml-1.5 text-[10px] ${statusColors[h.status as StatusKey].text}`}>{STATUS_LABELS[h.status]}</span>
                    <p className={`truncate mt-0.5 ${th.listItemAddr}`}>{h.address}</p>
                  </button>
                </li>
              ))}
            </ul>
            {withoutCoords.length > 0 && (
              <>
                <p className={`text-[10px] font-bold uppercase tracking-wide px-3 py-2 border-t ${th.noCoordsHeader}`}>
                  Sin coordenadas ({withoutCoords.length})
                </p>
                <ul className={`divide-y ${th.listDivider} opacity-70`}>
                  {withoutCoords.slice(0, 8).map((h: { id: string; code: string; address: string }) => (
                    <li key={h.id} className={`px-3 py-2 text-xs ${th.noCoordsItem}`}>
                      {h.code} — {h.address}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hydrants.map((h: { id: string; code: string; type: string; status: string; address: string; location?: string; diameter?: number; pressure?: number; flowRate?: number; latitude?: number; longitude?: number; company?: { number: number; name: string } }) => {
            const colors = statusColors[h.status as StatusKey];
            const StatusIcon = colors.icon;
            return (
              <div key={h.id} className={`border rounded-2xl overflow-hidden transition-all ${colors.border} ${th.card}`}>
                <div className={`${colors.bg} border-b px-4 py-3 flex items-start justify-between ${th.cardFooter}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors.border}`}>
                      <Droplets className="w-4 h-4" style={{ color: colors.markerColor }} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase ${th.cardTypeLabel}`}>{TYPE_LABELS[h.type]}</p>
                      <p className={`text-xs font-bold ${colors.text}`}>{STATUS_LABELS[h.status]}</p>
                    </div>
                  </div>
                  <StatusIcon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div className="p-4">
                  <h3 className={`text-sm font-semibold mb-2 ${th.cardTitle}`}>{h.code}</h3>
                  <div className={`flex items-center gap-1 text-xs mb-2 ${th.cardAddr}`}>
                    <MapPin className="w-3 h-3 shrink-0" />
                    {h.address}
                  </div>
                  {h.latitude && h.longitude && (
                    <button
                      type="button"
                      onClick={() => { openEdit(h as Parameters<typeof openEdit>[0]); }}
                      className={`text-[10px] mb-2 ${th.cardLink}`}
                    >
                      Ver en mapa
                    </button>
                  )}
                  <div className={`flex items-center justify-between pt-2 border-t ${th.cardFooter}`}>
                    <p className={`text-[10px] ${th.cardFooterText}`}>Cía. {h.company?.number}</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(h as Parameters<typeof openEdit>[0])} className={`p-1.5 rounded-lg ${th.cardAction}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => remove.mutate(h.id)} className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
