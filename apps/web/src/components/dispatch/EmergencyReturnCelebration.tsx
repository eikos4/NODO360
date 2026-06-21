import { useEffect, useMemo } from 'react';
import { CheckCircle2, Flame, HardHat, Shield, Sparkles, X } from 'lucide-react';

const MESSAGES = [
  { title: '¡Buen trabajo, equipo!', subtitle: 'Dotación de regreso al cuartel. Descansen y hidrátense.' },
  { title: '¡Misión cumplida!', subtitle: 'Gracias por servir a Parral con honor y entrega.' },
  { title: '¡Excelente labor, bomberos!', subtitle: 'La comunidad cuenta con ustedes. Vuelta en paz al cuartel.' },
  { title: '¡Orgullo de cuerpo!', subtitle: 'Trabajo en equipo impecable. Nos vemos en la próxima guardia.' },
  { title: '¡Bien hecho, dotación!', subtitle: 'Emergencia finalizada. Buen regreso y cuídense.' },
  { title: '¡Gracias por el servicio!', subtitle: 'Volvieron sanos — eso es lo más importante.' },
] as const;

function AnimatedFirefighter({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="return-ff-enter flex flex-col items-center"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="relative return-ff-salute">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-red-500 to-red-700 border-4 border-amber-400 shadow-xl shadow-red-900/50 flex items-center justify-center">
          <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-amber-200 return-ff-flame" strokeWidth={2} />
        </div>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 return-ff-helmet">
          <HardHat className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300 drop-shadow-lg" strokeWidth={2.25} />
        </div>
        <Shield className="absolute -bottom-1 -right-1 w-5 h-5 text-emerald-400 return-ff-badge" />
      </div>
      <div className="mt-2 w-10 h-3 rounded-full bg-slate-700/80" aria-hidden />
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  companyName?: string;
};

export default function EmergencyReturnCelebration({ open, onClose, companyName }: Props) {
  const message = useMemo(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    [open],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 6500);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 return-celebration-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-celebration-title"
    >
      <div className="absolute inset-0 bg-[#0a1628]/85 backdrop-blur-md return-celebration-fade-in" onClick={onClose} />

      {/* Partículas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-amber-400/60 return-sparkle"
            style={{
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 80}%`,
              width: 12 + (i % 3) * 4,
              height: 12 + (i % 3) * 4,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md return-celebration-pop">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white flex items-center justify-center"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#1a2f4a] to-[#0f172a] shadow-2xl shadow-emerald-900/30 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 return-shimmer-bar" />

          <div className="px-6 pt-8 pb-6 text-center">
            <div className="flex items-end justify-center gap-3 sm:gap-5 mb-6 min-h-[100px]">
              <AnimatedFirefighter delayMs={0} />
              <AnimatedFirefighter delayMs={180} />
              <AnimatedFirefighter delayMs={360} />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <CheckCircle2 className="w-4 h-4" />
              Regreso al cuartel
            </div>

            <h2 id="return-celebration-title" className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
              {message.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-sm mx-auto">
              {message.subtitle}
            </p>
            {companyName ? (
              <p className="text-xs text-emerald-400/90 mt-3 font-semibold">{companyName}</p>
            ) : null}
          </div>

          <div className="px-6 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes returnBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes returnPopIn {
          0% { opacity: 0; transform: scale(0.85) translateY(24px); }
          70% { transform: scale(1.02) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes returnFfEnter {
          0% { opacity: 0; transform: translateY(40px) scale(0.6); }
          60% { opacity: 1; transform: translateY(-8px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes returnFfSalute {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-6deg) scale(1.05); }
          70% { transform: rotate(4deg); }
        }
        @keyframes returnFfFlame {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
        @keyframes returnFfHelmet {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        @keyframes returnSparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        @keyframes returnShimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .return-celebration-fade-in { animation: returnBackdropIn 0.35s ease-out forwards; }
        .return-celebration-pop { animation: returnPopIn 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
        .return-ff-enter { animation: returnFfEnter 0.7s cubic-bezier(0.34, 1.3, 0.64, 1) both; }
        .return-ff-salute { animation: returnFfSalute 1.2s ease-in-out 0.5s 2; }
        .return-ff-flame { animation: returnFfFlame 1s ease-in-out infinite; }
        .return-ff-helmet { animation: returnFfHelmet 2s ease-in-out infinite; }
        .return-ff-badge { animation: returnFfFlame 1.4s ease-in-out infinite reverse; }
        .return-sparkle { animation: returnSparkle 2s ease-in-out infinite; }
        .return-shimmer-bar {
          background-size: 200% auto;
          animation: returnShimmer 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
