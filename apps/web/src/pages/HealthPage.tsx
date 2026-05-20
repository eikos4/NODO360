import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Pencil, Trash2, X, Building2, AlertTriangle, CheckCircle2,
  Clock, User, Stethoscope, Pill, Syringe, Activity, Search, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import LeucodeBadge from '../components/LeucodeBadge';

type Tab = 'resumen' | 'fichas';
type DetailTab = 'general' | 'examenes' | 'alergias' | 'medicamentos' | 'condiciones' | 'vacunas';

const BLOOD_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-', B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-', O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
  UNKNOWN: 'Desconocido',
};

const EXAM_TYPE_LABELS: Record<string, string> = {
  LABORATORIO: 'Laboratorio', IMAGENOLOGIA: 'Imagenología', CARDIOLOGICO: 'Cardiológico',
  OFTALMOLOGICO: 'Oftalmológico', AUDITIVO: 'Auditivo', PSICOMETRICO: 'Psicométrico',
  FISICO: 'Físico', OTRO: 'Otro',
};

const EXAM_STATUS_LABELS: Record<string, string> = {
  PROGRAMADO: 'Programado', COMPLETADO: 'Completado', RESULTADO_PENDIENTE: 'Pendiente',
  ANORMAL: 'Anormal', NORMAL: 'Normal',
};

const CHECKUP_META: Record<string, { label: string; badge: string }> = {
  VIGENTE: { label: 'Chequeo al día', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  POR_VENCER: { label: 'Chequeo por vencer', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  VENCIDO: { label: 'Chequeo vencido', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  SIN_FECHA: { label: 'Sin fecha', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function HealthPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'].includes(user?.role ?? '');

  const [tab, setTab] = useState<Tab>('resumen');
  const [companyFilter, setCompanyFilter] = useState(user?.companyId ?? '');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('general');
  const [search, setSearch] = useState('');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordForm, setRecordForm] = useState({
    bloodType: 'UNKNOWN',
    emergencyContact: '',
    emergencyPhone: '',
    chronicDiseases: '',
    surgeries: '',
    notes: '',
    lastCheckupAt: '',
    nextCheckupAt: '',
  });
  const [subModal, setSubModal] = useState<{ type: DetailTab; editing?: any } | null>(null);
  const [subForm, setSubForm] = useState<Record<string, string>>({});

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['health-summary', companyFilter],
    queryFn: () =>
      api.get('/health/summary', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: expiring } = useQuery({
    queryKey: ['health-expiring', companyFilter],
    queryFn: () =>
      api.get('/health/expiring', { params: companyFilter ? { companyId: companyFilter } : {} }).then(r => r.data),
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['health-roster', companyFilter],
    queryFn: () => api.get('/health/roster', { params: { companyId: companyFilter } }).then(r => r.data),
    enabled: !!companyFilter,
  });

  const { data: record, isLoading: loadingRecord } = useQuery({
    queryKey: ['health-record', selectedUserId],
    queryFn: () => api.get(`/health/records/${selectedUserId}`).then(r => r.data),
    enabled: !!selectedUserId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['health-summary'] });
    qc.invalidateQueries({ queryKey: ['health-expiring'] });
    qc.invalidateQueries({ queryKey: ['health-roster'] });
    if (selectedUserId) qc.invalidateQueries({ queryKey: ['health-record', selectedUserId] });
  };

  const ensureRecord = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/health/records/${userId}/ensure`, { companyId: companyFilter }),
    onSuccess: (_, userId) => {
      invalidate();
      setSelectedUserId(userId);
      toast.success('Ficha médica creada');
    },
    onError: () => toast.error('No se pudo crear la ficha'),
  });

  const saveRecord = useMutation({
    mutationFn: (payload: any) =>
      api.patch(`/health/records/${selectedUserId}`, payload),
    onSuccess: () => { invalidate(); toast.success('Ficha actualizada'); setShowRecordForm(false); },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteSub = useMutation({
    mutationFn: ({ path, id }: { path: string; id: string }) => api.delete(`/health/${path}/${id}`),
    onSuccess: () => { invalidate(); toast.success('Eliminado'); },
  });

  const saveSub = useMutation({
    mutationFn: async ({ path, id, payload }: { path: string; id?: string; payload: any }) => {
      if (id) return api.patch(`/health/${path}/${id}`, payload);
      const subPath =
        path === 'exams' ? 'exams' :
        path === 'conditions' ? 'conditions' :
        path === 'allergies' ? 'allergies' :
        path === 'medications' ? 'medications' : 'vaccinations';
      return api.post(`/health/records/${selectedUserId}/${subPath}`, payload);
    },
    onSuccess: () => { invalidate(); setSubModal(null); toast.success('Guardado'); },
    onError: () => toast.error('Error al guardar'),
  });

  const filteredRoster = roster.filter((m: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.rut?.toLowerCase().includes(q)
    );
  });

  const openRecordEdit = () => {
    if (!record) return;
    setRecordForm({
      bloodType: record.bloodType ?? 'UNKNOWN',
      emergencyContact: record.emergencyContact ?? '',
      emergencyPhone: record.emergencyPhone ?? '',
      chronicDiseases: record.chronicDiseases ?? '',
      surgeries: record.surgeries ?? '',
      notes: record.notes ?? '',
      lastCheckupAt: record.lastCheckupAt ? record.lastCheckupAt.slice(0, 10) : '',
      nextCheckupAt: record.nextCheckupAt ? record.nextCheckupAt.slice(0, 10) : '',
    });
    setShowRecordForm(true);
  };

  const selectMember = (m: any) => {
    if (!m.hasRecord) {
      if (canEdit && companyFilter) {
        ensureRecord.mutate(m.id);
      } else {
        toast.error('Este bombero aún no tiene ficha médica');
      }
      return;
    }
    setSelectedUserId(m.id);
    setDetailTab('general');
    setTab('fichas');
  };

  const openSubCreate = (type: DetailTab) => {
    setSubForm({});
    setSubModal({ type });
  };

  const submitSub = () => {
    if (!subModal || !selectedUserId) return;
    const pathMap: Record<string, string> = {
      examenes: 'exams', alergias: 'allergies', medicamentos: 'medications',
      condiciones: 'conditions', vacunas: 'vaccinations',
    };
    const path = pathMap[subModal.type];
    if (!path) return;

    let payload: any = { ...subForm };
    if (subModal.type === 'examenes') {
      payload = {
        type: subForm.type || 'FISICO',
        name: subForm.name,
        examDate: subForm.examDate,
        status: subForm.status || 'PROGRAMADO',
        result: subForm.result || undefined,
        notes: subForm.notes || undefined,
      };
    }
    saveSub.mutate({ path, id: subModal.editing?.id, payload });
  };

  const detailTabs: { id: DetailTab; label: string; icon: typeof Heart }[] = [
    { id: 'general', label: 'General', icon: Heart },
    { id: 'examenes', label: 'Exámenes', icon: Stethoscope },
    { id: 'alergias', label: 'Alergias', icon: AlertTriangle },
    { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
    { id: 'condiciones', label: 'Condiciones', icon: Activity },
    { id: 'vacunas', label: 'Vacunas', icon: Syringe },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Personal</p>
            <LeucodeBadge />
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="w-7 h-7 text-violet-400" />
            Salud operacional
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Fichas médicas, alergias, medicamentos y control de aptitud — desarrollo auspiciado por leucode.ia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <select
            value={companyFilter}
            onChange={e => { setCompanyFilter(e.target.value); setSelectedUserId(null); }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 min-w-[200px]"
          >
            <option value="">Seleccione compañía</option>
            {companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1">
        {(['resumen', 'fichas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30 border-b-transparent'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'resumen' ? 'Resumen' : 'Fichas médicas'}
          </button>
        ))}
      </div>

      {!companyFilter && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
          Seleccione una compañía para ver las fichas de salud
        </div>
      )}

      {companyFilter && tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Con ficha', value: summary?.withRecord ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Sin ficha', value: summary?.withoutRecord ?? 0, icon: User, color: 'text-slate-400' },
              { label: 'Chequeo vencido', value: summary?.checkupVencido ?? 0, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Por vencer', value: summary?.checkupPorVencer ?? 0, icon: Clock, color: 'text-amber-400' },
              { label: 'Exámenes anormales', value: summary?.examsAnormales ?? 0, icon: Stethoscope, color: 'text-orange-400' },
              { label: 'Alergias activas', value: summary?.activeAllergies ?? 0, icon: AlertTriangle, color: 'text-pink-400' },
              { label: 'Medicamentos', value: summary?.activeMedications ?? 0, icon: Pill, color: 'text-sky-400' },
              { label: 'Exámenes pendientes', value: summary?.examsPendientes ?? 0, icon: Clock, color: 'text-violet-400' },
            ].map(k => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <Icon className={`w-5 h-5 ${k.color} mb-2`} />
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{k.label}</p>
                </div>
              );
            })}
          </div>

          {(expiring?.checkups?.length > 0 || expiring?.exams?.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {expiring.checkups?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-amber-300 mb-3">Chequeos próximos / vencidos</h3>
                  <ul className="space-y-2 max-h-56 overflow-y-auto">
                    {expiring.checkups.map((c: any, i: number) => (
                      <li key={i} className="text-sm bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800">
                        <p className="font-semibold text-white">{c.user?.firstName} {c.user?.lastName}</p>
                        <p className="text-xs text-slate-500">{fmt(c.nextCheckupAt)} · {c.status}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiring.exams?.length > 0 && (
                <div className="bg-violet-950/20 border border-violet-800/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-violet-300 mb-3">Exámenes pendientes</h3>
                  <ul className="space-y-2 max-h-56 overflow-y-auto">
                    {expiring.exams.map((e: any) => (
                      <li key={e.id} className="text-sm bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800">
                        <p className="font-semibold text-white">{e.name}</p>
                        <p className="text-xs text-slate-500">{e.user?.firstName} {e.user?.lastName} · {fmt(e.examDate)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-900/50 border border-violet-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Tecnología de gestión clínica operacional integrada a NODO360
            </p>
            <LeucodeBadge variant="compact" />
          </div>
        </div>
      )}

      {companyFilter && tab === 'fichas' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar bombero..."
                className={`${inputCls} pl-10`}
              />
            </div>
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredRoster.map((m: any) => {
                const meta = CHECKUP_META[m.checkupStatus] ?? CHECKUP_META.SIN_FECHA;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => selectMember(m)}
                      className={`w-full text-left rounded-xl px-3 py-3 border transition-colors flex items-center gap-2 ${
                        selectedUserId === m.id
                          ? 'bg-violet-600/20 border-violet-500/40'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-slate-500">{m.rut}</p>
                        {!m.hasRecord && (
                          <p className="text-[10px] text-amber-400 mt-1">Sin ficha — clic para crear</p>
                        )}
                      </div>
                      {m.hasRecord && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${meta.badge}`}>
                          {m.allergyCount > 0 ? `${m.allergyCount} alerg.` : meta.label}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-8">
            {!selectedUserId && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-violet-500/40" />
                Seleccione un bombero para ver o crear su ficha médica
              </div>
            )}
            {selectedUserId && loadingRecord && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                Cargando ficha...
              </div>
            )}
            {selectedUserId && record && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {record.user?.firstName} {record.user?.lastName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {BLOOD_LABELS[record.bloodType]} · Contacto: {record.emergencyContact || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${CHECKUP_META[record.checkupStatus]?.badge}`}>
                      {CHECKUP_META[record.checkupStatus]?.label}
                      {record.nextCheckupAt && ` · ${fmt(record.nextCheckupAt)}`}
                    </span>
                    {canEdit && (
                      <button onClick={openRecordEdit} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 p-2 border-b border-slate-800 bg-slate-950/50">
                  {detailTabs.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDetailTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                          detailTab === t.id ? 'bg-violet-600/25 text-violet-300' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />{t.label}
                      </button>
                    );
                  })}
                  {canEdit && detailTab !== 'general' && (
                    <button
                      onClick={() => openSubCreate(detailTab)}
                      className="ml-auto flex items-center gap-1 px-3 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  )}
                </div>

                <div className="p-4">
                  {detailTab === 'general' && (
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div><p className="text-slate-500 text-xs">Tel. emergencia</p><p className="text-white">{record.emergencyPhone || '—'}</p></div>
                      <div><p className="text-slate-500 text-xs">Último chequeo</p><p className="text-white">{fmt(record.lastCheckupAt)}</p></div>
                      <div className="sm:col-span-2"><p className="text-slate-500 text-xs">Enfermedades crónicas</p><p className="text-white">{record.chronicDiseases || '—'}</p></div>
                      <div className="sm:col-span-2"><p className="text-slate-500 text-xs">Cirugías previas</p><p className="text-white">{record.surgeries || '—'}</p></div>
                      <div className="sm:col-span-2"><p className="text-slate-500 text-xs">Notas</p><p className="text-white">{record.notes || '—'}</p></div>
                    </div>
                  )}

                  {detailTab === 'examenes' && (
                    <ul className="space-y-2">
                      {record.medicalExams?.length === 0 && <p className="text-slate-500 text-sm">Sin exámenes registrados</p>}
                      {record.medicalExams?.map((e: any) => (
                        <li key={e.id} className="flex items-start justify-between gap-2 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/50">
                          <div>
                            <p className="font-semibold text-white text-sm">{e.name}</p>
                            <p className="text-xs text-slate-500">
                              {EXAM_TYPE_LABELS[e.type]} · {fmt(e.examDate)} · {EXAM_STATUS_LABELS[e.status]}
                            </p>
                            {e.result && <p className="text-xs text-amber-400/90 mt-1">{e.result}</p>}
                          </div>
                          {canEdit && (
                            <button onClick={() => deleteSub.mutate({ path: 'exams', id: e.id })} className="text-red-400 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {detailTab === 'alergias' && (
                    <ul className="space-y-2">
                      {record.allergies?.map((a: any) => (
                        <li key={a.id} className="flex justify-between bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2">
                          <div>
                            <p className="font-semibold text-red-200 text-sm">{a.name}</p>
                            <p className="text-xs text-slate-500">{a.type} · {a.severity} · {a.reaction}</p>
                          </div>
                          {canEdit && (
                            <button onClick={() => deleteSub.mutate({ path: 'allergies', id: a.id })} className="text-red-400 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {detailTab === 'medicamentos' && (
                    <ul className="space-y-2">
                      {record.medications?.map((m: any) => (
                        <li key={m.id} className="flex justify-between bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/50">
                          <div>
                            <p className="font-semibold text-white text-sm">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.dosage} · {m.frequency}</p>
                          </div>
                          {canEdit && (
                            <button onClick={() => deleteSub.mutate({ path: 'medications', id: m.id })} className="text-red-400 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {detailTab === 'condiciones' && (
                    <ul className="space-y-2">
                      {record.conditions?.map((c: any) => (
                        <li key={c.id} className="flex justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                          <div>
                            <p className="font-semibold text-white text-sm">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.severity} · {c.isActive ? 'Activa' : 'Inactiva'}</p>
                          </div>
                          {canEdit && (
                            <button onClick={() => deleteSub.mutate({ path: 'conditions', id: c.id })} className="text-red-400 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {detailTab === 'vacunas' && (
                    <ul className="space-y-2">
                      {record.vaccinations?.map((v: any) => (
                        <li key={v.id} className="flex justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                          <div>
                            <p className="font-semibold text-white text-sm">{v.name}</p>
                            <p className="text-xs text-slate-500">{fmt(v.administeredAt)} · próx. {fmt(v.nextDoseAt)}</p>
                          </div>
                          {canEdit && (
                            <button onClick={() => deleteSub.mutate({ path: 'vaccinations', id: v.id })} className="text-red-400 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <LeucodeBadge variant="footer" className="border-t border-slate-800/80" />
              </div>
            )}
          </div>
        </div>
      )}

      {showRecordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Editar ficha general</h3>
              <button onClick={() => setShowRecordForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <select value={recordForm.bloodType} onChange={e => setRecordForm(f => ({ ...f, bloodType: e.target.value }))} className={inputCls}>
              {Object.entries(BLOOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Contacto emergencia" value={recordForm.emergencyContact} onChange={e => setRecordForm(f => ({ ...f, emergencyContact: e.target.value }))} className={inputCls} />
            <input placeholder="Teléfono emergencia" value={recordForm.emergencyPhone} onChange={e => setRecordForm(f => ({ ...f, emergencyPhone: e.target.value }))} className={inputCls} />
            <input type="date" value={recordForm.lastCheckupAt} onChange={e => setRecordForm(f => ({ ...f, lastCheckupAt: e.target.value }))} className={inputCls} />
            <input type="date" value={recordForm.nextCheckupAt} onChange={e => setRecordForm(f => ({ ...f, nextCheckupAt: e.target.value }))} className={inputCls} />
            <textarea placeholder="Enfermedades crónicas (texto)" value={recordForm.chronicDiseases} onChange={e => setRecordForm(f => ({ ...f, chronicDiseases: e.target.value }))} className={inputCls} rows={2} />
            <textarea placeholder="Notas" value={recordForm.notes} onChange={e => setRecordForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} />
            <button
              onClick={() => saveRecord.mutate(recordForm)}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {subModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-bold text-white capitalize">Nuevo — {subModal.type}</h3>
              <button onClick={() => setSubModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {subModal.type === 'examenes' && (
              <>
                <input placeholder="Nombre examen" value={subForm.name ?? ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <select value={subForm.type ?? 'FISICO'} onChange={e => setSubForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="date" value={subForm.examDate ?? ''} onChange={e => setSubForm(f => ({ ...f, examDate: e.target.value }))} className={inputCls} />
                <select value={subForm.status ?? 'PROGRAMADO'} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {Object.entries(EXAM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input placeholder="Resultado (opcional)" value={subForm.result ?? ''} onChange={e => setSubForm(f => ({ ...f, result: e.target.value }))} className={inputCls} />
              </>
            )}
            {subModal.type === 'alergias' && (
              <>
                <input placeholder="Nombre alergia" value={subForm.name ?? ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <input placeholder="Tipo (MEDICAMENTO, ALIMENTO...)" value={subForm.type ?? ''} onChange={e => setSubForm(f => ({ ...f, type: e.target.value }))} className={inputCls} />
                <input placeholder="Severidad" value={subForm.severity ?? ''} onChange={e => setSubForm(f => ({ ...f, severity: e.target.value }))} className={inputCls} />
                <input placeholder="Reacción" value={subForm.reaction ?? ''} onChange={e => setSubForm(f => ({ ...f, reaction: e.target.value }))} className={inputCls} />
              </>
            )}
            {subModal.type === 'medicamentos' && (
              <>
                <input placeholder="Medicamento" value={subForm.name ?? ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <input placeholder="Dosis" value={subForm.dosage ?? ''} onChange={e => setSubForm(f => ({ ...f, dosage: e.target.value }))} className={inputCls} />
                <input placeholder="Frecuencia" value={subForm.frequency ?? ''} onChange={e => setSubForm(f => ({ ...f, frequency: e.target.value }))} className={inputCls} />
              </>
            )}
            {subModal.type === 'condiciones' && (
              <>
                <input placeholder="Condición" value={subForm.name ?? ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <select value={subForm.severity ?? 'MODERADO'} onChange={e => setSubForm(f => ({ ...f, severity: e.target.value }))} className={inputCls}>
                  {['LEVE', 'MODERADO', 'SEVERO', 'CRITICO'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            {subModal.type === 'vacunas' && (
              <>
                <input placeholder="Vacuna" value={subForm.name ?? ''} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <input type="date" value={subForm.administeredAt ?? ''} onChange={e => setSubForm(f => ({ ...f, administeredAt: e.target.value }))} className={inputCls} />
                <input type="date" value={subForm.nextDoseAt ?? ''} onChange={e => setSubForm(f => ({ ...f, nextDoseAt: e.target.value }))} className={inputCls} />
              </>
            )}
            <button onClick={submitSub} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm">
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
