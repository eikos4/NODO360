import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Cake, CalendarDays, CheckCircle2, CheckSquare, Home, Megaphone, Plus, Sparkles, Users, X,
} from 'lucide-react';
import { salaAuthHeaders } from '../../lib/sala-auth';
import CompaniaIntranet, {
  CompaniaLifeModal,
  type CompaniaBoard,
  type LifePriority,
} from '../compania/CompaniaIntranet';

type Kind = 'ASEO' | 'TAREA' | 'REUNION' | 'RECORDATORIO' | 'CUMPLE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
};

type LifeItem = {
  id: string;
  kind: Kind;
  title: string;
  notes: string | null;
  status: 'OPEN' | 'DONE';
  priority: Priority;
  dueAt: string | null;
  assignee: Person | null;
};

type Board = CompaniaBoard;

const KINDS: { id: Kind; label: string; icon: typeof CheckSquare }[] = [
  { id: 'TAREA', label: 'Tarea', icon: CheckSquare },
  { id: 'ASEO', label: 'Aseo', icon: Sparkles },
  { id: 'REUNION', label: 'Reunión', icon: Users },
  { id: 'RECORDATORIO', label: 'Aviso', icon: Bell },
  { id: 'CUMPLE', label: 'Cumple', icon: Cake },
];

const KIND_LABEL: Record<Kind, string> = {
  TAREA: 'Tarea', ASEO: 'Aseo', REUNION: 'Reunión', RECORDATORIO: 'Aviso', CUMPLE: 'Cumple',
};

function nameOf(p: Person) {
  return `${p.firstName} ${p.lastName}`;
}

function fmtDay(iso: string | null) {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function nextBirthday(iso: string, now = new Date()) {
  const src = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisYear = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  const next = thisYear >= start ? thisYear : new Date(now.getFullYear() + 1, src.getMonth(), src.getDate());
  return Math.round((next.getTime() - start.getTime()) / 86400000);
}

const BOARD_THEME_KEY = 'nodo360_compania_board_theme';

function readBoardTheme(fallbackDark: boolean): boolean {
  try {
    const stored = localStorage.getItem(BOARD_THEME_KEY);
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
  } catch { /* ignore */ }
  return fallbackDark;
}

type Props = {
  slug: string;
  variant?: 'compact' | 'full';
  dark?: boolean;
};

export default function SalaCompaniaLife({ slug, variant = 'compact', dark = false }: Props) {
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';
  const qc = useQueryClient();
  const [modal, setModal] = useState<Kind | null>(null);
  const [boardDark, setBoardDark] = useState(() => readBoardTheme(dark));
  const headers = salaAuthHeaders(slug);

  const { data, isLoading } = useQuery({
    queryKey: ['sala-life', slug],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/life`, { headers });
      if (!res.ok) throw new Error('No se pudo cargar el tablero');
      return res.json() as Promise<Board>;
    },
    refetchInterval: 30_000,
  });

  const patchMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'OPEN' | 'DONE' }) => {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/life/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sala-life', slug] }),
  });

  const createMut = useMutation({
    mutationFn: async (body: { kind: Kind; title: string; notes?: string; dueAt?: string; assigneeId?: string; priority?: LifePriority }) => {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/life`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('No se pudo publicar');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sala-life', slug] });
      setModal(null);
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/life/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('No se pudo borrar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sala-life', slug] }),
  });

  const items = data?.items ?? [];
  const openTasks = items.filter((i) => i.status !== 'DONE' && (i.kind === 'TAREA' || i.kind === 'ASEO'));
  const meetings = items.filter((i) => i.status !== 'DONE' && (i.kind === 'REUNION' || i.kind === 'RECORDATORIO'));
  const birthdays = items
    .filter((i) => i.kind === 'CUMPLE' && i.dueAt)
    .map((i) => ({ item: i, days: nextBirthday(i.dueAt!) }))
    .filter((b) => b.days <= 45)
    .sort((a, b) => a.days - b.days);

  const feed = useMemo(() => {
    const rows: { id: string; title: string; hint: string; kind: Kind | 'ANUNCIO' }[] = [
      ...openTasks.slice(0, 4).map((i) => ({
        id: i.id,
        title: i.title,
        hint: `${KIND_LABEL[i.kind]} · ${i.assignee ? nameOf(i.assignee) : 'Sin responsable'} · ${fmtDay(i.dueAt)}`,
        kind: i.kind,
      })),
      ...meetings.slice(0, 3).map((i) => ({
        id: i.id,
        title: i.title,
        hint: `${KIND_LABEL[i.kind]} · ${fmtDay(i.dueAt)}`,
        kind: i.kind,
      })),
      ...birthdays.slice(0, 3).map((b) => ({
        id: b.item.id,
        title: b.item.title,
        hint: b.days === 0 ? 'Hoy' : b.days === 1 ? 'Mañana' : `en ${b.days} días`,
        kind: 'CUMPLE' as const,
      })),
      ...(data?.announcements ?? []).slice(0, 3).map((a) => ({
        id: `a-${a.id}`,
        title: a.title,
        hint: a.content.slice(0, 80),
        kind: 'ANUNCIO' as const,
      })),
    ];
    return rows.slice(0, variant === 'compact' ? 6 : 16);
  }, [openTasks, meetings, birthdays, data?.announcements, variant]);

  const card = dark
    ? 'border-white/10 bg-slate-900/70 text-white'
    : 'border-slate-200 bg-white text-slate-800';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  if (variant === 'full') {
    if (isLoading) {
      return (
        <div className={`flex h-48 items-center justify-center ${boardDark ? 'bg-[#070b12]' : 'bg-slate-100'}`}>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      );
    }
    if (!data?.company) {
      return (
        <p className={`px-6 py-10 text-center text-sm ${muted}`}>
          No se pudo cargar el tablero de esta compañía.
        </p>
      );
    }
    return (
      <div className={boardDark ? 'min-h-full bg-[#070b12] text-white' : 'min-h-full bg-slate-100 text-slate-900'}>
        <CompaniaIntranet
          data={data}
          isDark={boardDark}
          announcementHref={null}
          documentsHref={null}
          onCreate={setModal}
          onToggle={(id, status) => patchMut.mutate({ id, status })}
          onDelete={(id) => delMut.mutate(id)}
          onToggleTheme={() => {
            setBoardDark((prev) => {
              const next = !prev;
              try { localStorage.setItem(BOARD_THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
              return next;
            });
          }}
        />
        {modal && (
          <CompaniaLifeModal
            kind={modal}
            dark={boardDark}
            members={data.members}
            busy={createMut.isPending}
            error={createMut.isError ? 'No se pudo publicar en este cuartel.' : null}
            onClose={() => setModal(null)}
            onSubmit={(body) => createMut.mutate(body)}
          />
        )}
      </div>
    );
  }

  return (
    <section className={`rounded-2xl border p-4 ${card}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-red-500" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Vida de la compañía</h2>
            <p className={`text-[11px] ${muted}`}>Privado de este cuartel · aseo, reuniones y anuncios</p>
          </div>
        </div>
        {data?.canEdit && (
          <div className="flex flex-wrap justify-end gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setModal(k.id)}
                className="keep-on-color rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-red-500"
              >
                + {k.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {feed.length === 0 && (
        <p className={`py-4 text-center text-sm ${muted}`}>Todavía no hay avisos en esta compañía.</p>
      )}

      <ul className={variant === 'full' ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'}>
        {feed.map((row) => (
          <li key={row.id} className={`flex items-start gap-2 rounded-xl px-2 py-1.5 ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
            {row.kind === 'TAREA' || row.kind === 'ASEO' ? (
              <button
                type="button"
                title="Marcar lista"
                onClick={() => patchMut.mutate({ id: row.id, status: 'DONE' })}
                className="mt-0.5 text-slate-400 hover:text-emerald-500"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            ) : row.kind === 'CUMPLE' ? (
              <Cake className="mt-0.5 h-4 w-4 text-rose-400" />
            ) : row.kind === 'ANUNCIO' ? (
              <Megaphone className="mt-0.5 h-4 w-4 text-amber-400" />
            ) : (
              <CalendarDays className="mt-0.5 h-4 w-4 text-cyan-400" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{row.title}</p>
              <p className={`line-clamp-1 text-[11px] ${muted}`}>{row.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      {modal && (
        <SalaLifeModal
          kind={modal}
          dark={dark}
          members={data?.members ?? []}
          busy={createMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={(body) => createMut.mutate(body)}
        />
      )}
    </section>
  );
}

function SalaLifeModal({
  kind,
  dark,
  members,
  busy,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  dark: boolean;
  members: Person[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: { kind: Kind; title: string; notes?: string; dueAt?: string; assigneeId?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const field = dark ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900';

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      kind,
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueAt: dueAt || undefined,
      assigneeId: assigneeId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className={`w-full max-w-md rounded-2xl border border-red-900/40 p-5 ${dark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black">Nuevo {KIND_LABEL[kind].toLowerCase()}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500"><X className="h-5 w-5" /></button>
        </div>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm ${field}`} />
        <input type={kind === 'CUMPLE' ? 'date' : 'datetime-local'} value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm ${field}`} />
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm ${field}`}>
          <option value="">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{nameOf(m)}</option>
          ))}
        </select>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas" className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm ${field}`} />
        <button type="submit" disabled={busy || !title.trim()} className="keep-on-color flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Publicar en este cuartel
        </button>
      </form>
    </div>
  );
}
