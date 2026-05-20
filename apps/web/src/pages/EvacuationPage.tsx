import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, X, Search, Building2, MapPin, Route, Users,
  Calendar, CheckCircle2, Clock, XCircle, Map, List, Signpost,
  ClipboardList, Filter, ChevronRight, PlayCircle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const MAP_CENTER: [number, number] = [-35.6632, -71.4392];

const DRILL_STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  PROGRAMADO: { label: 'Programado', badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30', dot: 'bg-sky-400' },
  EJECUTADO: { label: 'Ejecutado', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  CANCELADO: { label: 'Cancelado', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' },
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function asLatLng(obj: unknown): { lat: number; lng: number } | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, number>;
  if (typeof o.lat === 'number' && typeof o.lng === 'number') return { lat: o.lat, lng: o.lng };
  return null;
}

const meetingIcon = L.divIcon({
  className: '',
  html: '<div style="background:#10b981;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const routeStartIcon = L.divIcon({
  className: '',
  html: '<div style="background:#3b82f6;width:18px;height:18px;border-radius:4px;border:2px solid white"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const routeEndIcon = L.divIcon({
  className: '',
  html: '<div style="background:#ef4444;width:18px;height:18px;border-radius:4px;border:2px solid white"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type Tab = 'resumen' | 'simulacros' | 'puntos' | 'rutas' | 'mapa';

const EMPTY_DRILL = {
  title: '',
  description: '',
  scheduledAt: '',
  executedAt: '',
  status: 'PROGRAMADO',
  participants: '',
  notes: '',
  emergencyPlanId: '',
  companyId: '',
};

const EMPTY_POINT = {
  name: '',
  description: '',
  address: '',
  capacity: '',
  lat: '',
  lng: '',
  companyId: '',
};

const EMPTY_ROUTE = {
  name: '',
  description: '',
  buildingId: '',
  startLat: '',
  startLng: '',
  endLat: '',
  endLng: '',
  companyId: '',
};

export default function EvacuationPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'].includes(user?.role ?? '');

  const [tab, setTab] = useState<Tab>('resumen');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showDrillForm, setShowDrillForm] = useState(false);
  const [drillForm, setDrillForm] = useState(EMPTY_DRILL);
  const [editingDrill, setEditingDrill] = useState<any>(null);

  const [showPointForm, setShowPointForm] = useState(false);
  const [pointForm, setPointForm] = useState(EMPTY_POINT);
  const [editingPoint, setEditingPoint] = useState<any>(null);

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['evacuation-summary', companyFilter],
    queryFn: () => api.get('/evacuation/summary', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: drills = [], isLoading: loadingDrills } = useQuery({
    queryKey: ['evacuation-drills', companyFilter, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (companyFilter) params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;
      return api.get('/evacuation/drills', { params }).then(r => r.data);
    },
  });

  const { data: meetingPoints = [], isLoading: loadingPoints } = useQuery({
    queryKey: ['evacuation-meeting-points', companyFilter],
    queryFn: () => api.get('/evacuation/meeting-points', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['evacuation-routes', companyFilter],
    queryFn: () => api.get('/evacuation/routes', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['emergency-plans', companyFilter],
    queryFn: () => api.get('/emergency-plans', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const filteredDrills = useMemo(() => {
    if (!search.trim()) return drills;
    const q = search.toLowerCase();
    return drills.filter((d: any) =>
      d.title?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.participants?.some((p: string) => p.toLowerCase().includes(q)),
    );
  }, [drills, search]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['evacuation-summary'] });
    qc.invalidateQueries({ queryKey: ['evacuation-drills'] });
    qc.invalidateQueries({ queryKey: ['evacuation-meeting-points'] });
    qc.invalidateQueries({ queryKey: ['evacuation-routes'] });
  };

  const createDrill = useMutation({
    mutationFn: (d: any) => api.post('/evacuation/drills', d),
    onSuccess: () => { invalidateAll(); toast.success('Simulacro creado'); resetDrill(); },
    onError: () => toast.error('Error al crear simulacro'),
  });

  const updateDrill = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/evacuation/drills/${id}`, data),
    onSuccess: () => { invalidateAll(); toast.success('Simulacro actualizado'); resetDrill(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const removeDrill = useMutation({
    mutationFn: (id: string) => api.delete(`/evacuation/drills/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Simulacro eliminado'); },
  });

  const createPoint = useMutation({
    mutationFn: (d: any) => api.post('/evacuation/meeting-points', d),
    onSuccess: () => { invalidateAll(); toast.success('Punto de encuentro creado'); resetPoint(); },
    onError: () => toast.error('Error al crear punto'),
  });

  const updatePoint = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/evacuation/meeting-points/${id}`, data),
    onSuccess: () => { invalidateAll(); toast.success('Punto actualizado'); resetPoint(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const removePoint = useMutation({
    mutationFn: (id: string) => api.delete(`/evacuation/meeting-points/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Punto eliminado'); },
  });

  const createRoute = useMutation({
    mutationFn: (d: any) => api.post('/evacuation/routes', d),
    onSuccess: () => { invalidateAll(); toast.success('Ruta creada'); resetRoute(); },
    onError: () => toast.error('Error al crear ruta'),
  });

  const updateRoute = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/evacuation/routes/${id}`, data),
    onSuccess: () => { invalidateAll(); toast.success('Ruta actualizada'); resetRoute(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const removeRoute = useMutation({
    mutationFn: (id: string) => api.delete(`/evacuation/routes/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Ruta eliminada'); },
  });

  const resetDrill = () => { setShowDrillForm(false); setDrillForm(EMPTY_DRILL); setEditingDrill(null); };
  const resetPoint = () => { setShowPointForm(false); setPointForm(EMPTY_POINT); setEditingPoint(null); };
  const resetRoute = () => { setShowRouteForm(false); setRouteForm(EMPTY_ROUTE); setEditingRoute(null); };

  const submitDrill = () => {
    const payload = {
      ...drillForm,
      participants: drillForm.participants.split(',').map((s: string) => s.trim()).filter(Boolean),
      emergencyPlanId: drillForm.emergencyPlanId || undefined,
      executedAt: drillForm.executedAt || undefined,
    };
    if (editingDrill) updateDrill.mutate({ id: editingDrill.id, data: payload });
    else createDrill.mutate(payload);
  };

  const submitPoint = () => {
    const payload = {
      name: pointForm.name,
      description: pointForm.description || undefined,
      address: pointForm.address || undefined,
      capacity: pointForm.capacity ? Number(pointForm.capacity) : undefined,
      location: { lat: Number(pointForm.lat), lng: Number(pointForm.lng) },
      companyId: pointForm.companyId,
    };
    if (editingPoint) updatePoint.mutate({ id: editingPoint.id, data: payload });
    else createPoint.mutate(payload);
  };

  const submitRoute = () => {
    const payload = {
      name: routeForm.name,
      description: routeForm.description || undefined,
      buildingId: routeForm.buildingId || undefined,
      startPoint: { lat: Number(routeForm.startLat), lng: Number(routeForm.startLng) },
      endPoint: { lat: Number(routeForm.endLat), lng: Number(routeForm.endLng) },
      companyId: routeForm.companyId,
    };
    if (editingRoute) updateRoute.mutate({ id: editingRoute.id, data: payload });
    else createRoute.mutate(payload);
  };

  const openEditDrill = (d: any) => {
    setEditingDrill(d);
    setDrillForm({
      title: d.title,
      description: d.description,
      scheduledAt: d.scheduledAt?.slice(0, 16),
      executedAt: d.executedAt ? d.executedAt.slice(0, 16) : '',
      status: d.status,
      participants: (d.participants ?? []).join(', '),
      notes: d.notes ?? '',
      emergencyPlanId: d.emergencyPlanId ?? '',
      companyId: d.companyId,
    });
    setShowDrillForm(true);
  };

  const openEditPoint = (p: any) => {
    const loc = asLatLng(p.location);
    setEditingPoint(p);
    setPointForm({
      name: p.name,
      description: p.description ?? '',
      address: p.address ?? '',
      capacity: p.capacity?.toString() ?? '',
      lat: loc?.lat?.toString() ?? '',
      lng: loc?.lng?.toString() ?? '',
      companyId: p.companyId,
    });
    setShowPointForm(true);
  };

  const openEditRoute = (r: any) => {
    const start = asLatLng(r.startPoint);
    const end = asLatLng(r.endPoint);
    setEditingRoute(r);
    setRouteForm({
      name: r.name,
      description: r.description ?? '',
      buildingId: r.buildingId ?? '',
      startLat: start?.lat?.toString() ?? '',
      startLng: start?.lng?.toString() ?? '',
      endLat: end?.lat?.toString() ?? '',
      endLng: end?.lng?.toString() ?? '',
      companyId: r.companyId,
    });
    setShowRouteForm(true);
  };

  const markExecuted = (d: any) => {
    updateDrill.mutate({
      id: d.id,
      data: { status: 'EJECUTADO', executedAt: new Date().toISOString() },
    });
  };

  const tabs: { id: Tab; label: string; icon: typeof List }[] = [
    { id: 'resumen', label: 'Resumen', icon: ClipboardList },
    { id: 'simulacros', label: 'Simulacros', icon: PlayCircle },
    { id: 'puntos', label: 'Puntos de encuentro', icon: Users },
    { id: 'rutas', label: 'Rutas', icon: Route },
    { id: 'mapa', label: 'Mapa', icon: Map },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">Prevención</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Signpost className="w-7 h-7 text-red-400" />
            Simulacros y evacuación
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Simulacros, puntos de encuentro y rutas de evacuación por compañía
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
          >
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-red-600/20 text-red-300 border border-red-600/30 border-b-transparent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'resumen' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Simulacros', value: summary?.drills?.total ?? 0, sub: `${summary?.upcomingDrills ?? 0} próximos`, icon: PlayCircle, color: 'text-sky-400' },
            { label: 'Programados', value: summary?.drills?.programado ?? 0, sub: 'Por ejecutar', icon: Clock, color: 'text-amber-400' },
            { label: 'Ejecutados', value: summary?.drills?.ejecutado ?? 0, sub: 'Completados', icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Puntos / Rutas', value: `${summary?.meetingPoints ?? 0} / ${summary?.routes ?? 0}`, sub: 'Infraestructura', icon: MapPin, color: 'text-red-400' },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <Icon className={`w-5 h-5 ${k.color} mb-3`} />
                <p className="text-2xl font-bold text-white">{k.value}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{k.label}</p>
                <p className="text-[10px] text-slate-600 mt-1">{k.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'simulacros' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar simulacro..." className={`${inputCls} pl-10`} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200">
              <option value="">Todos los estados</option>
              {Object.entries(DRILL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {canEdit && (
              <button onClick={() => { resetDrill(); setShowDrillForm(true); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                <Plus className="w-4 h-4" /> Nuevo simulacro
              </button>
            )}
          </div>

          {loadingDrills ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />)}</div>
          ) : filteredDrills.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No hay simulacros registrados</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredDrills.map((d: any) => {
                const st = DRILL_STATUS[d.status] ?? DRILL_STATUS.PROGRAMADO;
                return (
                  <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-white">{d.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.badge}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">{d.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {fmt(d.scheduledAt)}
                    </div>
                    {d.emergencyPlan && (
                      <p className="text-xs text-red-400/90 mb-2">Plan: {d.emergencyPlan.title}</p>
                    )}
                    {d.participants?.length > 0 && (
                      <p className="text-xs text-slate-600 mb-3">{d.participants.length} participante(s)</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                      {canEdit && d.status === 'PROGRAMADO' && (
                        <button onClick={() => markExecuted(d)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar ejecutado
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={() => openEditDrill(d)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                          <button onClick={() => removeDrill.mutate(d.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'puntos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
              <button onClick={() => { resetPoint(); setShowPointForm(true); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                <Plus className="w-4 h-4" /> Nuevo punto
              </button>
            )}
          </div>
          {loadingPoints ? (
            <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ) : meetingPoints.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Sin puntos de encuentro</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {meetingPoints.map((p: any) => {
                const loc = asLatLng(p.location);
                return (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white">{p.name}</h3>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => openEditPoint(p)} className="p-1.5 text-slate-500 hover:text-white"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => removePoint.mutate(p.id)} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    {p.description && <p className="text-sm text-slate-400 mt-1">{p.description}</p>}
                    {p.address && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.address}</p>}
                    {loc && <p className="text-[10px] text-slate-600 mt-1">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>}
                    {p.capacity && <p className="text-xs text-emerald-400/80 mt-2">Capacidad: {p.capacity} personas</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'rutas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
              <button onClick={() => { resetRoute(); setShowRouteForm(true); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                <Plus className="w-4 h-4" /> Nueva ruta
              </button>
            )}
          </div>
          {loadingRoutes ? (
            <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ) : routes.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <Route className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Sin rutas de evacuación</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {routes.map((r: any) => {
                const start = asLatLng(r.startPoint);
                const end = asLatLng(r.endPoint);
                return (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{r.name}</h3>
                      {r.description && <p className="text-sm text-slate-400 mt-1">{r.description}</p>}
                      <p className="text-xs text-slate-500 mt-2">
                        {start && end ? `Inicio → Fin (${start.lat.toFixed(4)}, ${start.lng.toFixed(4)})` : 'Coordenadas registradas'}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => openEditRoute(r)} className="p-2 text-slate-400 hover:text-white border border-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => removeRoute.mutate(r.id)} className="p-2 text-red-400 hover:text-red-300 border border-slate-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'mapa' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[min(520px,70vh)]">
          <MapContainer center={MAP_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {meetingPoints.map((p: any) => {
              const loc = asLatLng(p.location);
              if (!loc) return null;
              return (
                <Marker key={p.id} position={[loc.lat, loc.lng]} icon={meetingIcon}>
                  <Popup>
                    <strong>{p.name}</strong>
                    {p.address && <p className="text-xs mt-1">{p.address}</p>}
                  </Popup>
                </Marker>
              );
            })}
            {routes.map((r: any) => {
              const start = asLatLng(r.startPoint);
              const end = asLatLng(r.endPoint);
              if (!start || !end) return null;
              const positions: [number, number][] = [[start.lat, start.lng], [end.lat, end.lng]];
              const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
              wps.forEach((w: any) => {
                const pt = asLatLng(w);
                if (pt) positions.splice(positions.length - 1, 0, [pt.lat, pt.lng]);
              });
              return (
                <span key={r.id}>
                  <Polyline positions={positions} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }} />
                  <Marker position={[start.lat, start.lng]} icon={routeStartIcon}>
                    <Popup>Inicio: {r.name}</Popup>
                  </Marker>
                  <Marker position={[end.lat, end.lng]} icon={routeEndIcon}>
                    <Popup>Fin: {r.name}</Popup>
                  </Marker>
                </span>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Drill modal */}
      {showDrillForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingDrill ? 'Editar simulacro' : 'Nuevo simulacro'}</h2>
              <button onClick={resetDrill} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input className={inputCls} placeholder="Título" value={drillForm.title} onChange={e => setDrillForm({ ...drillForm, title: e.target.value })} />
            <textarea className={`${inputCls} min-h-[80px]`} placeholder="Descripción" value={drillForm.description} onChange={e => setDrillForm({ ...drillForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Programado</label>
                <input type="datetime-local" className={inputCls} value={drillForm.scheduledAt} onChange={e => setDrillForm({ ...drillForm, scheduledAt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ejecutado (opc.)</label>
                <input type="datetime-local" className={inputCls} value={drillForm.executedAt} onChange={e => setDrillForm({ ...drillForm, executedAt: e.target.value })} />
              </div>
            </div>
            <select className={inputCls} value={drillForm.status} onChange={e => setDrillForm({ ...drillForm, status: e.target.value })}>
              {Object.entries(DRILL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input className={inputCls} placeholder="Participantes (separados por coma)" value={drillForm.participants} onChange={e => setDrillForm({ ...drillForm, participants: e.target.value })} />
            <select className={inputCls} value={drillForm.emergencyPlanId} onChange={e => setDrillForm({ ...drillForm, emergencyPlanId: e.target.value })}>
              <option value="">Sin plan vinculado</option>
              {plans.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select className={inputCls} value={drillForm.companyId} onChange={e => setDrillForm({ ...drillForm, companyId: e.target.value })} required>
              <option value="">Compañía</option>
              {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>)}
            </select>
            <textarea className={`${inputCls} min-h-[60px]`} placeholder="Notas" value={drillForm.notes} onChange={e => setDrillForm({ ...drillForm, notes: e.target.value })} />
            <button onClick={submitDrill} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">
              {editingDrill ? 'Guardar cambios' : 'Crear simulacro'}
            </button>
          </div>
        </div>
      )}

      {showPointForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingPoint ? 'Editar punto' : 'Nuevo punto de encuentro'}</h2>
              <button onClick={resetPoint} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input className={inputCls} placeholder="Nombre" value={pointForm.name} onChange={e => setPointForm({ ...pointForm, name: e.target.value })} />
            <textarea className={inputCls} placeholder="Descripción" value={pointForm.description} onChange={e => setPointForm({ ...pointForm, description: e.target.value })} />
            <input className={inputCls} placeholder="Dirección" value={pointForm.address} onChange={e => setPointForm({ ...pointForm, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Latitud" value={pointForm.lat} onChange={e => setPointForm({ ...pointForm, lat: e.target.value })} />
              <input className={inputCls} placeholder="Longitud" value={pointForm.lng} onChange={e => setPointForm({ ...pointForm, lng: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="Capacidad (personas)" type="number" value={pointForm.capacity} onChange={e => setPointForm({ ...pointForm, capacity: e.target.value })} />
            <select className={inputCls} value={pointForm.companyId} onChange={e => setPointForm({ ...pointForm, companyId: e.target.value })}>
              <option value="">Compañía</option>
              {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>)}
            </select>
            <button onClick={submitPoint} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">Guardar</button>
          </div>
        </div>
      )}

      {showRouteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingRoute ? 'Editar ruta' : 'Nueva ruta de evacuación'}</h2>
              <button onClick={resetRoute} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input className={inputCls} placeholder="Nombre" value={routeForm.name} onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} />
            <textarea className={inputCls} placeholder="Descripción" value={routeForm.description} onChange={e => setRouteForm({ ...routeForm, description: e.target.value })} />
            <p className="text-xs text-slate-500 font-semibold">Punto de inicio</p>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Lat inicio" value={routeForm.startLat} onChange={e => setRouteForm({ ...routeForm, startLat: e.target.value })} />
              <input className={inputCls} placeholder="Lng inicio" value={routeForm.startLng} onChange={e => setRouteForm({ ...routeForm, startLng: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500 font-semibold">Punto de fin (encuentro)</p>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Lat fin" value={routeForm.endLat} onChange={e => setRouteForm({ ...routeForm, endLat: e.target.value })} />
              <input className={inputCls} placeholder="Lng fin" value={routeForm.endLng} onChange={e => setRouteForm({ ...routeForm, endLng: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="ID edificio (opc.)" value={routeForm.buildingId} onChange={e => setRouteForm({ ...routeForm, buildingId: e.target.value })} />
            <select className={inputCls} value={routeForm.companyId} onChange={e => setRouteForm({ ...routeForm, companyId: e.target.value })}>
              <option value="">Compañía</option>
              {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>)}
            </select>
            <button onClick={submitRoute} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
