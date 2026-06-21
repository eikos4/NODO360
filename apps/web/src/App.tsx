import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { canCentralOperatorAccess, getDefaultRouteForRole, isCentralOperator } from './lib/roleAccess';
import { useAuthHydrated } from './hooks/useAuthHydrated';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';
import InventoryPage from './pages/InventoryPage';
import AlertsPage from './pages/AlertsPage';
import IncidentsPage from './pages/IncidentsPage';
import MaintenancePage from './pages/MaintenancePage';
import ShiftsPage from './pages/ShiftsPage';
import DocumentsPage from './pages/DocumentsPage';
import PurchasesPage from './pages/PurchasesPage';
import FinancePage from './pages/FinancePage';
import Nodo360Page from './pages/Nodo360Page';
import MotoresPage from './pages/MotoresPage';
import OrganigramaPage from './pages/OrganigramaPage';
import DispatchPublicPage from './pages/DispatchPublicPage';
import Despacho360Page from './pages/Despacho360Page';
import BotoneraShell from './pages/BotoneraShell';
import AnnouncementsPage from './pages/AnnouncementsPage';
import HydrantsPage from './pages/HydrantsPage';
import EmergencyPlansPage from './pages/EmergencyPlansPage';
import MembershipPage from './pages/MembershipPage';
import EvacuationPage from './pages/EvacuationPage';
import TrainingPage from './pages/TrainingPage';
import HealthPage from './pages/HealthPage';
import OperationalMapPage from './pages/OperationalMapPage';
import GuardLogPage from './pages/GuardLogPage';
import InventoryAuditsPage from './pages/InventoryAuditsPage';
import FleetLogPage from './pages/FleetLogPage';
import CentralOperativaPage from './pages/CentralOperativaPage';
import CentralDespachosParralPage from './pages/CentralDespachosParralPage';
import CentralExpressPage from './pages/CentralExpressPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isCentralOperator(user?.role) && !canCentralOperatorAccess(location.pathname)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/central/:slug" element={<DispatchPublicPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory-audits" element={<InventoryAuditsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="hydrants" element={<HydrantsPage />} />
        <Route path="emergency-plans" element={<EmergencyPlansPage />} />
        <Route path="evacuation" element={<EvacuationPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="operational-map" element={<OperationalMapPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="guard-log" element={<GuardLogPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="nodo360" element={<Nodo360Page />} />
        <Route path="motores" element={<MotoresPage />} />
        <Route path="fleet-logs" element={<FleetLogPage />} />
        <Route path="organigrama" element={<OrganigramaPage />} />
        <Route path="despacho360" element={<Despacho360Page />} />
        <Route path="central-despachos-parral" element={<CentralDespachosParralPage />} />
        <Route path="central-express" element={<CentralExpressPage />} />
        <Route path="central-operativa" element={<CentralOperativaPage />} />
        <Route path="central-despachos" element={<Navigate to="/despacho360" replace />} />
        <Route path="central-despachos/variantes" element={<BotoneraShell />} />
        <Route path="botonera" element={<Navigate to="/despacho360" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
