import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { COMPANIAS360, companias360Path, isCompanias360Path } from '../../lib/companias360';

type Props = {
  compact: boolean;
  roles: string[];
  userRole: string;
};

export default function SidebarCompanias360({ compact, roles, userRole }: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(() => isCompanias360Path(location.pathname));
  const [flyout, setFlyout] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const visible = roles.includes('ALL') || roles.includes(userRole);
  if (!visible) return null;

  const active = isCompanias360Path(location.pathname);

  useEffect(() => {
    if (isCompanias360Path(location.pathname)) setOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!flyout) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFlyout(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [flyout]);

  const childLink = (c: (typeof COMPANIAS360)[number]) => {
    const path = companias360Path(c.slug);
    const linkActive = location.pathname === path;
    return (
    <NavLink
      key={c.slug}
      to={path}
      target="_blank"
      rel="noopener noreferrer"
      title={`${c.number}ª — ${c.name}`}
      onClick={() => setFlyout(false)}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg text-xs font-medium transition-colors',
          compact ? 'px-3 py-2' : 'pl-9 pr-3 py-2',
          isActive || linkActive
            ? 'bg-red-600 !text-white border border-red-600 shadow-sm'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80',
        )
      }
    >
      <span className="w-5 h-5 rounded-md bg-red-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
        {c.number}
      </span>
      {!compact && (
        <span className="truncate flex-1">
          {c.short}
          <span className={cn('block text-[10px] font-normal truncate', linkActive ? 'text-white/75' : 'text-slate-600')}>{c.name}</span>
        </span>
      )}
      {!compact && <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />}
    </NavLink>
    );
  };

  const handleParentClick = () => {
    if (compact) {
      setFlyout((v) => !v);
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <div ref={wrapRef} className="relative mb-0.5">
      <button
        type="button"
        onClick={handleParentClick}
        title={compact ? 'Compañías360' : undefined}
        className={cn(
          'w-full flex items-center rounded-lg text-sm font-semibold transition-colors',
          compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
          active
            ? 'bg-red-600 !text-white border border-red-600 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent',
        )}
      >
        <Building2 className="w-4 h-4 shrink-0" />
        {!compact && (
          <>
            <span className="flex-1 text-left">Compañías360</span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', active ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-500')}>6</span>
            {open ? (
              <ChevronDown className={cn('w-3.5 h-3.5', active ? 'text-white/80' : 'text-slate-500')} />
            ) : (
              <ChevronRight className={cn('w-3.5 h-3.5', active ? 'text-white/80' : 'text-slate-500')} />
            )}
          </>
        )}
      </button>

      {!compact && open && (
        <div className="mt-0.5 space-y-0.5 pb-1">
          {COMPANIAS360.map(childLink)}
        </div>
      )}

      {compact && flyout && (
        <div className="absolute left-full top-0 ml-2 w-52 py-2 px-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-[100]">
          <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compañías360</p>
          {COMPANIAS360.map(childLink)}
        </div>
      )}
    </div>
  );
}
