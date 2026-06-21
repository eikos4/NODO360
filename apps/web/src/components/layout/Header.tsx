import { LogOut, Bell, Sun, Moon, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import CentralQuickOverview from './CentralQuickOverview';
import { canViewCuartelesOverview } from '../../hooks/useCuartelesOverview';

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

interface HeaderProps {
  onStartTour?: () => void;
}

export default function Header({ onStartTour }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const showOverview = canViewCuartelesOverview(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const btnClass = cn(
    'p-2 rounded-lg transition-colors',
    isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  );

  return (
    <header
      className={cn(
        'shrink-0 border-b',
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
      )}
    >
      <div className="h-14 flex items-center justify-between gap-3 px-4 sm:px-6">
        <div className="shrink-0 min-w-0 max-w-[140px] sm:max-w-[160px]">
          <p className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-900')}>
            {user?.firstName} {user?.lastName}
          </p>
          <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-600')}>
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </p>
        </div>

        {showOverview && (
          <CentralQuickOverview className="flex-1 hidden sm:block min-w-0 mx-1 lg:mx-3" />
        )}

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onStartTour && (
            <button
              onClick={onStartTour}
              title="Tour de la plataforma"
              className={btnClass}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Tema claro' : 'Tema oscuro'}
            className={btnClass}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/alerts')}
            title="Alertas y vencimientos"
            className={cn(btnClass, 'relative')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
              isDark
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-600/10'
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50',
            )}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>

      {showOverview && (
        <div className={cn('sm:hidden px-4 pb-2 border-t', isDark ? 'border-slate-800' : 'border-slate-100')}>
          <CentralQuickOverview compact />
        </div>
      )}
    </header>
  );
}
