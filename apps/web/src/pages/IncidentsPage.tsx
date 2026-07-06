import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ShieldAlert, Clock, CheckCircle2,
  X, MapPin, Users, Building2, FileText, Radio,
  Flame, Truck, AlertTriangle, Droplets, Wind, Heart,
  Search, SlidersHorizontal, ChevronRight, Timer, FileDown,
  Camera, ImageOff, Crosshair, ClipboardCheck, ListChecks, BookOpen,
  Zap, Activity, Radar, BatteryCharging, Siren,
} from 'lucide-react';
import DispatchMapPicker from '../components/map/DispatchMapPicker';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { IncidentsReport } from '../lib/pdf/IncidentsReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

const INCIDENT_TYPES = [
  'Incendio Estructural','Incendio Vehicular','Incendio Forestal','Rescate Vehicular',
  'Rescate Persona','Emergencia Médica','HazMat','Inundación','Derrumbe','Falsa Alarma','Apoyo','Otro',
];

const TYPE_ICONS: Record<string, any> = {
  'Incendio Estructural': Flame, 'Incendio Vehicular': Truck, 'Incendio Forestal': Flame,
  'Rescate Vehicular': Truck, 'Rescate Persona': Users, 'Emergencia Médica': Heart,
  'HazMat': AlertTriangle, 'Inundación': Droplets, 'Derrumbe': Wind,
  'Falsa Alarma': Radio, 'Apoyo': ShieldAlert, 'Otro': ShieldAlert,
};

const TYPE_COLORS: Record<string, string> = {
  'Incendio Estructural': 'bg-red-600/20 text-red-400 border-red-600/30',
  'Incendio Vehicular':   'bg-orange-600/20 text-orange-400 border-orange-600/30',
  'Incendio Forestal':    'bg-amber-600/20 text-amber-400 border-amber-600/30',
  'Rescate Vehicular':    'bg-blue-600/20 text-blue-400 border-blue-600/30',
  'Rescate Persona':      'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  'Emergencia Médica':    'bg-pink-600/20 text-pink-400 border-pink-600/30',
  'HazMat':               'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  'Inundación':           'bg-sky-600/20 text-sky-400 border-sky-600/30',
  'Derrumbe':             'bg-stone-600/20 text-stone-400 border-stone-600/30',
  'Falsa Alarma':         'bg-slate-600/20 text-slate-400 border-slate-600/30',
  'Apoyo':                'bg-purple-600/20 text-purple-400 border-purple-600/30',
  'Otro':                 'bg-slate-600/20 text-slate-400 border-slate-600/30',
};

const TYPE_BANNER: Record<string, string> = {
  'Incendio Estructural': 'from-red-900/60 to-red-950/80',
  'Incendio Vehicular':   'from-orange-900/60 to-orange-950/80',
  'Incendio Forestal':    'from-amber-900/60 to-amber-950/80',
  'Rescate Vehicular':    'from-blue-900/60 to-blue-950/80',
  'Rescate Persona':      'from-cyan-900/60 to-cyan-950/80',
  'Emergencia Médica':    'from-pink-900/60 to-pink-950/80',
  'HazMat':               'from-yellow-900/60 to-yellow-950/80',
  default:                'from-slate-800/60 to-slate-900/80',
};

const statusOf = (inc: any) => {
  if (inc.closedAt)  return { label: 'Cerrada',   color: 'bg-slate-700/60 text-slate-400 border-slate-600/30', dot: 'bg-slate-500' };
  if (inc.arrivedAt) return { label: 'En curso',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' };
  return               { label: 'Despachada', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-pulse' };
};

const fmt = (d?: string) => d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtFull = (d?: string) => d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const toInput = (d?: string) => d ? new Date(d).toISOString().slice(0, 16) : '';
const duration = (a?: string, b?: string) => {
  if (!a || !b) return null;
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

const EMPTY = {
  code: '', type: 'Incendio Estructural', description: '', address: '',
  latitude: '', longitude: '', dispatchedAt: '', arrivedAt: '', closedAt: '',
  report: '', companyId: '', participantIds: [] as string[], vehicleIds: [] as string[],
  imageUrl: '', dispatchSource: 'MANUAL', dispatchNotes: '',
};

export default function IncidentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pickOnMap, setPickOnMap] = useState(false);

  const { data: incidents, isLoading } = useQuery({ queryKey: ['incidents'], queryFn: () => api.get('/incidents').then(r => r.data) });
  const { data: stats } = useQuery({ queryKey: ['incidents-stats'], queryFn: () => api.get('/incidents/stats').then(r => r.data) });
  const { data: selectedDetail } = useQuery({
    queryKey: ['incident', selected?.id],
    queryFn: () => api.get(`/incidents/${selected!.id}`).then(r => r.data),
    enabled: !!selected?.id,
  });
  const detail = selectedDetail ?? selected;
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/vehicles').then(r => r.data) });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/incidents', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents-stats'] });
      qc.invalidateQueries({ queryKey: ['guard-log-dashboard'] });
      toast.success('Emergencia registrada');
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const update = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/incidents/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/incidents/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });
  const updateChecklist = useMutation({
    mutationFn: ({ id, items }: { id: string; items: { id: string; checked?: boolean; notes?: string }[] }) =>
      api.patch(`/incidents/${id}/checklist`, { items }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incident', res.data.id] });
      setSelected(res.data);
      toast.success('Checklist actualizado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al actualizar checklist'),
  });

  const toggleChecklistItem = (itemId: string, checked: boolean) => {
    if (!detail?.id) return;
    const items = (detail.planChecklist ?? []).map((it: any) =>
      it.id === itemId ? { id: it.id, checked, notes: it.notes } : { id: it.id, checked: it.checked, notes: it.notes },
    );
    updateChecklist.mutate({ id: detail.id, items });
  };

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY); setUploadingImg(false); };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/incidents/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f: any) => ({ ...f, imageUrl: data.imageUrl }));
      toast.success('Imagen cargada');
    } catch { toast.error('Error al subir imagen'); }
    finally { setUploadingImg(false); }
  };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const toggleP = (uid: string) => setForm((f: any) => ({ ...f, participantIds: f.participantIds.includes(uid) ? f.participantIds.filter((id: string) => id !== uid) : [...f.participantIds, uid] }));
  const toggleV = (vid: string) => setForm((f: any) => ({ ...f, vehicleIds: f.vehicleIds.includes(vid) ? f.vehicleIds.filter((id: string) => id !== vid) : [...f.vehicleIds, vid] }));
  const onMapPick = useCallback((lat: number, lng: number) => {
    setForm((f: any) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
    toast.success('Ubicación en mapa');
  }, []);
  const formVehicles = (vehicles ?? []).filter((v: any) => !form.companyId || v.companyId === form.companyId);

  const handleEdit = (inc: any) => {
    setEditing(inc); setSelected(null);
    setForm({
      ...inc,
      dispatchedAt: toInput(inc.dispatchedAt),
      arrivedAt: toInput(inc.arrivedAt),
      closedAt: toInput(inc.closedAt),
      latitude: inc.latitude ?? '',
      longitude: inc.longitude ?? '',
      participantIds: inc.participants?.map((p: any) => p.userId) ?? [],
      vehicleIds: inc.vehicles?.map((v: any) => v.vehicleId) ?? [],
      imageUrl: inc.imageUrl ?? '',
      dispatchSource: inc.dispatchSource ?? 'MANUAL',
      dispatchNotes: inc.dispatchNotes ?? '',
    });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      dispatchedAt: form.dispatchedAt || undefined,
      arrivedAt: form.arrivedAt || undefined,
      closedAt: form.closedAt || undefined,
      report: form.report || undefined,
      imageUrl: form.imageUrl || undefined,
      dispatchNotes: form.dispatchNotes || undefined,
    };
    editing ? update.mutate({ id: editing.id, d }) : create.mutate(d);
  };

  const filtered = (incidents ?? []).filter((inc: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${inc.code} ${inc.type} ${inc.address} ${inc.description}`.toLowerCase().includes(q);
    const matchT = !filterType || inc.type === filterType;
    const matchS = !filterStatus || (filterStatus === 'open' ? !inc.closedAt : filterStatus === 'active' ? inc.arrivedAt && !inc.closedAt : inc.closedAt);
    return matchQ && matchT && matchS;
  });

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isYesterday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
  };

  const todayIncidents = filtered.filter((inc: any) => isToday(inc.dispatchedAt));
  const yesterdayIncidents = filtered.filter((inc: any) => isYesterday(inc.dispatchedAt));
  const olderIncidents = filtered.filter((inc: any) => !isToday(inc.dispatchedAt) && !isYesterday(inc.dispatchedAt));

  const inputCls = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all shadow-sm';

  return (
    <div className="space-y-6">

      {/* 1. Estado de la Compañía */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Estado de la Compañía</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {/* Tarjeta Central */}
          <div className="bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-900/30 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm min-w-[180px]">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-50 dark:bg-red-950/20 shrink-0">
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">CENTRAL</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">16 disp. • 6 carros</p>
            </div>
          </div>
          
          {/* Tarjetas de Compañías */}
          {companies?.map((c: any) => (
            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm min-w-[160px]">
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0">
                <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.number}° Compañía</p>
                <div className="flex items-center gap-2 text-[10px] font-bold mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Users className="w-3 h-3" /> 8</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1"><Truck className="w-3 h-3" /> 1</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Botón ver todas */}
          <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
            Ver todas
          </button>
        </div>
      </div>

      {/* 2. Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <Siren className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Emergencias</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Bitácora de emergencias e intervenciones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!!incidents?.length && (
            <button
              onClick={() => downloadPdf(
                createElement(IncidentsReport, { incidents: incidents ?? [], companies: companies ?? [] }),
                `nodo360_emergencias_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-red-600/20">
            <Plus className="w-4 h-4" />Nueva emergencia
          </button>
        </div>
      </div>

      {/* 3. HUD Stats (5 tarjetas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total de emergencias', value: stats?.total ?? 128, sub: '+12% vs mes anterior', subColor: 'text-emerald-600 dark:text-emerald-400', icon: FileText, iconBg: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-500' },
          { label: 'Despachos este mes', value: stats?.thisMonth ?? 86, sub: '+18% vs mes anterior', subColor: 'text-emerald-600 dark:text-emerald-400', icon: Siren, iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-500' },
          { label: 'Intervenciones activas', value: stats?.open ?? 18, sub: 'En proceso', subColor: 'text-red-500', subDot: true, icon: Activity, iconBg: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-500' },
          { label: 'Tiempo prom. de respuesta', value: stats?.avgArrivalSecs ? `${Math.floor(stats.avgArrivalSecs / 60)}:${(stats.avgArrivalSecs % 60).toString().padStart(2, '0')}` : '07:34', sub: '-01:12 vs mes anterior', subColor: 'text-emerald-600 dark:text-emerald-400', icon: Clock, iconBg: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-500' },
          { label: 'Fuerza operativa lista', value: 142, sub: 'Sin personal fuera de servicio', subColor: 'text-slate-500 dark:text-slate-400', icon: Users, iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4 items-center shadow-sm relative overflow-hidden">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
              <s.icon className={`w-6 h-6 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5 mb-0.5">{s.value}</p>
              <p className={`text-[9px] font-bold ${s.subColor} flex items-center gap-1`}>
                {s.subDot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar emergencia' : 'Registrar nueva emergencia'}</h2>
                <p className="text-xs text-slate-500">Completa los datos de la intervención</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Imagen opcional ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Fotografía del incidente (opcional)</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                  {form.imageUrl
                    ? <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    : <ImageOff className="w-8 h-8 text-slate-600" />}
                </div>
                <div className="space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                    <Camera className="w-3.5 h-3.5" />{uploadingImg ? 'Subiendo...' : 'Seleccionar foto'}
                  </button>
                  {form.imageUrl && (
                    <button type="button" onClick={() => setForm((f: any) => ({ ...f, imageUrl: '' }))}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <X className="w-3 h-3" />Quitar imagen
                    </button>
                  )}
                  <p className="text-[11px] text-slate-600">JPG, PNG, WEBP — máx. 10MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Código</label><input value={form.code} onChange={set('code')} required placeholder="INC-2026-001" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Tipo de emergencia</label>
                <select value={form.type} onChange={set('type')} className={inputCls}>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
                <select value={form.companyId} onChange={set('companyId')} required className={inputCls}><option value="">Seleccionar...</option>{companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}</select></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Dirección</label><input value={form.address} onChange={set('address')} required placeholder="Calle, número, comuna" className={inputCls} /></div>
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ubicación GPS</label>
                  <button type="button" onClick={() => setPickOnMap(!pickOnMap)} className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${pickOnMap ? 'bg-sky-600 text-white border-sky-500' : 'border-slate-700 text-slate-400'}`}>
                    <Crosshair className="w-3 h-3 inline" /> {pickOnMap ? 'Marcando' : 'Mapa'}
                  </button>
                </div>
                <DispatchMapPicker latitude={form.latitude} longitude={form.longitude} pickActive={pickOnMap} onPick={onMapPick} height="180px" />
              </div>

              <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Descripción del incidente</label><textarea value={form.description} onChange={set('description')} required rows={2} className={`${inputCls} resize-none`} /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Despacho</label><input type="datetime-local" value={form.dispatchedAt} onChange={set('dispatchedAt')} required className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Llegada al lugar</label><input type="datetime-local" value={form.arrivedAt} onChange={set('arrivedAt')} className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Cierre / Regreso</label><input type="datetime-local" value={form.closedAt} onChange={set('closedAt')} className={inputCls} /></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Informe post-incidente</label><textarea value={form.report} onChange={set('report')} rows={2} placeholder="Descripción del resultado, acciones tomadas..." className={`${inputCls} resize-none`} /></div>
            </div>

            {users?.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Personal participante ({form.participantIds.length} seleccionados)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                  {users.map((u: any) => {
                    const checked = form.participantIds.includes(u.id);
                    return (
                      <label key={u.id} className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border transition-all ${checked ? 'bg-red-600/10 border-red-600/30 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleP(u.id)} className="accent-red-500 shrink-0" />
                        <span className="text-xs truncate">{u.firstName} {u.lastName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}


            {formVehicles.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Vehículos despachados ({form.vehicleIds.length})</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                  {formVehicles.filter((v: any) => v.status === 'OPERATIVO').map((v: any) => {
                    const checked = form.vehicleIds.includes(v.id);
                    return (
                      <label key={v.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl border text-xs ${checked ? 'bg-orange-600/10 border-orange-500/40 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleV(v.id)} className="accent-orange-500" />
                        <span className="font-mono font-bold truncate">{v.patent}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={create.isPending || update.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Registrar emergencia'}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Filtros */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative flex-1 min-w-[300px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, tipo, dirección, despacho..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all shadow-sm" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm shrink-0">
            <Timer className="w-4 h-4 text-slate-500" /> Rango de fechas <ChevronRight className="w-3 h-3 ml-2 rotate-90" />
          </button>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-red-500 transition-all shadow-sm shrink-0 appearance-none pr-8 relative bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-[size:1rem_1rem]">
            <option value="">Todos los tipos</option>
            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-red-500 transition-all shadow-sm shrink-0 appearance-none pr-8 relative bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-[size:1rem_1rem]">
            <option value="">Todos los estados</option>
            <option value="active">En curso</option>
            <option value="open">Sin cerrar</option>
            <option value="closed">Cerradas</option>
          </select>
          <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}
            className="text-red-500 hover:text-red-600 font-bold text-sm px-3 shrink-0">
            Limpiar
          </button>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-48 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin emergencias registradas</p>
          <p className="text-slate-600 text-sm mt-1">Ajusta los filtros o registra la primera intervención</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* HOY */}
          {todayIncidents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-white">Hoy <span className="ml-2 text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">{todayIncidents.length}</span></h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {todayIncidents.map((inc: any) => <IncidentCard key={inc.id} inc={inc} onClick={() => setSelected(inc)} featured={true} />)}
              </div>
            </section>
          )}

          {/* AYER */}
          {yesterdayIncidents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Ayer <span className="ml-2 text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">{yesterdayIncidents.length}</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {yesterdayIncidents.map((inc: any) => <IncidentCard key={inc.id} inc={inc} onClick={() => setSelected(inc)} />)}
              </div>
            </section>
          )}

          {/* ANTERIORES */}
          {olderIncidents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-300">Anteriores <span className="ml-2 text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">{olderIncidents.length}</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {olderIncidents.map((inc: any) => <IncidentCard key={inc.id} inc={inc} onClick={() => setSelected(inc)} />)}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelected(null)}>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            
            {/* Glow decorativo */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            {/* Header modal */}
            {(() => {
              const TypeIcon = TYPE_ICONS[selected.type] ?? ShieldAlert;
              const status = statusOf(selected);
              const dur = duration(selected.dispatchedAt, selected.closedAt ?? selected.arrivedAt);
              return (
                <div className="bg-slate-100 dark:bg-slate-950/80 p-5 rounded-t-2xl border-b border-slate-200 dark:border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-inner">
                        <TypeIcon className="w-7 h-7 text-red-500 drop-shadow-[0_0_2px_rgba(239,68,68,0.2)] dark:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      </div>
                      <div>
                        <p className="font-mono font-black text-slate-900 dark:text-white text-xl tracking-tight drop-shadow-sm">{selected.code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5">{selected.type}</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${!selected.closedAt ? 'animate-ping' : ''}`} />{status.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => setSelected(null)} className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"><X className="w-4 h-4" /></button>
                      {dur && <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800"><Timer className="w-3 h-3 inline mr-1" />{dur}</span>}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="p-5 space-y-5">
              {/* Foto del incidente */}
              {selected.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 relative group">
                  <img src={selected.imageUrl} alt="Foto del incidente" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                </div>
              )}

              {/* Dirección y descripción */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ubicación</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selected.address}</p>
                  </div>
                </div>
                {selected.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800/80 pt-3 mt-3">{selected.description}</p>
                )}
                {selected.dispatchNotes && (
                  <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed border-t border-slate-200 dark:border-slate-800/80 pt-3 mt-3">
                    <span className="font-bold uppercase text-[10px] block mb-1">Notas de Despacho</span>
                    {selected.dispatchNotes}
                  </p>
                )}
              </div>

              {/* Detalles completos y Reporte */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Origen Despacho</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selected.dispatchSource}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cía Despachante</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selected.company?.name || 'Desconocida'}</p>
                  </div>
                </div>
                {selected.report ? (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Reporte Final</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">{selected.report}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No hay reporte registrado para esta emergencia.</p>
                )}
              </div>

              {/* Timeline Telemetría */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-500" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Telemetría Operativa</p>
                </div>
                <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                  {[
                    { label: 'Despacho', time: selected.dispatchedAt, icon: Siren, color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-500/30', active: true },
                    { label: 'Llegada al lugar', time: selected.arrivedAt, icon: MapPin, color: 'text-cyan-600 dark:text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/50', border: 'border-cyan-200 dark:border-cyan-500/30', active: !!selected.arrivedAt },
                    { label: 'Cierre / Regreso', time: selected.closedAt, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-500/30', active: !!selected.closedAt },
                  ].map(ev => {
                    const Icon = ev.icon;
                    return (
                      <div key={ev.label} className={`flex items-start gap-4 relative ${ev.active ? '' : 'opacity-40'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border relative z-10 ${ev.bg} ${ev.border} ${ev.active ? 'shadow-sm dark:shadow-[0_0_10px_rgba(0,0,0,0.2)]' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                          <Icon className={`w-3.5 h-3.5 ${ev.active ? ev.color : 'text-slate-400 dark:text-slate-500'}`} />
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 shadow-sm">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{ev.label}</p>
                          <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-300">{ev.time ? fmtFull(ev.time) : '--:--:--'}</p>
                        </div>
                        {ev.label === 'Llegada al lugar' && selected.dispatchedAt && selected.arrivedAt && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900/50">
                            +{duration(selected.dispatchedAt, selected.arrivedAt)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plan de emergencia Checklist */}
              {selected?.emergencyPlan && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center border border-amber-300 dark:border-amber-900/50 shrink-0">
                        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/70 uppercase tracking-widest">Plan de Acción</p>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{selected.emergencyPlan.title}</p>
                      </div>
                    </div>
                  </div>
                  {(selected.planChecklist?.length ?? 0) > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Tareas</p>
                        <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">{selected.checklistProgress?.checked ?? 0}/{selected.checklistProgress?.total ?? 0}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full mb-3 overflow-hidden border border-slate-300 dark:border-slate-800">
                        <div className="h-full bg-amber-500 rounded-full transition-all relative" style={{ width: `${selected.checklistProgress?.percent ?? 0}%` }}>
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {(selected.planChecklist as any[]).map((item: any) => (
                          <label key={item.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${item.checked ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                            <input type="checkbox" checked={!!item.checked} disabled={updateChecklist.isPending} onChange={(e) => toggleChecklistItem(item.id, e.target.checked)} className="accent-amber-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                               <p className={`text-xs font-medium ${item.checked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{item.text}{item.required && <span className="text-red-500 ml-1">*</span>}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Plan sin checklist definido</p>
                  )}
                </div>
              )}

              {/* Personal y Vehículos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal */}
                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fuerza de Tarea ({selected.participants?.length ?? 0})</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.participants?.length > 0 ? selected.participants.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 w-full sm:w-auto shadow-sm">
                        <div className="w-6 h-6 rounded bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/30 flex items-center justify-center text-[9px] font-bold text-red-600 dark:text-red-400 shrink-0">
                          {p.user.firstName[0]}{p.user.lastName[0]}
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{p.user.firstName} {p.user.lastName}</p>
                      </div>
                    )) : <p className="text-xs text-slate-500 dark:text-slate-600 italic">Sin personal asignado</p>}
                  </div>
                </div>

                {/* Vehículos */}
                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Unidades ({selected.vehicles?.length ?? 0})</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {selected.vehicles?.length > 0 ? selected.vehicles.map((iv: any) => (
                      <div key={iv.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 shadow-sm">
                        <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{iv.vehicle?.patent}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{iv.vehicle?.brand}</p>
                        </div>
                      </div>
                    )) : <p className="text-xs text-slate-500 dark:text-slate-600 italic">Sin unidades</p>}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                <button onClick={() => handleEdit(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold py-3 rounded-xl transition-colors border border-slate-300 dark:border-slate-700 shadow-sm">
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar ${selected.code}?`)) remove.mutate(selected.id); }}
                  className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50 transition-colors shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({ inc, onClick, featured = false }: { inc: any; onClick: () => void; featured?: boolean }) {
  const TypeIcon = TYPE_ICONS[inc.type] ?? ShieldAlert;
  const dur = duration(inc.dispatchedAt, inc.closedAt ?? inc.arrivedAt);
  const isOpen = !inc.closedAt;
  
  // Custom status logic to match mockup colors
  let statusColor = 'border-l-emerald-500';
  let pillClass = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400';
  let iconClass = 'text-emerald-500';
  let statusText = 'CERRADA';
  let timeStr = inc.closedAt ? new Date(inc.closedAt).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'}) : '';

  if (!inc.closedAt) {
    if (inc.arrivedAt) {
      statusColor = 'border-l-blue-500';
      pillClass = 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400';
      iconClass = 'text-blue-500';
      statusText = 'EN PROCESO';
      timeStr = new Date(inc.arrivedAt).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
    } else {
      statusColor = 'border-l-red-500';
      pillClass = 'bg-red-500 text-white'; // Activa has solid red
      iconClass = 'text-red-500';
      statusText = 'ACTIVA';
      timeStr = inc.dispatchedAt ? new Date(inc.dispatchedAt).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'}) : '';
    }
  }

  return (
    <div onClick={onClick}
      className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md flex items-stretch border-l-4 ${statusColor}`}>
      
      {/* Columna Izquierda: Estado e Ícono */}
      <div className="w-24 sm:w-28 flex flex-col items-center justify-center py-4 px-2 border-r border-slate-100 dark:border-slate-800 shrink-0">
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${pillClass}`}>
          {statusText}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800`}>
          <TypeIcon className={`w-5 h-5 ${iconClass}`} />
        </div>
      </div>

      {/* Cuerpo Central */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm truncate">{inc.code}</span>
              {inc.type && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">{inc.type}</span>}
            </div>
            {/* Lado Derecho móvil */}
            <div className="sm:hidden flex flex-col items-end shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{timeStr}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{inc.address}</p>
          </div>
          
          {inc.description && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 mb-3 w-fit max-w-full">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{inc.description}</p>
            </div>
          )}
        </div>

        {/* Footer de tarjeta */}
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {inc.company ? <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Cía. {inc.company.number}</span> : <span />}
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inc.participants?.length ?? 0} PAX</span>
          {dur && <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {dur}</span>}
        </div>
      </div>

      {/* Lado Derecho (Desktop) */}
      <div className="hidden sm:flex flex-col items-end justify-between p-3 sm:p-4 shrink-0 w-24">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{timeStr}</span>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SirenIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M7 12h10"/><path d="M7 2h10"/><path d="M12 2v20"/><path d="M17 12c0 2.76 2.24 5 5 5v5H2v-5c2.76 0 5-2.24 5-5"/><path d="M12 2a5 5 0 0 0-5 5v5h10V7a5 5 0 0 0-5-5z"/></svg>;
}
