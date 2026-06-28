import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, GraduationCap, Flame, Play } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: Step[] = [
  {
    targetId: 'step-claves',
    title: '1. Identificar la Emergencia',
    description: 'Haz clic en una clave de emergencia principal (ej: 10-0 para Fuego o 10-3 para Rescate). Si tiene subdivisiones (indicadas con un círculo amarillo), se desplegarán abajo para mayor precisión.',
  },
  {
    targetId: 'step-ubicacion',
    title: '2. Ingresar Dirección y Ubicación',
    description: 'Escribe la calle y número de la emergencia, luego presiona Enter o la Lupa para buscar. También puedes hacer clic directo sobre el mapa interactivo para ajustar el marcador GPS.',
  },
  {
    targetId: 'step-companias',
    title: '3. Compañía a Cargo y Apoyo',
    description: 'Selecciona la Compañía principal (el cuartel primario de respuesta). Si es un incidente de gran magnitud, puedes indicar una Compañía de apoyo en el segundo selector.',
  },
  {
    targetId: 'step-carros',
    title: '4. Asignar Material Mayor (Carros)',
    description: 'Selecciona los carros de bomberos que saldrán a la emergencia (máximo 2 carros para despacho rápido). El listado muestra únicamente los vehículos que están operativos.',
  },
  {
    targetId: 'step-despachar',
    title: '5. Iniciar Despacho Operativo',
    description: '¡Todo listo! Haz clic en "DESPACHAR" para detonar la alarma sonora en los cuarteles y activar el sistema de voz inteligente que transmitirá los detalles de la emergencia.',
  },
];

interface DispatchTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DispatchTutorialOverlay({ isOpen, onClose }: DispatchTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scrolling to finish slightly before reading coordinates
        const timer = setTimeout(() => {
          const rect = element.getBoundingClientRect();
          setCoords({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        }, 350);

        return () => clearTimeout(timer);
      } else {
        setCoords(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
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

  // Determine card placement (top vs bottom of screen) depending on element height
  // to avoid covering the targeted element
  const isElementInLowerHalf = coords ? (coords.top - window.scrollY) > window.innerHeight / 2 : false;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Darkened backdrop with exclusion zone (spotlight) */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto transition-all duration-300" />

      {/* Dynamic spotlight border and shadow cutout */}
      {coords && (
        <div
          className="absolute border-[3px] border-red-500 dark:border-red-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] animate-pulse pointer-events-none transition-all duration-300 z-10"
          style={{
            top: coords.top - 8,
            left: coords.left - 8,
            width: coords.width + 16,
            height: coords.height + 16,
          }}
        />
      )}

      {/* Floating Instructions Card */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 w-[92%] max-w-md pointer-events-auto z-20 transition-all duration-500 ${
          isElementInLowerHalf ? 'top-6' : 'bottom-6'
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Header Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar tutorial"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 mt-1">
            <div className="w-10 h-10 shrink-0 bg-red-500/10 dark:bg-red-500/15 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            
            <div className="space-y-1 pr-6">
              <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-wide uppercase">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                {step.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-150 dark:border-slate-800/60">
            {/* Progress dot indicators */}
            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-5 bg-red-500'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-450 text-white font-black text-[10px] tracking-wider uppercase rounded-xl shadow-md shadow-red-500/10 active:scale-[0.98] transition"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    <span>Entendido</span>
                    <Flame className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
