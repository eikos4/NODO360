import { useEffect, useState } from 'react';
import {
  ExternalLink, Loader2, MapPin,
  Mic, MicOff, Radio, Search, Square, Truck, Volume2, VolumeX, Zap,
} from 'lucide-react';
import { EMERGENCY_MAIN_TYPES } from '../../lib/emergency-codes';
import { BOTONERA_THEMES, type BotoneraTheme } from '../../lib/botonera-themes';
import type { useSimpleDispatch } from '../../hooks/useQuickDispatch';
import DispatchMapPicker from '../map/DispatchMapPicker';
import CuartelOverviewPanel, { type CuartelItem } from './CuartelOverviewPanel';

export type DispatchState = ReturnType<typeof useSimpleDispatch>;

type VariantProps = {
  d: DispatchState;
  theme: BotoneraTheme;
  cuarteles: CuartelItem[];
  showCuarteles: boolean;
  onToggleAvailable: (id: string, available: boolean) => void;
  onTogglePublic: (id: string, enabled: boolean) => void;
  onEnsureSlug: (id: string) => void;
  updatingId: string | null;
  ensuringId: string | null;
};

function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function EmergencyKeys({
  d,
  theme,
  layout,
}: {
  d: DispatchState;
  theme: BotoneraTheme;
  layout: 'grid' | 'horizontal' | 'compact';
}) {
  const gridClass =
    layout === 'horizontal'
      ? 'flex gap-2 overflow-x-auto pb-1 scrollbar-thin'
      : layout === 'compact'
        ? 'grid grid-cols-5 gap-1.5'
        : 'grid grid-cols-2 sm:grid-cols-5 gap-2';

  return (
    <>
      <div className={gridClass}>
        {EMERGENCY_MAIN_TYPES.filter((m) => /^10-[0-9]$/.test(m.id)).map((main) => {
          const childSel = main.subdivisions?.some((s) => s.id === d.selectedType);
          const active = d.selectedType === main.id || childSel;
          const Icon = main.icon;
          return (
            <button
              key={main.id}
              type="button"
              disabled={d.dispatching}
              onClick={() => d.handleEmergencyTypeClick(main)}
              className={`shrink-0 flex flex-col items-center justify-center rounded-xl border-2 font-semibold transition-all ${
                layout === 'horizontal' ? 'min-w-[72px] px-2 py-3' : 'min-h-[64px] p-2'
              } ${layout === 'compact' ? 'text-[9px]' : 'text-[10px] sm:text-xs'} ${
                active
                  ? `${main.color} ${main.text} border-transparent ${theme.keySelected}`
                  : theme.keyIdle
              }`}
            >
              <span className="font-mono font-bold text-sm">{main.code}</span>
              <Icon className={`w-4 h-4 mt-1 ${active ? main.text : 'opacity-50'}`} />
              <span className="text-center leading-tight line-clamp-2 mt-0.5">{main.shortLabel}</span>
            </button>
          );
        })}
      </div>
      {d.activeMainWithSubs?.subdivisions?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.activeMainWithSubs.subdivisions.map((sub) => {
            const on = d.selectedType === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                disabled={d.dispatching}
                onClick={() => d.handleSubdivisionClick(sub, d.activeMainWithSubs!)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  on ? `${theme.accent} text-white border-transparent` : theme.keyIdle
                }`}
              >
                {sub.code} — {sub.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function AddressBlock({ d, theme }: { d: DispatchState; theme: BotoneraTheme }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textMuted}`} />
          <input
            value={d.address}
            onChange={(e) => d.setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && d.searchAddress()}
            placeholder="Dirección de emergencia..."
            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 ${theme.input}`}
          />
        </div>
        <button
          type="button"
          onClick={d.searchAddress}
          disabled={d.geocoding}
          className={`px-3 rounded-xl border ${theme.panelBorder} ${theme.panel}`}
        >
          {d.geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>
      {d.company?.address && (
        <button type="button" onClick={() => d.setAddress(d.company!.address!)} className={`text-xs ${theme.accentText}`}>
          Usar cuartel: {d.company.address}
        </button>
      )}
    </div>
  );
}

function VehicleBlock({ d, theme }: { d: DispatchState; theme: BotoneraTheme }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Carros</span>
        <button type="button" onClick={d.selectAllVehicles} className={`text-[10px] ${theme.accentText}`}>
          Todos
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {d.ciaVehicles.map((v) => {
          const on = d.selectedVehicles.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => d.toggleVehicle(v.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
                on ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : theme.keyIdle
              }`}
            >
              <Truck className="w-3 h-3" />
              {v.patent}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DispatchButton({ d, theme, size = 'normal' }: { d: DispatchState; theme: BotoneraTheme; size?: 'normal' | 'large' }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={!d.canDispatch || d.dispatching}
        onClick={d.handleDispatch}
        className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.98] disabled:cursor-not-allowed ${theme.dispatchBtn} ${theme.dispatchBtnDisabled} disabled:opacity-40 ${
          size === 'large' ? 'py-4 text-lg' : 'py-3 text-base'
        }`}
      >
        {d.dispatching ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Despachando...
          </>
        ) : (
          <>
            <Radio className="w-5 h-5" />
            DESPACHAR
          </>
        )}
      </button>
      {d.dispatching && (
        <button type="button" onClick={d.handleStop} className="px-4 rounded-2xl border-2 border-amber-500/50 text-amber-400">
          <Square className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function CuartelSection({ props }: { props: VariantProps }) {
  if (!props.showCuarteles) return null;
  return (
    <section className={`rounded-xl border p-3 ${props.theme.panel} ${props.theme.panelBorder}`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${props.theme.accentText}`}>
        Cuarteles del cuerpo
      </h3>
      <CuartelOverviewPanel
        cuarteles={props.cuarteles}
        selectedCia={props.d.selectedCia}
        onSelectCia={props.d.setSelectedCia}
        theme={props.theme}
        onToggleAvailable={props.onToggleAvailable}
        onTogglePublic={props.onTogglePublic}
        onEnsureSlug={props.onEnsureSlug}
        updatingId={props.updatingId}
        ensuringId={props.ensuringId}
      />
    </section>
  );
}

function VariantHeader({ d, theme }: { d: DispatchState; theme: BotoneraTheme }) {
  const companies = d.companies as { id: string; number: number; name: string }[];
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.accent} ${d.dispatching ? 'animate-pulse' : ''}`}>
          <Radio className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <select
            value={d.selectedCia}
            onChange={(e) => d.setSelectedCia(e.target.value)}
            className={`w-full max-w-xs text-sm font-bold rounded-lg border px-2 py-1 ${theme.input}`}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}ª — {c.name}
              </option>
            ))}
          </select>
          <p className={`text-[10px] mt-0.5 ${theme.textMuted}`}>{d.user?.firstName} {d.user?.lastName}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <LiveClock className={`text-xs ${theme.textMuted}`} />
        <button type="button" onClick={() => d.setMuted(!d.muted)} className={`p-2 rounded-lg border ${theme.panelBorder}`}>
          {d.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => d.setVoiceEnabled(!d.voiceEnabled)} className={`p-2 rounded-lg border ${theme.panelBorder}`}>
          {d.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        {d.publicUrl && (
          <a href={d.publicUrl} target="_blank" rel="noreferrer" className={`p-2 rounded-lg border ${theme.panelBorder}`}>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

/** 1 — Clásica: grid 2 columnas, mapa + claves */
export function ClassicVariant(props: VariantProps) {
  const { d, theme } = props;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      <VariantHeader d={d} theme={theme} />
      <CuartelSection props={props} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`rounded-xl border p-3 space-y-3 ${theme.panel} ${theme.panelBorder}`}>
          <h3 className={`text-xs font-bold uppercase ${theme.textMuted}`}>Ubicación</h3>
          <AddressBlock d={d} theme={theme} />
          <div className="rounded-xl overflow-hidden border border-inherit min-h-[140px]">
            <DispatchMapPicker center={d.mapCenter} latitude={d.latitude} longitude={d.longitude} pickActive onPick={d.onMapPick} height="160px" theme={theme.mapTheme} showGpsPanel={false} />
          </div>
          <VehicleBlock d={d} theme={theme} />
        </div>
        <div className={`rounded-xl border p-3 space-y-3 ${theme.panel} ${theme.panelBorder}`}>
          <h3 className={`text-xs font-bold uppercase ${theme.textMuted}`}>Claves 10-X</h3>
          <EmergencyKeys d={d} theme={theme} layout="grid" />
          {d.emergType && (
            <p className={`text-sm flex items-center gap-1 ${theme.accentText}`}>
              <Zap className="w-4 h-4" /> {d.emergType.code} — {d.emergType.label}
            </p>
          )}
          <DispatchButton d={d} theme={theme} />
        </div>
      </div>
    </div>
  );
}

/** 2 — Rápida: claves grandes + despacho inmediato */
export function RapidVariant(props: VariantProps) {
  const { d, theme } = props;
  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        <VariantHeader d={d} theme={theme} />
        <EmergencyKeys d={d} theme={theme} layout="grid" />
        <AddressBlock d={d} theme={theme} />
        <VehicleBlock d={d} theme={theme} />
        <DispatchButton d={d} theme={theme} size="large" />
      </main>
      <aside className={`w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l p-3 overflow-y-auto ${theme.panelBorder}`}>
        <h3 className={`text-xs font-bold uppercase mb-2 ${theme.accentText}`}>Cuarteles</h3>
        <CuartelOverviewPanel
          cuarteles={props.cuarteles}
          selectedCia={d.selectedCia}
          onSelectCia={d.setSelectedCia}
          theme={theme}
          compact
          onToggleAvailable={props.onToggleAvailable}
          onTogglePublic={props.onTogglePublic}
          onEnsureSlug={props.onEnsureSlug}
          updatingId={props.updatingId}
          ensuringId={props.ensuringId}
        />
      </aside>
    </div>
  );
}

/** 3 — Comando: cuarteles izquierda fija */
export function CommandVariant(props: VariantProps) {
  const { d, theme } = props;
  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      <aside className={`w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r p-3 overflow-y-auto ${theme.panelBorder} ${theme.panel}`}>
        <VariantHeader d={d} theme={theme} />
        <h3 className={`text-xs font-bold uppercase mt-3 mb-2 ${theme.accentText}`}>Estado cuarteles</h3>
        <CuartelOverviewPanel
          cuarteles={props.cuarteles}
          selectedCia={d.selectedCia}
          onSelectCia={d.setSelectedCia}
          theme={theme}
          compact
          onToggleAvailable={props.onToggleAvailable}
          onTogglePublic={props.onTogglePublic}
          onEnsureSlug={props.onEnsureSlug}
          updatingId={props.updatingId}
          ensuringId={props.ensuringId}
        />
      </aside>
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        <EmergencyKeys d={d} theme={theme} layout="compact" />
        <AddressBlock d={d} theme={theme} />
        <VehicleBlock d={d} theme={theme} />
        <DispatchButton d={d} theme={theme} size="large" />
      </main>
    </div>
  );
}

/** 4 — Nocturna: mapa central, claves horizontales */
export function NightVariant(props: VariantProps) {
  const { d, theme } = props;
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-3">
      <VariantHeader d={d} theme={theme} />
      <EmergencyKeys d={d} theme={theme} layout="horizontal" />
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className={`lg:col-span-2 rounded-xl overflow-hidden border min-h-[200px] ${theme.panelBorder}`}>
          <DispatchMapPicker center={d.mapCenter} latitude={d.latitude} longitude={d.longitude} pickActive onPick={d.onMapPick} height="100%" theme={theme.mapTheme} showGpsPanel />
        </div>
        <div className={`rounded-xl border p-3 space-y-3 flex flex-col ${theme.panel} ${theme.panelBorder}`}>
          <AddressBlock d={d} theme={theme} />
          <VehicleBlock d={d} theme={theme} />
          <div className="mt-auto">
            <DispatchButton d={d} theme={theme} />
          </div>
        </div>
      </div>
      {props.showCuarteles && (
        <div className={`shrink-0 max-h-36 overflow-y-auto rounded-xl border p-2 ${theme.panel} ${theme.panelBorder}`}>
          <CuartelOverviewPanel
          cuarteles={props.cuarteles}
          selectedCia={d.selectedCia}
          onSelectCia={d.setSelectedCia}
          theme={theme}
          compact
          onToggleAvailable={props.onToggleAvailable}
          onTogglePublic={props.onTogglePublic}
          onEnsureSlug={props.onEnsureSlug}
          updatingId={props.updatingId}
          ensuringId={props.ensuringId}
        />
        </div>
      )}
    </div>
  );
}

/** 5 — Institucional: cuarteles arriba en cards, despacho abajo */
export function InstitutionalVariant(props: VariantProps) {
  const { d, theme } = props;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      <div className={`rounded-2xl border p-4 ${theme.panel} ${theme.panelBorder}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className={`text-lg font-bold ${theme.text}`}>Central de Despachos — Cuerpo de Bomberos</h2>
            <p className={`text-xs ${theme.textMuted}`}>Gestión de disponibilidad por cuartel · URLs públicas</p>
          </div>
          <LiveClock className={`text-lg font-bold ${theme.accentText}`} />
        </div>
        <CuartelOverviewPanel
          cuarteles={props.cuarteles}
          selectedCia={d.selectedCia}
          onSelectCia={d.setSelectedCia}
          theme={theme}
          onToggleAvailable={props.onToggleAvailable}
          onTogglePublic={props.onTogglePublic}
          onEnsureSlug={props.onEnsureSlug}
          updatingId={props.updatingId}
          ensuringId={props.ensuringId}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className={`xl:col-span-2 rounded-xl border p-3 ${theme.panel} ${theme.panelBorder}`}>
          <h3 className={`text-xs font-bold uppercase mb-2 ${theme.textMuted}`}>Despacho</h3>
          <EmergencyKeys d={d} theme={theme} layout="grid" />
        </div>
        <div className={`rounded-xl border p-3 space-y-3 ${theme.panel} ${theme.panelBorder}`}>
          <AddressBlock d={d} theme={theme} />
          <VehicleBlock d={d} theme={theme} />
          <DispatchButton d={d} theme={theme} />
        </div>
      </div>
    </div>
  );
}

export function renderBotoneraVariant(props: VariantProps) {
  const layout = props.theme.layout;
  switch (layout) {
    case 'rapid': return <RapidVariant {...props} />;
    case 'command': return <CommandVariant {...props} />;
    case 'night': return <NightVariant {...props} />;
    case 'institutional': return <InstitutionalVariant {...props} />;
    default: return <ClassicVariant {...props} />;
  }
}

export { BOTONERA_THEMES };
