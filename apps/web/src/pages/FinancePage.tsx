import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown,
  X, Search, Building2, BarChart3, Receipt, ShoppingCart,
  CheckCircle2, AlertTriangle, Wallet, PiggyBank, Target,
  ChevronRight, StickyNote, CalendarDays, FileDown,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { FinanceReport } from '../lib/pdf/FinanceReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

const CATEGORIES = ['EQUIPAMIENTO', 'VEHICULOS', 'PERSONAL', 'OPERACIONAL', 'INFRAESTRUCTURA', 'CAPACITACION', 'OTRO'];

const CAT_META: Record<string, { label: string; color: string; bar: string; bg: string; border: string; icon: string }> = {
  EQUIPAMIENTO:    { label: 'Equipamiento',    color: 'text-blue-400',    bar: 'bg-blue-500',    bg: 'bg-blue-600/15',    border: 'border-blue-600/30',    icon: '🛡️' },
  VEHICULOS:       { label: 'Vehículos',        color: 'text-orange-400',  bar: 'bg-orange-500',  bg: 'bg-orange-600/15',  border: 'border-orange-600/30',  icon: '🚒' },
  PERSONAL:        { label: 'Personal',         color: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', icon: '👥' },
  OPERACIONAL:     { label: 'Operacional',      color: 'text-red-400',     bar: 'bg-red-500',     bg: 'bg-red-600/15',     border: 'border-red-600/30',     icon: '⚙️' },
  INFRAESTRUCTURA: { label: 'Infraestructura',  color: 'text-purple-400',  bar: 'bg-purple-500',  bg: 'bg-purple-600/15',  border: 'border-purple-600/30',  icon: '🏗️' },
  CAPACITACION:    { label: 'Capacitación',     color: 'text-yellow-400',  bar: 'bg-yellow-500',  bg: 'bg-yellow-600/15',  border: 'border-yellow-600/30',  icon: '📚' },
  OTRO:            { label: 'Otro',             color: 'text-slate-400',   bar: 'bg-slate-500',   bg: 'bg-slate-700/30',   border: 'border-slate-600/30',   icon: '📦' },
};

const money = (n: number) => `$${n.toLocaleString('es-CL')}`;
const rateColor = (r: number) => r > 90 ? 'text-red-400' : r > 70 ? 'text-yellow-400' : 'text-emerald-400';
const rateBar   = (r: number) => r > 90 ? 'bg-red-500'   : r > 70 ? 'bg-yellow-500'   : 'bg-emerald-500';

const EMPTY = { year: new Date().getFullYear(), category: 'EQUIPAMIENTO', description: '', planned: '', executed: '0', notes: '', companyId: '' };
const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

export default function FinancePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const { data: dash } = useQuery({ queryKey: ['finance-dash'], queryFn: () => api.get('/finance/dashboard').then(r => r.data), refetchInterval: 30000 });
  const { data: budgets, isLoading } = useQuery({ queryKey: ['budgets', year], queryFn: () => api.get('/finance/budgets', { params: { year } }).then(r => r.data) });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });

  const create = useMutation({ mutationFn: (d: any) => api.post('/finance/budgets', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); qc.invalidateQueries({ queryKey: ['finance-dash'] }); toast.success('Presupuesto creado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const update = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/finance/budgets/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); qc.invalidateQueries({ queryKey: ['finance-dash'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/finance/budgets/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); qc.invalidateQueries({ queryKey: ['finance-dash'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleEdit = (b: any) => {
    setEditing(b); setSelected(null);
    setForm({ ...b, planned: b.planned, executed: b.executed, notes: b.notes ?? '', companyId: b.companyId ?? '' });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = { ...form, year: Number(form.year), planned: Number(form.planned), executed: Number(form.executed), notes: form.notes || undefined, companyId: form.companyId || undefined };
    editing ? update.mutate({ id: editing.id, d }) : create.mutate(d);
  };

  const totalPlanned  = dash?.budget?.totalPlanned  ?? 0;
  const totalExecuted = dash?.budget?.totalExecuted ?? 0;
  const execRate      = dash?.budget?.executionRate ?? 0;
  const remaining     = totalPlanned - totalExecuted;

  const filtered = (budgets ?? []).filter((b: any) => {
    const q = search.toLowerCase();
    const mQ = !q || `${b.description} ${CAT_META[b.category]?.label}`.toLowerCase().includes(q);
    const mC = !filterCat || b.category === filterCat;
    return mQ && mC;
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Finanzas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Presupuesto y control de ejecución financiera</p>
        </div>
        <div className="flex items-center gap-2">
          {!!budgets?.length && (
            <button
              onClick={() => downloadPdf(
                createElement(FinanceReport, { budgets: budgets ?? [], dash, year, companies: companies ?? [] }),
                `nodo360_finanzas_${year}_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" />Nuevo presupuesto
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Presupuesto planificado', value: money(totalPlanned), icon: Target, bg: 'bg-blue-600/10', border: 'border-blue-600/20', ic: 'text-blue-400', vc: 'text-blue-400', sub: `Año ${dash?.year ?? currentYear}` },
          { label: 'Monto ejecutado', value: money(totalExecuted), icon: TrendingUp, bg: 'bg-emerald-600/10', border: 'border-emerald-600/20', ic: 'text-emerald-400', vc: 'text-emerald-400', sub: `${execRate}% del presupuesto` },
          { label: 'Saldo disponible', value: money(Math.max(remaining, 0)), icon: remaining >= 0 ? PiggyBank : TrendingDown, bg: remaining >= 0 ? 'bg-slate-800' : 'bg-red-600/10', border: remaining >= 0 ? 'border-slate-700' : 'border-red-600/20', ic: remaining >= 0 ? 'text-slate-400' : 'text-red-400', vc: remaining >= 0 ? 'text-white' : 'text-red-400', sub: remaining < 0 ? `Sobregiro ${money(Math.abs(remaining))}` : 'Sin comprometer' },
          { label: 'Facturas del año', value: money(dash?.invoices?.amount ?? 0), icon: Receipt, bg: 'bg-purple-600/10', border: 'border-purple-600/20', ic: 'text-purple-400', vc: 'text-purple-400', sub: `${dash?.invoices?.total ?? 0} factura${(dash?.invoices?.total ?? 0) !== 1 ? 's' : ''}` },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium leading-tight">{s.label}</p>
              <div className="w-8 h-8 bg-slate-900/50 rounded-xl flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.ic}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${s.vc}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Barra ejecución global */}
      {totalPlanned > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-bold text-white">Ejecución presupuestaria {dash?.year}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{money(totalExecuted)} / {money(totalPlanned)}</span>
              <span className={`text-lg font-bold ${rateColor(execRate)}`}>{execRate}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${rateBar(execRate)}`}
              style={{ width: `${Math.min(execRate, 100)}%` }} />
          </div>
          {execRate > 90 && (
            <div className="flex items-center gap-2 mt-3 bg-red-600/10 border border-red-600/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300 font-medium">Presupuesto casi agotado — revisar compromisos pendientes</p>
            </div>
          )}

          {/* Breakdown por categoría */}
          {dash?.byCategory?.length > 0 && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {dash.byCategory.map((c: any) => {
                const meta = CAT_META[c.category] ?? CAT_META.OTRO;
                return (
                  <div key={c.category} className={`${meta.bg} border ${meta.border} rounded-xl p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base leading-none">{meta.icon}</span>
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${rateColor(c.rate)}`}>{c.rate}%</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{money(c.executed)} / {money(c.planned)}</p>
                    <div className="mt-2 w-full bg-slate-700/60 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${meta.bar}`} style={{ width: `${Math.min(c.rate, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resumen OC + Facturas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 bg-orange-600/15 rounded-2xl flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Órdenes de compra del año</p>
            <p className="text-xl font-bold text-orange-400">{money(dash?.purchases?.amount ?? 0)}</p>
            <p className="text-[11px] text-slate-500">{dash?.purchases?.total ?? 0} orden{(dash?.purchases?.total ?? 0) !== 1 ? 'es' : ''} registrada{(dash?.purchases?.total ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 bg-purple-600/15 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total facturado del año</p>
            <p className="text-xl font-bold text-purple-400">{money(dash?.invoices?.amount ?? 0)}</p>
            <p className="text-[11px] text-slate-500">{dash?.invoices?.total ?? 0} factura{(dash?.invoices?.total ?? 0) !== 1 ? 's' : ''} registrada{(dash?.invoices?.total ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h2>
                <p className="text-xs text-slate-500">Completa los campos requeridos</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Año</label>
              <input type="number" value={form.year} onChange={set('year')} required min={2000} max={2100} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Categoría</label>
              <select value={form.category} onChange={set('category')} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].icon} {CAT_META[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
              <select value={form.companyId} onChange={set('companyId')} required className={inputCls}>
                <option value="">Seleccionar compañía...</option>
                {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Descripción</label>
              <input value={form.description} onChange={set('description')} required placeholder="Ej: Compra de equipos de protección personal..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Monto planificado ($)</label>
              <input type="number" value={form.planned} onChange={set('planned')} required min={0} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Monto ejecutado ($)</label>
              <input type="number" value={form.executed} onChange={set('executed')} min={0} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Notas</label>
              <input value={form.notes} onChange={set('notes')} placeholder="Observaciones opcionales..." className={inputCls} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={create.isPending || update.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Crear presupuesto'}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros + selector año */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-transparent text-sm text-slate-300 focus:outline-none">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción o categoría..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].icon} {CAT_META[c].label}</option>)}
        </select>
      </div>

      {/* Cards presupuestos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin presupuestos para {year}</p>
          <p className="text-slate-600 text-sm mt-1">Crea el primer presupuesto del año</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b: any) => {
            const meta = CAT_META[b.category] ?? CAT_META.OTRO;
            const rate = b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0;
            const over = b.executed > b.planned;
            return (
              <div key={b.id} onClick={() => setSelected(b)}
                className={`group bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30 ${over ? 'border-red-600/40 hover:border-red-600/60' : 'border-slate-800 hover:border-slate-600'}`}>
                {/* Banner categoría */}
                <div className={`${meta.bg} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${meta.color}`}>{meta.label}</p>
                      <p className="text-[10px] text-slate-500">Cía. {b.company?.number} — {b.company?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">{b.year}</span>
                    {over && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>
                {/* Body */}
                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-3">{b.description}</p>
                  {/* Barra progreso */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500">Ejecución</span>
                      <span className={`text-xs font-bold ${rateColor(rate)}`}>{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${rateBar(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                    </div>
                  </div>
                  {/* Montos */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-600">Planificado</p>
                      <p className="text-sm font-bold text-slate-300">{money(b.planned)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-600">Ejecutado</p>
                      <p className={`text-sm font-bold ${over ? 'text-red-400' : 'text-emerald-400'}`}>{money(b.executed)}</p>
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
      {selected && (() => {
        const b = selected;
        const meta = CAT_META[b.category] ?? CAT_META.OTRO;
        const rate = b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0;
        const over = b.executed > b.planned;
        const avail = b.planned - b.executed;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`${meta.bg} border-b ${meta.border} p-5 rounded-t-2xl`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${meta.border} bg-slate-900/50 text-2xl`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${meta.color}`}>{meta.label}</p>
                      <p className="text-white font-semibold text-xs mt-0.5">{b.year} · Cía. {b.company?.number}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {/* Descripción */}
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Descripción</p>
                  <p className="text-sm text-slate-200">{b.description}</p>
                </div>

                {/* Barra ejecución */}
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ejecución</p>
                    <span className={`text-lg font-bold ${rateColor(rate)}`}>{rate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${rateBar(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                  </div>
                </div>

                {/* Montos 3 columnas */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Planificado', value: money(b.planned), cls: 'text-slate-200', icon: Target },
                    { label: 'Ejecutado',   value: money(b.executed), cls: over ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold', icon: TrendingUp },
                    { label: avail >= 0 ? 'Disponible' : 'Sobregiro', value: money(Math.abs(avail)), cls: avail >= 0 ? 'text-slate-300' : 'text-red-400 font-bold', icon: avail >= 0 ? PiggyBank : TrendingDown },
                  ].map(({ label, value, cls, icon: Icon }) => (
                    <div key={label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                      <Icon className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className={`text-xs mt-0.5 ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Compañía */}
                <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-200">Cía. {b.company?.number} — {b.company?.name}</p>
                </div>

                {/* Alerta sobregiro */}
                {over && (
                  <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300 font-medium">Presupuesto excedido en {money(Math.abs(avail))}</p>
                  </div>
                )}

                {/* Notas */}
                {b.notes && (
                  <div className="flex items-start gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                    <StickyNote className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">{b.notes}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleEdit(b)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors">
                    <Pencil className="w-3.5 h-3.5" />Editar
                  </button>
                  <button onClick={() => { if (confirm('¿Eliminar este presupuesto?')) remove.mutate(b.id); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
