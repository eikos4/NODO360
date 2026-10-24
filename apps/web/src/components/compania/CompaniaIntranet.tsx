import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Cake, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight,
  FileText, Info, Lock, Megaphone, Moon, Plus, Sun, Trash2, Users, X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type LifeKind = 'ASEO' | 'TAREA' | 'REUNION' | 'RECORDATORIO' | 'CUMPLE';
export type LifePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type LifeStatus = 'OPEN' | 'DONE';

export type CompaniaPerson = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  operativeNumber?: number | null;
  stationAvailable?: boolean;
};

export type CompaniaLifeItem = {
  id: string;
  kind: LifeKind;
  title: string;
  notes: string | null;
  status: LifeStatus;
  priority: LifePriority;
  dueAt: string | null;
  assignee: CompaniaPerson | null;
};

export type CompaniaBoard = {
  canEdit: boolean;
  company: {
    id: string;
    name: string;
    number: number;
    city: string;
    region?: string;
    address?: string;
    logoUrl: string | null;
    headquartersImageUrl?: string | null;
  };
  stats: {
    members: number;
    inStation: number;
    vehicles: number;
    equipment: number;
    openTasks: number;
    documents: number;
  } | null;
  items: CompaniaLifeItem[];
  announcements: {
    id: string;
    title: string;
    content: string;
    type?: string;
    eventDate: string | null;
    eventLocation?: string | null;
    createdAt: string;
  }[];
  documents: { id: string; title: string; category: string; createdAt: string; fileUrl: string }[];
  members: CompaniaPerson[];
};

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
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

const PRIORITY_LABEL: Record<LifePriority, string> = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' };

function priorityCls(p: LifePriority, isDark: boolean) {
  if (isDark) {
    return {
      HIGH: 'bg-red-600/20 text-red-300',
      MEDIUM: 'bg-amber-500/20 text-amber-200',
      LOW: 'bg-slate-500/20 text-slate-300',
    }[p];
  }
  return {
    HIGH: 'bg-red-50 text-red-700',
    MEDIUM: 'bg-amber-50 text-amber-800',
    LOW: 'bg-slate-100 text-slate-600',
  }[p];
}

function boardTone(isDark: boolean) {
  if (isDark) {
    return {
      page: 'compania-intranet text-white',
      overlay: 'bg-gradient-to-r from-[#070b12] via-[#070b12]/88 to-[#070b12]/25',
      img: '',
      crest: 'border-red-500 bg-[#0b1220] shadow-red-950/50',
      city: 'text-slate-300',
      kicker: 'text-red-400',
      title: 'text-white',
      motto: 'text-slate-300',
      lock: 'text-red-200/90',
      stats: 'border-white/10 bg-black/45 text-white',
      statsK: 'text-slate-400',
      statsV: 'text-white',
      card: 'bg-[#0d1520] border-white/8',
      muted: 'text-slate-400',
      ink: 'text-white',
      divide: 'divide-white/5',
      themeBtn: 'border-white/15 bg-black/35 text-white hover:bg-black/55',
      anuncio: 'bg-slate-800 hover:bg-slate-700 text-white',
    };
  }
  return {
    page: 'compania-intranet compania-intranet-force-light text-slate-900',
    overlay: 'bg-gradient-to-r from-slate-50 via-slate-50/92 to-transparent',
    img: 'opacity-80 brightness-110 contrast-105',
    crest: 'border-red-500 bg-white shadow-red-200/70',
    city: 'text-slate-500',
    kicker: 'text-red-600',
    title: 'text-slate-900',
    motto: 'text-slate-600',
    lock: 'text-red-700',
    stats: 'border-slate-200 bg-white/90 text-slate-900 shadow-sm',
    statsK: 'text-slate-500',
    statsV: 'text-slate-900',
    card: 'bg-white border-slate-200 shadow-sm',
    muted: 'text-slate-500',
    ink: 'text-slate-900',
    divide: 'divide-slate-100',
    themeBtn: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
    anuncio: 'bg-slate-800 hover:bg-slate-700 text-white',
  };
}

function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}
function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function nextBirthday(iso: string, now = new Date()) {
  const src = new Date(iso);
  const thisYear = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  const next = thisYear >= startOfDay(now) ? thisYear : new Date(now.getFullYear() + 1, src.getMonth(), src.getDate());
  return Math.round((next.getTime() - startOfDay(now).getTime()) / 86400000);
}
function monthCells(year: number, month: number) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const last = new Date(year, month + 1, 0).getDate();
  return [...Array(start).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)] as (number | null)[];
}
function ageFrom(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age > 0 && age < 120 ? age : null;
}

function Avatar({ person, size = 'md' }: { person: CompaniaPerson; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs';
  if (person.photoUrl) return <img src={person.photoUrl} alt="" className={cn('rounded-full object-cover', box)} />;
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-red-600 font-black text-white', box)}>
      {initials(person)}
    </span>
  );
}

type Props = {
  data: CompaniaBoard;
  isDark: boolean;
  onCreate: (kind: LifeKind) => void;
  onToggle: (id: string, status: LifeStatus) => void;
  onDelete?: (id: string) => void;
  announcementHref?: string | null;
  documentsHref?: string | null;
  onToggleTheme?: () => void;
};

export default function CompaniaIntranet({
  data,
  isDark,
  onCreate,
  onToggle,
  onDelete,
  announcementHref = '/announcements',
  documentsHref = '/documents',
  onToggleTheme,
}: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [taskTab, setTaskTab] = useState<'OPEN' | 'TODAY' | 'DONE'>('OPEN');
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const today = new Date();
  const company = data.company;
  const items = data.items ?? [];
  const tasks = items.filter((i) => i.kind === 'TAREA' || i.kind === 'ASEO');
  const pending = tasks.filter((i) => i.status !== 'DONE' && (!i.dueAt || new Date(i.dueAt) > today));
  const todayTasks = tasks.filter((i) => i.status !== 'DONE' && i.dueAt && startOfDay(new Date(i.dueAt)).getTime() <= startOfDay(today).getTime());
  const done = tasks.filter((i) => i.status === 'DONE');
  const shown = taskTab === 'OPEN' ? pending : taskTab === 'TODAY' ? todayTasks : done;
  const meetings = items.filter((i) => i.status !== 'DONE' && (i.kind === 'REUNION' || i.kind === 'RECORDATORIO') && i.dueAt);
  const birthdays = items
    .filter((i) => i.kind === 'CUMPLE' && i.dueAt)
    .map((i) => ({ item: i, days: nextBirthday(i.dueAt!), age: ageFrom(i.dueAt) }))
    .filter((b) => b.days <= 60)
    .sort((a, b) => a.days - b.days);

  const marked = new Map<number, string>();
  for (const i of items) {
    if (!i.dueAt) continue;
    const d = new Date(i.dueAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      marked.set(d.getDate(), i.kind === 'CUMPLE' ? 'bg-rose-500' : i.kind === 'REUNION' ? 'bg-cyan-400' : 'bg-red-500');
    }
  }
  for (const a of data.announcements ?? []) {
    if (!a.eventDate) continue;
    const d = new Date(a.eventDate);
    if (d.getFullYear() === year && d.getMonth() === month) marked.set(d.getDate(), 'bg-amber-400');
  }

  const upcoming = [
    ...items.filter((i) => i.status !== 'DONE' && i.dueAt).map((i) => ({
      id: i.id, title: i.title, when: i.dueAt!, place: i.notes || company.address || 'Cuartel',
    })),
    ...(data.announcements ?? []).filter((a) => a.eventDate).map((a) => ({
      id: `a-${a.id}`, title: a.title, when: a.eventDate!, place: a.eventLocation || 'Comunicado',
    })),
  ].sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime()).slice(0, 5);

  const calendarEvents = [
    ...meetings.map((m) => ({ id: m.id, title: m.title, when: m.dueAt!, place: m.notes || 'Cuartel', color: m.kind === 'REUNION' ? 'bg-red-500' : 'bg-cyan-400' })),
    ...(data.announcements ?? []).filter((a) => a.eventDate).map((a) => ({
      id: `ev-${a.id}`, title: a.title, when: a.eventDate!, place: a.eventLocation || 'Comunicado', color: 'bg-amber-400',
    })),
  ].sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime()).slice(0, 4);

  const online = data.members.filter((m) => m.stationAvailable);
  const lastAt = (data.announcements ?? []).map((a) => a.createdAt)[0];
  const lastLabel = lastAt
    ? startOfDay(new Date(lastAt)).getTime() === startOfDay(today).getTime()
      ? `Hoy ${new Date(lastAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
      : new Date(lastAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    : '—';
  const t = boardTone(isDark);
  const card = t.card;
  const muted = t.muted;
  const ink = t.ink;

  return (
    <div className={t.page}>
      <section className="relative overflow-hidden">
        <img
          src={company.headquartersImageUrl || '/nodo-enlace-hero.jpg'}
          alt=""
          className={cn('absolute inset-0 h-full w-full object-cover object-right', t.img)}
        />
        <div className={cn('absolute inset-0', t.overlay)} />
        <div className="relative mx-auto grid max-w-[1400px] gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[1fr_auto] lg:py-9">
          <div className="flex items-center gap-5">
            <div className={cn('flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] shadow-xl', t.crest)}>
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="" className="h-16 w-16 object-contain" />
              ) : (
                <>
                  <span className="text-4xl font-black leading-none text-red-500">{company.number}</span>
                  <span className={cn('mt-0.5 text-[9px] font-black uppercase tracking-[0.14em]', t.city)}>{company.city}</span>
                </>
              )}
            </div>
            <div>
              <p className={cn('text-[11px] font-black uppercase tracking-[0.22em]', t.kicker)}>
                {company.number}ª compañía · {company.city}
              </p>
              <h1 className={cn('mt-1 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl', t.title)}>{company.name}</h1>
              <p className={cn('mt-2 text-sm italic', t.motto)}>Disciplina · Servicio · Hermandad</p>
              <p className={cn('mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold', t.lock)}>
                <Lock className="h-3 w-3" /> Privado de este cuartel
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 self-center">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={cn('inline-flex items-center justify-center gap-1.5 self-end rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide', t.themeBtn)}
                title={isDark ? 'Tema claro' : 'Tema oscuro'}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {isDark ? 'Claro' : 'Oscuro'}
              </button>
            )}
            <div className={cn('min-w-[200px] rounded-2xl border px-4 py-3 backdrop-blur-md', t.stats)}>
              <p className={cn('mb-2 text-[10px] font-black uppercase tracking-wider', t.statsK)}>Estado de la compañía</p>
              {[
                { k: 'Estado', v: 'Operativa' },
                { k: 'Integrantes', v: String(data.stats?.members ?? data.members.length) },
                { k: 'Vehículos', v: String(data.stats?.vehicles ?? 0) },
                { k: 'Equipamiento', v: String(data.stats?.equipment ?? 0) },
                { k: 'Última actividad', v: lastLabel },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-6 py-0.5 text-sm">
                  <span className={t.statsK}>{row.k}</span>
                  <span className={cn('font-bold', t.statsV)}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ActionBtn color="bg-red-600 hover:bg-red-500" icon={CheckSquare} title="+ Nueva tarea" hint="Asigna aseo o encargos de la compañía" onClick={() => onCreate('TAREA')} disabled={!data.canEdit} />
          <ActionBtn color="bg-rose-700 hover:bg-rose-600" icon={Bell} title="+ Recordatorio" hint="Una fecha que el cuartel no puede olvidar" onClick={() => onCreate('RECORDATORIO')} disabled={!data.canEdit} />
          <ActionBtn color="bg-emerald-600 hover:bg-emerald-500" icon={Users} title="+ Reunión" hint="Junta o actividad interna" onClick={() => onCreate('REUNION')} disabled={!data.canEdit} />
          {announcementHref ? (
            <Link to={announcementHref} className={cn('keep-on-color flex items-center gap-3 rounded-xl px-4 py-3.5 shadow-sm', t.anuncio)}>
              <Megaphone className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-bold">+ Anuncio</span>
                <span className="block text-[11px] text-white/75">Comunicado para la compañía</span>
              </span>
            </Link>
          ) : (
            <div className={cn('keep-on-color flex items-center gap-3 rounded-xl px-4 py-3.5', t.anuncio)}>
              <Megaphone className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-bold">Anuncios</span>
                <span className="block text-[11px] text-white/75">Comunicados de este cuartel</span>
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_0.85fr]">
          <Card title="Tareas de la compañía" card={card} ink={ink} extra={
            <div className="flex gap-1 text-[10px] font-bold uppercase">
              <Tab n={pending.length} label="Pendientes" active={taskTab === 'OPEN'} onClick={() => setTaskTab('OPEN')} tone="bg-red-600" light={!isDark} />
              <Tab n={todayTasks.length} label="En curso" active={taskTab === 'TODAY'} onClick={() => setTaskTab('TODAY')} tone="bg-amber-500" light={!isDark} />
              <Tab n={done.length} label="Completadas" active={taskTab === 'DONE'} onClick={() => setTaskTab('DONE')} tone="bg-emerald-600" light={!isDark} />
            </div>
          }>
            {shown.length === 0 && <p className={cn('py-8 text-center text-sm', muted)}>Nada en esta lista.</p>}
            <ul className={cn('divide-y', t.divide)}>
              {shown.slice(0, 7).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <button type="button" onClick={() => onToggle(item.id, item.status === 'DONE' ? 'OPEN' : 'DONE')} className={cn('grid h-5 w-5 place-items-center rounded-md border', item.status === 'DONE' ? 'border-emerald-500 text-emerald-500' : 'border-slate-400 text-slate-400 hover:text-emerald-500')}>
                    {item.status === 'DONE' ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-slate-400/50" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-semibold', item.status === 'DONE' && 'line-through opacity-60')}>{item.title}</p>
                    <p className={cn('text-[11px]', muted)}>
                      {item.assignee ? `Responsable: ${fullName(item.assignee)}` : 'Sin responsable'}
                    </p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', priorityCls(item.priority, isDark))}>{PRIORITY_LABEL[item.priority]}</span>
                  {item.dueAt && <span className={cn('w-16 shrink-0 text-right text-[11px]', muted)}>{dueLabel(item.dueAt)}</span>}
                  {onDelete && data.canEdit && (
                    <button type="button" onClick={() => onDelete(item.id)} className="text-slate-600 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title="Calendario de la compañía"
            card={card}
            ink={ink}
            extra={
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} className={muted}><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-[7.5rem] text-center text-xs font-bold capitalize">{cursor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
                <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className={muted}><ChevronRight className="h-4 w-4" /></button>
              </div>
            }
          >
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-500">
              {WEEK.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const dot = day != null ? marked.get(day) : undefined;
                return (
                  <div key={`${day}-${i}`} className={cn('relative flex h-8 items-center justify-center rounded-lg text-xs', !day && 'opacity-0', isToday && 'bg-red-600 font-black text-white')}>
                    {day}
                    {dot && !isToday && <span className={cn('absolute bottom-0.5 h-1 w-1 rounded-full', dot)} />}
                  </div>
                );
              })}
            </div>
            <ul className="mt-3 space-y-1.5">
              {calendarEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', e.color)} />
                  <span className="w-10 shrink-0 font-bold text-slate-400">{new Date(e.when).toLocaleDateString('es-CL', { day: '2-digit' })}/{String(month + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 truncate font-medium">{e.title}</span>
                  <span className={cn('ml-auto shrink-0', muted)}>{new Date(e.when).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Cumpleaños" card={card} ink={ink}>
            {birthdays.length === 0 && <p className={cn('py-8 text-center text-sm', muted)}>Sin cumpleaños cargados.</p>}
            <ul className="space-y-3">
              {birthdays.slice(0, 6).map(({ item, days, age }) => (
                <li key={item.id} className="flex items-center gap-3">
                  {item.assignee ? <Avatar person={item.assignee} /> : <Cake className="h-9 w-9 text-rose-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className={cn('text-[11px]', muted)}>
                      {new Date(item.dueAt!).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                      {days === 0 ? ' · Hoy' : days === 1 ? ' · Mañana' : ''}
                    </p>
                  </div>
                  {age != null && <span className={cn('text-xs font-bold', muted)}>{age} años</span>}
                </li>
              ))}
            </ul>
            {data.canEdit && (
              <button type="button" onClick={() => onCreate('CUMPLE')} className={cn('mt-3 text-[11px] font-bold uppercase', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500')}>
                + Registrar cumpleaños
              </button>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Próximos eventos" card={card} ink={ink}>
            {upcoming.length === 0 && <p className={cn('py-6 text-center text-sm', muted)}>Sin fechas próximas.</p>}
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="w-11 shrink-0 rounded-lg bg-red-600/15 py-1 text-center">
                    <span className="block text-sm font-black text-red-500">{new Date(e.when).getDate()}</span>
                    <span className="block text-[9px] font-bold uppercase text-slate-500">{new Date(e.when).toLocaleDateString('es-CL', { month: 'short' })}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className={cn('truncate text-[11px]', muted)}>
                      {new Date(e.when).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · {e.place}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Documentos recientes" card={card} ink={ink} extra={documentsHref ? <Link to={documentsHref} className={cn('text-[11px] font-bold uppercase hover:text-red-400', muted)}>Ver todos</Link> : undefined}>
            {(data.documents?.length ?? 0) === 0 && <p className={cn('py-6 text-center text-sm', muted)}>Sin documentos de este cuartel.</p>}
            <ul className="space-y-2.5">
              {(data.documents ?? []).slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div className="min-w-0">
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">{d.title}</a>
                    <p className={cn('text-[11px]', muted)}>{d.category} · {new Date(d.createdAt).toLocaleDateString('es-CL')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-4">
            <Card title="Anuncios" card={card} ink={ink} extra={announcementHref ? <Link to={announcementHref} className={cn('text-[11px] font-bold uppercase hover:text-red-400', muted)}>Ver todos</Link> : undefined}>
              {(data.announcements?.length ?? 0) === 0 && <p className={cn('py-4 text-center text-sm', muted)}>Sin comunicados de la compañía.</p>}
              <ul className="space-y-3">
                {(data.announcements ?? []).slice(0, 3).map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <AnnouncementIcon type={a.type} />
                    <div>
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className={cn('line-clamp-2 text-[11px]', muted)}>{a.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Integrantes en línea" card={card} ink={ink}>
              {online.length === 0 && <p className={cn('py-3 text-center text-sm', muted)}>Nadie marcado en el cuartel.</p>}
              <div className="flex flex-wrap gap-3">
                {online.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex w-[7.5rem] flex-col items-center text-center">
                    <Avatar person={m} size="sm" />
                    <p className="mt-1 w-full truncate text-[11px] font-semibold">{fullName(m)}</p>
                    <p className={cn('truncate text-[10px]', muted)}>{ROLE_SHORT[m.role] ?? m.role}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, extra, card, ink, children }: { title: string; extra?: ReactNode; card: string; ink: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border p-4', card)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className={cn('text-sm font-black', ink)}>{title}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

function Tab({ n, label, active, onClick, tone, light }: { n: number; label: string; active: boolean; onClick: () => void; tone: string; light?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', active ? `${tone} keep-on-color text-white` : light ? 'text-slate-500' : 'text-slate-400')}>
      {label} <span className={cn('rounded-full px-1', active ? 'bg-black/20' : light ? 'bg-slate-100' : 'bg-white/10')}>{n}</span>
    </button>
  );
}

function ActionBtn({ color, icon: Icon, title, hint, onClick, disabled }: { color: string; icon: typeof CheckSquare; title: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn('keep-on-color flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-white shadow-sm disabled:opacity-40', color)}>
      <Icon className="h-5 w-5 shrink-0" />
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-[11px] text-white/75">{hint}</span>
      </span>
    </button>
  );
}

export function CompaniaLifeModal({
  kind,
  dark,
  members,
  companyId,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  kind: LifeKind;
  dark: boolean;
  members: CompaniaPerson[];
  companyId?: string;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (body: { kind: LifeKind; title: string; notes?: string; dueAt?: string; assigneeId?: string; priority?: LifePriority; companyId?: string }) => void;
}) {
  const labels: Record<LifeKind, string> = {
    TAREA: 'tarea', ASEO: 'aseo', REUNION: 'reunión', RECORDATORIO: 'recordatorio', CUMPLE: 'cumpleaños',
  };
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<LifePriority>('MEDIUM');
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
      priority,
      companyId,
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className={cn('w-full max-w-md rounded-2xl border border-red-900/40 p-5 shadow-2xl', dark ? 'bg-[#070b12] text-white' : 'bg-white text-slate-900')}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-red-500">Privado · tu compañía</p>
            <h3 className="text-lg font-black">Nuevo {labels[kind]}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500"><X className="h-5 w-5" /></button>
        </div>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'CUMPLE' ? 'Nombre' : 'Título'} className={cn('mb-2 w-full rounded-lg border px-3 py-2 text-sm', field)} />
        <input type={kind === 'CUMPLE' ? 'date' : 'datetime-local'} value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={cn('mb-2 w-full rounded-lg border px-3 py-2 text-sm', field)} />
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={cn('mb-2 w-full rounded-lg border px-3 py-2 text-sm', field)}>
          <option value="">Sin asignar</option>
          {members.map((m) => <option key={m.id} value={m.id}>{fullName(m)}</option>)}
        </select>
        {(kind === 'TAREA' || kind === 'ASEO') && (
          <div className="mb-2 flex gap-2">
            {(['HIGH', 'MEDIUM', 'LOW'] as LifePriority[]).map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)} className={cn('rounded-full px-3 py-1 text-xs font-bold', priority === p ? priorityCls(p, dark) : 'bg-slate-500/10 text-slate-400')}>{PRIORITY_LABEL[p]}</button>
            ))}
          </div>
        )}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas o lugar" className={cn('mb-3 w-full rounded-lg border px-3 py-2 text-sm', field)} />
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy || !title.trim()} className="keep-on-color flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Publicar en la compañía
        </button>
      </form>
    </div>
  );
}

function AnnouncementIcon({ type }: { type?: string }) {
  const t = (type || '').toUpperCase();
  if (t.includes('RESULT') || t.includes('OK') || t.includes('SUCCESS')) return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  if (t.includes('INFO') || t.includes('NOTICE')) return <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />;
  return <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />;
}

function dueLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const a = startOfDay(d).getTime();
  const b = startOfDay(now).getTime();
  const days = Math.round((a - b) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

