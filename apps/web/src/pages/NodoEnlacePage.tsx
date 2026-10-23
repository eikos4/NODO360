import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Moon, Search, Send, Siren, Sun, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useThemeStore } from '../store/themeStore';
import { NodoEnlaceBrand, NodoEnlaceMark } from '../components/nodo-enlace/NodoEnlaceMark';

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

function clock(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NodoEnlacePage() {
  const qc = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');
  const [asCuerpoId, setAsCuerpoId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const networkQ = useQuery({
    queryKey: ['nodo-enlace-network', asCuerpoId],
    queryFn: async () =>
      (await api.get<Network>('/nodo-enlace/network', { params: asCuerpoId ? { asCuerpoId } : {} })).data,
    refetchInterval: 12_000,
  });

  const network = networkQ.data;
  const selected = network?.cuerpos.find((c) => c.id === selectedId) ?? null;
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
    return (network?.cuerpos ?? []).filter((c) => {
      if (!q) return true;
      return `${c.name} ${c.city} ${c.region}`.toLowerCase().includes(q);
    });
  }, [network?.cuerpos, query]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sendM.isPending) return;
    sendM.mutate();
  };

  return (
    <div className={cn('nodo-enlace-page h-full min-h-0 flex flex-col', isDark ? 'bg-[#061018] text-slate-100' : 'bg-slate-100 text-slate-900')}>
      <div className={cn('h-1 shrink-0', isDark ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600' : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-500')} />
      <header className={cn('shrink-0 border-b px-4 py-3.5 sm:px-6', isDark ? 'border-cyan-500/15 bg-[#07141c]' : 'border-slate-200 bg-white shadow-sm')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <NodoEnlaceBrand isDark={isDark} />
            <p className={cn('mt-1.5 text-sm max-w-xl', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Red de cuerpos: pedí enlace, mirá si el otro está en alarma y coordiná por chat de central.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {network?.me ? (
              <div className={cn('rounded-xl border px-4 py-2.5', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
                <p className={cn('text-[10px] uppercase tracking-wider font-bold', isDark ? 'text-cyan-400/80' : 'text-cyan-700')}>Tu cuerpo</p>
                <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{network.me.name}</p>
                <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  {network.me.city} · {network.me.activeCount} emergencia{network.me.activeCount === 1 ? '' : 's'} activa{network.me.activeCount === 1 ? '' : 's'}
                </p>
              </div>
            ) : network ? (
              <label className={cn('rounded-xl border px-4 py-2.5 block', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
                <p className={cn('text-[10px] uppercase tracking-wider font-bold mb-1', isDark ? 'text-cyan-400/80' : 'text-cyan-700')}>Actuar como cuerpo</p>
                <select
                  value={asCuerpoId}
                  onChange={(e) => setAsCuerpoId(e.target.value)}
                  className={cn('bg-transparent text-sm outline-none', isDark ? 'text-white' : 'text-slate-900')}
                >
                  <option value="">Elegir cuerpo…</option>
                  {network.cuerpos.map((c) => (
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
              className={cn(
                'p-2.5 rounded-xl border',
                isDark ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )}
              title={isDark ? 'Tema claro' : 'Tema oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {network?.pendingIn?.length ? (
        <div className={cn('shrink-0 border-b px-4 py-3 sm:px-6', isDark ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50')}>
          <p className={cn('text-xs font-black uppercase tracking-wider mb-2', isDark ? 'text-amber-300' : 'text-amber-800')}>Solicitudes entrantes</p>
          <div className="flex flex-wrap gap-2">
            {network.pendingIn.map((link) => (
              <div
                key={link.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  isDark ? 'border-amber-500/30 bg-[#061018]/50' : 'border-amber-200 bg-white',
                )}
              >
                <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{link.other.name}</p>
                {link.note && <span className={cn('text-xs hidden sm:inline', isDark ? 'text-slate-400' : 'text-slate-600')}>{link.note}</span>}
                <button
                  type="button"
                  onClick={() => acceptM.mutate(link.id)}
                  className="keep-on-color inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  <Check className="w-3 h-3" /> Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => closeM.mutate(link.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                    isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white text-slate-700',
                  )}
                >
                  <X className="w-3 h-3" /> Rechazar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn('border-b lg:border-b-0 lg:border-r min-h-0 flex flex-col', isDark ? 'border-white/10 bg-[#07141c]' : 'border-slate-200 bg-white')}>
          <div className="p-3">
            <label className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
              <Search className={cn('w-4 h-4', isDark ? 'text-slate-500' : 'text-slate-400')} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cuerpo, ciudad o región"
                className={cn('w-full bg-transparent text-sm outline-none placeholder:text-slate-500', isDark ? 'text-white' : 'text-slate-900')}
              />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {networkQ.isLoading && (
              <p className={cn('flex items-center gap-2 text-sm px-2 py-6', isDark ? 'text-slate-500' : 'text-slate-500')}>
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando red de cuerpos…
              </p>
            )}
            {!networkQ.isLoading && filtered.length === 0 && (
              <p className={cn('text-sm px-2 py-6', isDark ? 'text-slate-500' : 'text-slate-600')}>
                Todavía no hay otro cuerpo en Nodo360. Cuando se sume uno (por ejemplo Coihueco), aparece acá para pedir enlace y chatear.
              </p>
            )}
            {filtered.map((cuerpo) => {
              const active = selectedId === cuerpo.id;
              return (
                <button
                  key={cuerpo.id}
                  type="button"
                  onClick={() => setSelectedId(cuerpo.id)}
                  className={cn(
                    'w-full text-left rounded-xl border px-3 py-3 transition-colors',
                    active
                      ? isDark
                        ? 'border-cyan-400/50 bg-cyan-500/10'
                        : 'border-cyan-500 bg-cyan-50 shadow-sm'
                      : isDark
                        ? 'border-white/10 bg-white/[0.03] hover:border-cyan-500/30'
                        : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-slate-900')}>{cuerpo.name}</p>
                      <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-600')}>{cuerpo.city} · {cuerpo.region}</p>
                    </div>
                    <StatusPill cuerpo={cuerpo} isDark={isDark} />
                  </div>
                  {cuerpo.activeCount > 0 && (
                    <p className={cn('mt-2 flex items-center gap-1.5 text-xs font-semibold', isDark ? 'text-red-300' : 'text-red-700')}>
                      <Siren className="w-3 h-3" />
                      {cuerpo.activeCount} activa{cuerpo.activeCount === 1 ? '' : 's'}
                      {cuerpo.latestType ? ` · ${cuerpo.latestType}` : ''}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-0 flex flex-col">
          {!selected ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div className="max-w-md space-y-4">
                <div
                  className={cn(
                    'enlace-mark-pulse mx-auto h-20 w-20 rounded-3xl grid place-items-center',
                    isDark ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25' : 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
                  )}
                >
                  <NodoEnlaceMark className="w-10 h-10" />
                </div>
                <h2 className={cn('text-xl font-black', isDark ? 'text-white' : 'text-slate-900')}>
                  Red de cuerpos
                </h2>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  Elegí un cuerpo de la lista. Si hay alarma, se ve al toque. Pedí enlace y, al aceptar, queda el chat de coordinación.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={cn('shrink-0 border-b px-4 py-4 sm:px-5', isDark ? 'border-white/10' : 'border-slate-200 bg-white/80')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <NodoEnlaceMark className={cn('w-5 h-5', isDark ? 'text-cyan-300' : 'text-cyan-700')} />
                      <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>{selected.name}</h2>
                    </div>
                    <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                      {selected.city} · {selected.region} · {selected.companyCount} cuartel{selected.companyCount === 1 ? '' : 'es'}
                    </p>
                    {selected.link?.note && <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-slate-500')}>{selected.link.note}</p>}
                  </div>
                  <LinkActions
                    isDark={isDark}
                    cuerpo={selected}
                    note={note}
                    setNote={setNote}
                    requesting={requestM.isPending}
                    onRequest={() => requestM.mutate(selected.id)}
                    onAccept={() => selected.link && acceptM.mutate(selected.link.id)}
                    onClose={() => selected.link && closeM.mutate(selected.link.id)}
                  />
                </div>
              </div>

              {selected.link?.status === 'ACTIVE' && (
                <div className={cn('shrink-0 border-b px-4 py-3 sm:px-5', isDark ? 'border-white/10' : 'border-slate-200')}>
                  <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-slate-500')}>
                    Emergencias activas de {selected.name}
                  </p>
                  <div className="flex gap-2 overflow-x-auto">
                    {(emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).length === 0 ? (
                      <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>Sin emergencias abiertas.</p>
                    ) : (
                      (emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).map((inc) => (
                        <div
                          key={inc.id}
                          className={cn(
                            'min-w-[220px] rounded-xl border px-3 py-2',
                            isDark ? 'border-red-500/25 bg-red-600/10' : 'border-red-200 bg-red-50',
                          )}
                        >
                          <p className={cn('text-xs font-bold', isDark ? 'text-red-300' : 'text-red-700')}>{inc.code}</p>
                          <p className={cn('text-sm truncate', isDark ? 'text-white' : 'text-slate-900')}>{inc.type}</p>
                          <p className={cn('text-[11px] truncate', isDark ? 'text-slate-400' : 'text-slate-600')}>{inc.address}</p>
                          <p className={cn('text-[11px]', isDark ? 'text-slate-500' : 'text-slate-500')}>
                            {inc.companyNumber}ª {inc.companyName} · {clock(inc.dispatchedAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 space-y-3">
                {selected.link?.status !== 'ACTIVE' ? (
                  <div className={cn('h-full grid place-items-center text-center text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>
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
                          msg.mine
                            ? 'ml-auto keep-on-color bg-cyan-600 text-white'
                            : isDark
                              ? 'bg-white/10 text-slate-100'
                              : 'bg-white border border-slate-200 text-slate-900 shadow-sm',
                        )}
                      >
                        <p className={cn('text-[10px] font-semibold mb-0.5', msg.mine ? 'text-cyan-50' : isDark ? 'text-slate-400' : 'text-slate-500')}>
                          {msg.cuerpoName} · {msg.author} · {ROLE_SHORT[msg.role] ?? msg.role}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        {msg.incident && (
                          <p className={cn('text-[10px] mt-1', msg.mine ? 'text-cyan-50' : isDark ? 'text-slate-400' : 'text-slate-500')}>
                            Ref. {msg.incident.code} · {msg.incident.type}
                          </p>
                        )}
                        <p className={cn('text-[10px] mt-1', msg.mine ? 'text-cyan-100/80' : isDark ? 'text-slate-500' : 'text-slate-400')}>{clock(msg.createdAt)}</p>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {selected.link?.status === 'ACTIVE' && (
                <form onSubmit={onSend} className={cn('shrink-0 border-t p-3 sm:p-4 flex items-end gap-2', isDark ? 'border-white/10 bg-[#07141c]' : 'border-slate-200 bg-white')}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Mensaje a la central del otro cuerpo…"
                    className={cn(
                      'flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none',
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-cyan-500'
                        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500',
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendM.isPending}
                    className="keep-on-color h-10 w-10 shrink-0 rounded-xl bg-cyan-600 text-white grid place-items-center disabled:opacity-40"
                  >
                    {sendM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ cuerpo, isDark }: { cuerpo: CuerpoCard; isDark: boolean }) {
  if (cuerpo.link?.status === 'ACTIVE') {
    return <span className={cn('text-[10px] font-black uppercase tracking-wide', isDark ? 'text-emerald-400' : 'text-emerald-700')}>Enlace</span>;
  }
  if (cuerpo.link?.status === 'PENDING') {
    return (
      <span className={cn('text-[10px] font-black uppercase tracking-wide', isDark ? 'text-amber-300' : 'text-amber-700')}>
        {cuerpo.link.incoming ? 'Entrante' : 'Pendiente'}
      </span>
    );
  }
  return <span className={cn('text-[10px] font-black uppercase tracking-wide', isDark ? 'text-slate-500' : 'text-slate-400')}>Libre</span>;
}

function LinkActions({
  isDark,
  cuerpo,
  note,
  setNote,
  requesting,
  onRequest,
  onAccept,
  onClose,
}: {
  isDark: boolean;
  cuerpo: CuerpoCard;
  note: string;
  setNote: (value: string) => void;
  requesting: boolean;
  onRequest: () => void;
  onAccept: () => void;
  onClose: () => void;
}) {
  if (cuerpo.link?.status === 'ACTIVE') {
    return (
      <button
        type="button"
        onClick={onClose}
        className={cn(
          'rounded-lg border px-3 py-2 text-xs font-semibold',
          isDark ? 'border-white/15 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50',
        )}
      >
        Cerrar enlace
      </button>
    );
  }
  if (cuerpo.link?.status === 'PENDING' && cuerpo.link.incoming) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={onAccept} className="keep-on-color rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
          Aceptar
        </button>
        <button
          type="button"
          onClick={onClose}
          className={cn('rounded-lg border px-3 py-2 text-xs', isDark ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700')}
        >
          Rechazar
        </button>
      </div>
    );
  }
  if (cuerpo.link?.status === 'PENDING') {
    return <p className={cn('text-xs font-semibold', isDark ? 'text-amber-300' : 'text-amber-700')}>Esperando aceptación</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row gap-2 min-w-[220px]">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo (opcional)"
        className={cn(
          'rounded-lg border px-3 py-2 text-xs outline-none',
          isDark
            ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500'
            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
        )}
      />
      <button
        type="button"
        onClick={onRequest}
        disabled={requesting}
        className="keep-on-color inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
      >
        {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <NodoEnlaceMark className="w-3.5 h-3.5" />}
        Pedir enlace
      </button>
    </div>
  );
}
