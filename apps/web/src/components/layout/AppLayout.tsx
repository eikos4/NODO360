import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OnboardingTour from '../OnboardingTour';

export default function AppLayout() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar onStartTour={startTour} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onStartTour={startTour} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
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
