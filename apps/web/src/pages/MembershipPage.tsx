import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, X, Search, Building2, Users, Wallet,
  CheckCircle2, AlertTriangle, ChevronRight, HandCoins,
  Receipt, UserCheck, UserX, Clock, Banknote, CreditCard,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const FREQ_LABELS: Record<string, string> = {
  MENSUAL: 'Mensual',
  ANUAL: 'Anual',
  EXTRAORDINARIA: 'Extraordinaria',
};

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
  OTRO: 'Otro',
};

const PAYMENT_STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  PAGADO: { label: 'Al día', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  PARCIAL: { label: 'Parcial', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  PENDIENTE: { label: 'Pendiente', badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  EXONERADO: { label: 'Exonerado', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  SIN_CUOTA: { label: 'Sin cuota', badge: 'bg-slate-700/40 text-slate-500 border-slate-600/30', dot: 'bg-slate-500' },
};

const MEMBER_STATUS: Record<string, string> = {
  ACTIVO: 'Activo',
  MOROSO: 'Moroso',
  SUSPENDIDO: 'Suspendido',
  INACTIVO: 'Inactivo',
};

const money = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CL')}`;
const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

const EMPTY_FEE = {
  name: '',
  description: '',
  amount: '',
  frequency: 'MENSUAL',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  dueDate: '',
  companyId: '',
};

const EMPTY_CONTRIB = {
  amount: '',
  paidAt: new Date().toISOString().slice(0, 10),
  method: 'EFECTIVO',
  status: 'PAGADO',
  receiptNumber: '',
  notes: '',
  userId: '',
  companyId: '',
  feeId: '',
};

type Tab = 'resumen' | 'socios' | 'cuotas' | 'aportes';

export default function MembershipPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = ['SUPER_ADMIN', 'TESORERO', 'COMANDANTE', 'SECRETARIO'].includes(user?.role ?? '');

  const [tab, setTab] = useState<Tab>('resumen');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showContribForm, setShowContribForm] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [editingContrib, setEditingContrib] = useState<any>(null);
  const [feeForm, setFeeForm] = useState<any>(EMPTY_FEE);
  const [contribForm, setContribForm] = useState<any>(EMPTY_CONTRIB);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const effectiveCompanyId = companyId || companies?.[0]?.id || '';

  const { data: dash, isLoading: loadingDash } = useQuery({
    queryKey: ['membership-dash', effectiveCompanyId, year, month],
    queryFn: () =>
      api
        .get('/membership/dashboard', {
          params: { companyId: effectiveCompanyId || undefined, year, month },
        })
        .then(r => r.data),
    enabled: !!effectiveCompanyId || !!companies?.length,
  });

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ['membership-roster', effectiveCompanyId, year, month],
    queryFn: () =>
      api
        .get('/membership/members', {
          params: { companyId: effectiveCompanyId, year, month },
        })
        .then(r => r.data),
    enabled: !!effectiveCompanyId && (tab === 'socios' || tab === 'resumen'),
  });

  const { data: fees, isLoading: loadingFees } = useQuery({
    queryKey: ['membership-fees', effectiveCompanyId, year],
    queryFn: () =>
      api
        .get('/membership/fees', { params: { companyId: effectiveCompanyId, year } })
        .then(r => r.data),
    enabled: !!effectiveCompanyId,
  });

  const { data: contributions, isLoading: loadingContrib } = useQuery({
    queryKey: ['membership-contributions', effectiveCompanyId, year, month],
    queryFn: () =>
      api
        .get('/membership/contributions', {
          params: { companyId: effectiveCompanyId, year, month },
        })
        .then(r => r.data),
    enabled: !!effectiveCompanyId,
  });

  const { data: companyUsers } = useQuery({
    queryKey: ['users', effectiveCompanyId],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: !!effectiveCompanyId && showContribForm,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['membership-dash'] });
    qc.invalidateQueries({ queryKey: ['membership-roster'] });
    qc.invalidateQueries({ queryKey: ['membership-fees'] });
    qc.invalidateQueries({ queryKey: ['membership-contributions'] });
  };

  const createFee = useMutation({
    mutationFn: (d: any) => api.post('/membership/fees', d),
    onSuccess: () => { invalidateAll(); toast.success('Cuota creada'); resetFeeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const updateFee = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/membership/fees/${id}`, d),
    onSuccess: () => { invalidateAll(); toast.success('Cuota actualizada'); resetFeeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const removeFee = useMutation({
    mutationFn: (id: string) => api.delete(`/membership/fees/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Cuota eliminada'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const createContrib = useMutation({
    mutationFn: (d: any) => api.post('/membership/contributions', d),
    onSuccess: () => { invalidateAll(); toast.success('Aporte registrado'); resetContribForm(); setSelectedMember(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const updateContrib = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/membership/contributions/${id}`, d),
    onSuccess: () => { invalidateAll(); toast.success('Aporte actualizado'); resetContribForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const removeContrib = useMutation({
    mutationFn: (id: string) => api.delete(`/membership/contributions/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Aporte eliminado'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const resetFeeForm = () => { setShowFeeForm(false); setEditingFee(null); setFeeForm({ ...EMPTY_FEE, companyId: effectiveCompanyId }); };
  const resetContribForm = () => {
    setShowContribForm(false);
    setEditingContrib(null);
    setContribForm({ ...EMPTY_CONTRIB, companyId: effectiveCompanyId, feeId: currentFee?.id ?? '' });
  };

  const setFee = (k: string) => (e: React.ChangeEvent<any>) => setFeeForm((f: any) => ({ ...f, [k]: e.target.value }));
  const setContrib = (k: string) => (e: React.ChangeEvent<any>) => setContribForm((f: any) => ({ ...f, [k]: e.target.value }));

  const currentFee = dash?.byCompany?.find((c: any) => c.company.id === effectiveCompanyId)?.currentFee
    ?? fees?.find((f: any) => f.month === month && f.year === year);

  const companyMembers = (companyUsers ?? []).filter(
    (u: any) => u.companyId === effectiveCompanyId && u.role !== 'SUPER_ADMIN' && u.isActive
  );

  const filteredRoster = useMemo(() => {
    return (roster ?? []).filter((m: any) => {
      const q = search.toLowerCase();
      const name = `${m.user.firstName} ${m.user.lastName} ${m.user.rut}`.toLowerCase();
      const matchQ = !q || name.includes(q);
      const matchP = !filterPay || m.paymentStatus === filterPay;
      return matchQ && matchP;
    });
  }, [roster, search, filterPay]);

  const companySummary = dash?.byCompany?.find((c: any) => c.company.id === effectiveCompanyId);
  const summary = dash?.summary;

  const openRegisterPayment = (member: any) => {
    const expected = member.expectedAmount || currentFee?.amount || 0;
    const pending = Math.max(0, expected - member.paidTotal);
    setContribForm({
      ...EMPTY_CONTRIB,
      companyId: effectiveCompanyId,
      feeId: currentFee?.id ?? '',
      userId: member.user.id,
      amount: pending > 0 ? String(pending) : String(expected),
      paidAt: new Date().toISOString().slice(0, 10),
    });
    setEditingContrib(null);
    setShowContribForm(true);
    setSelectedMember(member);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = {
      ...feeForm,
      companyId: feeForm.companyId || effectiveCompanyId,
      amount: Number(feeForm.amount),
      year: Number(feeForm.year),
      month: feeForm.frequency === 'MENSUAL' ? Number(feeForm.month) : undefined,
      dueDate: feeForm.dueDate || undefined,
      description: feeForm.description || undefined,
    };
    editingFee ? updateFee.mutate({ id: editingFee.id, d }) : createFee.mutate(d);
  };

  const handleContribSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = {
      ...contribForm,
      companyId: contribForm.companyId || effectiveCompanyId,
      amount: Number(contribForm.amount),
      receiptNumber: contribForm.receiptNumber || undefined,
      notes: contribForm.notes || undefined,
      feeId: contribForm.feeId || undefined,
      recordedBy: user?.id,
    };
    editingContrib ? updateContrib.mutate({ id: editingContrib.id, d }) : createContrib.mutate(d);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Tesorería Social</h1>
          <p className="text-sm text-slate-400 mt-0.5">Cuotas, socios y aportes de voluntarios por compañía</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={effectiveCompanyId}
            onChange={e => setCompanyId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
          >
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          {canEdit && (
            <button
              onClick={() => {
                resetContribForm();
                setShowContribForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />Registrar aporte
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recaudado (mes)', value: money(companySummary?.collectedMonth ?? summary?.collectedMonth ?? 0), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-600/10', iconColor: 'text-emerald-400' },
          { label: 'Recaudado (año)', value: money(summary?.collectedYtd ?? 0), icon: Banknote, color: 'text-blue-400', bg: 'bg-blue-600/10', iconColor: 'text-blue-400' },
          { label: 'Socios al día', value: `${companySummary?.paidCount ?? 0}/${companySummary?.activeMembers ?? 0}`, icon: UserCheck, color: 'text-white', bg: 'bg-slate-800', iconColor: 'text-slate-400' },
          { label: 'Morosos', value: companySummary?.morososCount ?? 0, icon: UserX, color: 'text-red-400', bg: 'bg-red-600/10', iconColor: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 bg-slate-900/60 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <div>
              <p className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cuota vigente */}
      {currentFee && (
        <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-600/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400/80 font-semibold uppercase tracking-wide">Cuota vigente — {MONTHS[month - 1]} {year}</p>
              <p className="text-white font-bold">{currentFee.name}</p>
              <p className="text-sm text-slate-400">Monto: {money(currentFee.amount)} · Vence: {currentFee.dueDate ? new Date(currentFee.dueDate).toLocaleDateString('es-CL') : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Cobranza: <span className="text-white font-bold">{companySummary?.collectionRate ?? 0}%</span></span>
            <span className="text-slate-400">Meta: <span className="text-emerald-400 font-bold">{money(companySummary?.expectedTotal ?? 0)}</span></span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {([
          ['resumen', 'Resumen'],
          ['socios', 'Socios'],
          ['cuotas', 'Cuotas'],
          ['aportes', 'Aportes'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form cuota */}
      {showFeeForm && canEdit && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">{editingFee ? 'Editar cuota' : 'Nueva cuota / período'}</h2>
            <button onClick={resetFeeForm} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleFeeSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Nombre</label>
              <input value={feeForm.name} onChange={setFee('name')} required className={inputCls} placeholder="Cuota mensual mayo 2026" /></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Monto ($)</label>
              <input type="number" value={feeForm.amount} onChange={setFee('amount')} required min={0} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Frecuencia</label>
              <select value={feeForm.frequency} onChange={setFee('frequency')} className={inputCls}>
                {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Año</label>
              <input type="number" value={feeForm.year} onChange={setFee('year')} required className={inputCls} /></div>
            {feeForm.frequency === 'MENSUAL' && (
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Mes</label>
                <select value={feeForm.month} onChange={setFee('month')} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select></div>
            )}
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Vencimiento</label>
              <input type="date" value={feeForm.dueDate} onChange={setFee('dueDate')} className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Descripción</label>
              <input value={feeForm.description} onChange={setFee('description')} className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-2">
              <button type="submit" disabled={createFee.isPending || updateFee.isPending} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />{editingFee ? 'Guardar' : 'Crear cuota'}
              </button>
              <button type="button" onClick={resetFeeForm} className="text-slate-400 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Form aporte */}
      {showContribForm && canEdit && (
        <div className="bg-slate-900 border border-emerald-600/30 rounded-2xl p-6 shadow-xl shadow-emerald-600/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">{editingContrib ? 'Editar aporte' : 'Registrar aporte'}</h2>
              {selectedMember && (
                <p className="text-xs text-slate-500">{selectedMember.user.firstName} {selectedMember.user.lastName}</p>
              )}
            </div>
            <button onClick={() => { resetContribForm(); setSelectedMember(null); }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleContribSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Socio</label>
              <select value={contribForm.userId} onChange={setContrib('userId')} required className={inputCls}>
                <option value="">Seleccionar socio...</option>
                {companyMembers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.rut}</option>
                ))}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Cuota vinculada</label>
              <select value={contribForm.feeId} onChange={setContrib('feeId')} className={inputCls}>
                <option value="">Sin vincular</option>
                {fees?.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name} ({money(f.amount)})</option>
                ))}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Monto ($)</label>
              <input type="number" value={contribForm.amount} onChange={setContrib('amount')} required min={0} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Fecha de pago</label>
              <input type="date" value={contribForm.paidAt} onChange={setContrib('paidAt')} required className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Medio de pago</label>
              <select value={contribForm.method} onChange={setContrib('method')} className={inputCls}>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Estado</label>
              <select value={contribForm.status} onChange={setContrib('status')} className={inputCls}>
                <option value="PAGADO">Pagado</option>
                <option value="PARCIAL">Parcial</option>
                <option value="EXONERADO">Exonerado</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Nº comprobante</label>
              <input value={contribForm.receiptNumber} onChange={setContrib('receiptNumber')} className={inputCls} placeholder="TRX-001" /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Notas</label>
              <input value={contribForm.notes} onChange={setContrib('notes')} className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-2">
              <button type="submit" disabled={createContrib.isPending || updateContrib.isPending} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />{editingContrib ? 'Guardar' : 'Registrar'}
              </button>
              <button type="button" onClick={() => { resetContribForm(); setSelectedMember(null); }} className="text-slate-400 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Resumen */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> Por compañía</h3>
            {loadingDash ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {dash?.byCompany?.map((row: any) => (
                  <button
                    key={row.company.id}
                    onClick={() => { setCompanyId(row.company.id); setTab('socios'); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${row.company.id === effectiveCompanyId ? 'bg-red-600/10 border-red-600/30' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Cía. {row.company.number}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.company.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{money(row.collectedMonth)}</p>
                      <p className="text-[10px] text-slate-500">{row.collectionRate}% cobranza · {row.morososCount} morosos</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Pendientes de cobro</h3>
            {loadingRoster ? (
              <div className="h-32 bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredRoster.filter((m: any) => m.paymentStatus === 'PENDIENTE' || m.paymentStatus === 'PARCIAL').length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Todos los socios están al día 🎉</p>
                ) : (
                  filteredRoster
                    .filter((m: any) => m.paymentStatus === 'PENDIENTE' || m.paymentStatus === 'PARCIAL')
                    .map((m: any) => (
                      <div key={m.user.id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl">
                        <div>
                          <p className="text-sm text-white font-medium">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-xs text-slate-500">Debe: {money(Math.max(0, m.expectedAmount - m.paidTotal))}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => openRegisterPayment(m)} className="text-xs bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-600/30 transition-colors">
                            Cobrar
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Socios */}
      {tab === 'socios' && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar socio..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" />
            </div>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
              <option value="">Todos los estados</option>
              {Object.entries(PAYMENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
          </div>
          {loadingRoster ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredRoster.map((m: any) => {
                const ps = PAYMENT_STATUS[m.paymentStatus] ?? PAYMENT_STATUS.SIN_CUOTA;
                return (
                  <div key={m.user.id} className={`bg-slate-900 border rounded-2xl p-4 transition-all ${m.isMoroso ? 'border-red-600/40' : 'border-slate-800'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-bold text-red-400">
                          {m.user.firstName[0]}{m.user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-[10px] text-slate-500">{m.user.rut} · {m.profile?.memberNumber ?? 'Sin nº socio'}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ps.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />{ps.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Pagado: <span className="text-slate-300 font-medium">{money(m.paidTotal)}</span></span>
                      {m.expectedAmount > 0 && <span>Meta: {money(m.expectedAmount)}</span>}
                    </div>
                    {m.profile && (
                      <p className="text-[10px] text-slate-600 mb-2">Estado: {MEMBER_STATUS[m.profile.status] ?? m.profile.status}</p>
                    )}
                    {canEdit && m.paymentStatus !== 'PAGADO' && m.paymentStatus !== 'EXONERADO' && (
                      <button onClick={() => openRegisterPayment(m)} className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-red-600/15 hover:bg-red-600/25 text-red-400 py-2 rounded-xl transition-colors">
                        <Receipt className="w-3.5 h-3.5" />Registrar pago
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Cuotas */}
      {tab === 'cuotas' && (
        <>
          {canEdit && (
            <button
              onClick={() => {
                setEditingFee(null);
                setFeeForm({ ...EMPTY_FEE, companyId: effectiveCompanyId, year, month });
                setShowFeeForm(true);
              }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <Plus className="w-4 h-4" /> Nueva cuota para esta compañía
            </button>
          )}
          {loadingFees ? (
            <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ) : !fees?.length ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <HandCoins className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Sin cuotas definidas para {year}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fees.map((f: any) => (
                <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{f.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{FREQ_LABELS[f.frequency]} · Cía. {f.company?.number}</p>
                      <p className="text-lg font-bold text-emerald-400 mt-2">{money(f.amount)}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingFee(f); setFeeForm({ ...f, amount: f.amount, month: f.month ?? '', dueDate: f.dueDate?.slice(0, 10) ?? '' }); setShowFeeForm(true); }} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm('¿Eliminar cuota?')) removeFee.mutate(f.id); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-600/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f._count?.contributions ?? 0} aportes</span>
                    {f.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Vence {new Date(f.dueDate).toLocaleDateString('es-CL')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Aportes */}
      {tab === 'aportes' && (
        <>
          {loadingContrib ? (
            <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ) : !contributions?.length ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Sin aportes en {MONTHS[month - 1]} {year}</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Socio</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Medio</th>
                      <th className="px-4 py-3">Cuota</th>
                      {canEdit && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-400">{new Date(c.paidAt).toLocaleDateString('es-CL')}</td>
                        <td className="px-4 py-3 text-white font-medium">{c.user.firstName} {c.user.lastName}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{money(c.amount)}</td>
                        <td className="px-4 py-3 text-slate-400">{METHOD_LABELS[c.method]}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.fee?.name ?? '—'}</td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditingContrib(c); setContribForm({ ...c, paidAt: c.paidAt.slice(0, 10), amount: c.amount, feeId: c.feeId ?? '' }); setShowContribForm(true); }} className="p-1 text-slate-500 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => { if (confirm('¿Eliminar aporte?')) removeContrib.mutate(c.id); }} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
