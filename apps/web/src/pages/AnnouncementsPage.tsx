import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Bell, Megaphone, Calendar, Filter, X } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: 'Anuncio',
  OFFICIAL: 'Oficial',
  EVENT: 'Evento',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-slate-600/10', text: 'text-slate-400', border: 'border-slate-600/30' },
  MEDIUM: { bg: 'bg-blue-600/10', text: 'text-blue-400', border: 'border-blue-600/30' },
  HIGH: { bg: 'bg-orange-600/10', text: 'text-orange-400', border: 'border-orange-600/30' },
  URGENT: { bg: 'bg-red-600/10', text: 'text-red-400', border: 'border-red-600/30' },
};

const EMPTY = {
  title: '',
  content: '',
  type: 'ANNOUNCEMENT',
  priority: 'MEDIUM',
  eventDate: '',
  eventLocation: '',
  expiresAt: '',
  targetAudience: 'ALL',
  attachments: [] as string[],
};

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [editing, setEditing] = useState<any>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', filterType, filterPriority],
    queryFn: () => {
      const params: any = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterPriority !== 'all') params.priority = filterPriority;
      return api.get('/announcements', { params }).then(r => r.data);
    },
  });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/announcements', d, { params: { publishedBy: user?.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Anuncio creado'); reset(); },
    onError: () => toast.error('Error al crear anuncio'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/announcements/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Anuncio actualizado'); reset(); },
    onError: () => toast.error('Error al actualizar anuncio'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Anuncio eliminado'); },
    onError: () => toast.error('Error al eliminar anuncio'),
  });

  const reset = () => { setShowForm(false); setForm(EMPTY); setEditing(null); };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      eventDate: form.eventDate || undefined,
      eventLocation: form.eventLocation || undefined,
      expiresAt: form.expiresAt || undefined,
      attachments: form.attachments.length ? form.attachments : undefined,
    };
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      eventDate: a.eventDate?.slice(0, 10) ?? '',
      eventLocation: a.eventLocation ?? '',
      expiresAt: a.expiresAt?.slice(0, 10) ?? '',
      targetAudience: a.targetAudience,
      attachments: a.attachments ?? [],
    });
    setShowForm(true);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  const isExpired = (d?: string) => d && new Date(d) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Comunicados y Avisos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Tablón de anuncios, comunicados oficiales y eventos</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />Nuevo anuncio
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Filter className="w-4 h-4" />
          Filtros:
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['all', 'ANNOUNCEMENT', 'OFFICIAL', 'EVENT'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterType === t ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['all', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterPriority === p ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {p === 'all' ? 'Todas' : PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">{editing ? 'Editar' : 'Crear'} anuncio</h2>
            <button onClick={reset} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Título</label>
                <input value={form.title} onChange={set('title')} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
                <select value={form.type} onChange={set('type')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Prioridad</label>
                <select value={form.priority} onChange={set('priority')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500">
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Fecha de evento (opcional)</label>
                <input type="date" value={form.eventDate} onChange={set('eventDate')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Ubicación (opcional)</label>
                <input value={form.eventLocation} onChange={set('eventLocation')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
              <div><label className="block text-xs font-medium text-slate-400 mb-1">Expira (opcional)</label>
                <input type="date" value={form.expiresAt} onChange={set('expiresAt')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div><label className="block text-xs font-medium text-slate-400 mb-1">Contenido</label>
              <textarea value={form.content} onChange={set('content')} required rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={create.isPending || update.isPending} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                {editing ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <p className="text-slate-500 text-sm">Cargando...</p> : !announcements?.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">Sin anuncios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((a: any) => {
            const colors = PRIORITY_COLORS[a.priority];
            const isEvent = a.type === 'EVENT';
            return (
              <div key={a.id} className={`bg-slate-900 border ${colors.border} rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/30 transition-all`}>
                <div className={`${colors.bg} border-b border-slate-800 px-4 py-3 flex items-start justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.border} border`}>
                      {isEvent ? <Calendar className="w-4 h-4" /> : a.type === 'OFFICIAL' ? <Megaphone className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">{TYPE_LABELS[a.type]}</p>
                      <p className={`text-xs font-bold ${colors.text}`}>{PRIORITY_LABELS[a.priority]}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {a.targetAudience === 'ALL' ? 'Todos' : a.targetAudience === 'OFFICERS' ? 'Oficiales' : 'Personal'}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">{a.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 mb-3">{a.content}</p>
                  {isEvent && a.eventDate && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                      <Calendar className="w-3 h-3" />
                      {fmt(a.eventDate)}
                      {a.eventLocation && <span>• {a.eventLocation}</span>}
                    </div>
                  )}
                  {a.expiresAt && isExpired(a.expiresAt) && (
                    <p className="text-xs text-red-400 mb-2">Expiró el {fmt(a.expiresAt)}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <p className="text-[10px] text-slate-600">{fmt(a.publishedAt)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 text-slate-600 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove.mutate(a.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
