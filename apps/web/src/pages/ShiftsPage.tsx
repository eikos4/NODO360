import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle, XCircle, Calendar, Clock, Users, AlertTriangle, BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: 'Super Admin', COMANDANTE: 'Comandante', CAPITAN: 'Capitán', ENCARGADO_MATERIAL: 'Enc. Material', SECRETARIO: 'Secretario', TESORERO: 'Tesorero', BOMBERO: 'Bombero', AUDITOR: 'Auditor' };
const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
const fmtShort = (d: string) => new Date(d).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });

const EMPTY = { date: '', startTime: '08:00', endTime: '20:00', notes: '', userIds: [] as string[] };

export default function ShiftsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', viewMode],
    queryFn: () => viewMode === 'upcoming'
      ? api.get('/shifts/upcoming').then(r => r.data)
      : api.get('/shifts').then(r => r.data),
  });

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/shifts', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success('Turno(s) creado(s)'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const markPresent = useMutation({
    mutationFn: ({ id, present }: { id: string; present: boolean }) => api.patch(`/shifts/${id}/present`, { present }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
    onError: () => toast.error('Error al actualizar asistencia'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success('Turno eliminado'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const reset = () => { setShowForm(false); setForm(EMPTY); };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const toggleUser = (uid: string) => setForm((f: any) => ({
    ...f, userIds: f.userIds.includes(uid) ? f.userIds.filter((id: string) => id !== uid) : [...f.userIds, uid]
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userIds.length) { toast.error('Selecciona al menos un bombero'); return; }
    create.mutate({ ...form, notes: form.notes || undefined });
  };

  const grouped = shifts?.reduce((acc: Record<string, any[]>, s: any) => {
    const key = s.date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Guardia y Turnos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Programación de guardias operativas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/guard-log"
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />Abrir bitácora
          </Link>
          <button onClick={() => { reset(); setShowForm(true); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />Nueva guardia
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {(['upcoming', 'all'] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === m ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {m === 'upcoming' ? 'Próximas' : 'Todas'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Programar guardia</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Fecha</label>
                <input type="date" value={form.date} onChange={set('date')} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" /></div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Hora inicio</label>
                <input type="time" value={form.startTime} onChange={set('startTime')} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" /></div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Hora término</label>
                <input type="time" value={form.endTime} onChange={set('endTime')} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" /></div>
              <div className="sm:col-span-3"><label className="block text-xs font-medium text-slate-400 mb-1">Notas (opcional)</label>
                <input value={form.notes} onChange={set('notes')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" /></div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Personal asignado <span className="text-red-400">({form.userIds.length} seleccionados)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto bg-slate-800 rounded-lg p-3">
                {users?.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <input type="checkbox" checked={form.userIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-red-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-200 truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-[10px] text-slate-500">{ROLE_LABELS[u.role] ?? u.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={create.isPending} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                Crear guardia</button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <p className="text-slate-500 text-sm">Cargando...</p> : !Object.keys(grouped).length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">{viewMode === 'upcoming' ? 'No hay guardias programadas' : 'Sin registros de turno'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayShifts]) => {
              const presentCount = (dayShifts as any[]).filter((s: any) => s.present).length;
              const totalCount = (dayShifts as any[]).length;
              const isToday = new Date(date).toDateString() === new Date().toDateString();
              const isPast = new Date(date) < new Date().setHours(0,0,0,0);

              return (
                <div key={date} className={`bg-slate-900 border ${isToday ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-800'} rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/30 transition-all duration-300`}>
                  {/* Header de la tarjeta */}
                  <div className={`px-5 py-4 flex items-center gap-3 ${isToday ? 'bg-gradient-to-r from-red-600/20 to-red-600/5' : 'bg-slate-800/50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isToday ? 'bg-red-600' : isPast ? 'bg-slate-700' : 'bg-slate-800'}`}>
                      <Calendar className={`w-5 h-5 ${isToday ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isToday ? 'text-red-400' : 'text-slate-200'} capitalize`}>{fmt(date)}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {totalCount} turno{totalCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {presentCount}/{totalCount} presentes
                        </span>
                      </div>
                    </div>
                    {isToday && (
                      <div className="px-2 py-1 bg-red-600/20 rounded-lg">
                        <span className="text-xs font-medium text-red-400">Hoy</span>
                      </div>
                    )}
                  </div>

                  {/* Lista de turnos */}
                  <div className="divide-y divide-slate-800/50">
                    {(dayShifts as any[]).map((s: any) => (
                      <div key={s.id} className="group px-4 py-3 hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3">
                          {/* Avatar inicial */}
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.present ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'} font-semibold text-sm`}>
                            {s.user.firstName[0]}{s.user.lastName[0]}
                          </div>

                          {/* Info del bombero */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-200 truncate">{s.user.firstName} {s.user.lastName}</p>
                              {s.present && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">{ROLE_LABELS[s.user.role] ?? s.user.role}</span>
                              <span className="text-xs text-slate-600">•</span>
                              <span className="text-xs font-mono text-slate-400">{s.startTime} — {s.endTime}</span>
                            </div>
                            {s.notes && <p className="text-xs text-slate-600 italic mt-1 truncate">{s.notes}</p>}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => markPresent.mutate({ id: s.id, present: !s.present })}
                              className={`p-1.5 rounded-lg transition-colors ${s.present ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                              {s.present ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => remove.mutate(s.id)}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer con resumen */}
                  <div className="px-4 py-2.5 bg-slate-800/30 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {(dayShifts as any[]).slice(0, 3).map((s: any) => (
                          <div key={s.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${s.present ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {s.user.firstName[0]}
                          </div>
                        ))}
                        {totalCount > 3 && (
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                            +{totalCount - 3}
                          </div>
                        )}
                      </div>
                    </div>
                    {presentCount === totalCount && totalCount > 0 && (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completo</span>
                      </div>
                    )}
                    {presentCount === 0 && totalCount > 0 && (
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Pendiente</span>
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
