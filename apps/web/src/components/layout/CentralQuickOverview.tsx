import { Link } from 'react-router-dom';
import { Truck, Users, Siren, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../store/themeStore';
import { useCuartelesOverview } from '../../hooks/useCuartelesOverview';
import type { CuartelItem } from '../botonera/CuartelOverviewPanel';

type Props = {
  compact?: boolean;
  className?: string;
};

function statusDot(status: CuartelItem['status'], emergencies: number) {
  if (emergencies > 0) return 'bg-red-500 animate-pulse';
  if (status === 'DISPONIBLE') return 'bg-emerald-500';
  if (status === 'NO_DISPONIBLE') return 'bg-amber-500';
  return 'bg-slate-400';
}

function CuartelChip({ c, isDark, compact, fill }: { c: CuartelItem; isDark: boolean; compact?: boolean; fill?: boolean }) {
  const href = c.dispatchSlug ? `/central/${c.dispatchSlug}` : undefined;
  const inner = (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition-colors',
        fill ? 'flex-1 min-w-[68px] basis-0' : 'shrink-0',
        isDark
          ? 'bg-slate-900/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm shadow-sm',
        compact && 'px-1.5 py-1 gap-1',
      )}
      title={`${c.number}ª ${c.name} · ${c.roster.available} disp. · ${c.fleet.operativo} carros · ${c.activeEmergencies} activas`}
    >
      <span className="relative shrink-0">
        {c.logoUrl ? (
          <img
            src={c.logoUrl}
            alt=""
            className={cn('rounded-lg object-cover', compact ? 'w-7 h-7' : 'w-8 h-8')}
          />
        ) : (
          <span
            className={cn(
              'rounded-lg bg-red-600 !text-white font-black flex items-center justify-center',
              compact ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs',
            )}
          >
            {c.number}
          </span>
        )}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2',
            isDark ? 'border-slate-900' : 'border-white',
            statusDot(c.status, c.activeEmergencies),
          )}
        />
      </span>

      <div className="min-w-0">
        <p
          className={cn(
            'font-bold leading-none truncate',
            compact ? 'text-[10px]' : 'text-[11px]',
            isDark ? 'text-slate-200' : 'text-slate-800',
          )}
        >
          {c.number}ª
          {!compact && <span className="font-medium text-slate-500 ml-1 hidden lg:inline">{c.city}</span>}
        </p>
        <div className={cn('flex items-center gap-2 mt-0.5', compact ? 'gap-1.5' : 'gap-2')}>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              compact ? 'text-[9px]' : 'text-[10px]',
              c.roster.available > 0
                ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                : isDark ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            <Users className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {c.roster.available}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              compact ? 'text-[9px]' : 'text-[10px]',
              c.fleet.operativo > 0
                ? isDark ? 'text-sky-400' : 'text-sky-700'
                : isDark ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            <Truck className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {c.fleet.operativo}
          </span>
          {c.activeEmergencies > 0 && (
            <span className={cn('inline-flex items-center gap-0.5 font-bold text-red-500', compact ? 'text-[9px]' : 'text-[10px]')}>
              <Siren className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              {c.activeEmergencies}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} target="_blank" rel="noopener noreferrer" className={cn(fill && 'flex-1 min-w-[68px] basis-0')}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function CentralQuickOverview({ compact, className }: Props) {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const { data: cuarteles = [], isLoading, isFetching } = useCuartelesOverview();

  if (!cuarteles.length && !isLoading) return null;

  const totals = cuarteles.reduce(
    (acc, c) => ({
      personnel: acc.personnel + c.roster.available,
      vehicles: acc.vehicles + c.fleet.operativo,
      emergencies: acc.emergencies + c.activeEmergencies,
    }),
    { personnel: 0, vehicles: 0, emergencies: 0 },
  );

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <div className="flex items-center gap-2 min-w-0 w-full">
        {!compact && (
          <div className={cn('hidden lg:block shrink-0 pr-2 border-r', isDark ? 'border-slate-700' : 'border-slate-200')}>
            <p className={cn('text-[9px] font-bold uppercase tracking-wider leading-none', isDark ? 'text-slate-500' : 'text-slate-500')}>
              Central
            </p>
            <p className={cn('text-[10px] font-semibold mt-0.5 whitespace-nowrap', isDark ? 'text-slate-300' : 'text-slate-700')}>
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{totals.personnel}</span>
              {' '}disp. ·{' '}
              <span className={isDark ? 'text-sky-400' : 'text-sky-700'}>{totals.vehicles}</span>
              {' '}carros
              {totals.emergencies > 0 && (
                <span className="text-red-500 ml-1">· {totals.emergencies} activa{totals.emergencies !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        )}

        <div
          className={cn(
            'flex items-center min-w-0 py-0.5',
            compact ? 'gap-1.5 overflow-x-auto scrollbar-thin' : 'gap-1 flex-1 w-full',
          )}
        >
          {isLoading ? (
            <span className={cn('flex items-center gap-1.5 text-xs px-2', isDark ? 'text-slate-500' : 'text-slate-500')}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cuarteles…
            </span>
          ) : (
            cuarteles.map((c) => (
              <CuartelChip key={c.id} c={c} isDark={isDark} compact={compact} fill={!compact} />
            ))
          )}
          {isFetching && !isLoading && (
            <Loader2 className={cn('w-3 h-3 animate-spin shrink-0', isDark ? 'text-slate-600' : 'text-slate-400')} />
          )}
        </div>
      </div>
    </div>
  );
}
