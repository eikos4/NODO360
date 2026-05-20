import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, X, Search, Building2, GraduationCap,
  AlertTriangle, CheckCircle2, Clock, User, Filter, Award,
  Calendar, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

type Tab = 'resumen' | 'certificaciones' | 'bomberos';
type CertStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_VENCIMIENTO';

const CATEGORY_LABELS: Record<string, string> = {
  LICENCIA: 'Licencia / Conducir',
  EPP: 'EPP / Equipamiento',
  MEDICO: 'Examen médico',
  CURSO: 'Curso / Capacitación',
  HABILITACION: 'Habilitación',
  OTRO: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  LICENCIA: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  EPP: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  MEDICO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CURSO: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  HABILITACION: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  OTRO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_META: Record<CertStatus, { label: string; badge: string; dot: string }> = {
  VIGENTE: { label: 'Vigente', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  POR_VENCER: { label: 'Por vencer', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  VENCIDO: { label: 'Vencido', badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  SIN_VENCIMIENTO: { label: 'Sin vencimiento', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EMPTY = {
  name: '',
  category: 'OTRO',
  issuer: '',
  issuedAt: '',
  expiresAt: '',
  documentUrl: '',
  notes: '',
  userId: '',
  companyId: '',
};

export default function TrainingPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'].includes(user?.role ?? '');

  const [tab, setTab] = useState<Tab>('resumen');
  const [companyFilter, setCompanyFilter] = useState(user?.companyId ?? '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['training-summary', companyFilter],
    queryFn: () =>
      api.get('/training/summary', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: expiring } = useQuery({
    queryKey: ['training-expiring', companyFilter],
    queryFn: () =>
      api.get('/training/expiring', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['training-certs', companyFilter, categoryFilter, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (companyFilter) params.companyId = companyFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      return api.get('/training/certifications', { params }).then(r => r.data);
    },
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['training-roster', companyFilter],
    queryFn: () => api.get('/training/roster', { params: { companyId: companyFilter } }).then(r => r.data),
    enabled: !!companyFilter && tab === 'bomberos',
  });

  const { data: companyUsers = [] } = useQuery({
    queryKey: ['users', companyFilter],
    queryFn: () => api.get('/users', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
    enabled: !!companyFilter && showForm,
  });

  const filteredCerts = useMemo(() => {
    if (!search.trim()) return certs;
    const q = search.toLowerCase();
    return certs.filter((c: any) => {
      const person = `${c.user?.firstName} ${c.user?.lastName}`.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        person.includes(q) ||
        c.user?.rut?.toLowerCase().includes(q) ||
        c.issuer?.toLowerCase().includes(q)
      );
    });
  }, [certs, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['training-summary'] });
    qc.invalidateQueries({ queryKey: ['training-expiring'] });
    qc.invalidateQueries({ queryKey: ['training-certs'] });
    qc.invalidateQueries({ queryKey: ['training-roster'] });
  };

  const create = useMutation({
    mutationFn: (d: any) => api.post('/training/certifications', d),
    onSuccess: () => { invalidate(); toast.success('Certificación registrada'); resetForm(); },
    onError: () => toast.error('Error al registrar'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/training/certifications/${id}`, data),
    onSuccess: () => { invalidate(); toast.success('Certificación actualizada'); resetForm(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/training/certifications/${id}`),
    onSuccess: () => { invalidate(); toast.success('Certificación eliminada'); },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY, companyId: companyFilter || '' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, companyId: companyFilter || '' });
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      category: c.category,
      issuer: c.issuer ?? '',
      issuedAt: c.issuedAt ? c.issuedAt.slice(0, 10) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      documentUrl: c.documentUrl ?? '',
      notes: c.notes ?? '',
      userId: c.userId,
      companyId: c.companyId,
    });
    setShowForm(true);
  };

  const submit = () => {
    const payload = {
      ...form,
      issuer: form.issuer || undefined,
      documentUrl: form.documentUrl || undefined,
      notes: form.notes || undefined,
      issuedAt: form.issuedAt || undefined,
      expiresAt: form.expiresAt || undefined,
    };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const tabs: { id: Tab; label: string; icon: typeof Award }[] = [
    { id: 'resumen', label: 'Resumen', icon: Award },
    { id: 'certificaciones', label: 'Certificaciones', icon: GraduationCap },
    { id: 'bomberos', label: 'Por bombero', icon: User },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">Personal</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-red-400" />
            Capacitación y certificaciones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Licencias, cursos, EPP y habilitaciones con control de vencimientos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 min-w-[200px]"
          >
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nueva certificación
            </button>
          )}
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
                tab === t.id
                  ? 'bg-red-600/20 text-red-300 border border-red-600/30 border-b-transparent'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: summary?.total ?? 0, icon: GraduationCap, color: 'text-slate-300' },
              { label: 'Vigentes', value: summary?.vigente ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Por vencer', value: summary?.porVencer ?? 0, icon: Clock, color: 'text-amber-400' },
              { label: 'Vencidos', value: summary?.vencido ?? 0, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Sin fecha', value: summary?.sinVencimiento ?? 0, icon: FileText, color: 'text-slate-400' },
            ].map(k => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <Icon className={`w-5 h-5 ${k.color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                </div>
              );
            })}
          </div>

          {(expiring?.expired?.length > 0 || expiring?.soon?.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {expiring?.expired?.length > 0 && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-red-300 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" /> Vencidos ({expiring.expired.length})
                  </h3>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {expiring.expired.map((c: any) => (
                      <li key={c.id} className="text-sm bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800">
                        <p className="font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {c.user?.firstName} {c.user?.lastName} · {fmt(c.expiresAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiring?.soon?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4" /> Por vencer — {summary?.soonDays ?? 30} días ({expiring.soon.length})
                  </h3>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {expiring.soon.map((c: any) => (
                      <li key={c.id} className="text-sm bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800">
                        <p className="font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {c.user?.firstName} {c.user?.lastName} · en {c.daysUntilExpiry} días
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Por categoría</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byCategory).map(([cat, count]) => (
                  <span
                    key={cat}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTRO}`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'certificaciones' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar certificación o bombero..."
                className={`${inputCls} pl-10`}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200"
            >
              <option value="">Todas las categorías</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse" />)}</div>
          ) : filteredCerts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No hay certificaciones registradas</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCerts.map((c: any) => {
                const st = STATUS_META[c.status as CertStatus] ?? STATUS_META.VIGENTE;
                const catCls = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.OTRO;
                return (
                  <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-white">{c.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.user?.firstName} {c.user?.lastName} · {c.user?.rut}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catCls}`}>
                        {CATEGORY_LABELS[c.category] ?? c.category}
                      </span>
                      {c.issuer && <span className="text-[10px] text-slate-500">{c.issuer}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Emisión: {fmt(c.issuedAt)}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Vence: {fmt(c.expiresAt)}</span>
                    </div>
                    {c.daysUntilExpiry != null && c.status !== 'SIN_VENCIMIENTO' && (
                      <p className={`text-xs mb-3 ${c.status === 'VENCIDO' ? 'text-red-400' : 'text-amber-400'}`}>
                        {c.status === 'VENCIDO' ? `Venció hace ${Math.abs(c.daysUntilExpiry)} días` : `${c.daysUntilExpiry} días restantes`}
                      </p>
                    )}
                    {canEdit && (
                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button onClick={() => openEdit(c)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button onClick={() => remove.mutate(c.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'bomberos' && (
        <div className="space-y-4">
          {!companyFilter ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Selecciona una compañía para ver el roster</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Sin personal activo en esta compañía</div>
          ) : (
            <div className="space-y-2">
              {roster.map((u: any) => {
                const open = expandedUser === u.id;
                const hasAlert = u.stats.vencido > 0 || u.stats.porVencer > 0;
                return (
                  <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedUser(open ? null : u.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${hasAlert ? 'bg-red-600/20 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-500">{u.rut} · {u.certifications.length} certificación(es)</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.stats.vencido > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            {u.stats.vencido} venc.
                          </span>
                        )}
                        {u.stats.porVencer > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {u.stats.porVencer} alerta
                          </span>
                        )}
                        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-2 border-t border-slate-800 pt-3">
                        {u.certifications.length === 0 ? (
                          <p className="text-sm text-slate-500">Sin certificaciones</p>
                        ) : (
                          u.certifications.map((c: any) => {
                            const st = STATUS_META[c.status as CertStatus] ?? STATUS_META.VIGENTE;
                            return (
                              <div key={c.id} className="flex items-center justify-between gap-2 bg-slate-950/60 rounded-xl px-3 py-2 text-sm">
                                <div>
                                  <p className="text-white font-medium">{c.name}</p>
                                  <p className="text-xs text-slate-500">Vence: {fmt(c.expiresAt)}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.badge}`}>{st.label}</span>
                              </div>
                            );
                          })
                        )}
                        {canEdit && (
                          <button
                            onClick={() => {
                              setForm({ ...EMPTY, userId: u.id, companyId: companyFilter });
                              setEditing(null);
                              setShowForm(true);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold mt-1"
                          >
                            + Agregar certificación
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editing ? 'Editar certificación' : 'Nueva certificación'}</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <select className={inputCls} value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value, userId: '' })}>
              <option value="">Compañía</option>
              {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>)}
            </select>
            <select className={inputCls} value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} disabled={!form.companyId}>
              <option value="">Bombero / usuario</option>
              {companyUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.rut})</option>
              ))}
            </select>
            <input className={inputCls} placeholder="Nombre (ej. Licencia Clase B)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={inputCls} placeholder="Organismo emisor (opc.)" value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha emisión</label>
                <input type="date" className={inputCls} value={form.issuedAt} onChange={e => setForm({ ...form, issuedAt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha vencimiento</label>
                <input type="date" className={inputCls} value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>
            <input className={inputCls} placeholder="URL documento (opc.)" value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} />
            <textarea className={`${inputCls} min-h-[60px]`} placeholder="Notas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <button onClick={submit} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">
              {editing ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
