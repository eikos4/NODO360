import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ShieldAlert, Clock, CheckCircle2,
  X, MapPin, Users, Building2, FileText, Radio,
  Flame, Truck, AlertTriangle, Droplets, Wind, Heart,
  Search, SlidersHorizontal, ChevronRight, Timer, FileDown,
  Camera, ImageOff, Crosshair, ClipboardCheck, ListChecks, BookOpen,
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

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Emergencias</h1>
          <p className="text-sm text-slate-400 mt-0.5">Bitácora de intervenciones operativas</p>
        </div>
        <div className="flex items-center gap-2">
          {!!incidents?.length && (
            <button
              onClick={() => downloadPdf(
                createElement(IncidentsReport, { incidents: incidents ?? [], companies: companies ?? [] }),
                `nodo360_emergencias_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" />Nueva emergencia
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total registradas', value: stats?.total ?? 0, icon: ShieldAlert, color: 'text-white', bg: 'bg-slate-800', iconColor: 'text-slate-400' },
          { label: 'Este mes', value: stats?.thisMonth ?? 0, icon: Timer, color: 'text-blue-400', bg: 'bg-blue-600/10', iconColor: 'text-blue-400' },
          { label: 'En curso', value: stats?.open ?? 0, icon: Radio, color: 'text-yellow-400', bg: 'bg-yellow-600/10', iconColor: 'text-yellow-400' },
          { label: 'Tipos distintos', value: stats?.byType?.length ?? 0, icon: SlidersHorizontal, color: 'text-purple-400', bg: 'bg-purple-600/10', iconColor: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 bg-slate-900/60 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
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

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, tipo o dirección..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all">
          <option value="">Todos los tipos</option>
          {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all">
          <option value="">Todos los estados</option>
          <option value="active">En curso</option>
          <option value="open">Sin cerrar</option>
          <option value="closed">Cerradas</option>
        </select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inc: any) => {
            const status = statusOf(inc);
            const TypeIcon = TYPE_ICONS[inc.type] ?? ShieldAlert;
            const banner = TYPE_BANNER[inc.type] ?? TYPE_BANNER.default;
            const dur = duration(inc.dispatchedAt, inc.closedAt ?? inc.arrivedAt);
            return (
              <div key={inc.id} onClick={() => setSelected(inc)}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30">

                {/* Banner */}
                <div className={`bg-gradient-to-r ${banner} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${TYPE_COLORS[inc.type] ?? TYPE_COLORS['Otro']}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-white text-xs">{inc.code}</p>
                      <p className="text-[10px] text-slate-400">
                        {inc.type}
                        {inc.dispatchSource === 'BOTONERA' && <span className="ml-1 text-red-400">· Botonera</span>}
                        {inc.emergencyPlanId && <span className="ml-1 text-amber-400">· Plan</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                    </span>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-tight line-clamp-1">{inc.address}</p>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{inc.description}</p>

                  {/* Timeline compacto */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 mb-3">
                    <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">🚨 {fmt(inc.dispatchedAt)}</span>
                    {inc.arrivedAt && <><span>→</span><span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">📍 {fmt(inc.arrivedAt)}</span></>}
                    {inc.closedAt && <><span>→</span><span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">✅ {fmt(inc.closedAt)}</span></>}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inc.participants?.length ?? 0} bomberos</span>
                      {dur && <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{dur}</span>}
                      {inc.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />Cía. {inc.company.number}</span>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Header modal */}
            {(() => {
              const TypeIcon = TYPE_ICONS[selected.type] ?? ShieldAlert;
              const banner = TYPE_BANNER[selected.type] ?? TYPE_BANNER.default;
              const status = statusOf(selected);
              return (
                <div className={`bg-gradient-to-r ${banner} p-5 rounded-t-2xl border-b border-slate-800`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${TYPE_COLORS[selected.type] ?? TYPE_COLORS['Otro']}`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white text-lg">{selected.code}</p>
                        <p className="text-slate-300 text-sm">{selected.type}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })()}

            <div className="p-5 space-y-4">
              {/* Foto del incidente */}
              {selected.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700 h-48">
                  <img src={selected.imageUrl} alt="Foto del incidente" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Dirección y descripción */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{selected.address}</p>
                  <p className="text-xs text-slate-500 mt-1">{selected.description}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-800/60 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Línea de tiempo</p>
                <div className="space-y-2">
                  {[
                    { label: 'Despacho', time: selected.dispatchedAt, icon: '🚨', active: true },
                    { label: 'Llegada al lugar', time: selected.arrivedAt, icon: '📍', active: !!selected.arrivedAt },
                    { label: 'Cierre / Regreso', time: selected.closedAt, icon: '✅', active: !!selected.closedAt },
                  ].map(ev => (
                    <div key={ev.label} className={`flex items-center gap-3 ${ev.active ? '' : 'opacity-30'}`}>
                      <span className="text-sm w-5 text-center">{ev.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">{ev.label}</p>
                        <p className="text-xs font-semibold text-slate-200">{ev.time ? fmtFull(ev.time) : 'Pendiente'}</p>
                      </div>
                      {ev.label === 'Llegada al lugar' && selected.dispatchedAt && selected.arrivedAt && (
                        <span className="text-[10px] text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
                          +{duration(selected.dispatchedAt, selected.arrivedAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {selected.dispatchedAt && selected.closedAt && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-400">Duración total: <span className="font-semibold text-slate-200">{duration(selected.dispatchedAt, selected.closedAt)}</span></span>
                  </div>
                )}
              </div>

              {detail?.emergencyPlan && (
                <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Plan de emergencia</p>
                        <p className="text-sm font-medium text-slate-200">{detail.emergencyPlan.title}</p>
                        <p className="text-[10px] text-slate-500">v{detail.emergencyPlan.version} · {detail.emergencyPlan.emergencyType}</p>
                      </div>
                    </div>
                    <Link to="/emergency-plans" className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 shrink-0">Ver planes →</Link>
                  </div>
                  {(detail.planChecklist?.length ?? 0) > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-400 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Checklist operativo</p>
                        <span className="text-[10px] font-mono text-amber-400">{detail.checklistProgress?.checked ?? 0}/{detail.checklistProgress?.total ?? 0} ({detail.checklistProgress?.percent ?? 0}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${detail.checklistProgress?.percent ?? 0}%` }} />
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {(detail.planChecklist as any[]).map((item: any) => (
                          <label key={item.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${item.checked ? 'bg-emerald-950/40 border-emerald-700/40' : 'bg-slate-800/50 border-slate-700'}`}>
                            <input type="checkbox" checked={!!item.checked} disabled={updateChecklist.isPending} onChange={(e) => toggleChecklistItem(item.id, e.target.checked)} className="accent-amber-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${item.checked ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{item.text}{item.required && <span className="text-red-400 ml-1">*</span>}</p>
                              {item.checkedAt && <p className="text-[10px] text-slate-600 mt-0.5"><ClipboardCheck className="w-3 h-3 inline" /> {fmt(item.checkedAt)}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">El plan no tiene checklist definido</p>
                  )}
                </div>
              )}
              {!detail?.emergencyPlan && (
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 text-xs text-slate-500">
                  Sin plan activo. <Link to="/emergency-plans" className="text-amber-400 hover:underline">Planes de emergencia</Link>
                </div>
              )}

              {selected.vehicles?.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Vehículos</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.vehicles.map((iv: any) => (
                      <span key={iv.id} className="text-xs font-mono bg-orange-600/15 text-orange-300 border border-orange-500/30 px-2 py-1 rounded-lg">
                        {iv.vehicle?.patent} — {iv.vehicle?.brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Informe */}
              {selected.report && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Informe post-incidente</p>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{selected.report}</p>
                </div>
              )}

              {/* Personal */}
              {selected.participants?.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Personal participante ({selected.participants.length})</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.participants.map((p: any) => (
                      <span key={p.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg">
                        <span className="w-5 h-5 bg-red-600/20 rounded-md flex items-center justify-center text-[10px] font-bold text-red-400">
                          {p.user.firstName[0]}{p.user.lastName[0]}
                        </span>
                        {p.user.firstName} {p.user.lastName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleEdit(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors">
                  <Pencil className="w-3.5 h-3.5" />Editar
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar ${selected.code}?`)) remove.mutate(selected.id); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
