import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { COMPANIAS360, companias360Path, isCompanias360Path } from '../../lib/companias360';

export default function CentralCompanias360Menu() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isCompanias360Path(location.pathname);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors',
          active || open
            ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
            : 'text-slate-400 hover:text-white hover:bg-slate-800',
        )}
      >
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Compañías360</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 py-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[200]">
          <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 mb-1">
            Salas — disponibilidad
          </p>
          {COMPANIAS360.map((c) => {
            const path = companias360Path(c.slug);
            const isActive = location.pathname === path;
            return (
              <Link
                key={c.slug}
                to={path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'bg-red-600 !text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:!text-white',
                )}
              >
                <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {c.number}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold block truncate">{c.short}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{c.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
