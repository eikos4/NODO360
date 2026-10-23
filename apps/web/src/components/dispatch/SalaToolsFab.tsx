import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flag, Home, LayoutDashboard, Leaf, Lock, Maximize2, Minimize2, Moon, Radio, SlidersHorizontal, Sun, Truck, X,
} from 'lucide-react';
import type { SalaLook } from '../../lib/dispatch-public-theme';

const VIEWS: { id: SalaLook; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Sala clara', hint: 'Vista diurna', icon: Sun },
  { id: 'nodo', label: 'Sala Nodo', hint: 'Tema NODO360', icon: Radio },
  { id: 'verde', label: 'Sala verde', hint: 'Tema cuartel', icon: Leaf },
  { id: 'night', label: 'Guardia', hint: 'Noche', icon: Moon },
  { id: 'salida', label: 'Salida', hint: 'Alarma en pantalla', icon: Truck },
  { id: 'comando', label: 'Comando', hint: 'Puesto de mando', icon: Flag },
  { id: 'compania', label: 'Mi compañía', hint: 'Aseo, reuniones y anuncios', icon: Home },
];

type Props = {
  look: SalaLook;
  lookLabel: string;
  onSelectLook: (look: SalaLook) => void;
  slug: string;
  onLock: () => void;
  isFullscreen: boolean;
  onFullscreen: () => void;
  showLayoutToggle?: boolean;
  layout?: 'classic' | 'modern';
  onToggleLayout?: () => void;
  chrome: string;
  iconClass: string;
  light?: boolean;
};

export default function SalaToolsFab({
  look,
  lookLabel,
  onSelectLook,
  slug,
  onLock,
  isFullscreen,
  onFullscreen,
  showLayoutToggle,
  layout,
  onToggleLayout,
  chrome,
  iconClass,
  light,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = VIEWS.find((v) => v.id === look)?.icon ?? LayoutDashboard;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
      {open && (
        <div className={`w-64 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${chrome}`}>
          <p className={`px-3 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${light ? 'text-slate-500' : 'opacity-60'}`}>Vistas de sala</p>
          <div className="px-1.5 pb-1.5 space-y-0.5">
            {VIEWS.map(({ id, label, hint, icon: Icon }) => {
              const active = look === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectLook(id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    active
                      ? light ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-white/15 ring-1 ring-white/20'
                      : light ? 'hover:bg-slate-50' : 'hover:bg-white/10'
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${active ? (light ? 'bg-white' : 'bg-white/20') : light ? 'bg-slate-100' : 'bg-black/20'}`}>
                    <Icon className={`h-4 w-4 ${iconClass}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">{label}</span>
                    <span className={`block text-[11px] ${light ? 'text-slate-500' : 'opacity-60'}`}>{hint}</span>
                  </span>
                  {active && <span className={`text-[10px] font-black uppercase tracking-wide ${light ? 'text-slate-500' : 'opacity-70'}`}>Ahora</span>}
                </button>
              );
            })}
          </div>

          <div className={`border-t px-3 pt-2.5 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${light ? 'border-slate-200 text-slate-500' : 'border-white/10 opacity-60'}`}>
            Acciones
          </div>
          <div className="px-1.5 pb-2 space-y-0.5">
            <Link
              to={`/carro/${slug}`}
              onClick={() => setOpen(false)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 ${light ? 'hover:bg-slate-50' : 'hover:bg-white/10'}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full ${light ? 'bg-slate-100' : 'bg-black/20'}`}>
                <Truck className={`h-4 w-4 ${iconClass}`} />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-tight">NodoTrack</span>
                <span className={`block text-[11px] ${light ? 'text-slate-500' : 'opacity-60'}`}>Tablet del carro</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                onLock();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 ${light ? 'hover:bg-slate-50' : 'hover:bg-white/10'}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full ${light ? 'bg-slate-100' : 'bg-black/20'}`}>
                <Lock className={`h-4 w-4 ${iconClass}`} />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-tight">Bloquear</span>
                <span className={`block text-[11px] ${light ? 'text-slate-500' : 'opacity-60'}`}>Pide PIN para entrar</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onFullscreen();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 ${light ? 'hover:bg-slate-50' : 'hover:bg-white/10'}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full ${light ? 'bg-slate-100' : 'bg-black/20'}`}>
                {isFullscreen
                  ? <Minimize2 className={`h-4 w-4 ${iconClass}`} />
                  : <Maximize2 className={`h-4 w-4 ${iconClass}`} />}
              </span>
              <span>
                <span className="block text-sm font-semibold leading-tight">
                  {isFullscreen ? 'Salir de pantalla' : 'Pantalla completa'}
                </span>
                <span className={`block text-[11px] ${light ? 'text-slate-500' : 'opacity-60'}`}>Kiosco de cuartel</span>
              </span>
            </button>
            {showLayoutToggle && onToggleLayout && (
              <button
                type="button"
                onClick={() => {
                  onToggleLayout();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 ${light ? 'hover:bg-slate-50' : 'hover:bg-white/10'}`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full ${light ? 'bg-slate-100' : 'bg-black/20'}`}>
                  <SlidersHorizontal className={`h-4 w-4 ${iconClass}`} />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">
                    {layout === 'modern' ? 'Diseño clásico' : 'Diseño moderno'}
                  </span>
                  <span className={`block text-[11px] ${light ? 'text-slate-500' : 'opacity-60'}`}>Solo en sala clara / Nodo / verde</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${chrome} relative flex items-center gap-2 rounded-full px-3.5 py-3 hover:scale-105 transition-all`}
        title={open ? 'Cerrar menú de sala' : `${lookLabel} · abrir vistas`}
        aria-expanded={open}
        aria-label={open ? 'Cerrar menú de sala' : 'Abrir vistas de sala'}
      >
        {open ? <X className={`h-5 w-5 ${iconClass}`} /> : <CurrentIcon className={`h-5 w-5 ${iconClass}`} />}
        <span className="pr-0.5 text-xs font-black uppercase tracking-wide">{open ? 'Cerrar' : lookLabel.replace('Tema ', '')}</span>
      </button>
    </div>
  );
}
