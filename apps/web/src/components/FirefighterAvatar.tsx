import { useState } from 'react';
import { Flame, Star } from 'lucide-react';

type Variant = 'bombero' | 'maquinista';

const BORDER: Record<Variant, { on: string; off: string; principal?: string }> = {
  bombero: {
    on: 'border-emerald-400 shadow-lg shadow-emerald-900/40',
    off: 'border-slate-600 opacity-70',
  },
  maquinista: {
    on: 'border-sky-400 shadow-lg shadow-sky-900/30',
    off: 'border-slate-600 opacity-70',
    principal: 'border-amber-400 shadow-lg shadow-amber-900/40',
  },
};

export function FirefighterPlaceholder({
  available = true,
  className = '',
}: {
  available?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 ${className}`}
      aria-hidden
    >
      <div className={`relative flex items-center justify-center rounded-full ${
        available ? 'bg-red-600/15' : 'bg-slate-700/50'
      } w-[70%] h-[70%]`}>
        <Flame
          className={`w-[55%] h-[55%] ${available ? 'text-red-400' : 'text-slate-500'}`}
          strokeWidth={1.75}
        />
      </div>
    </div>
  );
}

export default function FirefighterAvatar({
  photoUrl,
  fullName,
  available = true,
  size = 'md',
  variant = 'bombero',
  principal = false,
  statusDot = true,
  className = '',
}: {
  photoUrl?: string | null;
  fullName: string;
  available?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: Variant;
  principal?: boolean;
  statusDot?: boolean;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = !!photoUrl && !imgError;

  const dim =
    size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32'
    : size === 'sm' ? 'w-7 h-7'
    : 'w-20 h-20 sm:w-24 sm:h-24';

  const border =
    principal && variant === 'maquinista'
      ? BORDER.maquinista.principal!
      : available
        ? BORDER[variant].on
        : BORDER[variant].off;

  return (
    <div className={`relative ${dim} rounded-full overflow-hidden border-[3px] shrink-0 transition-all ${border} ${className}`}>
      {showPhoto ? (
        <img
          src={photoUrl!}
          alt={fullName}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${available ? '' : 'grayscale brightness-75'}`}
        />
      ) : (
        <FirefighterPlaceholder available={available} className="w-full h-full" />
      )}
      {statusDot && size !== 'sm' && (
        <span className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-slate-900 ${
          available
            ? variant === 'bombero' ? 'bg-emerald-400' : 'bg-sky-400'
            : 'bg-slate-500'
        }`} />
      )}
      {principal && size !== 'sm' && (
        <span className="absolute -top-0.5 -right-0.5 w-7 h-7 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center">
          <Star className="w-3.5 h-3.5 text-amber-950 fill-amber-950" />
        </span>
      )}
    </div>
  );
}
