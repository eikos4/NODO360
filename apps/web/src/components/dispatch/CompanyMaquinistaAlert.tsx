import { AlertTriangle, UserCog } from 'lucide-react';
import { formatCompanyLabel } from '../../lib/company-dispatch-readiness';
import { useThemeStore } from '../../store/themeStore';

type Props = {
  company?: { number?: number; name?: string } | null;
  availableCount: number;
  className?: string;
  isDark?: boolean;
};

export default function CompanyMaquinistaAlert({ company, availableCount, className = '', isDark: isDarkProp }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === 'dark';
  if (availableCount > 0) return null;

  const label = formatCompanyLabel(company);

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${
        isDark
          ? 'border-amber-500/45 bg-amber-500/10'
          : 'border-amber-400 bg-amber-100'
      } ${className}`}
      role="alert"
    >
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
          <UserCog className="w-3.5 h-3.5" />
          Sin maquinista disponible
        </p>
        <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-amber-200/85' : 'text-amber-950'}`}>
          {label} no está operativa para emergencias. Marca un maquinista en la sala pública del cuartel antes de despachar.
        </p>
      </div>
    </div>
  );
}
