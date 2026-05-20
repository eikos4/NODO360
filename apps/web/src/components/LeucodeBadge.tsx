import { Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  className?: string;
  variant?: 'default' | 'compact' | 'footer';
};

export default function LeucodeBadge({ className, variant = 'default' }: Props) {
  const href = 'https://leucode.cl';

  if (variant === 'compact') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider',
          'text-violet-300/90 hover:text-violet-200 transition-colors',
          className,
        )}
      >
        <Sparkles className="w-3 h-3" />
        leucode.ia
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>
    );
  }

  if (variant === 'footer') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center justify-center gap-2 py-2 text-xs text-slate-500 hover:text-violet-300 transition-colors',
          className,
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        Módulo auspiciado por
        <span className="font-bold text-violet-400">leucode.ia</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
        'bg-gradient-to-r from-violet-600/20 via-fuchsia-600/15 to-indigo-600/20',
        'border-violet-500/40 text-violet-200 hover:border-violet-400/60 hover:from-violet-600/30 transition-all',
        'shadow-sm shadow-violet-900/20',
        className,
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-violet-300" />
      <span className="text-slate-400 font-normal">Auspiciado por</span>
      <span className="text-violet-200">leucode.ia</span>
      <ExternalLink className="w-3 h-3 text-violet-400/70" />
    </a>
  );
}
