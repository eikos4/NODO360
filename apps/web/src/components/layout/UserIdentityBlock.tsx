import { Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useAuthCompany } from '../../hooks/useAuthCompany';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán / Oficial',
  OPERADOR_CENTRAL: 'Operador Central',
  ENCARGADO_MATERIAL: 'Encargado Material',
  SECRETARIO: 'Secretario/a',
  TESORERO: 'Tesorero/a',
  BOMBERO: 'Bombero Operativo',
  AUDITOR: 'Auditor',
};

type Props = {
  variant: 'header' | 'sidebar';
  compact?: boolean;
};

export default function UserIdentityBlock({ variant, compact = false }: Props) {
  const user = useAuthStore((s) => s.user);
  const company = useAuthCompany();
  const isHeader = variant === 'header';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '';

  if (!user) return null;

  const avatar = company?.logoUrl ? (
    <img
      src={company.logoUrl}
      alt=""
      className={cn(
        'rounded-full object-cover border-2 shrink-0',
        isHeader ? 'w-10 h-10 border-red-500/40' : 'w-9 h-9 border-red-500/30',
      )}
    />
  ) : (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 border-2',
        isHeader
          ? 'w-10 h-10 bg-red-600/15 border-red-500/30'
          : 'w-9 h-9 bg-slate-700 border-slate-600',
      )}
    >
      {company ? (
        <span className={cn('font-black text-red-400', isHeader ? 'text-sm' : 'text-xs')}>
          {company.number}
        </span>
      ) : (
        <span className={cn('font-bold text-slate-300', isHeader ? 'text-sm' : 'text-xs')}>
          {user.firstName?.[0]}{user.lastName?.[0]}
        </span>
      )}
    </div>
  );

  if (compact) {
    return (
      <div title={`${user.firstName} ${user.lastName}${company ? ` · ${company.number}ª ${company.name}` : ''}`}>
        {avatar}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 min-w-0', isHeader ? 'max-w-[220px] sm:max-w-[280px] shrink-0' : '')}>
      {avatar}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium truncate', isHeader ? 'text-slate-900 dark:text-slate-200' : 'text-slate-200')}>
          {user.firstName} {user.lastName}
        </p>
        {company ? (
          <>
            <p className={cn('text-xs font-semibold truncate text-red-500', isHeader && 'dark:text-red-400')}>
              {company.number}ª Compañía · {company.name}
            </p>
            <p className={cn('text-[11px] truncate', isHeader ? 'text-slate-600 dark:text-slate-500' : 'text-slate-500')}>
              {company.city} · {roleLabel}
            </p>
          </>
        ) : (
          <p className={cn('text-xs truncate', isHeader ? 'text-slate-600 dark:text-slate-500' : 'text-slate-500')}>
            {roleLabel}
          </p>
        )}
      </div>
      {company && variant === 'sidebar' && (
        <Building2 className="w-4 h-4 text-slate-600 shrink-0 hidden lg:block" />
      )}
    </div>
  );
}
