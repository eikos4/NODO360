import { AlertTriangle, UserCog } from 'lucide-react';
import { formatCompanyLabel } from '../../lib/company-dispatch-readiness';

type Props = {
  company?: { number?: number; name?: string } | null;
  availableCount: number;
  className?: string;
  isDark?: boolean;
};

export default function CompanyMaquinistaAlert({ company, availableCount, className = '', isDark = true }: Props) {
  if (availableCount > 0) return null;

  const label = formatCompanyLabel(company);

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${
        isDark
          ? 'border-amber-500/45 bg-amber-500/10'
          : 'border-amber-300 bg-amber-50 shadow-sm'
      } ${className}`}
      role="alert"
    >
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
          <UserCog className="w-3.5 h-3.5" />
          Sin maquinista disponible
        </p>
        <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-amber-200/85' : 'text-amber-900/80'}`}>
          {label} no está operativa para emergencias. Marca un maquinista en la sala pública del cuartel antes de despachar.
        </p>
      </div>
    </div>
  );
}
