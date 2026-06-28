import { Siren, MapPin, Radio, Volume2, CheckCircle2, Truck } from 'lucide-react';
import type { PublicEmergency } from './DispatchEmergenciesPanel';

type Props = {
  emergency: PublicEmergency;
  onFinalize: () => void;
  onReplayAudio?: () => void;
};

export default function PublicEmergencyBanner({ emergency, onFinalize, onReplayAudio }: Props) {
  const vehicles = emergency.vehicles ?? [];

  return (
    <div className="relative overflow-hidden border-b-4 border-red-500 bg-gradient-to-r from-red-950 via-red-900/95 to-red-950 shadow-[0_0_60px_rgba(239,68,68,0.35)] animate-pulse-slow">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_12px,rgba(239,68,68,0.08)_12px,rgba(239,68,68,0.08)_24px)]" />
      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50 animate-pulse">
              <Siren className="w-8 h-8 !text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] !text-red-200 mb-1">
                ● Bomberos en emergencia
              </p>
              <h2 className="text-xl sm:text-2xl font-black !text-white leading-tight">
                {emergency.code && !emergency.type.startsWith(emergency.code)
                  ? `${emergency.code} — ${emergency.type}`
                  : emergency.type}
              </h2>
              <p className="text-sm !text-red-100/90 flex items-start gap-1.5 mt-1.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{emergency.address}</span>
              </p>
              {vehicles.length > 0 && (
                <p className="text-xs !text-red-200/80 flex flex-wrap items-center gap-2 mt-2">
                  <Truck className="w-3.5 h-3.5" />
                  {vehicles.map((v) => (
                    <span key={v.patent} className="font-mono font-bold bg-red-600/30 border border-red-400/30 px-2 py-0.5 rounded">
                      {v.patent}
                    </span>
                  ))}
                </p>
              )}
              {emergency.radioMessage && (
                <p className="mt-3 text-sm sm:text-base font-mono font-bold !text-white bg-black/25 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-start gap-2">
                  <Radio className="w-4 h-4 shrink-0 mt-1 !text-white/90" />
                  <span className="!text-white">&quot;{emergency.radioMessage}&quot;</span>
                </p>
              )}
              <p className="text-[10px] !text-red-300/70 mt-2">
                Alarma por: {emergency.alarmBy}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            {onReplayAudio && (
              <button
                type="button"
                onClick={onReplayAudio}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-400/40 bg-red-950/60 !text-red-100 text-sm font-semibold hover:bg-red-900/60 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                Repetir aviso
              </button>
            )}
            <button
              type="button"
              onClick={onFinalize}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 !text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar emergencia
            </button>
            <p className="text-[10px] text-center !text-red-200/60 max-w-[220px]">
              Confirmar regreso de dotación al cuartel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
