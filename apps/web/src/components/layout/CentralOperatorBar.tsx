import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Flame, LogOut, Moon, Siren, Map, ShieldAlert, Radio, Sun, Zap, Droplets, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../lib/utils';
import CentralQuickOverview from './CentralQuickOverview';
import { canViewCuartelesOverview } from '../../hooks/useCuartelesOverview';

const TABS = [
  { to: '/despacho360', label: 'Despacho360', icon: Siren },
  { to: '/central-express', label: 'Central Express', icon: Zap },
  { to: '/central-despachos-parral', label: 'Central Parral', icon: Flame },
  { to: '/central-operativa', label: 'En vivo', icon: Radio },
  { to: '/dispatch/global', label: 'Global', icon: Globe },
  { to: '/operational-map', label: 'Mapa', icon: Map },
  { to: '/hydrants', label: 'Hidrantes', icon: Droplets },
  { to: '/incidents', label: 'Emergencias', icon: ShieldAlert },
] as const;

export default function CentralOperatorBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const showOverview = canViewCuartelesOverview(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={cn(
      'shrink-0 border-b backdrop-blur z-30',
      isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95 shadow-sm',
    )}>
      <div className="h-12 sm:h-14 flex items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 hidden md:block">
            <p className={cn('text-xs font-bold leading-none truncate', isDark ? 'text-white' : 'text-slate-900')}>Central de Despacho</p>
            <p className={cn('text-[10px] truncate', isDark ? 'text-slate-500' : 'text-slate-600')}>{user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5 flex-shrink justify-center overflow-x-auto scrollbar-none">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={cn(
                  'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors shrink-0',
                  active
                    ? 'bg-red-600 !text-white shadow-md shadow-red-600/25'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          {showOverview && (
            <div className="hidden lg:flex flex-1 min-w-0 max-w-none mx-2">
              <CentralQuickOverview />
            </div>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'p-2 rounded-lg transition-colors shrink-0',
              isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-red-600 hover:bg-slate-100',
            )}
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showOverview && (
        <div className={cn('lg:hidden px-3 pb-2 border-t', isDark ? 'border-slate-800' : 'border-slate-100')}>
          <CentralQuickOverview compact />
        </div>
      )}
    </header>
  );
}
