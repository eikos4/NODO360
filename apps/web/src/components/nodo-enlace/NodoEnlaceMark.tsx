import type { SVGProps } from 'react';
import { cn } from '../../lib/utils';

/** Marca propia de NodoEnlace: dos nodos (cuerpos) unidos por un haz. */
export function NodoEnlaceMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="6.5" cy="12" r="3.25" />
      <circle cx="17.5" cy="12" r="3.25" />
      <path d="M9.75 12h4.5" />
      <circle cx="6.5" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function NodoEnlaceBrand({
  isDark,
  compact,
}: {
  isDark: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={cn(
          'enlace-mark-pulse relative shrink-0 grid place-items-center rounded-2xl',
          compact ? 'h-9 w-9' : 'h-11 w-11',
          isDark
            ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30'
            : 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
        )}
      >
        <NodoEnlaceMark className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
          Nodo360
        </p>
        <h1 className={cn('font-black leading-none tracking-tight', compact ? 'text-lg' : 'text-xl', isDark ? 'text-white' : 'text-slate-900')}>
          Nodo<span className={isDark ? 'text-cyan-300' : 'text-cyan-700'}>Enlace</span>
        </h1>
      </div>
    </div>
  );
}
