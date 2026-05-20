import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Truck, Package, Pencil, Trash2, AlertTriangle,
  Search, X, ChevronRight, Camera, ImageOff,
  CheckCircle2, Clock, WrenchIcon, Gauge, Building2,
  CalendarDays, Hash, Tag, FileDown, ClipboardCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { InventoryReport } from '../lib/pdf/InventoryReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

const STATUS_META: Record<string, { label: string; color: string; border: string; dot: string }> = {
  OPERATIVO:         { label: 'Operativo',        color: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  EN_REPARACION:     { label: 'En reparación',    color: 'bg-yellow-500/15 text-yellow-400',   border: 'border-yellow-500/30',  dot: 'bg-yellow-400' },
  FUERA_DE_SERVICIO: { label: 'Fuera de servicio', color: 'bg-red-500/15 text-red-400',        border: 'border-red-500/30',     dot: 'bg-red-400' },
};
const STATUSES = ['OPERATIVO', 'EN_REPARACION', 'FUERA_DE_SERVICIO'];
const VEHICLE_TYPES = ['Carro Bomba', 'Autobomba', 'Carro Escala', 'Carro Rescate', 'Carro HazMat', 'Ambulancia', 'Vehículo Liviano', 'Otro'];
const EQUIPMENT_CATEGORIES = ['EPP', 'ERA', 'Herramienta', 'Material Médico', 'Material HazMat', 'Comunicaciones', 'Rescate', 'Otro'];

const CAT_COLORS: Record<string, string> = {
  EPP: 'bg-blue-600/10 text-blue-400', ERA: 'bg-orange-600/10 text-orange-400',
  Herramienta: 'bg-slate-600/10 text-slate-400', 'Material Médico': 'bg-pink-600/10 text-pink-400',
  'Material HazMat': 'bg-yellow-600/10 text-yellow-400', Comunicaciones: 'bg-cyan-600/10 text-cyan-400',
  Rescate: 'bg-purple-600/10 text-purple-400', Otro: 'bg-slate-600/10 text-slate-400',
};

type Tab = 'vehicles' | 'equipment';
const EMPTY_V = { patent: '', brand: '', model: '', year: new Date().getFullYear(), type: 'Carro Bomba', status: 'OPERATIVO', kilometers: 0, lastMaintenanceAt: '', nextMaintenanceAt: '', companyId: '', imageUrl: '' };
const EMPTY_E = { name: '', code: '', category: 'EPP', status: 'OPERATIVO', serial: '', purchaseDate: '', expiresAt: '', notes: '', companyId: '', imageUrl: '', quantity: 1 };

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const isExpired = (d?: string) => !!d && new Date(d) < new Date();
const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition-colors';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('vehicles');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [vForm, setVForm] = useState<any>(EMPTY_V);
  const [eForm, setEForm] = useState<any>(EMPTY_E);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCia, setFilterCia] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: vehicles, isLoading: loadingV } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/vehicles').then(r => r.data) });
  const { data: equipment, isLoading: loadingE } = useQuery({ queryKey: ['equipment'], queryFn: () => api.get('/equipment').then(r => r.data) });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });

  const createV = useMutation({ mutationFn: (d: any) => api.post('/vehicles', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Vehículo creado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const updateV = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/vehicles/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const deleteV = useMutation({ mutationFn: (id: string) => api.delete(`/vehicles/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Eliminado'); setDetail(null); }, onError: () => toast.error('Error al eliminar') });

  const createE = useMutation({ mutationFn: (d: any) => api.post('/equipment', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); toast.success('Equipo creado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const updateE = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/equipment/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const deleteE = useMutation({ mutationFn: (id: string) => api.delete(`/equipment/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); toast.success('Eliminado'); setDetail(null); }, onError: () => toast.error('Error al eliminar') });

  const reset = () => { setShowForm(false); setEditing(null); setVForm(EMPTY_V); setEForm(EMPTY_E); };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const endpoint = tab === 'vehicles' ? '/vehicles/upload-image' : '/equipment/upload-image';
      const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (tab === 'vehicles') setVForm((f: any) => ({ ...f, imageUrl: data.imageUrl }));
      else setEForm((f: any) => ({ ...f, imageUrl: data.imageUrl }));
      toast.success('Imagen cargada');
    } catch { toast.error('Error al subir imagen'); }
    finally { setUploadingImg(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'vehicles') {
      const d = { ...vForm, year: Number(vForm.year), kilometers: Number(vForm.kilometers), lastMaintenanceAt: vForm.lastMaintenanceAt || undefined, nextMaintenanceAt: vForm.nextMaintenanceAt || undefined, imageUrl: vForm.imageUrl || undefined };
      editing ? updateV.mutate({ id: editing.id, d }) : createV.mutate(d);
    } else {
      const d = { ...eForm, purchaseDate: eForm.purchaseDate || undefined, expiresAt: eForm.expiresAt || undefined, serial: eForm.serial || undefined, notes: eForm.notes || undefined, imageUrl: eForm.imageUrl || undefined, quantity: Number(eForm.quantity) || 1 };
      editing ? updateE.mutate({ id: editing.id, d }) : createE.mutate(d);
    }
  };

  const openEditV = (v: any) => { setEditing(v); setVForm({ ...v, lastMaintenanceAt: v.lastMaintenanceAt?.slice(0, 10) ?? '', nextMaintenanceAt: v.nextMaintenanceAt?.slice(0, 10) ?? '', imageUrl: v.imageUrl ?? '' }); setShowForm(true); setDetail(null); };
  const openEditE = (eq: any) => { setEditing(eq); setEForm({ ...eq, purchaseDate: eq.purchaseDate?.slice(0, 10) ?? '', expiresAt: eq.expiresAt?.slice(0, 10) ?? '', imageUrl: eq.imageUrl ?? '' }); setShowForm(true); setDetail(null); };

  const setV = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setVForm((f: any) => ({ ...f, [k]: e.target.value }));
  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setEForm((f: any) => ({ ...f, [k]: e.target.value }));

  const isLoading = tab === 'vehicles' ? loadingV : loadingE;
  const isPending = tab === 'vehicles' ? (createV.isPending || updateV.isPending) : (createE.isPending || updateE.isPending);
  const curForm = tab === 'vehicles' ? vForm : eForm;

  const rawItems = tab === 'vehicles' ? (vehicles ?? []) : (equipment ?? []);
  const filtered = rawItems.filter((item: any) => {
    const q = search.toLowerCase();
    const matchSearch = tab === 'vehicles'
      ? (`${item.patent} ${item.brand} ${item.model} ${item.type}`).toLowerCase().includes(q)
      : (`${item.name} ${item.code} ${item.category}`).toLowerCase().includes(q);
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchCia = !filterCia || item.companyId === filterCia;
    return matchSearch && matchStatus && matchCia;
  });

  const totalItems = rawItems.length;
  const operativos = rawItems.filter((i: any) => i.status === 'OPERATIVO').length;
  const enRep = rawItems.filter((i: any) => i.status === 'EN_REPARACION').length;
  const fuera = rawItems.filter((i: any) => i.status === 'FUERA_DE_SERVICIO').length;
  const opRate = totalItems > 0 ? Math.round((operativos / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Inventario Operativo</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vehículos y equipamiento de las compañías</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/inventory-audits"
            className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />Auditoría física
          </Link>
          {(!!vehicles?.length || !!equipment?.length) && (
            <button
              onClick={() => downloadPdf(
                createElement(InventoryReport, { vehicles: vehicles ?? [], equipment: equipment ?? [], companies: companies ?? [] }),
                `nodo360_inventario_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" />Nuevo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {([['vehicles', Truck, 'Vehículos'], ['equipment', Package, 'Equipamiento']] as const).map(([id, Icon, label]) => (
          <button key={id} onClick={() => { setTab(id); reset(); setSearch(''); setFilterStatus(''); setFilterCia(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totalItems, icon: () => tab === 'vehicles' ? Truck : Package, color: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-700' },
            { label: 'Operativos', value: operativos, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-600/20' },
            { label: 'En reparación', value: enRep, icon: WrenchIcon, color: 'text-yellow-400', bg: 'bg-yellow-600/10', border: 'border-yellow-600/20' },
            { label: 'Fuera de servicio', value: fuera, icon: AlertTriangle, color: 'text-red-400', bg: fuera > 0 ? 'bg-red-600/10' : 'bg-slate-800', border: fuera > 0 ? 'border-red-600/20' : 'border-slate-700' },
          ].map((k, i) => {
            const Icon = i === 0 ? (tab === 'vehicles' ? Truck : Package) : k.icon as any;
            return (
              <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-slate-500 font-medium">{k.label}</p>
                  <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra operatividad */}
      {!isLoading && totalItems > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-400">Tasa de operatividad</p>
            </div>
            <span className={`text-sm font-bold ${opRate >= 70 ? 'text-emerald-400' : opRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{opRate}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-700 ${opRate >= 70 ? 'bg-emerald-500' : opRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${opRate}%` }} />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'vehicles' ? 'Patente, marca, modelo...' : 'Nombre, código, categoría...'}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /></button>}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={filterCia} onChange={e => setFilterCia(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
          <option value="">Todas las compañías</option>
          {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
        </select>
        {(search || filterStatus || filterCia) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCia(''); }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-2 rounded-xl border border-slate-700 hover:border-red-600/30 transition-colors">
            <X className="w-3 h-3" />Limpiar
          </button>
        )}
      </div>

      {/* Formulario modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">{editing ? 'Editar' : 'Nuevo'} {tab === 'vehicles' ? 'Vehículo' : 'Equipo'}</h2>
              <button onClick={reset} className="p-2 hover:bg-slate-800 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Upload imagen */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Imagen (opcional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                    {curForm.imageUrl
                      ? <img src={curForm.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      : <ImageOff className="w-8 h-8 text-slate-600" />}
                  </div>
                  <div className="space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                      <Camera className="w-3.5 h-3.5" />{uploadingImg ? 'Subiendo...' : 'Seleccionar imagen'}
                    </button>
                    {curForm.imageUrl && (
                      <button type="button" onClick={() => tab === 'vehicles' ? setVForm((f: any) => ({ ...f, imageUrl: '' })) : setEForm((f: any) => ({ ...f, imageUrl: '' }))}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                        <X className="w-3 h-3" />Quitar imagen
                      </button>
                    )}
                    <p className="text-[11px] text-slate-600">JPG, PNG, WEBP — máx. 10MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tab === 'vehicles' ? (
                  <>
                    {[['Patente *', 'patent', true], ['Marca *', 'brand', true], ['Modelo *', 'model', true]].map(([label, key, req]: any) => (
                      <div key={key}><label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                        <input value={vForm[key]} onChange={setV(key)} required={req} className={inp} /></div>
                    ))}
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Año *</label>
                      <input type="number" value={vForm.year} onChange={setV('year')} required min={1900} max={2100} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo *</label>
                      <select value={vForm.type} onChange={setV('type')} className={inp}>
                        {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
                      <select value={vForm.status} onChange={setV('status')} className={inp}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Kilómetros</label>
                      <input type="number" value={vForm.kilometers} onChange={setV('kilometers')} min={0} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Última mantención</label>
                      <input type="date" value={vForm.lastMaintenanceAt} onChange={setV('lastMaintenanceAt')} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Próxima mantención</label>
                      <input type="date" value={vForm.nextMaintenanceAt} onChange={setV('nextMaintenanceAt')} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Compañía *</label>
                      <select value={vForm.companyId} onChange={setV('companyId')} required className={inp}>
                        <option value="">Seleccionar...</option>
                        {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}</select></div>
                  </>
                ) : (
                  <>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre *</label>
                      <input value={eForm.name} onChange={setE('name')} required className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Código *</label>
                      <input value={eForm.code} onChange={setE('code')} required className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría *</label>
                      <select value={eForm.category} onChange={setE('category')} className={inp}>
                        {EQUIPMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
                      <select value={eForm.status} onChange={setE('status')} className={inp}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">N° Serie</label>
                      <input value={eForm.serial} onChange={setE('serial')} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha compra</label>
                      <input type="date" value={eForm.purchaseDate} onChange={setE('purchaseDate')} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Vencimiento</label>
                      <input type="date" value={eForm.expiresAt} onChange={setE('expiresAt')} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Cantidad</label>
                      <input type="number" value={eForm.quantity} onChange={setE('quantity')} min={1} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1.5">Compañía *</label>
                      <select value={eForm.companyId} onChange={setE('companyId')} required className={inp}>
                        <option value="">Seleccionar...</option>
                        {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}</select></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-medium text-slate-400 mb-1.5">Notas</label>
                      <textarea value={eForm.notes} onChange={setE('notes')} rows={2} className={`${inp} resize-none`} /></div>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button type="submit" disabled={isPending || uploadingImg}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
                  {editing ? 'Guardar cambios' : 'Crear'}
                </button>
                <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Imagen header */}
            <div className="relative h-48 bg-slate-800 overflow-hidden">
              {detail.imageUrl
                ? <img src={detail.imageUrl} alt="foto" className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full">{tab === 'vehicles' ? <Truck className="w-16 h-16 text-slate-700" /> : <Package className="w-16 h-16 text-slate-700" />}</div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-300" />
              </button>
              <div className="absolute bottom-3 left-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_META[detail.status].color} ${STATUS_META[detail.status].border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[detail.status].dot}`} />
                  {STATUS_META[detail.status].label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {tab === 'vehicles' ? `${detail.brand} ${detail.model}` : detail.name}
                </h2>
                <p className="text-sm text-slate-400">
                  {tab === 'vehicles' ? `Patente: ${detail.patent}` : `Código: ${detail.code}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tab === 'vehicles' ? (
                  <>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" />Tipo</p><p className="text-sm font-semibold text-slate-200">{detail.type}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />Año</p><p className="text-sm font-semibold text-slate-200">{detail.year}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Gauge className="w-3 h-3" />Kilómetros</p><p className="text-sm font-semibold text-slate-200">{detail.kilometers?.toLocaleString('es-CL')} km</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />Compañía</p><p className="text-sm font-semibold text-slate-200">Cía. {detail.company?.number}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Última mantención</p><p className="text-sm font-semibold text-slate-200">{fmtDate(detail.lastMaintenanceAt)}</p></div>
                    <div className={`rounded-xl p-3 ${isExpired(detail.nextMaintenanceAt) ? 'bg-red-600/10 border border-red-600/20' : 'bg-slate-800/60'}`}>
                      <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Próx. mantención</p>
                      <p className={`text-sm font-semibold ${isExpired(detail.nextMaintenanceAt) ? 'text-red-400' : 'text-slate-200'}`}>{fmtDate(detail.nextMaintenanceAt)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" />Categoría</p><p className="text-sm font-semibold text-slate-200">{detail.category}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />N° Serie</p><p className="text-sm font-semibold text-slate-200 font-mono">{detail.serial || '—'}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />Compañía</p><p className="text-sm font-semibold text-slate-200">Cía. {detail.company?.number}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />Fecha compra</p><p className="text-sm font-semibold text-slate-200">{fmtDate(detail.purchaseDate)}</p></div>
                    <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Cantidad</p><p className="text-sm font-semibold text-slate-200">{detail.quantity ?? 1} unid.</p></div>
                    <div className={`col-span-2 rounded-xl p-3 ${isExpired(detail.expiresAt) ? 'bg-red-600/10 border border-red-600/20' : 'bg-slate-800/60'}`}>
                      <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencimiento</p>
                      <p className={`text-sm font-semibold ${isExpired(detail.expiresAt) ? 'text-red-400' : 'text-slate-200'}`}>{fmtDate(detail.expiresAt)}</p>
                    </div>
                    {detail.notes && <div className="col-span-2 bg-slate-800/40 rounded-xl p-3"><p className="text-[10px] text-slate-500 mb-1">Notas</p><p className="text-xs text-slate-300">{detail.notes}</p></div>}
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => tab === 'vehicles' ? openEditV(detail) : openEditE(detail)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
                  <Pencil className="w-3.5 h-3.5" />Editar
                </button>
                <button onClick={() => { if (confirm('¿Eliminar este elemento?')) tab === 'vehicles' ? deleteV.mutate(detail.id) : deleteE.mutate(detail.id); }}
                  className="flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-52 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          {tab === 'vehicles' ? <Truck className="w-12 h-12 text-slate-700 mx-auto mb-3" /> : <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />}
          <p className="text-slate-400 font-medium">{search || filterStatus || filterCia ? 'Sin resultados para los filtros aplicados' : `Sin ${tab === 'vehicles' ? 'vehículos' : 'equipamiento'} registrado`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => {
            const sm = STATUS_META[item.status];
            const expiredDate = tab === 'vehicles' ? isExpired(item.nextMaintenanceAt) : isExpired(item.expiresAt);
            return (
              <div key={item.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden hover:border-slate-600 transition-all cursor-pointer group ${expiredDate ? 'border-red-600/40' : 'border-slate-800'}`}
                onClick={() => setDetail(item)}>
                {/* Imagen */}
                <div className="relative h-36 bg-slate-800 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt="foto" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900">
                        {tab === 'vehicles' ? <Truck className="w-12 h-12 text-slate-700" /> : <Package className="w-12 h-12 text-slate-700" />}
                      </div>
                  }
                  {expiredDate && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />VENCIDO
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${sm.color} ${sm.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot} ${item.status === 'OPERATIVO' ? '' : 'animate-pulse'}`} />
                      {sm.label}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {tab === 'vehicles' ? `${item.brand} ${item.model}` : item.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {tab === 'vehicles' ? item.patent : item.code}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
                  </div>

                  <div className="flex items-center justify-between">
                    {tab === 'vehicles' ? (
                      <>
                        <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-lg">{item.type}</span>
                        <span className="text-[11px] text-slate-500">{item.year} · {item.kilometers?.toLocaleString() ?? 0} km</span>
                      </>
                    ) : (
                      <>
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${CAT_COLORS[item.category] ?? 'bg-slate-800 text-slate-400'}`}>{item.category}</span>
                        <span className="text-[11px] text-slate-500">{item.quantity ?? 1} unid. · Cía. {item.company?.number}</span>
                      </>
                    )}
                  </div>

                  {tab === 'vehicles' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                      <Building2 className="w-3 h-3" />Cía. {item.company?.number} — {item.company?.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
