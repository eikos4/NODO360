import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Bell, Megaphone, Calendar, Filter, X,
  ImagePlus, MapPin, User, Clock, ChevronRight, Upload,
} from 'lucide-react';
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

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'Todo el cuerpo',
  ALL_PERSONNEL: 'Personal',
  OFFICERS: 'Oficiales',
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  MEDIUM: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
  HIGH: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  URGENT: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
};

const inputCls =
  'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40';

const EMPTY = {
  title: '',
  content: '',
  type: 'ANNOUNCEMENT',
  priority: 'MEDIUM',
  eventDate: '',
  eventLocation: '',
  expiresAt: '',
  targetAudience: 'ALL',
  imageUrl: '',
  attachments: [] as string[],
};

type Publisher = { firstName: string; lastName: string; role?: string };
type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  expiresAt?: string | null;
  targetAudience: string;
  imageUrl?: string | null;
  attachments?: string[];
  publishedAt: string;
  publisher?: Publisher;
};

const EDITORS = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'];

function publisherName(item: Announcement) {
  const name = `${item.publisher?.firstName ?? ''} ${item.publisher?.lastName ?? ''}`.trim();
  return name || 'Cuerpo';
}

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

function isSoon(d?: string | null) {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 21 * 86400000;
}

async function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ imageUrl: string }>('/announcements/upload', form);
  return data.imageUrl;
}

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = EDITORS.includes(user?.role ?? '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements', filterType, filterPriority],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterPriority !== 'all') params.priority = filterPriority;
      return api.get('/announcements', { params }).then((r) => r.data);
    },
  });

  type AnnouncementPayload = Omit<typeof EMPTY, 'eventDate' | 'eventLocation' | 'expiresAt'> & {
    eventDate?: string;
    eventLocation?: string;
    expiresAt?: string;
  };

  const create = useMutation({
    mutationFn: (d: AnnouncementPayload) => api.post('/announcements', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Comunicado publicado'); reset(); },
    onError: () => toast.error('No se pudo publicar'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnnouncementPayload }) => api.put(`/announcements/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Comunicado actualizado'); reset(); },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Comunicado retirado'); setSelected(null); },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const reset = () => { setShowForm(false); setForm(EMPTY); setEditing(null); };
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      eventDate: form.eventDate || undefined,
      eventLocation: form.eventLocation || undefined,
      expiresAt: form.expiresAt || undefined,
      imageUrl: form.imageUrl || '',
      attachments: form.attachments,
    };
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setSelected(null);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      eventDate: a.eventDate?.slice(0, 10) ?? '',
      eventLocation: a.eventLocation ?? '',
      expiresAt: a.expiresAt?.slice(0, 10) ?? '',
      targetAudience: a.targetAudience,
      imageUrl: a.imageUrl ?? '',
      attachments: a.attachments ?? [],
    });
    setShowForm(true);
  };

  const onCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch {
      toast.error('No se pudo subir la portada');
    } finally {
      setUploading(false);
    }
  };

  const onExtra = async (file?: File) => {
    if (!file || form.attachments.length >= 3) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, attachments: [...f.attachments, url] }));
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const featured = (announcements ?? []).filter((a) => a.priority === 'URGENT' || (a.type === 'EVENT' && isSoon(a.eventDate)));
  const rest = (announcements ?? []).filter((a) => !featured.some((f) => f.id === a.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Cuerpo</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-red-600 dark:text-red-400" />
            Comunicados y avisos
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Tablón oficial: anuncios, comunicados y eventos del cuerpo
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Nuevo comunicado
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
          {(['all', 'ANNOUNCEMENT', 'OFFICIAL', 'EVENT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterType === t ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
          {(['all', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterPriority === p ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {p === 'all' ? 'Prioridad' : PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{editing ? 'Editar comunicado' : 'Publicar comunicado'}</h2>
            <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Título</label>
              <input value={form.title} onChange={set('title')} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo</label>
              <select value={form.type} onChange={set('type')} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prioridad</label>
              <select value={form.priority} onChange={set('priority')} className={inputCls}>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Audiencia</label>
              <select value={form.targetAudience} onChange={set('targetAudience')} className={inputCls}>
                {Object.entries(AUDIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Vence (opcional)</label>
              <input type="date" value={form.expiresAt} onChange={set('expiresAt')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de evento</label>
              <input type="date" value={form.eventDate} onChange={set('eventDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Lugar del evento</label>
              <input value={form.eventLocation} onChange={set('eventLocation')} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contenido</label>
              <textarea value={form.content} onChange={set('content')} required rows={5} className={`${inputCls} resize-y min-h-[120px]`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Portada (opcional)</label>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => void onCover(e.target.files?.[0])} />
              {form.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={form.imageUrl} alt="" className="w-full h-36 object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button type="button" disabled={uploading} onClick={() => coverRef.current?.click()} className="w-full h-36 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 text-sm flex flex-col items-center justify-center gap-2 hover:border-red-400">
                  <ImagePlus className="w-6 h-6" /> {uploading ? 'Subiendo…' : 'Subir imagen de portada'}
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fotos extra (hasta 3)</label>
              <input ref={extraRef} type="file" accept="image/*" hidden onChange={(e) => { void onExtra(e.target.files?.[0]); if (extraRef.current) extraRef.current.value = ''; }} />
              <div className="flex flex-wrap gap-2">
                {form.attachments.map((url) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, attachments: f.attachments.filter((u) => u !== url) }))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {form.attachments.length < 3 && (
                  <button type="button" disabled={uploading} onClick={() => extraRef.current?.click()} className="w-20 h-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={create.isPending || update.isPending || uploading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              {editing ? 'Guardar cambios' : 'Publicar'}
            </button>
            <button type="button" onClick={reset} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm px-4 py-2.5">Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando tablón…</p>
      ) : !announcements?.length ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No hay comunicados vigentes</p>
          <p className="text-sm text-slate-500 mt-1">Cuando el comando publique un aviso, aparece acá.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {featured.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-400">Destacados</p>
              <div className="grid gap-4 lg:grid-cols-2">
                {featured.map((a) => (
                  <button key={a.id} type="button" onClick={() => setSelected(a)} className="text-left group bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {a.imageUrl && <img src={a.imageUrl} alt="" className="w-full h-44 object-cover" />}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[a.priority]}`}>{PRIORITY_LABELS[a.priority]}</span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{TYPE_LABELS[a.type]}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600">{a.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{a.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rest.map((a) => (
                <button key={a.id} type="button" onClick={() => setSelected(a)} className="text-left group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt="" className="w-full h-36 object-cover" />
                  ) : (
                    <div className="h-16 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center px-4 gap-2">
                      {a.type === 'EVENT' ? <Calendar className="w-4 h-4 text-red-500" /> : a.type === 'OFFICIAL' ? <Megaphone className="w-4 h-4 text-red-500" /> : <Bell className="w-4 h-4 text-red-500" />}
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{TYPE_LABELS[a.type]}</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[a.priority]}`}>{PRIORITY_LABELS[a.priority]}</span>
                      <span className="text-[10px] text-slate-400">{AUDIENCE_LABELS[a.targetAudience]}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 mb-1">{a.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-3 flex-1">{a.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <span>{publisherName(a)}</span>
                      <span className="flex items-center gap-1">{fmt(a.publishedAt)} <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setSelected(null)}>
          <article className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {selected.imageUrl && <img src={selected.imageUrl} alt="" className="w-full h-56 object-cover" />}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[selected.priority]}`}>{PRIORITY_LABELS[selected.priority]}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{TYPE_LABELS[selected.type]}</span>
                    <span className="text-[10px] text-slate-400">{AUDIENCE_LABELS[selected.targetAudience]}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selected.title}</h2>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
              {(selected.eventDate || selected.eventLocation) && (
                <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                  {selected.eventDate && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-red-500" /> {fmt(selected.eventDate)}</span>}
                  {selected.eventLocation && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500" /> {selected.eventLocation}</span>}
                </div>
              )}
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selected.attachments.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {publisherName(selected)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmt(selected.publishedAt)}</span>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(selected)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => { if (confirm('¿Retirar este comunicado del tablón?')) remove.mutate(selected.id); }} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                    <Trash2 className="w-3.5 h-3.5" /> Retirar
                  </button>
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
