import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, GraduationCap, Flame } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: Step[] = [
  {
    targetId: 'step-claves',
    title: '1. Identificar la Emergencia',
    description:
      'Haz clic en una clave 10-0 a 10-9. Abajo aparecen el detalle y las claves que reciclan ese tono (10-10 por 10-0, 10-12 por 10-4, 10-11 por 10-0).',
  },
  {
    targetId: 'step-ubicacion',
    title: '2. Ingresar Dirección y Ubicación',
    description:
      'Escribe la calle y número de la emergencia, luego presiona Enter o la Lupa para buscar. También puedes hacer clic directo sobre el mapa interactivo para ajustar el marcador GPS.',
  },
  {
    targetId: 'step-companias',
    title: '3. Compañía a Cargo y Apoyo',
    description:
      'Selecciona la Compañía principal (el cuartel primario de respuesta). Si es un incidente de gran magnitud, puedes indicar una Compañía de apoyo en el segundo selector.',
  },
  {
    targetId: 'step-carros',
    title: '4. Asignar Material Mayor (Carros)',
    description:
      'Selecciona los carros de bomberos que saldrán a la emergencia (máximo 2 carros para despacho rápido). El listado muestra únicamente los vehículos que están operativos.',
  },
  {
    targetId: 'step-despachar',
    title: '5. Iniciar Despacho Operativo',
    description:
      '¡Todo listo! Haz clic en "DESPACHAR" para detonar la alarma sonora en los cuarteles y activar el sistema de voz inteligente que transmitirá los detalles de la emergencia.',
  },
];

interface DispatchTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DispatchTutorialOverlay({ isOpen, onClose }: DispatchTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setCoords(null);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const updatePosition = () => {
      const element = document.getElementById(step.targetId);
      if (!element) {
        if (!cancelled) setCoords(null);
        return;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const rect = element.getBoundingClientRect();
        // Coordenadas de viewport (fixed overlay) — sin sumar scrollY
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }, 320);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, currentStep, step.targetId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isElementInLowerHalf = coords ? coords.top > window.innerHeight / 2 : false;

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {coords ? (
        <div
          className="absolute rounded-2xl border-[3px] border-red-500 transition-all duration-300"
          style={{
            top: Math.max(4, coords.top - 8),
            left: Math.max(4, coords.left - 8),
            width: coords.width + 16,
            height: coords.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      <div
        className={`fixed left-1/2 z-[10001] w-[92%] max-w-md -translate-x-1/2 pointer-events-auto transition-all duration-300 ${
          isElementInLowerHalf ? 'top-6' : 'bottom-6'
        }`}
      >
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mt-1 flex gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div className="space-y-1 pr-6">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                {step.description}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800/60">
            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep ? 'w-5 bg-red-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-red-500/10 transition active:scale-[0.98] hover:from-red-500 hover:to-orange-400"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    <span>Entendido</span>
                    <Flame className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
