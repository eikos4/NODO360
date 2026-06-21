import { Mic, MicOff } from 'lucide-react';

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
  isDark?: boolean;
};

export default function DispatchVoiceConfigToggle({ enabled, onChange, compact = false, isDark = true }: Props) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
          enabled
            ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-600'
            : isDark
              ? 'bg-slate-800 border-slate-700 text-slate-400'
              : 'bg-white border-slate-300 text-slate-600 shadow-sm'
        }`}
      >
        {enabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        {enabled ? 'Activada' : 'Desactivada'}
      </button>
    );
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${
      isDark ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Voz asistente de despacho</p>
          <p className={`text-[10px] mt-0.5 leading-snug ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
            {enabled
              ? 'La central leerá el mensaje al despachar.'
              : 'Desactivada — habla la centralista en vivo.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-600 hover:bg-emerald-600/25'
              : isDark
                ? 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm'
          }`}
        >
          {enabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          {enabled ? 'Activada' : 'Desactivada'}
        </button>
      </div>
    </div>
  );
}
