import { LogOut, Bell, Sun, Moon, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán / Oficial',
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-sm font-medium text-slate-200">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-500">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
      </div>
      <div className="flex items-center gap-2">
        {onStartTour && (
          <button
            onClick={onStartTour}
            title="Tour de la plataforma"
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Tema claro' : 'Tema oscuro'}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => navigate('/alerts')}
          title="Alertas y vencimientos"
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </header>
  );
}
