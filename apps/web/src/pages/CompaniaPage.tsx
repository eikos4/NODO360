import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Cake, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight,
  FileText, Lock, Megaphone, Plus, Sparkles, Trash2, Truck, Users, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useThemeStore } from '../store/themeStore';

type Kind = 'ASEO' | 'TAREA' | 'REUNION' | 'RECORDATORIO' | 'CUMPLE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
type Status = 'OPEN' | 'DONE';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  operativeNumber: number | null;
  stationAvailable: boolean;
};

type LifeItem = {
  id: string;
  kind: Kind;
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  dueAt: string | null;
  assignee: Person | null;
  createdBy: { id: string; firstName: string; lastName: string };
};

type Board = {
  canEdit: boolean;
  canPickCompany: boolean;
  company: {
    id: string;
    name: string;
    number: number;
    city: string;
    region: string;
    address: string;
    logoUrl: string | null;
    headquartersImageUrl: string | null;
  } | null;
  companies: { id: string; name: string; number: number; city: string; logoUrl: string | null }[];
  stats: {
    members: number;
    inStation: number;
    vehicles: number;
    equipment: number;
    openTasks: number;
    documents: number;
  } | null;
  items: LifeItem[];
  announcements: {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    eventDate: string | null;
    eventLocation: string | null;
    createdAt: string;
    imageUrl: string | null;
  }[];
  documents: { id: string; title: string; category: string; createdAt: string; fileUrl: string }[];
  members: Person[];
  vehicles: { id: string; brand: string; model: string; type: string; status: string; patent: string; imageUrl: string | null }[];
};

const KINDS: { id: Kind; label: string; hint: string; icon: typeof CheckSquare; tone: string }[] = [
  { id: 'TAREA', label: 'Tarea', hint: 'Encargo de la compañía', icon: CheckSquare, tone: 'bg-red-600 hover:bg-red-500' },
  { id: 'ASEO', label: 'Aseo', hint: 'Limpieza y orden del cuartel', icon: Sparkles, tone: 'bg-emerald-600 hover:bg-emerald-500' },
  { id: 'REUNION', label: 'Reunión', hint: 'Junta o actividad interna', icon: Users, tone: 'bg-cyan-600 hover:bg-cyan-500' },
  { id: 'RECORDATORIO', label: 'Recordatorio', hint: 'Fecha que no se puede olvidar', icon: Bell, tone: 'bg-amber-600 hover:bg-amber-500' },
  { id: 'CUMPLE', label: 'Cumpleaños', hint: 'Se ve solo en tu compañía', icon: Cake, tone: 'bg-rose-600 hover:bg-rose-500' },
];

const ROLE_SHORT: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán',
  SECRETARIO: 'Secretario',
  TESORERO: 'Tesorero',
  ENCARGADO_MATERIAL: 'Material',
  AUDITOR: 'Auditor',
  BOMBERO: 'Voluntario',
  BOMBERO_HONORARIO: 'Honorario',
  BOMBERO_INICIAL: 'Inicial',
  BOMBERO_PROFESIONAL: 'Profesional',
};

const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  HIGH: { label: 'Alta', cls: 'bg-red-500/15 text-red-400' },
  MEDIUM: { label: 'Media', cls: 'bg-amber-500/15 text-amber-400' },
  LOW: { label: 'Baja', cls: 'bg-slate-500/15 text-slate-400' },
};

const KIND_META: Record<Kind, { label: string; cls: string }> = {
  TAREA: { label: 'Tarea', cls: 'text-red-400' },
  ASEO: { label: 'Aseo', cls: 'text-emerald-400' },
  REUNION: { label: 'Reunión', cls: 'text-cyan-400' },
  RECORDATORIO: { label: 'Aviso', cls: 'text-amber-400' },
  CUMPLE: { label: 'Cumple', cls: 'text-rose-400' },
};

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

function fmtDay(iso: string | null) {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function fmtWhen(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nextBirthday(iso: string, now = new Date()) {
  const src = new Date(iso);
  const thisYear = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  const next = thisYear >= startOfDay(now) ? thisYear : new Date(now.getFullYear() + 1, src.getMonth(), src.getDate());
  const days = Math.round((next.getTime() - startOfDay(now).getTime()) / 86400000);
  return { next, days };
}

function monthCells(year: number, month: number) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const last = new Date(year, month + 1, 0).getDate();
  return [...Array(start).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)] as (number | null)[];
}

function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  if (person.photoUrl) {
    return <img src={person.photoUrl} alt="" className={cn('rounded-full object-cover', box)} />;
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-red-600 font-bold text-white', box)}>
      {initials(person)}
    </span>
  );
}

export default function CompaniaPage() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const [params, setParams] = useSearchParams();
  const companyId = params.get('companyId') || undefined;
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [modal, setModal] = useState<Kind | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['compania-board', companyId],
    queryFn: async () => (await api.get<Board>('/compania/board', { params: companyId ? { companyId } : {} })).data,
  });

  const createMut = useMutation({
    mutationFn: async (body: { kind: Kind; title: string; notes?: string; dueAt?: string; assigneeId?: string; priority?: Priority; companyId?: string }) =>
      (await api.post('/compania/items', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compania-board'] });
      setModal(null);
    },
  });

  const patchMut = useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<LifeItem>) =>
      (await api.patch(`/compania/items/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compania-board'] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/compania/items/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compania-board'] }),
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const today = new Date();

  const items = data?.items ?? [];
  const openTasks = items.filter((i) => i.status !== 'DONE' && (i.kind === 'TAREA' || i.kind === 'ASEO'));
  const meetings = items.filter((i) => i.status !== 'DONE' && (i.kind === 'REUNION' || i.kind === 'RECORDATORIO'));
  const birthdays = items
    .filter((i) => i.kind === 'CUMPLE' && i.dueAt)
    .map((i) => ({ item: i, ...nextBirthday(i.dueAt!) }))
    .filter((b) => b.days <= 45)
    .sort((a, b) => a.days - b.days);

  const markedDays = new Set<number>();
  for (const i of items) {
    if (!i.dueAt) continue;
    const d = new Date(i.dueAt);
    if (d.getFullYear() === year && d.getMonth() === month) markedDays.add(d.getDate());
  }
  for (const a of data?.announcements ?? []) {
    if (!a.eventDate) continue;
    const d = new Date(a.eventDate);
    if (d.getFullYear() === year && d.getMonth() === month) markedDays.add(d.getDate());
  }

  const upcoming = [
    ...items
      .filter((i) => i.status !== 'DONE' && i.dueAt)
      .map((i) => ({
        id: i.id,
        title: i.title,
        when: i.dueAt!,
        place: KIND_META[i.kind].label,
        kind: i.kind,
      })),
    ...(data?.announcements ?? [])
      .filter((a) => a.eventDate)
      .map((a) => ({
        id: `a-${a.id}`,
        title: a.title,
        when: a.eventDate!,
        place: a.eventLocation || 'Comunicado',
        kind: 'REUNION' as Kind,
      })),
  ]
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    .slice(0, 6);

  const surface = isDark ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900';
  const card = isDark ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const line = isDark ? 'border-white/10' : 'border-slate-200';

  return (
    <div className={cn('min-h-full -m-4 p-4 md:-m-6 md:p-6', surface)}>
      <div className="mx-auto max-w-7xl space-y-4">
        {data?.canPickCompany && (data.companies?.length ?? 0) > 1 && (
          <select
            value={companyId || data.company?.id || ''}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('companyId', e.target.value);
              else next.delete('companyId');
              setParams(next);
            }}
            className={cn('rounded-lg border px-3 py-2 text-sm', isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white')}
          >
            {data.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}ª · {c.name}
              </option>
            ))}
          </select>
        )}

        {isLoading && (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </div>
        )}

        {!isLoading && !data?.company && (
          <div className={cn('rounded-2xl border p-8 text-center', card)}>
            <Lock className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <p className="font-semibold">Tu usuario no tiene compañía asignada</p>
            <p className={cn('mt-1 text-sm', muted)}>Esta vista es privada. Pide a tu capitán o a Kodesk que te asigne a un cuartel.</p>
          </div>
        )}

        {data?.company && (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-red-900/40">
              <img
                src={data.company.headquartersImageUrl || '/nodo-enlace-hero.jpg'}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070b12] via-[#070b12]/85 to-red-950/40" />
              <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-red-500 bg-[#0b1220] text-center shadow-lg shadow-red-900/40">
                    {data.company.logoUrl ? (
                      <img src={data.company.logoUrl} alt="" className="h-16 w-16 object-contain" />
                    ) : (
                      <>
                        <span className="text-3xl font-black leading-none text-red-500">{data.company.number}</span>
                        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                          {data.company.city}
                        </span>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">
                      {data.company.number}ª compañía · privado
                    </p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-4xl">{data.company.name}</h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-300">
                      {data.company.address} · {data.company.city}, {data.company.region}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[11px] font-semibold text-red-200">
                      <Lock className="h-3 w-3" /> Solo lo ve tu compañía. Las otras no entran a este tablero.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 self-center sm:grid-cols-4">
                  {[
                    { k: 'Integrantes', v: data.stats?.members ?? 0 },
                    { k: 'En cuartel', v: data.stats?.inStation ?? 0 },
                    { k: 'Carros', v: data.stats?.vehicles ?? 0 },
                    { k: 'Tareas', v: data.stats?.openTasks ?? 0 },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-xl font-black text-white">{s.v}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.k}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {data.canEdit &&
                KINDS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setModal(k.id)}
                      className={cn(
                        'keep-on-color flex items-center gap-3 rounded-xl px-4 py-3 text-left text-white shadow-sm',
                        k.tone,
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>
                        <span className="block text-sm font-bold">+ {k.label}</span>
                        <span className="block text-[11px] text-white/80">{k.hint}</span>
                      </span>
                    </button>
                  );
                })}
              <Link
                to="/announcements"
                className="keep-on-color flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white hover:bg-slate-700"
              >
                <Megaphone className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-sm font-bold">+ Anuncio</span>
                  <span className="block text-[11px] text-white/80">Comunicado de la compañía</span>
                </span>
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_0.85fr]">
              <Panel title="Tareas de la compañía" extra={`${openTasks.length} pendientes`} card={card} muted={muted}>
                {openTasks.length === 0 && <Empty text="Sin aseo ni encargos abiertos." muted={muted} />}
                <ul className="divide-y" style={{ borderColor: 'inherit' }}>
                  {openTasks.map((item) => (
                    <li key={item.id} className={cn('flex items-start gap-3 py-3', line)}>
                      <button
                        type="button"
                        onClick={() => patchMut.mutate({ id: item.id, status: 'DONE' })}
                        className="mt-0.5 rounded-md border border-current/20 p-0.5 text-slate-400 hover:text-emerald-400"
                        title="Marcar lista"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.title}</p>
                        <p className={cn('text-xs', muted)}>
                          {item.assignee ? fullName(item.assignee) : 'Sin responsable'} · {fmtDay(item.dueAt)}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', PRIORITY[item.priority].cls)}>
                        {PRIORITY[item.priority].label}
                      </span>
                      {data.canEdit && (
                        <button type="button" onClick={() => delMut.mutate(item.id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel
                title="Calendario de la compañía"
                extra={cursor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                card={card}
                muted={muted}
                actions={
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} className={cn('rounded-md p-1', muted)}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setCursor(new Date())} className={cn('rounded-md px-2 text-[11px] font-bold uppercase', muted)}>
                      Hoy
                    </button>
                    <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className={cn('rounded-md p-1', muted)}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                }
              >
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-500">
                  {WEEK.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {cells.map((day, i) => {
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const marked = day != null && markedDays.has(day);
                    return (
                      <div
                        key={`${day}-${i}`}
                        className={cn(
                          'flex h-8 items-center justify-center rounded-md text-xs',
                          !day && 'opacity-0',
                          isToday && 'bg-red-600 font-black text-white',
                          !isToday && marked && (isDark ? 'bg-red-500/20 font-bold text-red-300' : 'bg-red-50 font-bold text-red-700'),
                        )}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {meetings.slice(0, 4).map((m) => (
                    <li key={m.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate font-medium">{m.title}</span>
                      <span className={muted}>{fmtWhen(m.dueAt)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Cumpleaños" extra="próximos 45 días" card={card} muted={muted}>
                {birthdays.length === 0 && <Empty text="Aún no hay cumpleaños cargados. El capitán puede registrarlos." muted={muted} />}
                <ul className="space-y-3">
                  {birthdays.map(({ item, days }) => (
                    <li key={item.id} className="flex items-center gap-3">
                      {item.assignee ? <Avatar person={item.assignee} /> : <Cake className="h-8 w-8 text-rose-400" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.title}</p>
                        <p className={cn('text-xs', muted)}>
                          {fmtDay(item.dueAt)} · {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `en ${days} días`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Próximos eventos" extra="de tu cuartel" card={card} muted={muted}>
                {upcoming.length === 0 && <Empty text="Sin fechas próximas." muted={muted} />}
                <ul className="space-y-2">
                  {upcoming.map((e) => (
                    <li key={e.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', line)}>
                      <span className="w-10 shrink-0 text-center text-[11px] font-black text-red-500">
                        {new Date(e.when).getDate()}
                        <span className="block text-[9px] font-semibold uppercase text-slate-500">
                          {new Date(e.when).toLocaleDateString('es-CL', { month: 'short' })}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{e.title}</p>
                        <p className={cn('text-xs', muted)}>{e.place} · {fmtWhen(e.when)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Anuncios" extra="solo tu compañía" to="/announcements" card={card} muted={muted}>
                {(data.announcements?.length ?? 0) === 0 && <Empty text="No hay comunicados de esta compañía." muted={muted} />}
                <ul className="space-y-3">
                  {data.announcements.map((a) => (
                    <li key={a.id}>
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className={cn('line-clamp-2 text-xs', muted)}>{a.content}</p>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Documentos recientes" extra="de tu cuartel" to="/documents" card={card} muted={muted}>
                {(data.documents?.length ?? 0) === 0 && <Empty text="Sin documentos de compañía." muted={muted} />}
                <ul className="space-y-2">
                  {data.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-red-400" />
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        {d.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Integrantes en línea" extra={`${data.stats?.inStation ?? 0} en cuartel`} to="/users" card={card} muted={muted}>
                <div className="flex flex-wrap gap-3">
                  {data.members.filter((m) => m.stationAvailable).length === 0 && (
                    <Empty text="Nadie marcado en el cuartel ahora." muted={muted} />
                  )}
                  {data.members
                    .filter((m) => m.stationAvailable)
                    .map((m) => (
                      <div key={m.id} className="flex w-36 items-center gap-2">
                        <Avatar person={m} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{fullName(m)}</p>
                          <p className={cn('truncate text-[10px]', muted)}>{ROLE_SHORT[m.role] ?? m.role}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel title="Carros de la compañía" extra={`${data.vehicles.length}`} to="/motores" card={card} muted={muted}>
                {(data.vehicles.length === 0) && <Empty text="Sin vehículos cargados." muted={muted} />}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {data.vehicles.map((v) => (
                    <li key={v.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', line)}>
                      <Truck className="h-4 w-4 text-red-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{v.patent}</p>
                        <p className={cn('truncate text-xs', muted)}>
                          {v.brand} {v.model} · {v.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </>
        )}
      </div>

      {modal && data?.company && (
        <LifeModal
          kind={modal}
          dark={isDark}
          members={data.members}
          companyId={data.company.id}
          busy={createMut.isPending}
          error={createMut.isError ? 'No se pudo guardar. Revisa los datos.' : null}
          onClose={() => setModal(null)}
          onSubmit={(body) => createMut.mutate(body)}
        />
      )}
    </div>
  );
}

function Panel({
  title,
  extra,
  to,
  card,
  muted,
  actions,
  children,
}: {
  title: string;
  extra?: string;
  to?: string;
  card: string;
  muted: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border p-4', card)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">{title}</h2>
          {extra && <p className={cn('text-[11px]', muted)}>{extra}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {to && (
            <Link to={to} className={cn('text-[11px] font-bold uppercase hover:text-red-500', muted)}>
              Ver todos
            </Link>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

function Empty({ text, muted }: { text: string; muted: string }) {
  return <p className={cn('py-4 text-center text-sm', muted)}>{text}</p>;
}

function LifeModal({
  kind,
  dark,
  members,
  companyId,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  dark: boolean;
  members: Person[];
  companyId: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: { kind: Kind; title: string; notes?: string; dueAt?: string; assigneeId?: string; priority?: Priority; companyId: string }) => void;
}) {
  const meta = KINDS.find((k) => k.id === kind)!;
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      kind,
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueAt: dueAt || undefined,
      assigneeId: assigneeId || undefined,
      priority,
      companyId,
    });
  }

  const box = dark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';
  const field = dark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className={cn('w-full max-w-md rounded-2xl border border-red-900/40 p-5 shadow-2xl', box)}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Privado · tu compañía</p>
            <h3 className="text-lg font-black">Nuevo {meta.label.toLowerCase()}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-red-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-xs font-bold uppercase text-slate-500">Título</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn('mt-1 w-full rounded-lg border px-3 py-2 text-sm', field)}
          placeholder={kind === 'CUMPLE' ? 'Ej. Carlos Rojas' : meta.hint}
        />
        <label className="mt-3 block text-xs font-bold uppercase text-slate-500">
          {kind === 'CUMPLE' ? 'Fecha de cumpleaños' : 'Fecha'}
        </label>
        <input
          type={kind === 'CUMPLE' ? 'date' : 'datetime-local'}
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className={cn('mt-1 w-full rounded-lg border px-3 py-2 text-sm', field)}
        />
        <label className="mt-3 block text-xs font-bold uppercase text-slate-500">Responsable / cumpleañero</label>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className={cn('mt-1 w-full rounded-lg border px-3 py-2 text-sm', field)}
        >
          <option value="">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {fullName(m)}
            </option>
          ))}
        </select>
        {(kind === 'TAREA' || kind === 'ASEO') && (
          <div className="mt-3 flex gap-2">
            {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn('rounded-full px-3 py-1 text-xs font-bold', priority === p ? PRIORITY[p].cls : 'bg-slate-500/10 text-slate-400')}
              >
                {PRIORITY[p].label}
              </button>
            ))}
          </div>
        )}
        <label className="mt-3 block text-xs font-bold uppercase text-slate-500">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={cn('mt-1 w-full rounded-lg border px-3 py-2 text-sm', field)}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="keep-on-color mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Publicar en la compañía
        </button>
      </form>
    </div>
  );
}
