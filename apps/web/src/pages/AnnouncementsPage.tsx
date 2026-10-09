import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Bell, Megaphone, Calendar, Filter, X,
  ImagePlus, MapPin, User, Clock, ChevronRight, Upload, CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { safeHref } from '../lib/safe-url';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { hasAnyRole } from '../lib/roles';
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_TARGET_ROLES,
  announcementKind,
  announcementPriorityLabel,
} from '../lib/announcement-kinds';

const MAX_ATTACHMENTS = 8;
const IMAGE_ACCEPT = 'image/*,.heic,.heif,.avif,.bmp,.tif,.tiff';

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
  targetCompanyIds: [] as string[],
  targetRoles: [] as string[],
  requireAck: false,
  pollOn: false,
  pollQuestion: '',
  pollOptions: ['', ''] as string[],
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
  targetCompanyIds?: string[];
  targetRoles?: string[];
  requireAck?: boolean;
  imageUrl?: string | null;
  attachments?: string[];
  publishedAt: string;
  publisher?: Publisher;
  stats?: { sent: number; read: number; acked: number };
  mine?: { read: boolean; acked: boolean; voteIndex: number | null };
  poll?: {
    question: string;
    options: string[];
    closesAt?: string | null;
    closed?: boolean;
    results: number[];
    totalVotes: number;
  } | null;
};

type CompanyOpt = { id: string; name: string; number: number };

const EDITORS = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL'];

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

function StatsLine({ stats, requireAck }: { stats?: Announcement['stats']; requireAck?: boolean }) {
  if (!stats) return null;
  return (
    <p className="text-[11px] font-semibold text-slate-500 mt-2">
      Enviado a {stats.sent} · Leído {stats.read}
      {requireAck ? ` · Confirmado ${stats.acked}` : ''}
    </p>
  );
}

export default function AnnouncementsPage({ variant = 'admin' }: { variant?: 'admin' | 'central' }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = hasAnyRole(user, ...EDITORS);
  const fromCentral = variant === 'central';
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

  const { data: companies = [] } = useQuery<CompanyOpt[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: canEdit,
  });

  type AnnouncementPayload = {
    title: string;
    content: string;
    type: string;
    priority: string;
    eventDate?: string;
    eventLocation?: string;
    expiresAt?: string;
    targetCompanyIds: string[];
    targetRoles: string[];
    requireAck: boolean;
    pollQuestion?: string;
    pollOptions?: string[];
    imageUrl?: string;
    attachments: string[];
  };

  const buildPayload = (): AnnouncementPayload => ({
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    priority: form.priority,
    eventDate: form.eventDate || undefined,
    eventLocation: form.eventLocation || undefined,
    expiresAt: form.expiresAt || undefined,
    targetCompanyIds: form.targetCompanyIds,
    targetRoles: form.targetRoles,
    requireAck: form.requireAck,
    pollQuestion: form.pollOn ? form.pollQuestion.trim() : '',
    pollOptions: form.pollOn ? form.pollOptions.map((item) => item.trim()).filter(Boolean) : [],
    imageUrl: form.imageUrl || '',
    attachments: form.attachments,
  });

  const create = useMutation({
    mutationFn: (d: AnnouncementPayload) => api.post('/announcements', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Aviso enviado a la app'); reset(); },
    onError: () => toast.error('No se pudo publicar'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnnouncementPayload }) => api.put(`/announcements/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Aviso actualizado'); reset(); },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Aviso retirado'); setSelected(null); },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const reset = () => { setShowForm(false); setForm(EMPTY); setEditing(null); };
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pollOn && form.pollOptions.map((item) => item.trim()).filter(Boolean).length < 2) {
      toast.error('La votación necesita al menos 2 alternativas');
      return;
    }
    const payload = buildPayload();
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setSelected(null);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority === 'LOW' ? 'MEDIUM' : a.priority,
      eventDate: a.eventDate?.slice(0, 10) ?? '',
      eventLocation: a.eventLocation ?? '',
      expiresAt: a.expiresAt?.slice(0, 10) ?? '',
      targetCompanyIds: a.targetCompanyIds ?? [],
      targetRoles: a.targetRoles ?? [],
      requireAck: Boolean(a.requireAck),
      pollOn: Boolean(a.poll?.question),
      pollQuestion: a.poll?.question ?? '',
      pollOptions: a.poll?.options?.length ? [...a.poll.options] : ['', ''],
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

  const onExtra = async (files?: FileList | null) => {
    const room = MAX_ATTACHMENTS - form.attachments.length;
    const batch = Array.from(files ?? []).slice(0, room);
    if (!batch.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of batch) urls.push(await uploadImage(file));
      setForm((f) => ({ ...f, attachments: [...f.attachments, ...urls].slice(0, MAX_ATTACHMENTS) }));
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const toggleCompany = (id: string) => {
    setForm((f) => ({
      ...f,
      targetCompanyIds: f.targetCompanyIds.includes(id)
        ? f.targetCompanyIds.filter((item) => item !== id)
        : [...f.targetCompanyIds, id],
    }));
  };

  const toggleRole = (id: string) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(id)
        ? f.targetRoles.filter((item) => item !== id)
        : [...f.targetRoles, id],
    }));
  };

  const featured = (announcements ?? []).filter((a) =>
    a.priority === 'URGENT'
    || a.type === 'URGENT_NOTICE'
    || a.type === 'OFFICIAL'
    || a.type === 'CITATION'
    || (a.type === 'EVENT' && isSoon(a.eventDate)),
  );
  const rest = (announcements ?? []).filter((a) => !featured.some((f) => f.id === a.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">
            {fromCentral ? 'Central' : 'Cuerpo'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-red-600 dark:text-red-400" />
            {fromCentral ? 'Avisos a la app' : 'Comunicados y avisos'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Avisos, comandancia, noticias, citaciones y votaciones. Central ve enviado, leído y confirmado.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Nuevo aviso
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterType === 'all' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Todos
          </button>
          {ANNOUNCEMENT_KINDS.map((kind) => (
            <button
              key={kind.value}
              onClick={() => setFilterType(kind.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterType === kind.value ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {kind.icon} {kind.label.split(' / ')[0]}
            </button>
          ))}
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
          {[{ value: 'all', label: 'Prioridad' }, ...ANNOUNCEMENT_PRIORITIES].map((p) => (
            <button
              key={p.value}
              onClick={() => setFilterPriority(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterPriority === p.value ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{editing ? 'Editar aviso' : 'Publicar en la app'}</h2>
            <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Tipo</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ANNOUNCEMENT_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    type: kind.value,
                    priority: kind.value === 'URGENT_NOTICE' ? 'URGENT' : f.priority,
                  }))}
                  className={`text-left rounded-xl border px-3 py-2 ${form.type === kind.value ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{kind.icon} {kind.label}</p>
                  <p className="text-[11px] text-slate-500">{kind.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Título</label>
              <input value={form.title} onChange={set('title')} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prioridad</label>
              <div className="flex flex-wrap gap-2">
                {ANNOUNCEMENT_PRIORITIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: option.value }))}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase ${form.priority === option.value ? PRIORITY_STYLE[option.value] : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Vence (opcional)</label>
              <input type="date" value={form.expiresAt} onChange={set('expiresAt')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de evento (opcional)</label>
              <input type="date" value={form.eventDate} onChange={set('eventDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Lugar (opcional)</label>
              <input value={form.eventLocation} onChange={set('eventLocation')} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mensaje</label>
              <textarea value={form.content} onChange={set('content')} required rows={5} className={`${inputCls} resize-y min-h-[120px]`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Compañías destinatarias</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, targetCompanyIds: [] }))}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${form.targetCompanyIds.length === 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                Todas las compañías
              </button>
              {companies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => toggleCompany(company.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${form.targetCompanyIds.includes(company.id) ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  {company.number}ª {company.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Roles destinatarios</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, targetRoles: [] }))}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${form.targetRoles.length === 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                Todos los roles
              </button>
              {ANNOUNCEMENT_TARGET_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${form.targetRoles.includes(role.value) ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={form.requireAck} onChange={(e) => setForm((f) => ({ ...f, requireAck: e.target.checked }))} />
            Pedir acuse de lectura (confirmar en la app)
          </label>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <input type="checkbox" checked={form.pollOn} onChange={(e) => setForm((f) => ({ ...f, pollOn: e.target.checked }))} />
              Incluir votación o pregunta
            </label>
            {form.pollOn && (
              <>
                <input value={form.pollQuestion} onChange={set('pollQuestion')} placeholder="Pregunta para la dotación" className={inputCls} />
                {form.pollOptions.map((option, index) => (
                  <input
                    key={index}
                    value={option}
                    onChange={(e) => setForm((f) => {
                      const next = [...f.pollOptions];
                      next[index] = e.target.value;
                      return { ...f, pollOptions: next };
                    })}
                    placeholder={`Alternativa ${index + 1}`}
                    className={inputCls}
                  />
                ))}
                {form.pollOptions.length < 6 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, pollOptions: [...f.pollOptions, ''] }))} className="text-xs font-semibold text-red-600">
                    + Otra alternativa
                  </button>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Portada (opcional)</label>
              <input ref={coverRef} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => void onCover(e.target.files?.[0])} />
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
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fotos extra (hasta {MAX_ATTACHMENTS})</label>
              <input ref={extraRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => { void onExtra(e.target.files); if (extraRef.current) extraRef.current.value = ''; }} />
              <div className="flex flex-wrap gap-2">
                {form.attachments.map((url) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, attachments: f.attachments.filter((u) => u !== url) }))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {form.attachments.length < MAX_ATTACHMENTS && (
                  <button type="button" disabled={uploading} onClick={() => extraRef.current?.click()} className="w-20 h-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={create.isPending || update.isPending || uploading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              {editing ? 'Guardar cambios' : 'Enviar a la app'}
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
          <p className="text-sm text-slate-500 mt-1">Cuando Central publique un aviso, aparece acá y en la app.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {featured.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-400">Destacados</p>
              <div className="grid gap-4 lg:grid-cols-2">
                {featured.map((a) => {
                  const kind = announcementKind(a.type);
                  return (
                    <button key={a.id} type="button" onClick={() => setSelected(a)} className="text-left group bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                      {a.imageUrl && <img src={a.imageUrl} alt="" className="w-full h-44 object-cover" />}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.MEDIUM}`}>{announcementPriorityLabel(a.priority)}</span>
                          <span className="text-[10px] font-bold uppercase text-slate-400">{kind.icon} {kind.label}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600">{a.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{a.content}</p>
                        <StatsLine stats={a.stats} requireAck={a.requireAck} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rest.map((a) => {
                const kind = announcementKind(a.type);
                return (
                  <button key={a.id} type="button" onClick={() => setSelected(a)} className="text-left group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt="" className="w-full h-36 object-cover" />
                    ) : (
                      <div className="h-16 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center px-4 gap-2">
                        <span className="text-lg">{kind.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kind.label}</span>
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.MEDIUM}`}>{announcementPriorityLabel(a.priority)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 mb-1">{a.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 flex-1">{a.content}</p>
                      <StatsLine stats={a.stats} requireAck={a.requireAck} />
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                        <span>{publisherName(a)}</span>
                        <span className="flex items-center gap-1">{fmt(a.publishedAt)} <ChevronRight className="w-3 h-3" /></span>
                      </div>
                    </div>
                  </button>
                );
              })}
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLE[selected.priority] ?? PRIORITY_STYLE.MEDIUM}`}>{announcementPriorityLabel(selected.priority)}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{announcementKind(selected.type).icon} {announcementKind(selected.type).label}</span>
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
              {selected.stats && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Enviado a {selected.stats.sent}, leído {selected.stats.read}{selected.requireAck ? `, confirmado ${selected.stats.acked}` : ''}
                </div>
              )}
              {selected.poll && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selected.poll.question}</p>
                  {selected.poll.options.map((option, index) => {
                    const total = selected.poll?.totalVotes || 1;
                    const count = selected.poll?.results[index] ?? 0;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={option} className="text-sm">
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>{option}</span>
                          <span>{count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1">
                          <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selected.attachments.map((url) => (
                    <a key={url} href={safeHref(url)} target="_blank" rel="noopener noreferrer">
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
