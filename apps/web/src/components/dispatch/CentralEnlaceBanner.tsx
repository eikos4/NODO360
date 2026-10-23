import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Link2, Radio, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

type LinkCard = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  note: string | null;
  incoming: boolean;
  requestedBy: string;
  incident: { id: string; code: string; type: string } | null;
  other: { id: string; name: string; city: string };
};

type Network = {
  pendingIn: LinkCard[];
  pendingOut: LinkCard[];
  cuerpos: { id: string; link: LinkCard | null }[];
};

export function useNodoEnlaceInbox() {
  const query = useQuery({
    queryKey: ['nodo-enlace-network'],
    queryFn: async () => (await api.get<Network>('/nodo-enlace/network')).data,
    refetchInterval: 8_000,
    retry: 1,
  });
  const pendingIn = query.data?.pendingIn ?? [];
  const pendingOut = query.data?.pendingOut ?? [];
  const activeCount = (query.data?.cuerpos ?? []).filter((c) => c.link?.status === 'ACTIVE').length;
  return { ...query, pendingIn, pendingOut, activeCount };
}

export function EnlaceHeaderButton({
  pendingCount,
  activeCount,
  sceneBg,
  isDark,
  className,
}: {
  pendingCount: number;
  activeCount?: number;
  sceneBg?: boolean;
  isDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/nodo-enlace"
      title="Enlace entre cuerpos"
      className={cn(
        'relative keep-on-color flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wide',
        pendingCount > 0
          ? 'border-amber-400 bg-amber-500 text-amber-950'
          : sceneBg
            ? 'border-white/30 bg-white/10 text-white'
            : isDark
              ? 'border-sky-500/40 text-sky-200 bg-sky-500/10'
              : 'border-sky-600 text-sky-800 bg-sky-50',
        className,
      )}
    >
      <Link2 className="w-3.5 h-3.5" />
      Enlace
      {pendingCount > 0 ? (
        <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
          {pendingCount}
        </span>
      ) : activeCount ? (
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      ) : null}
    </Link>
  );
}

export function EnlacePendingBanner({ sceneBg, isDark }: { sceneBg?: boolean; isDark?: boolean }) {
  const qc = useQueryClient();
  const { pendingIn, pendingOut } = useNodoEnlaceInbox();

  const acceptM = useMutation({
    mutationFn: async (id: string) => (await api.post(`/nodo-enlace/links/${id}/accept`)).data,
    onSuccess: () => {
      toast.success('Enlace aceptado');
      void qc.invalidateQueries({ queryKey: ['nodo-enlace-network'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo aceptar'),
  });

  const closeM = useMutation({
    mutationFn: async (id: string) => (await api.post(`/nodo-enlace/links/${id}/close`)).data,
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      void qc.invalidateQueries({ queryKey: ['nodo-enlace-network'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo rechazar'),
  });

  if (pendingIn.length === 0 && pendingOut.length === 0) return null;

  return (
    <div
      className={cn(
        'relative z-10 shrink-0 border-b px-3 sm:px-5 py-2.5',
        pendingIn.length
          ? sceneBg
            ? 'border-amber-400/30 bg-amber-500/25'
            : 'border-amber-400/40 bg-amber-500/15'
          : sceneBg
            ? 'border-white/15 bg-black/25'
            : 'border-sky-500/20 bg-sky-500/10',
      )}
    >
      {pendingIn.map((link) => (
        <div key={link.id} className="flex flex-wrap items-center gap-2 py-0.5">
          <Radio className="w-4 h-4 text-amber-300 shrink-0" />
          <p className={cn('text-sm font-semibold min-w-0 flex-1', sceneBg || isDark ? 'keep-on-color text-white' : 'text-amber-950')}>
            {link.other.name} pide enlace
            {link.incident ? ` · ${link.incident.code}` : ''}
            {link.note ? ` · ${link.note}` : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={acceptM.isPending}
              onClick={() => acceptM.mutate(link.id)}
              className="keep-on-color inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black uppercase text-white"
            >
              <Check className="w-3.5 h-3.5" />
              Aceptar
            </button>
            <button
              type="button"
              disabled={closeM.isPending}
              onClick={() => closeM.mutate(link.id)}
              className="keep-on-color inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
              Rechazar
            </button>
            <Link
              to="/nodo-enlace"
              className={cn(
                'keep-on-color text-[11px] font-bold uppercase',
                sceneBg || isDark ? 'text-white' : 'text-amber-900',
              )}
            >
              Abrir
            </Link>
          </div>
        </div>
      ))}
      {pendingIn.length === 0 && pendingOut.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link2 className="w-4 h-4 text-sky-300 shrink-0" />
          <p className={cn('text-sm min-w-0 flex-1', sceneBg || isDark ? 'keep-on-color text-white' : 'text-sky-900')}>
            Esperando que {pendingOut.map((l) => l.other.name).join(', ')} acepte el enlace.
          </p>
          <Link to="/nodo-enlace" className={cn('keep-on-color text-[11px] font-bold uppercase', sceneBg || isDark ? 'text-sky-200' : 'text-sky-800')}>
            Ver
          </Link>
        </div>
      )}
    </div>
  );
}
