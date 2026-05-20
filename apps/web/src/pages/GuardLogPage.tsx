import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Trash2, Users, Truck, ShieldAlert, Siren,
  ClipboardList, ArrowRightLeft, Calendar, Building2, CheckCircle2,
  Lock, Unlock, Clock, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const ENTRY_TYPES: Record<string, string> = {
  NOVEDAD: 'Novedad',
  REVISION: 'Revisión',
  VISITA: 'Visita',
  COMUNICACION: 'Comunicación',
  MANTENIMIENTO: 'Mantención',
  OTRO: 'Otro',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', COMANDANTE: 'Comandante', CAPITAN: 'Capitán',
  ENCARGADO_MATERIAL: 'Enc. Material', SECRETARIO: 'Secretario', BOMBERO: 'Bombero',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const fmtTime = (d: string) =>
  new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500';

type Tab = 'turno' | 'novedades' | 'entrega' | 'emergencias';

export default function GuardLogPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('turno');
  const [companyId, setCompanyId] = useState(
    () => searchParams.get('companyId') ?? user?.companyId ?? '',
  );
  const [date, setDate] = useState(
    () => searchParams.get('date') ?? new Date().toISOString().slice(0, 10),
  );
  const [entryForm, setEntryForm] = useState({ type: 'NOVEDAD', title: '', content: '' });
  const [handoverForm, setHandoverForm] = useState({ fromUserId: '', toUserId: '', summary: '', observations: '' });
  const [closingNotes, setClosingNotes] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['guard-log-dashboard', companyId, date],
    queryFn: () =>
      api.get('/guard-log/dashboard', { params: { companyId, date } }).then((r) => r.data),
    enabled: !!companyId,
  });

  const logId = dashboard?.log?.id;
  const isOpen = dashboard?.log?.status === 'OPEN';
  const ciaUsers = useMemo(
    () => (users ?? []).filter((u: { companyId?: string }) => !companyId || u.companyId === companyId),
    [users, companyId],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guard-log-dashboard', companyId, date] });
    qc.invalidateQueries({ queryKey: ['guard-log'] });
  };

  const addEntry = useMutation({
    mutationFn: (body: unknown) => api.post(`/guard-log/${logId}/entries`, body),
    onSuccess: () => {
      toast.success('Novedad registrada');
      setEntryForm({ type: 'NOVEDAD', title: '', content: '' });
      invalidate();
    },
    onError: () => toast.error('Error al registrar novedad'),
  });

  const addHandover = useMutation({
    mutationFn: (body: unknown) => api.post(`/guard-log/${logId}/handovers`, body),
    onSuccess: () => {
      toast.success('Entrega de turno registrada');
      setHandoverForm({ fromUserId: '', toUserId: '', summary: '', observations: '' });
      invalidate();
    },
    onError: () => toast.error('Error al registrar entrega'),
  });

  const closeLog = useMutation({
    mutationFn: () => api.patch(`/guard-log/${logId}/close`, { closingNotes: closingNotes || undefined }),
    onSuccess: () => { toast.success('Bitácora cerrada'); invalidate(); },
    onError: () => toast.error('Error al cerrar'),
  });

  const reopenLog = useMutation({
    mutationFn: () => api.patch(`/guard-log/${logId}/reopen`),
    onSuccess: () => { toast.success('Bitácora reabierta'); invalidate(); },
    onError: () => toast.error('Error al reabrir'),
  });

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) => api.delete(`/guard-log/${logId}/entries/${entryId}`),
    onSuccess: () => { toast.success('Novedad eliminada'); invalidate(); },
    onError: () => toast.error('Error al eliminar'),
  });

  const stats = dashboard?.stats;
  const isToday = date === new Date().toISOString().slice(0, 10);

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'turno', label: 'Turno activo', icon: Users },
    { id: 'novedades', label: 'Novedades', icon: ClipboardList },
    { id: 'entrega', label: 'Entrega', icon: ArrowRightLeft },
    { id: 'emergencias', label: 'Emergencias del día', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            Bitácora de guardia
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Libro de guardia: novedades, entrega de turno y emergencias del día
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/shifts"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600"
          >
            <Calendar className="w-4 h-4" /> Turnos
          </Link>
          <Link
            to="/botonera"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
          >
            <Siren className="w-4 h-4" /> Botonera
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="min-w-[200px] flex-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Compañía</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
            <option value="">Seleccionar...</option>
            {companies?.map((c: { id: string; number: number; name: string }) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        {isToday && (
          <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">
            Hoy
          </span>
        )}
        {dashboard?.log && (
          <span
            className={`px-2 py-1 text-xs font-bold rounded-lg border ${
              isOpen
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700 text-slate-400 border-slate-600'
            }`}
          >
            {isOpen ? 'Abierta' : 'Cerrada'}
          </span>
        )}
      </div>

      {!companyId ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">Selecciona una compañía para abrir la bitácora</p>
        </div>
      ) : isLoading ? (
        <p className="text-slate-500 text-sm">Cargando bitácora...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'En guardia', value: stats?.presentCount ?? 0, sub: `/${stats?.shiftCount ?? 0}`, color: 'text-emerald-400' },
              { label: 'Emergencias', value: stats?.incidentCount ?? 0, sub: `${stats?.openIncidents ?? 0} abiertas`, color: 'text-red-400' },
              { label: 'Novedades', value: stats?.entryCount ?? 0, sub: 'registros', color: 'text-sky-400' },
              { label: 'Entregas', value: stats?.handoverCount ?? 0, sub: 'turno', color: 'text-amber-400' },
              { label: 'Carros op.', value: stats?.vehicleOperativo ?? 0, sub: `/${stats?.vehicleTotal ?? 0}`, color: 'text-orange-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>
                  {s.value}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">{s.sub}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'turno' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Personal de guardia — {fmtDate(date)}
                </h2>
                {!dashboard?.shifts?.length ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Sin turnos programados.{' '}
                    <Link to="/shifts" className="text-emerald-400 hover:underline">Programar en Turnos</Link>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.shifts.map((s: any) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          s.present ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                          {s.user.firstName[0]}{s.user.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {s.user.firstName} {s.user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ROLE_LABELS[s.user.role] ?? s.user.role} · {s.startTime} — {s.endTime}
                          </p>
                        </div>
                        {s.present ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-400" />
                    Estado carros
                  </h2>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {dashboard?.vehicles?.map((v: any) => (
                      <div key={v.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
                        <span className="font-mono text-slate-300">{v.patent}</span>
                        <span className={v.status === 'OPERATIVO' ? 'text-emerald-400' : 'text-amber-400'}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-3">Cierre de bitácora</h2>
                  {isOpen ? (
                    <>
                      <textarea
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        rows={3}
                        placeholder="Resumen final del turno (opcional)..."
                        className={`${inputCls} resize-none mb-3`}
                      />
                      <button
                        type="button"
                        onClick={() => closeLog.mutate()}
                        disabled={closeLog.isPending}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2.5 rounded-xl"
                      >
                        <Lock className="w-4 h-4" /> Cerrar bitácora del día
                      </button>
                    </>
                  ) : (
                    <>
                      {dashboard?.log?.closingNotes && (
                        <p className="text-xs text-slate-400 mb-3 bg-slate-800 rounded-lg p-3">
                          {dashboard.log.closingNotes}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => reopenLog.mutate()}
                        disabled={reopenLog.isPending}
                        className="w-full flex items-center justify-center gap-2 border border-emerald-600/50 text-emerald-400 text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-600/10"
                      >
                        <Unlock className="w-4 h-4" /> Reabrir bitácora
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'novedades' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isOpen && (
                <div className="bg-slate-900 border border-emerald-600/30 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-4">Registrar novedad</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!entryForm.title.trim()) { toast.error('Título requerido'); return; }
                      addEntry.mutate(entryForm);
                    }}
                    className="space-y-3"
                  >
                    <select
                      value={entryForm.type}
                      onChange={(e) => setEntryForm((f) => ({ ...f, type: e.target.value }))}
                      className={inputCls}
                    >
                      {Object.entries(ENTRY_TYPES).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </select>
                    <input
                      value={entryForm.title}
                      onChange={(e) => setEntryForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Título breve"
                      required
                      className={inputCls}
                    />
                    <textarea
                      value={entryForm.content}
                      onChange={(e) => setEntryForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Detalle de la novedad..."
                      rows={4}
                      required
                      className={`${inputCls} resize-none`}
                    />
                    <button
                      type="submit"
                      disabled={addEntry.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl"
                    >
                      Agregar a bitácora
                    </button>
                  </form>
                </div>
              )}

              <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${!isOpen ? 'lg:col-span-2' : ''}`}>
                <h2 className="text-sm font-bold text-white mb-4">Cronología ({dashboard?.entries?.length ?? 0})</h2>
                {!dashboard?.entries?.length ? (
                  <p className="text-sm text-slate-500 text-center py-8">Sin novedades registradas</p>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {dashboard.entries.map((entry: any) => (
                      <div key={entry.id} className="border border-slate-700 rounded-xl p-4 bg-slate-800/40">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-sky-400 uppercase">
                              {ENTRY_TYPES[entry.type] ?? entry.type}
                            </span>
                            <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                          </div>
                          {isOpen && (
                            <button
                              type="button"
                              onClick={() => deleteEntry.mutate(entry.id)}
                              className="p-1 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 whitespace-pre-wrap">{entry.content}</p>
                        <p className="text-[10px] text-slate-600 mt-2">
                          {entry.author.firstName} {entry.author.lastName} · {fmtTime(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'entrega' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-amber-600/30 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  Nueva entrega de turno
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!handoverForm.fromUserId || !handoverForm.toUserId || !handoverForm.summary.trim()) {
                      toast.error('Completa entrega, recepción y resumen');
                      return;
                    }
                    addHandover.mutate(handoverForm);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Entrega (sale de guardia)</label>
                    <select
                      value={handoverForm.fromUserId}
                      onChange={(e) => setHandoverForm((f) => ({ ...f, fromUserId: e.target.value }))}
                      className={inputCls}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {ciaUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Recibe (entra a guardia)</label>
                    <select
                      value={handoverForm.toUserId}
                      onChange={(e) => setHandoverForm((f) => ({ ...f, toUserId: e.target.value }))}
                      className={inputCls}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {ciaUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={handoverForm.summary}
                    onChange={(e) => setHandoverForm((f) => ({ ...f, summary: e.target.value }))}
                    placeholder="Resumen del estado del cuartel, novedades pendientes..."
                    rows={3}
                    required
                    className={`${inputCls} resize-none`}
                  />
                  <textarea
                    value={handoverForm.observations}
                    onChange={(e) => setHandoverForm((f) => ({ ...f, observations: e.target.value }))}
                    placeholder="Observaciones adicionales (opcional)"
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                  <button
                    type="submit"
                    disabled={addHandover.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-xl"
                  >
                    Registrar entrega
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4">Historial de entregas</h2>
                {!dashboard?.handovers?.length ? (
                  <p className="text-sm text-slate-500 text-center py-8">Sin entregas registradas</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.handovers.map((h: any) => (
                      <div key={h.id} className="border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-white mb-2">
                          <span>{h.fromUser.firstName} {h.fromUser.lastName}</span>
                          <ChevronRight className="w-4 h-4 text-amber-400" />
                          <span>{h.toUser.firstName} {h.toUser.lastName}</span>
                        </div>
                        <p className="text-xs text-slate-300">{h.summary}</p>
                        {h.observations && (
                          <p className="text-xs text-slate-500 mt-1 italic">{h.observations}</p>
                        )}
                        <p className="text-[10px] text-slate-600 mt-2">{fmtTime(h.handedAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'emergencias' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Emergencias despachadas — {fmtDate(date)}
                </h2>
                <Link
                  to="/botonera"
                  className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Siren className="w-3.5 h-3.5" /> Ir a botonera
                </Link>
              </div>
              {!dashboard?.incidents?.length ? (
                <p className="text-sm text-slate-500 text-center py-12">Sin emergencias este día</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.incidents.map((inc: any) => (
                    <div
                      key={inc.id}
                      className="border border-slate-700 rounded-xl p-4 hover:border-red-500/30 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-bold text-red-400">{inc.code}</p>
                          <p className="text-sm text-white">{inc.type}</p>
                          <p className="text-xs text-slate-500 mt-1">{inc.address}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inc.closedAt
                              ? 'bg-slate-700 text-slate-400'
                              : 'bg-red-600/20 text-red-400 animate-pulse'
                          }`}
                        >
                          {inc.closedAt ? 'Cerrada' : 'En curso'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {inc.vehicles?.map((iv: any) => (
                          <span
                            key={iv.id}
                            className="text-[10px] font-mono bg-orange-600/15 text-orange-300 px-2 py-0.5 rounded"
                          >
                            {iv.vehicle?.patent}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2">
                        Despacho: {fmtTime(inc.dispatchedAt)}
                        {inc.dispatchSource === 'BOTONERA' && (
                          <span className="text-red-400 ml-1">· Botonera</span>
                        )}
                      </p>
                      <Link
                        to="/incidents"
                        className="inline-flex items-center gap-1 text-[10px] text-sky-400 mt-2 hover:underline"
                      >
                        Ver en emergencias <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
