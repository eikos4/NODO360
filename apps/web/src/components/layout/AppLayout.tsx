import { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import Sidebar, { navItems } from './Sidebar';
import Header from './Header';
import CentralOperatorBar from './CentralOperatorBar';
import OnboardingTour from '../OnboardingTour';
import { useAuthStore } from '../../store/authStore';
import { isCentralOperator, isCentralOperatorRoute } from '../../lib/roleAccess';
import { useThemeStore } from '../../store/themeStore';
import { LogOut, Sun, Moon, HelpCircle, Menu, X, Building2, Flame } from 'lucide-react';
import UserIdentityBlock from './UserIdentityBlock';
import { cn } from '../../lib/utils';

const IMMERSIVE_ROUTES = [
  '/despacho360',
  '/central-despachos',
  '/central-operativa',
  '/central-despachos-parral',
  '/central-express',
  '/dispatch/global',
  '/hydrants',
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const role = user?.role ?? '';
  const centralOperator = isCentralOperator(user?.role);
  const isImmersive = IMMERSIVE_ROUTES.some((r) => location.pathname.startsWith(r));
  const hideSidebar = centralOperator && isCentralOperatorRoute(location.pathname);
  const globalTheme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = globalTheme === 'dark';
  const isDespacho360 = location.pathname.startsWith('/despacho360');
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const shellBg =
    isImmersive && globalTheme === 'light'
      ? isDespacho360
        ? 'bg-white'
        : 'bg-slate-100'
      : 'bg-slate-950';

  useEffect(() => {
    if (isCentralOperator(user?.role)) return;
    const hasCompletedOnboarding = localStorage.getItem('nodo360_onboarding_completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('nodo360_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const startTour = () => {
    setShowOnboarding(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter items visible to user based on role
  const visibleItems = navItems.filter(
    (item) => item.roles.includes('ALL') || item.roles.includes(role)
  );

  // Dynamic Mobile Bottom Bar items
  const PREFERRED_BOTTOM_ROUTES = ['/emergencia-respuesta', '/operational-map', '/nodo360', '/alerts'];
  const bottomItems = visibleItems.filter((i) => PREFERRED_BOTTOM_ROUTES.includes(i.to));
  const remainingVisible = visibleItems.filter((i) => !PREFERRED_BOTTOM_ROUTES.includes(i.to));
  const finalBottomItems = [...bottomItems, ...remainingVisible].slice(0, 4);

  return (
    <div className={cn("flex h-[100dvh] h-screen overflow-hidden", shellBg)}>
      {/* Sidebar for Desktop */}
      <div className={hideSidebar ? 'hidden' : 'contents'}>
        <Sidebar onStartTour={startTour} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0 w-full">
        {/* Header for Desktop */}
        {centralOperator ? (
          <CentralOperatorBar />
        ) : (
          <Header onStartTour={startTour} />
        )}

        {/* Main Content Area */}
        <main
          className={cn(
            isImmersive
              ? 'flex-1 min-h-0 overflow-hidden flex flex-col p-0'
              : 'flex-1 overflow-y-auto p-6 scrollbar-thin',
            // On mobile, add padding bottom to avoid the bottom navigation bar covering the content
            !isImmersive && "pb-20 md:pb-6"
          )}
        >
          <Outlet />
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        {!hideSidebar && !centralOperator && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-50 shadow-lg">
            {finalBottomItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-100 transition-all",
                    isActive && "text-red-500 hover:text-red-400 font-bold"
                  )
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-[9px] mt-1 truncate max-w-[64px] uppercase tracking-wider scale-90">
                  {item.label === 'Mi emergencia' ? 'Emergencia' : item.label === 'Central en vivo' ? 'Central' : item.label}
                </span>
              </NavLink>
            ))}

            {/* "Más" (Drawer Menu Trigger) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-100 transition-all",
                menuOpen && "text-red-500 font-bold"
              )}
            >
              <Menu className="w-5 h-5 shrink-0" />
              <span className="text-[9px] mt-1 uppercase tracking-wider scale-90">Más</span>
            </button>
          </nav>
        )}
      </div>

      {/* MOBILE FULLSCREEN MENU DRAWER */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-950 z-[9999] flex flex-col p-6 overflow-y-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Profile Header */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mt-6 mb-5">
            <div className="w-10 h-10 bg-red-650 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-lg leading-none">NODO360</p>
              <p className="text-xs text-slate-400 mt-1">Bomberos de Chile · Parral</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-5 shadow-inner">
            <UserIdentityBlock variant="sidebar" />
          </div>

          {/* Configuration quick actions */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-400" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                startTour();
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Ayuda / Tour</span>
            </button>
          </div>

          {/* All menu items */}
          <div className="flex-1 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-3 mb-2">Secciones del Sistema</p>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold border transition-all",
                      isActive
                        ? "bg-red-650/15 text-red-400 border-red-500/30"
                        : "bg-slate-900/40 text-slate-300 border-slate-900/60 hover:bg-slate-800 hover:border-slate-800"
                    )
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Logout button at bottom */}
          <div className="border-t border-slate-800 pt-5 mt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      <OnboardingTour
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
