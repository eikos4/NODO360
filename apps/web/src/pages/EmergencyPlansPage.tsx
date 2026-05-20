import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Pencil, FileText, Filter, X, Shield,
  Search, ChevronRight, CheckCircle2, Building2, ListChecks,
  Flame, Droplets, Wind, AlertTriangle, Layers, SlidersHorizontal,
  ShieldAlert, Calendar, ClipboardList,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { PlanDepthFields, parseChecklist, PLAN_STATUS_LABELS } from '../components/emergency-plans/PlanDepthFields';

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  INCENDIO: 'Incendio',
  TERREMOTO: 'Terremoto',
  INUNDACION: 'Inundación',
  DERRUMBE: 'Derrumbe',
  ACCIDENTE: 'Accidente',
  OTRO: 'Otro',
};

const SEVERITY_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

const TYPE_ICONS: Record<string, typeof Shield> = {
  INCENDIO: Flame,
  TERREMOTO: Wind,
  INUNDACION: Droplets,
  DERRUMBE: Layers,
  ACCIDENTE: AlertTriangle,
  OTRO: Shield,
};

const TYPE_COLORS: Record<string, string> = {
  INCENDIO: 'bg-red-600/20 text-red-400 border-red-600/30',
  TERREMOTO: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  INUNDACION: 'bg-sky-600/20 text-sky-400 border-sky-600/30',
  DERRUMBE: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  ACCIDENTE: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  OTRO: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
};

const TYPE_BANNER: Record<string, string> = {
  INCENDIO: 'from-red-900/70 to-red-950/90',
  TERREMOTO: 'from-amber-900/70 to-amber-950/90',
  INUNDACION: 'from-sky-900/70 to-sky-950/90',
  DERRUMBE: 'from-stone-800/70 to-stone-950/90',
  ACCIDENTE: 'from-orange-900/70 to-orange-950/90',
  OTRO: 'from-slate-800/70 to-slate-950/90',
};

const SEVERITY_STYLES: Record<string, { badge: string; dot: string }> = {
  BAJA: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  MEDIA: { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  ALTA: { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  CRITICA: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-pulse' },
};

const EMPTY = {
  title: '',
  description: '',
  emergencyType: 'INCENDIO',
  severity: 'MEDIA',
  status: 'DRAFT',
  version: 1,
  procedures: '',
  checklist: [] as { id: string; text: string; required: boolean; order: number }[],
  companyId: '',
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function parseSteps(procedures: unknown): string[] {
  if (!procedures) return [];
  if (typeof procedures === 'string') {
    try {
      return parseSteps(JSON.parse(procedures));
    } catch {
      return procedures.trim() ? [procedures] : [];
    }
  }
  if (Array.isArray(procedures)) return procedures.map(String);
  if (typeof procedures === 'object' && procedures !== null) {
    const obj = procedures as Record<string, unknown>;
    if (Array.isArray(obj.steps)) return obj.steps.map(String);
    if (Array.isArray(obj.pasos)) return obj.pasos.map(String);
    return Object.values(obj).flatMap(v => (typeof v === 'string' ? [v] : []));
  }
  return [];
}

export default function EmergencyPlansPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['emergency-plans', filterType, filterSeverity],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filterType) params.emergencyType = filterType;
      if (filterSeverity) params.severity = filterSeverity;
      return api.get('/emergency-plans', { params }).then(r => r.data);
    },
  });

  const { data: planDetail } = useQuery({
    queryKey: ['emergency-plan', selected?.id],
    queryFn: () => api.get(`/emergency-plans/${selected!.id}`).then(r => r.data),
    enabled: !!selected?.id,
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/emergency-plans', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-plans'] });
      toast.success('Plan creado');
      reset();
    },
    onError: () => toast.error('Error al crear plan'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/emergency-plans/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-plans'] });
      qc.invalidateQueries({ queryKey: ['emergency-plan'] });
      toast.success('Plan actualizado');
      reset();
    },
    onError: () => toast.error('Error al actualizar plan'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/emergency-plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-plans'] });
      toast.success('Plan eliminado');
      setSelected(null);
    },
    onError: () => toast.error('Error al eliminar plan'),
  });

  const reset = () => {
    setShowForm(false);
    setForm(EMPTY);
    setEditing(null);
  };

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let procedures: object = {};
    if (form.procedures?.trim()) {
      try {
        procedures = JSON.parse(form.procedures);
      } catch {
        toast.error('Procedimientos: JSON inválido');
        return;
      }
    }
    const payload = { ...form, procedures, checklist: form.checklist ?? [] };
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload);
  };

  const openEdit = (p: any) => {
    setSelected(null);
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description,
      emergencyType: p.emergencyType,
      severity: p.severity,
      status: p.status ?? 'DRAFT',
      version: p.version ?? 1,
      procedures:
        typeof p.procedures === 'object'
          ? JSON.stringify(p.procedures, null, 2)
          : p.procedures ?? '',
      checklist: parseChecklist(p.checklist),
      companyId: p.companyId,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (plans ?? []).filter((p: any) => {
      if (!q) return true;
      const haystack = `${p.title} ${p.description} ${p.company?.name ?? ''} ${p.company?.number ?? ''} ${EMERGENCY_TYPE_LABELS[p.emergencyType]}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [plans, search]);

  const stats = useMemo(() => {
    const all = plans ?? [];
    const now = new Date();
    const thisMonth = all.filter((p: any) => {
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const critical = all.filter((p: any) => p.severity === 'CRITICA' || p.severity === 'ALTA').length;
    const types = new Set(all.map((p: any) => p.emergencyType)).size;
    return { total: all.length, thisMonth, critical, types };
  }, [plans]);

  const detail = planDetail ?? selected;
  const detailSteps = parseSteps(detail?.procedures);
  const detailChecklist = parseChecklist(detail?.checklist);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Planes de Emergencia</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Protocolos de contingencia, simulacros y procedimientos operativos
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Planes activos',
            value: stats.total,
            icon: ShieldAlert,
            color: 'text-white',
            bg: 'bg-slate-800',
            iconColor: 'text-slate-400',
          },
          {
            label: 'Alta / Crítica',
            value: stats.critical,
            icon: AlertTriangle,
            color: 'text-red-400',
            bg: 'bg-red-600/10',
            iconColor: 'text-red-400',
          },
          {
            label: 'Creados este mes',
            value: stats.thisMonth,
            icon: Calendar,
            color: 'text-blue-400',
            bg: 'bg-blue-600/10',
            iconColor: 'text-blue-400',
          },
          {
            label: 'Tipos cubiertos',
            value: stats.types,
            icon: SlidersHorizontal,
            color: 'text-purple-400',
            bg: 'bg-purple-600/10',
            iconColor: 'text-purple-400',
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 bg-slate-900/60 rounded-xl flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {editing ? 'Editar plan de emergencia' : 'Nuevo plan de emergencia'}
                </h2>
                <p className="text-xs text-slate-500">Define protocolos y procedimientos por compañía</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Título del plan
                </label>
                <input
                  value={form.title}
                  onChange={set('title')}
                  required
                  placeholder="Ej. Evacuación edificio central"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Tipo de emergencia
                </label>
                <select value={form.emergencyType} onChange={set('emergencyType')} className={inputCls}>
                  {Object.entries(EMERGENCY_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Nivel de severidad
                </label>
                <select value={form.severity} onChange={set('severity')} className={inputCls}>
                  {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Compañía responsable
                </label>
                <select value={form.companyId} onChange={set('companyId')} required className={inputCls}>
                  <option value="">Seleccionar compañía...</option>
                  {companies?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      Cía. {c.number} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Descripción general
                </label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  required
                  rows={2}
                  placeholder="Alcance, objetivos y contexto del plan..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Procedimientos (JSON)
                </label>
                <textarea
                  value={form.procedures}
                  onChange={set('procedures')}
                  rows={5}
                  className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={'{"steps": ["Activar alarma", "Evacuar por escalera norte", "Punto de encuentro: plaza"]}'}
                />
                <p className="text-[11px] text-slate-600 mt-1.5">
                  Usa el campo <code className="text-slate-500">steps</code> con un arreglo de pasos ordenados
                </p>
              </div>
            </div>

              <PlanDepthFields
                form={form}
                setForm={setForm}
                inputCls={inputCls}
                planId={editing?.id}
                attachments={planDetail?.attachments ?? editing?.attachments}
                versions={planDetail?.versions ?? editing?.versions}
                onRefresh={() => {
                  qc.invalidateQueries({ queryKey: ['emergency-plans'] });
                  if (editing?.id) qc.invalidateQueries({ queryKey: ['emergency-plan', editing.id] });
                }}
              />

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={create.isPending || update.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {editing ? 'Guardar cambios' : 'Crear plan'}
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, descripción o compañía..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(EMERGENCY_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all"
        >
          <option value="">Todas las severidades</option>
          {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(filterType || filterSeverity || search) && (
          <button
            onClick={() => {
              setFilterType('');
              setFilterSeverity('');
              setSearch('');
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin planes de emergencia</p>
          <p className="text-slate-600 text-sm mt-1">
            {search || filterType || filterSeverity
              ? 'Prueba otros filtros o términos de búsqueda'
              : 'Crea el primer protocolo de contingencia para tu compañía'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p: any) => {
            const TypeIcon = TYPE_ICONS[p.emergencyType] ?? Shield;
            const banner = TYPE_BANNER[p.emergencyType] ?? TYPE_BANNER.OTRO;
            const sev = SEVERITY_STYLES[p.severity] ?? SEVERITY_STYLES.MEDIA;
            const steps = parseSteps(p.procedures);

            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <div
                  className={`bg-gradient-to-r ${banner} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border ${TYPE_COLORS[p.emergencyType] ?? TYPE_COLORS.OTRO}`}
                    >
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        {EMERGENCY_TYPE_LABELS[p.emergencyType]}
                      </p>
                      <p className="text-xs font-bold text-white leading-tight line-clamp-1">{p.title}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${sev.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                    {SEVERITY_LABELS[p.severity]}
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{p.description}</p>

                  {steps.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {steps.slice(0, 2).map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <span className="w-4 h-4 rounded-md bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 text-[9px] font-bold">
                            {i + 1}
                          </span>
                          <span className="line-clamp-1">{step}</span>
                        </div>
                      ))}
                      {steps.length > 2 && (
                        <p className="text-[10px] text-slate-600 pl-6">+{steps.length - 2} pasos más</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {steps.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3 h-3" />
                          {steps.length} pasos
                        </span>
                      )}
                      {p.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Cía. {p.company.number}
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
      {selected && detail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const TypeIcon = TYPE_ICONS[detail.emergencyType] ?? Shield;
              const banner = TYPE_BANNER[detail.emergencyType] ?? TYPE_BANNER.OTRO;
              const sev = SEVERITY_STYLES[detail.severity] ?? SEVERITY_STYLES.MEDIA;
              return (
                <div className={`bg-gradient-to-r ${banner} p-5 rounded-t-2xl border-b border-slate-800`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${TYPE_COLORS[detail.emergencyType] ?? TYPE_COLORS.OTRO}`}
                      >
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-base leading-tight">{detail.title}</p>
                        <p className="text-slate-300 text-sm">{EMERGENCY_TYPE_LABELS[detail.emergencyType]}</p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sev.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          Severidad {SEVERITY_LABELS[detail.severity]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-300 leading-relaxed">{detail.description}</p>
                {detail.company && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Cía. {detail.company.number} — {detail.company.name}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Creado {fmt(detail.createdAt)}
                  {detail.updatedAt !== detail.createdAt && ` · Actualizado ${fmt(detail.updatedAt)}`}
                </p>
              </div>

              {detail?.status && (
                <p className="text-xs text-slate-500">
                  Estado: <span className="text-sky-400 font-semibold">{PLAN_STATUS_LABELS[detail.status] ?? detail.status}</span>
                  {detail.version != null && <span className="ml-2">· v{detail.version}</span>}
                </p>
              )}

              {detailChecklist.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Checklist</p>
                  <ul className="space-y-1.5">
                    {detailChecklist.map((item, i) => (
                      <li key={item.id ?? i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-sky-400 font-mono text-xs">{i + 1}.</span>
                        {item.text}
                        {item.required && <span className="text-[10px] text-red-400">*</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {planDetail?.attachments?.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Adjuntos</p>
                  <ul className="space-y-1">
                    {planDetail.attachments.map((a: any) => (
                      <li key={a.id}>
                        <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-400 hover:underline">{a.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailSteps.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Procedimiento ({detailSteps.length} pasos)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {detailSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-red-600/15 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-300 leading-snug pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planDetail?.drills?.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Simulacros vinculados ({planDetail.drills.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {planDetail.drills.slice(0, 3).map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-xs bg-slate-700/50 rounded-lg px-3 py-2"
                      >
                        <span className="text-slate-300 font-medium truncate">{d.title}</span>
                        <span className="text-slate-500 shrink-0 ml-2">{d.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openEdit(detail)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar el plan "${detail.title}"?`)) remove.mutate(detail.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
