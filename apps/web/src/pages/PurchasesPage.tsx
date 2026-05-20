import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ShoppingCart, Receipt,
  X, Search, Building2, DollarSign, Calendar,
  CheckCircle2, Clock, XCircle, Package, ChevronRight,
  AlertTriangle, Link2, FileText, Banknote,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'purchases' | 'invoices';

const STATUS_META: Record<string, { label: string; color: string; dot: string; banner: string; icon: any }> = {
  PENDIENTE: { label: 'Pendiente',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',  dot: 'bg-yellow-400', banner: 'from-yellow-900/40 to-yellow-950/60', icon: Clock },
  APROBADA:  { label: 'Aprobada',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        dot: 'bg-blue-400',   banner: 'from-blue-900/40 to-blue-950/60',   icon: CheckCircle2 },
  RECIBIDA:  { label: 'Recibida',   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', banner: 'from-emerald-900/40 to-emerald-950/60', icon: Package },
  RECHAZADA: { label: 'Rechazada',  color: 'bg-red-500/20 text-red-400 border-red-500/30',           dot: 'bg-red-400',    banner: 'from-red-900/40 to-red-950/60',     icon: XCircle },
};
const STATUSES = ['PENDIENTE', 'APROBADA', 'RECIBIDA', 'RECHAZADA'];

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const toInput = (d?: string) => d ? d.slice(0, 10) : '';
const money = (n?: number) => n != null ? `$${n.toLocaleString('es-CL')}` : '—';
const isOverdue = (inv: any) => !inv.paidAt && inv.dueAt && new Date(inv.dueAt) < new Date();

const EMPTY_P = { number: '', description: '', supplier: '', status: 'PENDIENTE', totalAmount: '', approvedAt: '', receivedAt: '', notes: '', companyId: '' };
const EMPTY_I = { number: '', supplier: '', amount: '', fileUrl: '', issuedAt: '', dueAt: '', paidAt: '', notes: '', purchaseId: '', companyId: '' };
const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('purchases');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [pForm, setPForm] = useState<any>(EMPTY_P);
  const [iForm, setIForm] = useState<any>(EMPTY_I);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: purchases, isLoading: loadP } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/purchases').then(r => r.data) });
  const { data: invoices, isLoading: loadI } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices').then(r => r.data) });
  const { data: stats } = useQuery({ queryKey: ['purchases-stats'], queryFn: () => api.get('/purchases/stats').then(r => r.data) });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });

  const createP = useMutation({ mutationFn: (d: any) => api.post('/purchases', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['purchases-stats'] }); toast.success('Orden creada'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const updateP = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/purchases/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const deleteP = useMutation({ mutationFn: (id: string) => api.delete(`/purchases/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['purchases-stats'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });

  const createI = useMutation({ mutationFn: (d: any) => api.post('/invoices', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['purchases-stats'] }); toast.success('Factura registrada'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const updateI = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/invoices/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const deleteI = useMutation({ mutationFn: (id: string) => api.delete(`/invoices/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['purchases-stats'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });

  const reset = () => { setShowForm(false); setEditing(null); setPForm(EMPTY_P); setIForm(EMPTY_I); };

  const setP = (k: string) => (e: React.ChangeEvent<any>) => setPForm((f: any) => ({ ...f, [k]: e.target.value }));
  const setI = (k: string) => (e: React.ChangeEvent<any>) => setIForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleEditP = (p: any) => {
    setEditing(p); setSelected(null);
    setPForm({ ...p, totalAmount: p.totalAmount, approvedAt: toInput(p.approvedAt), receivedAt: toInput(p.receivedAt), notes: p.notes ?? '', companyId: p.companyId ?? '' });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleEditI = (inv: any) => {
    setEditing(inv); setSelected(null);
    setIForm({ ...inv, amount: inv.amount, issuedAt: toInput(inv.issuedAt), dueAt: toInput(inv.dueAt), paidAt: toInput(inv.paidAt), notes: inv.notes ?? '', fileUrl: inv.fileUrl ?? '', purchaseId: inv.purchaseId ?? '', companyId: inv.companyId ?? '' });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'purchases') {
      const d = { ...pForm, totalAmount: Number(pForm.totalAmount), approvedAt: pForm.approvedAt || undefined, receivedAt: pForm.receivedAt || undefined, notes: pForm.notes || undefined, companyId: pForm.companyId || undefined };
      editing ? updateP.mutate({ id: editing.id, d }) : createP.mutate(d);
    } else {
      const d = { ...iForm, amount: Number(iForm.amount), dueAt: iForm.dueAt || undefined, paidAt: iForm.paidAt || undefined, notes: iForm.notes || undefined, fileUrl: iForm.fileUrl || undefined, purchaseId: iForm.purchaseId || undefined, companyId: iForm.companyId || undefined };
      editing ? updateI.mutate({ id: editing.id, d }) : createI.mutate(d);
    }
  };

  const isPending = tab === 'purchases' ? (createP.isPending || updateP.isPending) : (createI.isPending || updateI.isPending);
  const isLoading = tab === 'purchases' ? loadP : loadI;

  const overdueCount = (invoices ?? []).filter((inv: any) => isOverdue(inv)).length;
  const pendingOC = (purchases ?? []).filter((p: any) => p.status === 'PENDIENTE').length;

  const filteredP = (purchases ?? []).filter((p: any) => {
    const q = search.toLowerCase();
    const mQ = !q || `${p.number} ${p.description} ${p.supplier}`.toLowerCase().includes(q);
    const mS = !filterStatus || p.status === filterStatus;
    return mQ && mS;
  });
  const filteredI = (invoices ?? []).filter((inv: any) => {
    const q = search.toLowerCase();
    const mQ = !q || `${inv.number} ${inv.supplier}`.toLowerCase().includes(q);
    return mQ;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Compras y Facturación</h1>
          <p className="text-sm text-slate-400 mt-0.5">Órdenes de compra y registro de facturas</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true); }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" />{tab === 'purchases' ? 'Nueva OC' : 'Nueva factura'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total OC', value: stats?.purchases?.total ?? 0, icon: ShoppingCart, color: 'text-white', bg: 'bg-slate-800', ic: 'text-slate-400' },
          { label: 'OC Pendientes', value: pendingOC, icon: Clock, color: pendingOC > 0 ? 'text-yellow-400' : 'text-white', bg: pendingOC > 0 ? 'bg-yellow-600/10' : 'bg-slate-800', ic: pendingOC > 0 ? 'text-yellow-400' : 'text-slate-500' },
          { label: 'Facturas por pagar', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? 'text-red-400' : 'text-white', bg: overdueCount > 0 ? 'bg-red-600/10' : 'bg-slate-800', ic: overdueCount > 0 ? 'text-red-400' : 'text-slate-500' },
          { label: 'Gasto del año', value: `$${(stats?.yearSpend ?? 0).toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-600/10', ic: 'text-emerald-400' },
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

      {/* Alerta facturas vencidas */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300"><span className="font-bold">{overdueCount} factura{overdueCount > 1 ? 's' : ''}</span> vencida{overdueCount > 1 ? 's' : ''} sin pagar</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {([['purchases', ShoppingCart, 'Órdenes de Compra', purchases?.length ?? 0], ['invoices', Receipt, 'Facturas', invoices?.length ?? 0]] as const).map(([id, Icon, label, count]) => (
          <button key={id} onClick={() => { setTab(id as Tab); reset(); setSearch(''); setFilterStatus(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-4 h-4" />{label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                {tab === 'purchases' ? <ShoppingCart className="w-5 h-5 text-red-400" /> : <Receipt className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar' : 'Nueva'} {tab === 'purchases' ? 'orden de compra' : 'factura'}</h2>
                <p className="text-xs text-slate-500">Completa todos los campos requeridos</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tab === 'purchases' ? (
              <>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">N° Orden</label><input value={pForm.number} onChange={setP('number')} required placeholder="Ej: OC-2026-001" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Proveedor</label><input value={pForm.supplier} onChange={setP('supplier')} required placeholder="Nombre del proveedor" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Monto total ($)</label><input type="number" value={pForm.totalAmount} onChange={setP('totalAmount')} required min={0} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Estado</label>
                  <select value={pForm.status} onChange={setP('status')} className={inputCls}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha aprobación</label><input type="date" value={pForm.approvedAt} onChange={setP('approvedAt')} className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha recepción</label><input type="date" value={pForm.receivedAt} onChange={setP('receivedAt')} className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
                  <select value={pForm.companyId} onChange={setP('companyId')} required className={inputCls}>
                    <option value="">Seleccionar compañía...</option>
                    {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Descripción</label><input value={pForm.description} onChange={setP('description')} required placeholder="¿Qué se compra?" className={inputCls} /></div>
              </>
            ) : (
              <>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">N° Factura</label><input value={iForm.number} onChange={setI('number')} required placeholder="Ej: FAC-001234" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Proveedor</label><input value={iForm.supplier} onChange={setI('supplier')} required placeholder="Nombre del proveedor" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Monto ($)</label><input type="number" value={iForm.amount} onChange={setI('amount')} required min={0} placeholder="0" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha emisión</label><input type="date" value={iForm.issuedAt} onChange={setI('issuedAt')} required className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Vencimiento pago</label><input type="date" value={iForm.dueAt} onChange={setI('dueAt')} className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha pago</label><input type="date" value={iForm.paidAt} onChange={setI('paidAt')} className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
                  <select value={iForm.companyId} onChange={setI('companyId')} required className={inputCls}>
                    <option value="">Seleccionar compañía...</option>
                    {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">OC asociada</label>
                  <select value={iForm.purchaseId} onChange={setI('purchaseId')} className={inputCls}>
                    <option value="">Sin orden asociada</option>
                    {purchases?.map((p: any) => <option key={p.id} value={p.id}>OC {p.number} — {p.description}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">URL archivo</label><input value={iForm.fileUrl} onChange={setI('fileUrl')} placeholder="https://..." className={inputCls} /></div>
              </>
            )}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : tab === 'purchases' ? 'Crear orden' : 'Registrar factura'}
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'purchases' ? 'Buscar por N° OC, descripción, proveedor...' : 'Buscar por N° factura o proveedor...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        {tab === 'purchases' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />)}
        </div>
      ) : tab === 'purchases' ? (
        !filteredP.length ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Sin órdenes de compra</p>
            <p className="text-slate-600 text-sm mt-1">Crea la primera orden de compra</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredP.map((p: any) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.PENDIENTE;
              const StatusIcon = meta.icon;
              return (
                <div key={p.id} onClick={() => setSelected({ type: 'purchase', data: p })}
                  className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30">
                  {/* Banner */}
                  <div className={`bg-gradient-to-r ${meta.banner} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${meta.color}`}>
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white text-xs">{p.number}</p>
                        <p className="text-[10px] text-slate-400">Cía. {p.company?.number ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      <StatusIcon className="w-2.5 h-2.5" />{meta.label}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-1">{p.description}</p>
                    <p className="text-xs text-slate-500 mb-3">{p.supplier}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />{p.totalAmount?.toLocaleString('es-CL')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600">{fmt(p.requestedAt)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        !filteredI.length ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Sin facturas registradas</p>
            <p className="text-slate-600 text-sm mt-1">Registra la primera factura</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredI.map((inv: any) => {
              const overdue = isOverdue(inv);
              const paid = !!inv.paidAt;
              return (
                <div key={inv.id} onClick={() => setSelected({ type: 'invoice', data: inv })}
                  className={`group bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30 ${overdue ? 'border-red-600/40 hover:border-red-600/60' : paid ? 'border-emerald-600/30 hover:border-emerald-600/50' : 'border-slate-800 hover:border-slate-600'}`}>
                  {/* Banner */}
                  <div className={`border-b border-slate-800 px-4 py-3 flex items-center justify-between ${overdue ? 'bg-gradient-to-r from-red-900/40 to-red-950/60' : paid ? 'bg-gradient-to-r from-emerald-900/30 to-emerald-950/50' : 'bg-gradient-to-r from-slate-800/50 to-slate-900/70'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${overdue ? 'bg-red-500/20 text-red-400 border-red-500/30' : paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white text-xs">{inv.number}</p>
                        <p className="text-[10px] text-slate-400">Cía. {inv.company?.number ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${overdue ? 'bg-red-500/20 text-red-400 border-red-500/30' : paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${overdue ? 'bg-red-400' : paid ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {overdue ? 'Vencida' : paid ? 'Pagada' : 'Pendiente'}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-200 mb-1">{inv.supplier}</p>
                    {inv.purchase && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-2">
                        <Link2 className="w-2.5 h-2.5" />OC {inv.purchase?.number}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className={`font-bold text-sm flex items-center gap-1 ${overdue ? 'text-red-400' : paid ? 'text-emerald-400' : 'text-slate-200'}`}>
                        <DollarSign className="w-3.5 h-3.5" />{inv.amount?.toLocaleString('es-CL')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600">{paid ? `Pagada ${fmt(inv.paidAt)}` : inv.dueAt ? `Vence ${fmt(inv.dueAt)}` : `Emitida ${fmt(inv.issuedAt)}`}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            {selected.type === 'purchase' ? (() => {
              const p = selected.data;
              const meta = STATUS_META[p.status] ?? STATUS_META.PENDIENTE;
              const StatusIcon = meta.icon;
              return (
                <>
                  <div className={`bg-gradient-to-r ${meta.banner} p-5 rounded-t-2xl border-b border-slate-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${meta.color}`}>
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white">{p.number}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                            <StatusIcon className="w-2.5 h-2.5" />{meta.label}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="bg-slate-800/60 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Descripción</p>
                      <p className="text-sm text-slate-200">{p.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Banknote, label: 'Monto total', value: money(p.totalAmount), cls: 'text-emerald-400 font-bold' },
                        { icon: Building2, label: 'Compañía', value: `Cía. ${p.company?.number ?? '—'} ${p.company?.name ?? ''}`, cls: 'text-slate-200' },
                        { icon: Calendar, label: 'Fecha solicitud', value: fmt(p.requestedAt), cls: 'text-slate-200' },
                        { icon: Calendar, label: 'Fecha recepción', value: fmt(p.receivedAt), cls: 'text-slate-200' },
                      ].map(({ icon: Icon, label, value, cls }) => (
                        <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-slate-500 shrink-0" />
                            <p className={`text-sm truncate ${cls}`}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {p.notes && <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-xs text-slate-400">{p.notes}</p></div>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleEditP(p)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors"><Pencil className="w-3.5 h-3.5" />Editar</button>
                      <button onClick={() => { if (confirm('¿Eliminar esta orden?')) deleteP.mutate(p.id); }} className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                    </div>
                  </div>
                </>
              );
            })() : (() => {
              const inv = selected.data;
              const overdue = isOverdue(inv);
              const paid = !!inv.paidAt;
              const bannerCls = overdue ? 'from-red-900/40 to-red-950/60' : paid ? 'from-emerald-900/30 to-emerald-950/50' : 'from-slate-800/50 to-slate-900/70';
              const badgeCls = overdue ? 'bg-red-500/20 text-red-400 border-red-500/30' : paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600';
              return (
                <>
                  <div className={`bg-gradient-to-r ${bannerCls} p-5 rounded-t-2xl border-b border-slate-800`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${badgeCls}`}>
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white">{inv.number}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeCls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${overdue ? 'bg-red-400' : paid ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                            {overdue ? 'Vencida sin pagar' : paid ? 'Pagada' : 'Pendiente de pago'}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Banknote, label: 'Monto', value: money(inv.amount), cls: overdue ? 'text-red-400 font-bold' : paid ? 'text-emerald-400 font-bold' : 'text-slate-200 font-bold' },
                        { icon: Building2, label: 'Compañía', value: `Cía. ${inv.company?.number ?? '—'}`, cls: 'text-slate-200' },
                        { icon: Calendar, label: 'Fecha emisión', value: fmt(inv.issuedAt), cls: 'text-slate-200' },
                        { icon: Calendar, label: 'Vencimiento', value: fmt(inv.dueAt), cls: overdue ? 'text-red-400' : 'text-slate-200' },
                        { icon: Calendar, label: 'Fecha pago', value: fmt(inv.paidAt), cls: 'text-emerald-400' },
                        { icon: Link2, label: 'OC asociada', value: inv.purchase?.number ?? 'Sin OC', cls: 'text-slate-300' },
                      ].map(({ icon: Icon, label, value, cls }) => (
                        <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-slate-500 shrink-0" />
                            <p className={`text-sm truncate ${cls}`}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {overdue && (
                      <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-xs text-red-300 font-medium">Factura vencida sin registrar pago</p>
                      </div>
                    )}
                    {inv.fileUrl && (
                      <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl px-4 py-3 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <p className="text-xs text-blue-400 truncate">Ver archivo adjunto</p>
                      </a>
                    )}
                    {inv.notes && <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-xs text-slate-400">{inv.notes}</p></div>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleEditI(inv)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors"><Pencil className="w-3.5 h-3.5" />Editar</button>
                      <button onClick={() => { if (confirm('¿Eliminar esta factura?')) deleteI.mutate(inv.id); }} className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
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
