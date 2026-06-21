import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CentralOperatorBar from './CentralOperatorBar';
import OnboardingTour from '../OnboardingTour';
import { useAuthStore } from '../../store/authStore';
import { isCentralOperator, isCentralOperatorRoute } from '../../lib/roleAccess';
import { useThemeStore } from '../../store/themeStore';

const IMMERSIVE_ROUTES = [
  '/despacho360',
  '/central-despachos',
  '/central-operativa',
  '/central-despachos-parral',
  '/central-express',
];

export default function AppLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const centralOperator = isCentralOperator(user?.role);
  const isImmersive = IMMERSIVE_ROUTES.some((r) => location.pathname.startsWith(r));
  /** Operador central usa barra superior; el resto conserva sidebar + header */
  const hideSidebar = centralOperator && isCentralOperatorRoute(location.pathname);
  const globalTheme = useThemeStore((s) => s.theme);
  const isDespacho360 = location.pathname.startsWith('/despacho360');
  const shellBg =
    isImmersive && globalTheme === 'light'
      ? isDespacho360
        ? 'bg-white'
        : 'bg-slate-100'
      : 'bg-slate-950';
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  return (
    <div className={`flex h-[100dvh] h-screen overflow-hidden ${shellBg}`}>
      <div className={hideSidebar ? 'hidden' : 'contents'}>
        <Sidebar onStartTour={startTour} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 w-full">
        {centralOperator ? (
          <CentralOperatorBar />
        ) : (
          <Header onStartTour={startTour} />
        )}
        <main
          className={
            isImmersive
              ? 'flex-1 min-h-0 overflow-hidden flex flex-col p-0'
              : 'flex-1 overflow-y-auto p-6 scrollbar-thin'
          }
        >
          <Outlet />
        </main>
      </div>
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
