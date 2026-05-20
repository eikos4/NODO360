import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Wrench, Truck, Calendar, DollarSign,
  Building2, X, CheckCircle2, Search, ChevronRight,
  ShieldCheck, AlertTriangle, ClipboardList, Fuel,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const TYPE_META: Record<string, { label: string; color: string; banner: string; icon: any }> = {
  PREVENTIVA: { label: 'Preventiva', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   banner: 'from-blue-900/50 to-blue-950/70',   icon: ShieldCheck },
  CORRECTIVA: { label: 'Correctiva', color: 'bg-red-500/20 text-red-400 border-red-500/30',     banner: 'from-red-900/50 to-red-950/70',     icon: AlertTriangle },
  REVISION:   { label: 'Revisión',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', banner: 'from-yellow-900/40 to-yellow-950/70', icon: ClipboardList },
};
const TYPES = ['PREVENTIVA', 'CORRECTIVA', 'REVISION'];

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = (n?: number) => n != null ? `$${n.toLocaleString('es-CL')}` : '—';
const EMPTY = { type: 'PREVENTIVA', description: '', cost: '', date: '', workshopName: '', vehicleId: '' };
const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  const { data: records, isLoading } = useQuery({ queryKey: ['maintenance'], queryFn: () => api.get('/maintenance').then(r => r.data) });
  const { data: stats } = useQuery({ queryKey: ['maintenance-stats'], queryFn: () => api.get('/maintenance/stats').then(r => r.data) });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/vehicles').then(r => r.data) });

  const create = useMutation({ mutationFn: (d: any) => api.post('/maintenance', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['maintenance-stats'] }); qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Mantención registrada'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const update = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/maintenance/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/maintenance/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['maintenance-stats'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleEdit = (r: any) => {
    setEditing(r); setSelected(null);
    setForm({ ...r, cost: r.cost ?? '', date: r.date?.slice(0, 10) ?? '', workshopName: r.workshopName ?? '' });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = { ...form, cost: form.cost !== '' ? Number(form.cost) : undefined, workshopName: form.workshopName || undefined };
    editing ? update.mutate({ id: editing.id, d }) : create.mutate(d);
  };

  const filtered = (records ?? []).filter((r: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${r.description} ${r.workshopName ?? ''} ${r.vehicle?.patent ?? ''}`.toLowerCase().includes(q);
    const matchT = !filterType || r.type === filterType;
    const matchV = !filterVehicle || r.vehicleId === filterVehicle;
    return matchQ && matchT && matchV;
  });

  const totalCost = stats?.totalCost ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Mantención</h1>
          <p className="text-sm text-slate-400 mt-0.5">Historial de mantenciones preventivas y correctivas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/fleet-logs"
            className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            <Fuel className="w-4 h-4" /> Libro flota
          </Link>
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" />Nueva mantención
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total registros', value: stats?.total ?? 0, icon: Wrench, color: 'text-white', bg: 'bg-slate-800', ic: 'text-slate-400' },
          { label: 'Este año', value: stats?.thisYear ?? 0, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-600/10', ic: 'text-blue-400' },
          { label: 'Costo total', value: `$${totalCost.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-600/10', ic: 'text-emerald-400' },
          { label: 'Tipos activos', value: stats?.byType?.length ?? 0, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-600/10', ic: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 bg-slate-900/60 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.ic}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose por tipo */}
      {stats?.byType?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Desglose por tipo</p>
          <div className="flex flex-wrap gap-3">
            {stats.byType.map((b: any) => {
              const meta = TYPE_META[b.type];
              const TypeIcon = meta.icon;
              return (
                <div key={b.type} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${meta.color} cursor-pointer ${filterType === b.type ? 'ring-1 ring-offset-1 ring-offset-slate-900' : ''}`}
                  onClick={() => setFilterType(filterType === b.type ? '' : b.type)}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <span className="text-xs opacity-70">{b.count} · {money(b.cost)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar mantención' : 'Registrar nueva mantención'}</h2>
                <p className="text-xs text-slate-500">Completa los datos del servicio</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Tipo de mantención</label>
              <select value={form.type} onChange={set('type')} className={inputCls}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Vehículo</label>
              <select value={form.vehicleId} onChange={set('vehicleId')} required className={inputCls}>
                <option value="">Seleccionar vehículo...</option>
                {vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.patent} — {v.brand} {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha</label>
              <input type="date" value={form.date} onChange={set('date')} required className={inputCls} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Descripción del trabajo realizado</label>
              <textarea value={form.description} onChange={set('description')} required rows={2} placeholder="Detalla el trabajo, piezas cambiadas, etc." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Taller / Proveedor</label>
              <input value={form.workshopName} onChange={set('workshopName')} placeholder="Ej: Taller Central Bomberos" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Costo ($)</label>
              <input type="number" value={form.cost} onChange={set('cost')} min={0} placeholder="0" className={inputCls} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={create.isPending || update.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Registrar mantención'}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción, taller o patente..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all">
          <option value="">Todos los tipos</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <div className="relative">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all appearance-none">
            <option value="">Todos los vehículos</option>
            {vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.patent} — {v.brand} {v.model}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin mantenciones registradas</p>
          <p className="text-slate-600 text-sm mt-1">Ajusta los filtros o registra la primera mantención</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r: any) => {
            const meta = TYPE_META[r.type] ?? TYPE_META.PREVENTIVA;
            const TypeIcon = meta.icon;
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30">

                {/* Banner */}
                <div className={`bg-gradient-to-r ${meta.banner} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${meta.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${meta.color.split(' ')[1]}`}>{meta.label}</p>
                      <p className="text-[10px] text-slate-500">{fmt(r.date)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                    <Calendar className="w-2.5 h-2.5" />{fmt(r.date)}
                  </span>
                </div>

                {/* Cuerpo */}
                <div className="p-4">
                  {/* Vehículo */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-slate-200 text-sm">{r.vehicle?.patent ?? '—'}</p>
                      <p className="text-[11px] text-slate-500">{r.vehicle?.brand} {r.vehicle?.model} {r.vehicle?.year}</p>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{r.description}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {r.workshopName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{r.workshopName}
                        </span>
                      )}
                      {r.cost != null && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <DollarSign className="w-3 h-3" />{r.cost.toLocaleString('es-CL')}
                        </span>
                      )}
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            {(() => {
              const meta = TYPE_META[selected.type] ?? TYPE_META.PREVENTIVA;
              const TypeIcon = meta.icon;
              return (
                <>
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${meta.banner} p-5 rounded-t-2xl border-b border-slate-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${meta.color}`}>
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${meta.color.split(' ')[1]}`}>{meta.label}</p>
                          <p className="text-white font-semibold">{fmt(selected.date)}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Datos */}
                  <div className="p-5 space-y-3">
                    {/* Vehículo */}
                    <div className="bg-slate-800/60 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehículo</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Truck className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-slate-200">{selected.vehicle?.patent}</p>
                          <p className="text-xs text-slate-500">{selected.vehicle?.brand} {selected.vehicle?.model} {selected.vehicle?.year}</p>
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="bg-slate-800/60 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Trabajo realizado</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
                    </div>

                    {/* Taller y costo */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Taller</p>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-sm text-slate-200 truncate">{selected.workshopName ?? 'No especificado'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Costo</p>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-sm font-bold text-emerald-400">{money(selected.cost)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleEdit(selected)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors">
                        <Pencil className="w-3.5 h-3.5" />Editar
                      </button>
                      <button onClick={() => { if (confirm('¿Eliminar esta mantención?')) remove.mutate(selected.id); }}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />Eliminar
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
