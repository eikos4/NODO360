import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Globe, Loader2, MessageSquare, Moon, Phone, Search, Send, Shield, Siren, Sun, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useThemeStore } from '../store/themeStore';
import { NodoEnlaceMark } from '../components/nodo-enlace/NodoEnlaceMark';
import {
  CHILE_REGIONS,
  chileCatalogTotals,
  listChileCuerpos,
  matchChileCuerpo,
} from '../lib/chile-bomberos';

type Emergency = {
  id: string;
  code: string;
  type: string;
  address: string;
  dispatchedAt: string;
  companyNumber: number;
  companyName: string;
};

type LinkCard = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  note: string | null;
  incoming: boolean;
  requestedBy: string;
  incident: { id: string; code: string; type: string } | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  other: { id: string; name: string; city: string; region: string; slug: string };
};

type CuerpoCard = {
  id: string;
  name: string;
  city: string;
  region: string;
  companyCount: number;
  activeCount: number;
  latestType: string | null;
  activeEmergencies: Emergency[];
  link: LinkCard | null;
  onNodo?: boolean;
};

type Network = {
  me: CuerpoCard | null;
  pendingIn: LinkCard[];
  pendingOut: LinkCard[];
  cuerpos: CuerpoCard[];
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  author: string;
  role: string;
  cuerpoName: string;
  incident: { id: string; code: string; type: string } | null;
};

const ROLE_SHORT: Record<string, string> = {
  KODESK: 'Kodesk',
  SUPER_ADMIN: 'Admin',
  COMANDANTE: 'Cdte.',
  CAPITAN: 'Capitán',
  OPERADOR_CENTRAL: 'Central',
};

const FEATURES = [
  { icon: NodoEnlaceMark, title: 'Enlazar con otro cuerpo', text: 'Pedí enlace, compartí información y coordiná en un mismo lugar.' },
  { icon: MessageSquare, title: 'Chat de coordinación', text: 'Comunicación directa entre centrales de distintos cuerpos.' },
  { icon: Users, title: 'Emergencias en conjunto', text: 'Trabajo unificado cuando la emergencia es grande.' },
  { icon: Globe, title: 'Red nacional', text: 'Conectado con cualquier cuerpo de Nodo360 en el país.' },
] as const;

function clock(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function useEnlaceTone(isDark: boolean) {
  if (isDark) {
    return {
      page: 'bg-[#050910] text-white',
      overlayX: 'bg-gradient-to-r from-[#050910] via-[#050910]/88 to-[#050910]/25',
      overlayY: 'bg-gradient-to-t from-[#050910] via-transparent to-[#050910]/55',
      img: '',
      wrap: 'keep-on-color',
      ink: 'text-white',
      muted: 'text-white/70',
      soft: 'text-white/55',
      cyan: 'text-cyan-300',
      glass: 'border-white/15 bg-black/35',
      me: 'border-white/15 bg-white/10',
      selected: 'border-cyan-300/50 bg-cyan-400/15',
      idle: 'border-transparent hover:border-white/10 hover:bg-white/5',
      iconIdle: 'bg-white/10',
      mark: 'bg-white/5 text-cyan-300 ring-1 ring-cyan-300/40',
      searchIcon: 'text-white/50',
      placeholder: 'placeholder:text-white/45',
      heroLead: 'text-white/85',
      heroBody: 'text-white/70',
      feature: 'border-white/15 bg-black/30',
      featureIcon: 'border-white/20 bg-white/5 text-cyan-300',
      cta: 'border-white/20 bg-white/10 hover:bg-white/15',
      panel: 'border-white/15 bg-black/45',
      line: 'border-white/10',
      incoming: 'bg-white/10',
      input: 'border-white/15 bg-black/30 placeholder:text-white/40',
      back: 'text-white/60 hover:text-white',
      themeBtn: 'border-white/15 bg-black/30 text-white/80 hover:bg-black/50',
      pending: 'border-amber-400/30 bg-amber-500/15',
      pendingTitle: 'text-amber-300',
      emergency: 'border-red-400/30 bg-red-600/15',
      emergencyCode: 'text-red-300',
      wait: 'text-amber-300',
      enlace: 'text-emerald-300',
      ghost: 'border-white/20',
    };
  }
  return {
    page: 'bg-slate-100 text-slate-900',
    overlayX: 'bg-gradient-to-r from-slate-50 via-slate-50/92 to-transparent',
    overlayY: 'bg-gradient-to-t from-slate-100/90 via-transparent to-white/55',
    img: 'opacity-80 brightness-110 contrast-105',
    wrap: '',
    ink: 'text-slate-900',
    muted: 'text-slate-600',
    soft: 'text-slate-500',
    cyan: 'text-cyan-700',
    glass: 'border-slate-200 bg-white/90 shadow-sm',
    me: 'border-cyan-200 bg-cyan-50',
    selected: 'border-cyan-400 bg-cyan-50 shadow-sm',
    idle: 'border-transparent hover:border-cyan-200 hover:bg-white/80',
    iconIdle: 'bg-slate-100 text-slate-600',
    mark: 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
    searchIcon: 'text-slate-400',
    placeholder: 'placeholder:text-slate-400',
    heroLead: 'text-slate-800',
    heroBody: 'text-slate-600',
    feature: 'border-slate-200 bg-white/90 shadow-sm',
    featureIcon: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    cta: 'border-cyan-300 bg-white text-cyan-800 hover:bg-cyan-50 shadow-sm',
    panel: 'border-slate-200 bg-white/95 shadow-lg',
    line: 'border-slate-200',
    incoming: 'bg-slate-100 text-slate-900',
    input: 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400',
    back: 'text-slate-500 hover:text-slate-900',
    themeBtn: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm',
    pending: 'border-amber-200 bg-amber-50',
    pendingTitle: 'text-amber-800',
    emergency: 'border-red-200 bg-red-50',
    emergencyCode: 'text-red-700',
    wait: 'text-amber-700',
    enlace: 'text-emerald-700',
    ghost: 'border-slate-300 text-slate-700',
  };
}

export default function NodoEnlacePage() {
  const qc = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const t = useEnlaceTone(isDark);
  const [query, setQuery] = useState('');
  const [asCuerpoId, setAsCuerpoId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const networkQ = useQuery({
    queryKey: ['nodo-enlace-network', asCuerpoId],
    queryFn: async () =>
      (await api.get<Network>('/nodo-enlace/network', { params: asCuerpoId ? { asCuerpoId } : {} })).data,
    refetchInterval: 12_000,
  });

  const network = networkQ.data;
  const directory = useMemo(() => {
    const live = network?.cuerpos ?? [];
    const me = network?.me;
    const pool = me ? [me, ...live] : live;
    const used = new Set<string>();
    const catalog = listChileCuerpos().flatMap((row) => {
      const match = matchChileCuerpo(row, pool);
      if (match && me && match.id === me.id) {
        used.add(match.id);
        return [];
      }
      if (match) used.add(match.id);
      return [{
        id: match?.id ?? `off:${row.key}`,
        name: match?.name ?? row.name,
        city: match?.city ?? row.city,
        region: match?.region ?? row.region,
        companyCount: match?.companyCount ?? row.companies,
        activeCount: match?.activeCount ?? 0,
        latestType: match?.latestType ?? null,
        activeEmergencies: match?.activeEmergencies ?? [],
        link: match?.link ?? null,
        onNodo: Boolean(match),
      } satisfies CuerpoCard];
    });
    const extras = live
      .filter((row) => !used.has(row.id))
      .map((row) => ({ ...row, onNodo: true as const }));
    return [...catalog, ...extras];
  }, [network?.cuerpos, network?.me]);
  const selected = directory.find((c) => c.id === selectedId) ?? null;
  const linkId = selected?.link?.status === 'ACTIVE' || selected?.link?.status === 'PENDING'
    ? selected.link.id
    : null;

  const messagesQ = useQuery({
    queryKey: ['nodo-enlace-messages', linkId],
    enabled: Boolean(linkId && selected?.link?.status === 'ACTIVE'),
    queryFn: async () => (await api.get<ChatMessage[]>(`/nodo-enlace/links/${linkId}/messages`)).data,
    refetchInterval: 3_000,
  });

  const emergenciesQ = useQuery({
    queryKey: ['nodo-enlace-link', linkId],
    enabled: Boolean(linkId && selected?.link?.status === 'ACTIVE'),
    queryFn: async () => (await api.get<{ activeEmergencies: Emergency[] }>(`/nodo-enlace/links/${linkId}`)).data,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQ.data?.length]);

  const requestM = useMutation({
    mutationFn: async (toCuerpoId: string) =>
      (await api.post('/nodo-enlace/links', {
        toCuerpoId,
        fromCuerpoId: asCuerpoId || undefined,
        note: note.trim() || undefined,
      })).data,
    onSuccess: () => {
      setNote('');
      toast.success('Solicitud de enlace enviada');
      void qc.invalidateQueries({ queryKey: ['nodo-enlace-network'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo solicitar el enlace'),
  });

  const acceptM = useMutation({
    mutationFn: async (id: string) => (await api.post(`/nodo-enlace/links/${id}/accept`)).data,
    onSuccess: () => {
      toast.success('Enlace activo');
      void qc.invalidateQueries({ queryKey: ['nodo-enlace-network'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo aceptar'),
  });

  const closeM = useMutation({
    mutationFn: async (id: string) => (await api.post(`/nodo-enlace/links/${id}/close`)).data,
    onSuccess: () => {
      toast.success('Enlace cerrado');
      void qc.invalidateQueries({ queryKey: ['nodo-enlace-network'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo cerrar'),
  });

  const sendM = useMutation({
    mutationFn: async () => {
      if (!linkId) throw new Error('sin enlace');
      return (await api.post(`/nodo-enlace/links/${linkId}/messages`, { body: draft })).data as ChatMessage;
    },
    onSuccess: (msg) => {
      setDraft('');
      qc.setQueryData<ChatMessage[]>(['nodo-enlace-messages', linkId], (prev) => [...(prev ?? []), msg]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo enviar'),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((c) => {
      if (!q) return true;
      return `${c.name} ${c.city} ${c.region}`.toLowerCase().includes(q);
    });
  }, [directory, query]);

  const grouped = useMemo(() => {
    const order = CHILE_REGIONS.map((region) => region.name);
    const map = new Map<string, CuerpoCard[]>();
    for (const cuerpo of filtered) {
      const list = map.get(cuerpo.region) ?? [];
      list.push(cuerpo);
      map.set(cuerpo.region, list);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const me = network?.me;
    const catalog = chileCatalogTotals();
    const onNodo = directory.filter((c) => c.onNodo !== false).length + (me ? 1 : 0);
    const emergencies = directory.reduce((n, c) => n + c.activeCount, 0) + (me?.activeCount ?? 0);
    const links = directory.filter((c) => c.link?.status === 'ACTIVE').length;
    return { cuerpoCount: catalog.cuerpos, onNodo, emergencies, links, companies: catalog.companies };
  }, [directory, network?.me]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sendM.isPending) return;
    sendM.mutate();
  };

  const pickFirstCuerpo = () => {
    const first = filtered[0];
    if (first) {
      setSelectedId(first.id);
      return;
    }
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={cn('nodo-enlace-page relative h-full min-h-0 overflow-hidden', t.page, isDark && 'enlace-scene')}>
      <img
        src="/nodo-enlace-hero.jpg"
        alt=""
        className={cn('absolute inset-0 h-full w-full object-cover object-[70%_center]', t.img)}
      />
      <div className={cn('absolute inset-0', t.overlayX)} />
      <div className={cn('absolute inset-0', t.overlayY)} />

      <div className={cn('relative z-10 flex h-full min-h-0 flex-col', t.wrap, t.ink)}>
        <header className="shrink-0 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn('enlace-mark-pulse grid h-11 w-11 place-items-center rounded-full', t.mark)}>
                <NodoEnlaceMark className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black leading-none tracking-[0.18em]">NODO360</p>
                <p className={cn('mt-1 text-[10px] font-bold uppercase tracking-[0.22em]', t.muted)}>
                  Coordinación de emergencias
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {network?.me ? (
                <div className={cn('rounded-full border px-4 py-2 backdrop-blur-md', t.glass)}>
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', t.cyan)}>Tu cuerpo</p>
                  <p className="text-sm font-semibold leading-tight">{network.me.name}</p>
                  <p className={cn('text-[11px]', t.muted)}>
                    {network.me.city} · {network.me.activeCount} emergencia{network.me.activeCount === 1 ? '' : 's'} activa{network.me.activeCount === 1 ? '' : 's'}
                  </p>
                </div>
              ) : network ? (
                <label className={cn('rounded-full border px-4 py-2 backdrop-blur-md', t.glass)}>
                  <p className={cn('mb-1 text-[10px] font-black uppercase tracking-[0.18em]', t.cyan)}>Actuar como cuerpo</p>
                  <select
                    value={asCuerpoId}
                    onChange={(e) => setAsCuerpoId(e.target.value)}
                    className={cn('bg-transparent text-sm outline-none', t.ink)}
                  >
                    <option value="">Elegir cuerpo…</option>
                    {network.cuerpos.filter((c) => !c.id.startsWith('off:')).map((c) => (
                      <option key={c.id} value={c.id} className="text-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={toggleTheme}
                className={cn('rounded-full border p-2.5', t.themeBtn)}
                title={isDark ? 'Tema claro' : 'Tema oscuro'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        {network?.pendingIn?.length ? (
          <div className={cn('mx-4 mb-2 shrink-0 rounded-2xl border px-4 py-3 backdrop-blur-md sm:mx-6', t.pending)}>
            <p className={cn('mb-2 text-[11px] font-black uppercase tracking-wider', t.pendingTitle)}>Solicitudes entrantes</p>
            <div className="flex flex-wrap gap-2">
              {network.pendingIn.map((link) => (
                <div key={link.id} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', t.glass)}>
                  <p className="text-sm font-semibold">{link.other.name}</p>
                  {link.note && <span className={cn('hidden text-xs sm:inline', t.muted)}>{link.note}</span>}
                  <button
                    type="button"
                    onClick={() => acceptM.mutate(link.id)}
                    className="keep-on-color inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                  >
                    <Check className="h-3 w-3" /> Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => closeM.mutate(link.id)}
                    className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs', t.ghost)}
                  >
                    <X className="h-3 w-3" /> Rechazar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="shrink-0 px-4 sm:px-6">
          <label className={cn('flex items-center gap-3 rounded-full border px-4 py-2.5 backdrop-blur-md', t.glass)}>
            <Search className={cn('h-4 w-4', t.searchIcon)} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cuerpo, ciudad o región…"
              className={cn('w-full bg-transparent text-sm outline-none', t.ink, t.placeholder)}
            />
          </label>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside ref={listRef} className="min-h-0 overflow-y-auto px-4 pb-4 sm:px-6 lg:pr-2">
            <p className={cn('mb-3 text-[10px] font-black uppercase tracking-[0.22em]', t.soft)}>
              {filtered.length} de {chileCatalogTotals().cuerpos} cuerpos
            </p>
            <div className="space-y-1.5">
              {network?.me && (
                <div className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2.5', t.me)}>
                  <span className="keep-on-color grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{network.me.name}</p>
                    <p className={cn('truncate text-[11px]', t.muted)}>
                      {network.me.region || network.me.city}
                      {network.me.activeCount > 0 ? ` · ${network.me.activeCount} emergencia` : ''}
                    </p>
                  </div>
                </div>
              )}
              {networkQ.isLoading && (
                <p className={cn('flex items-center gap-2 px-2 py-6 text-sm', t.muted)}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando red de cuerpos…
                </p>
              )}
              {!networkQ.isLoading && filtered.length === 0 && (
                <p className={cn('px-1 py-4 text-sm', t.muted)}>
                  No hay un cuerpo con ese nombre. Probá ciudad o región.
                </p>
              )}
              {grouped.map(([region, cuerpos]) => (
                <div key={region} className="pt-2">
                  <p className={cn('mb-1.5 px-1 text-[10px] font-black uppercase tracking-[0.18em]', t.soft)}>{region}</p>
                  <div className="space-y-1.5">
                    {cuerpos.map((cuerpo) => {
                      const active = selectedId === cuerpo.id;
                      return (
                        <button
                          key={cuerpo.id}
                          type="button"
                          onClick={() => setSelectedId(cuerpo.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                            active ? t.selected : t.idle,
                          )}
                        >
                          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', active ? 'keep-on-color bg-cyan-600 text-white' : t.iconIdle)}>
                            <Shield className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{cuerpo.name}</p>
                            <p className={cn('truncate text-[11px]', t.muted)}>
                              {cuerpo.city}
                              {cuerpo.onNodo === false ? ' · No está en Nodo360' : cuerpo.activeCount > 0 ? ` · ${cuerpo.activeCount} emergencia` : ''}
                            </p>
                          </div>
                          <StatusPill cuerpo={cuerpo} t={t} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative min-h-0 overflow-y-auto px-4 pb-4 sm:px-8">
            {!selected ? (
              <div className="flex min-h-full flex-col justify-center py-6">
                <p className={cn('text-[11px] font-black uppercase tracking-[0.28em]', t.cyan)}>Sistema de Nodo360</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
                  Nodo<span className={t.cyan}>Enlace</span>
                </h1>
                <p className={cn('mt-4 max-w-md text-lg font-medium', t.heroLead)}>
                  Coordinación nacional entre cuerpos para emergencias grandes.
                </p>
                <p className={cn('mt-3 max-w-lg text-sm leading-relaxed', t.heroBody)}>
                  NodoEnlace es un sistema de Nodo360 capaz de comunicarte con cualquier cuerpo a nivel nacional para coordinar emergencias grandes en tiempo real.
                </p>
                <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                  {FEATURES.map(({ icon: Icon, title, text }) => (
                    <div key={title} className={cn('rounded-2xl border px-3 py-4 text-center backdrop-blur-md', t.feature)}>
                      <span className={cn('mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border', t.featureIcon)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="text-xs font-bold leading-tight">{title}</p>
                      <p className={cn('mt-1 text-[11px] leading-snug', t.muted)}>{text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={pickFirstCuerpo}
                    className={cn('inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold backdrop-blur-md', t.cta)}
                  >
                    <NodoEnlaceMark className={cn('h-4 w-4', t.cyan)} />
                    Selecciona un cuerpo de la lista para comenzar
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn('flex min-h-full flex-col overflow-hidden rounded-3xl border backdrop-blur-xl', t.panel)}>
                <div className={cn('flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5', t.line)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <NodoEnlaceMark className={cn('h-5 w-5', t.cyan)} />
                      <h2 className="text-lg font-bold">{selected.name}</h2>
                    </div>
                    <p className={cn('text-sm', t.muted)}>
                      {selected.city} · {selected.region} · {selected.companyCount} cuartel{selected.companyCount === 1 ? '' : 'es'}
                    </p>
                    {selected.link?.note && <p className={cn('mt-1 text-xs', t.soft)}>{selected.link.note}</p>}
                  </div>
                  {selected.onNodo !== false ? (
                    <LinkActions
                      t={t}
                      cuerpo={selected}
                      note={note}
                      setNote={setNote}
                      requesting={requestM.isPending}
                      onRequest={() => requestM.mutate(selected.id)}
                      onAccept={() => selected.link && acceptM.mutate(selected.link.id)}
                      onClose={() => selected.link && closeM.mutate(selected.link.id)}
                      onBack={() => setSelectedId(null)}
                    />
                  ) : (
                    <button type="button" onClick={() => setSelectedId(null)} className={cn('text-[11px] font-semibold uppercase tracking-wide', t.back)}>
                      Volver
                    </button>
                  )}
                </div>

                {selected.link?.status === 'ACTIVE' && (
                  <div className={cn('shrink-0 border-b px-4 py-3 sm:px-5', t.line)}>
                    <p className={cn('mb-2 text-[10px] font-black uppercase tracking-wider', t.soft)}>
                      Emergencias activas de {selected.name}
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {(emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).length === 0 ? (
                        <p className={cn('text-xs', t.soft)}>Sin emergencias abiertas.</p>
                      ) : (
                        (emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).map((inc) => (
                          <div key={inc.id} className={cn('min-w-[220px] rounded-xl border px-3 py-2', t.emergency)}>
                            <p className={cn('text-xs font-bold', t.emergencyCode)}>{inc.code}</p>
                            <p className="truncate text-sm">{inc.type}</p>
                            <p className={cn('truncate text-[11px]', t.muted)}>{inc.address}</p>
                            <p className={cn('text-[11px]', t.soft)}>
                              {inc.companyNumber}ª {inc.companyName} · {clock(inc.dispatchedAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                  {selected.onNodo === false ? (
                    <OffNodoPanel t={t} cuerpo={selected} />
                  ) : selected.link?.status !== 'ACTIVE' ? (
                    <div className={cn('grid h-full place-items-center text-center text-sm', t.muted)}>
                      {selected.link?.status === 'PENDING'
                        ? selected.link.incoming
                          ? 'Aceptá el enlace para abrir el chat.'
                          : 'Esperando que el otro cuerpo acepte.'
                        : 'Pedí enlace para coordinar por chat.'}
                    </div>
                  ) : (
                    <>
                      {(messagesQ.data ?? []).map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                            msg.mine ? 'keep-on-color ml-auto bg-cyan-600 text-white' : t.incoming,
                          )}
                        >
                          <p className={cn('mb-0.5 text-[10px] font-semibold', msg.mine ? 'text-cyan-50' : t.soft)}>
                            {msg.cuerpoName} · {msg.author} · {ROLE_SHORT[msg.role] ?? msg.role}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                          {msg.incident && (
                            <p className={cn('mt-1 text-[10px]', msg.mine ? 'text-cyan-50' : t.soft)}>
                              Ref. {msg.incident.code} · {msg.incident.type}
                            </p>
                          )}
                          <p className={cn('mt-1 text-[10px]', msg.mine ? 'text-cyan-100/80' : t.soft)}>{clock(msg.createdAt)}</p>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                {selected.link?.status === 'ACTIVE' && (
                  <form onSubmit={onSend} className={cn('flex shrink-0 items-end gap-2 border-t p-3 sm:p-4', t.line)}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="Mensaje a la central del otro cuerpo…"
                      className={cn('flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-cyan-500', t.input)}
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sendM.isPending}
                      className="keep-on-color grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white disabled:opacity-40"
                    >
                      {sendM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>

        {!selected && (
          <footer className="flex shrink-0 flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-6">
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', t.soft)}>Red nacional Nodo360</p>
              <div className="mt-2 flex flex-wrap gap-6">
                <Stat n={stats.cuerpoCount} label="cuerpos Chile" muted={t.soft} />
                <Stat n={stats.onNodo} label="en Nodo360" muted={t.soft} />
                <Stat n={stats.emergencies} label="emergencias" muted={t.soft} />
                <Stat n={stats.links} label="enlaces" muted={t.soft} />
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, muted }: { n: number; label: string; muted: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-black tabular-nums leading-none">{String(n).padStart(2, '0')}</p>
      <p className={cn('mt-1 text-[10px] uppercase tracking-[0.16em]', muted)}>{label}</p>
    </div>
  );
}

function StatusPill({ cuerpo, t }: { cuerpo: CuerpoCard; t: ReturnType<typeof useEnlaceTone> }) {
  if (cuerpo.onNodo === false) {
    return <span className={cn('text-[10px] font-black uppercase tracking-wide', t.soft)}>Contactar</span>;
  }
  if (cuerpo.link?.status === 'ACTIVE') {
    return <span className={cn('text-[10px] font-black uppercase tracking-wide', t.enlace)}>Enlace</span>;
  }
  if (cuerpo.link?.status === 'PENDING') {
    return (
      <span className={cn('text-[10px] font-black uppercase tracking-wide', t.wait)}>
        {cuerpo.link.incoming ? 'Entrante' : 'Pendiente'}
      </span>
    );
  }
  if (cuerpo.activeCount > 0) {
    return <Siren className="h-3.5 w-3.5 shrink-0 text-red-500" />;
  }
  return <span className={cn('text-[10px] font-black uppercase tracking-wide', t.cyan)}>En Nodo</span>;
}

function inviteCopy(cuerpo: CuerpoCard) {
  return `Comandante: hay que contactar al ${cuerpo.name} (${cuerpo.city}, ${cuerpo.region}) e invitarlos a entrar a Nodo360. Hoy no están en la red y no se puede abrir NodoEnlace con ellos.`;
}

function OffNodoPanel({ t, cuerpo }: { t: ReturnType<typeof useEnlaceTone>; cuerpo: CuerpoCard }) {
  const copyInvite = async () => {
    const text = inviteCopy(cuerpo);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Mensaje copiado para el comandante');
    } catch {
      toast(text);
    }
  };

  return (
    <div className="grid h-full place-items-center px-2 py-6 text-center">
      <div className="max-w-md">
        <span className={cn('mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border', t.featureIcon)}>
          <Phone className="h-5 w-5" />
        </span>
        <p className={cn('text-[11px] font-black uppercase tracking-[0.22em]', t.cyan)}>No está en Nodo360</p>
        <h3 className="mt-2 text-xl font-black">{cuerpo.name}</h3>
        <p className={cn('mt-3 text-sm leading-relaxed', t.heroBody)}>
          Este cuerpo no existe en la red todavía. Dile al comandante que se ponga a contactar al {cuerpo.name} e invítelo a estar en Nodo360. Cuando se sumen, van a poder enlazarse y coordinar emergencias grandes por acá.
        </p>
        <button
          type="button"
          onClick={() => void copyInvite()}
          className="keep-on-color mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Copy className="h-4 w-4" />
          Contactar
        </button>
        <p className={cn('mt-3 text-[11px] leading-relaxed', t.soft)}>
          Copia el recado para el comandante: que llame a ese cuerpo y los invite a Nodo360.
        </p>
      </div>
    </div>
  );
}

function LinkActions({
  t,
  cuerpo,
  note,
  setNote,
  requesting,
  onRequest,
  onAccept,
  onClose,
  onBack,
}: {
  t: ReturnType<typeof useEnlaceTone>;
  cuerpo: CuerpoCard;
  note: string;
  setNote: (value: string) => void;
  requesting: boolean;
  onRequest: () => void;
  onAccept: () => void;
  onClose: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={onBack} className={cn('text-[11px] font-semibold uppercase tracking-wide', t.back)}>
        Volver
      </button>
      {cuerpo.link?.status === 'ACTIVE' ? (
        <button type="button" onClick={onClose} className={cn('rounded-lg border px-3 py-2 text-xs font-semibold', t.ghost)}>
          Cerrar enlace
        </button>
      ) : cuerpo.link?.status === 'PENDING' && cuerpo.link.incoming ? (
        <div className="flex gap-2">
          <button type="button" onClick={onAccept} className="keep-on-color rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
            Aceptar
          </button>
          <button type="button" onClick={onClose} className={cn('rounded-lg border px-3 py-2 text-xs', t.ghost)}>
            Rechazar
          </button>
        </div>
      ) : cuerpo.link?.status === 'PENDING' ? (
        <p className={cn('text-xs font-semibold', t.wait)}>Esperando aceptación</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo (opcional)"
            className={cn('rounded-lg border px-3 py-2 text-xs outline-none', t.input)}
          />
          <button
            type="button"
            onClick={onRequest}
            disabled={requesting}
            className="keep-on-color inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NodoEnlaceMark className="h-3.5 w-3.5" />}
            Pedir enlace
          </button>
        </div>
      )}
    </div>
  );
}
