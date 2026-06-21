import { ExternalLink, Globe, Loader2, MapPin, Truck, UserCog, Users } from 'lucide-react';
import type { BotoneraTheme } from '../../lib/botonera-themes';

export type CuartelItem = {
  id: string;
  number: number;
  name: string;
  city: string;
  address: string;
  logoUrl?: string | null;
  dispatchSlug: string | null;
  dispatchPublicEnabled: boolean;
  dispatchAvailable: boolean;
  status: 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';
  roster: { total: number; available: number; unavailable: number };
  maquinistas: { total: number; available: number; unavailable: number };
  fleet: { total: number; operativo: number };
  activeEmergencies: number;
};

const STATUS_STYLES = {
  DISPONIBLE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  NO_DISPONIBLE: 'bg-red-500/20 text-red-400 border-red-500/40',
  OCULTA: 'bg-slate-500/20 text-slate-400 border-slate-600/40',
} as const;

const STATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  NO_DISPONIBLE: 'No disponible',
  OCULTA: 'Oculta',
} as const;

type Props = {
  cuarteles: CuartelItem[];
  selectedCia: string;
  onSelectCia: (id: string) => void;
  theme: BotoneraTheme;
  compact?: boolean;
  onToggleAvailable: (id: string, available: boolean) => void;
  onTogglePublic: (id: string, enabled: boolean) => void;
  onEnsureSlug: (id: string) => void;
  ensuringId?: string | null;
  updatingId?: string | null;
};

export default function CuartelOverviewPanel({
  cuarteles,
  selectedCia,
  onSelectCia,
  theme,
  compact,
  onToggleAvailable,
  onTogglePublic,
  onEnsureSlug,
  ensuringId,
  updatingId,
}: Props) {
  if (!cuarteles.length) {
    return <p className={`text-sm ${theme.textMuted} text-center py-6`}>Sin cuarteles registrados</p>;
  }

  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
      {cuarteles.map((c) => {
        const selected = c.id === selectedCia;
        const publicUrl = c.dispatchSlug ? `${window.location.origin}/central/${c.dispatchSlug}` : null;
        const busy = ensuringId === c.id || updatingId === c.id;

        return (
          <div
            key={c.id}
            className={`rounded-xl border p-3 transition-all ${
              selected
                ? `${theme.accentMuted} ring-1 ring-inset`
                : `${theme.panel} ${theme.panelBorder} hover:border-opacity-60`
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectCia(c.id)}
              className="w-full text-left"
            >
              <div className="flex items-start gap-2.5">
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold ${theme.accentMuted}`}>
                    {c.number}ª
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-sm ${theme.text}`}>{c.number}ª Compañía</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    {c.activeEmergencies > 0 && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">
                        {c.activeEmergencies} activa{c.activeEmergencies > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${theme.textMuted} truncate`}>{c.city}</p>
                </div>
              </div>
            </button>

            <div className={`mt-2 flex flex-wrap gap-3 text-[10px] ${theme.textMuted}`}>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-500" />
                {c.roster.available}/{c.roster.total} disp.
              </span>
              <span className={`flex items-center gap-1 ${c.maquinistas.available === 0 ? 'text-amber-400 font-semibold' : ''}`}>
                <UserCog className={`w-3 h-3 ${c.maquinistas.available === 0 ? 'text-amber-400' : 'text-sky-400'}`} />
                {c.maquinistas.available}/{c.maquinistas.total} maq.
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-sky-400" />
                {c.fleet.operativo}/{c.fleet.total} carros
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {c.city}
              </span>
            </div>

            {!compact && (
              <p className={`text-[10px] ${theme.textMuted} mt-1 line-clamp-1`}>{c.address}</p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {c.dispatchPublicEnabled ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onToggleAvailable(c.id, !c.dispatchAvailable)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition ${
                      c.dispatchAvailable
                        ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin inline" /> : c.dispatchAvailable ? 'Marcar no disp.' : 'Marcar disponible'}
                  </button>
                  {publicUrl && (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${theme.panelBorder} ${theme.textMuted} hover:text-white flex items-center gap-1 transition-colors`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Pública
                    </a>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onTogglePublic(c.id, true)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${theme.panelBorder} ${theme.accentText}`}
                  >
                    <Globe className="w-3 h-3 inline mr-1" />
                    Activar pública
                  </button>
                  {!c.dispatchSlug && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEnsureSlug(c.id)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${theme.panelBorder} ${theme.textMuted}`}
                    >
                      Generar URL
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
