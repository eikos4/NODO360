import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check, Link2, Loader2, Radio, Search, Send, Siren, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

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
    <div className="h-full min-h-0 bg-slate-950 text-slate-100 flex flex-col">
      <header className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Nodo360 · módulo especial</p>
            <h1 className="text-xl font-bold text-white">NodoEnlace</h1>
            <p className="text-sm text-slate-400">
              Conectá cuerpos en emergencia, mirá si están en alarma y coordiná por chat de central.
            </p>
          </div>
          {network?.me ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Tu cuerpo</p>
              <p className="text-sm font-semibold text-white">{network.me.name}</p>
              <p className="text-xs text-slate-400">
                {network.me.city} · {network.me.activeCount} emergencia{network.me.activeCount === 1 ? '' : 's'} activa{network.me.activeCount === 1 ? '' : 's'}
              </p>
            </div>
          ) : network ? (
            <label className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 block">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Actuar como cuerpo</p>
              <select
                value={asCuerpoId}
                onChange={(e) => setAsCuerpoId(e.target.value)}
                className="bg-transparent text-sm text-white outline-none"
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
        </div>
      </header>

      {network?.pendingIn?.length ? (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">Solicitudes entrantes</p>
          <div className="flex flex-wrap gap-2">
            {network.pendingIn.map((link) => (
              <div key={link.id} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-slate-950/40 px-3 py-2">
                <p className="text-sm text-white">{link.other.name}</p>
                {link.note && <span className="text-xs text-slate-400 hidden sm:inline">{link.note}</span>}
                <button
                  type="button"
                  onClick={() => acceptM.mutate(link.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  <Check className="w-3 h-3" /> Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => closeM.mutate(link.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                >
                  <X className="w-3 h-3" /> Rechazar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-800 min-h-0 flex flex-col">
          <div className="p-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cuerpo, ciudad o región"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {networkQ.isLoading && (
              <p className="flex items-center gap-2 text-sm text-slate-500 px-2 py-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando red de cuerpos…
              </p>
            )}
            {!networkQ.isLoading && filtered.length === 0 && (
              <p className="text-sm text-slate-500 px-2 py-6">
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
                      ? 'border-red-500/50 bg-red-600/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{cuerpo.name}</p>
                      <p className="text-xs text-slate-400">{cuerpo.city} · {cuerpo.region}</p>
                    </div>
                    <StatusPill cuerpo={cuerpo} />
                  </div>
                  {cuerpo.activeCount > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
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
              <div className="max-w-md space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 grid place-items-center">
                  <Radio className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Red de cuerpos Nodo360</h2>
                <p className="text-sm text-slate-400">
                  Elegí un cuerpo de la lista. Si hay alarma, se ve al toque. Pedí enlace y, al aceptar, queda el chat de coordinación.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                    <p className="text-sm text-slate-400">{selected.city} · {selected.region} · {selected.companyCount} cuartel{selected.companyCount === 1 ? '' : 'es'}</p>
                    {selected.link?.note && <p className="text-xs text-slate-500 mt-1">{selected.link.note}</p>}
                  </div>
                  <LinkActions
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
                <div className="shrink-0 border-b border-slate-800 px-4 py-3 sm:px-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Emergencias activas de {selected.name}</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {(emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).length === 0 ? (
                      <p className="text-xs text-slate-500">Sin emergencias abiertas.</p>
                    ) : (
                      (emergenciesQ.data?.activeEmergencies ?? selected.activeEmergencies).map((inc) => (
                        <div key={inc.id} className="min-w-[220px] rounded-xl border border-red-500/25 bg-red-600/10 px-3 py-2">
                          <p className="text-xs font-bold text-red-300">{inc.code}</p>
                          <p className="text-sm text-white truncate">{inc.type}</p>
                          <p className="text-[11px] text-slate-400 truncate">{inc.address}</p>
                          <p className="text-[11px] text-slate-500">{inc.companyNumber}ª {inc.companyName} · {clock(inc.dispatchedAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 space-y-3">
                {selected.link?.status !== 'ACTIVE' ? (
                  <div className="h-full grid place-items-center text-center text-sm text-slate-500">
                    {selected.link?.status === 'PENDING'
                      ? selected.link.incoming
                        ? 'Aceptá el enlace para abrir el chat.'
                        : 'Esperando que el otro cuerpo acepte.'
                      : 'Pedí enlace para coordinar por chat.'}
                  </div>
                ) : (
                  <>
                    {(messagesQ.data ?? []).map((msg) => (
                      <div key={msg.id} className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5', msg.mine ? 'ml-auto bg-red-600 text-white' : 'bg-slate-800 text-slate-100')}>
                        <p className={cn('text-[10px] font-semibold mb-0.5', msg.mine ? 'text-red-100' : 'text-slate-400')}>
                          {msg.cuerpoName} · {msg.author} · {ROLE_SHORT[msg.role] ?? msg.role}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        {msg.incident && (
                          <p className={cn('text-[10px] mt-1', msg.mine ? 'text-red-100' : 'text-slate-400')}>
                            Ref. {msg.incident.code} · {msg.incident.type}
                          </p>
                        )}
                        <p className={cn('text-[10px] mt-1', msg.mine ? 'text-red-100/80' : 'text-slate-500')}>{clock(msg.createdAt)}</p>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {selected.link?.status === 'ACTIVE' && (
                <form onSubmit={onSend} className="shrink-0 border-t border-slate-800 p-3 sm:p-4 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Mensaje a la central del otro cuerpo…"
                    className="flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendM.isPending}
                    className="h-10 w-10 shrink-0 rounded-xl bg-red-600 text-white grid place-items-center disabled:opacity-40"
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

function StatusPill({ cuerpo }: { cuerpo: CuerpoCard }) {
  if (cuerpo.link?.status === 'ACTIVE') {
    return <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Enlace</span>;
  }
  if (cuerpo.link?.status === 'PENDING') {
    return <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">{cuerpo.link.incoming ? 'Entrante' : 'Pendiente'}</span>;
  }
  return <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Libre</span>;
}

function LinkActions({
  cuerpo,
  note,
  setNote,
  requesting,
  onRequest,
  onAccept,
  onClose,
}: {
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
      <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
        Cerrar enlace
      </button>
    );
  }
  if (cuerpo.link?.status === 'PENDING' && cuerpo.link.incoming) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={onAccept} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Aceptar</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Rechazar</button>
      </div>
    );
  }
  if (cuerpo.link?.status === 'PENDING') {
    return <p className="text-xs text-amber-300">Esperando aceptación</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row gap-2 min-w-[220px]">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo (opcional)"
        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
      />
      <button
        type="button"
        onClick={onRequest}
        disabled={requesting}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
      >
        {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
        Pedir enlace
      </button>
    </div>
  );
}
