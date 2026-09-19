import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { canCentralOperatorAccess, getDefaultRouteForUser, isRestrictedCentralista } from './lib/roleAccess';
import { hasAnyRole } from './lib/roles';
import { useAuthHydrated } from './hooks/useAuthHydrated';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import NosotrosPage from './pages/NosotrosPage';
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
import CentralGlobalPage from './pages/CentralGlobalPage';
import IncidentLocationPinPage from './pages/IncidentLocationPinPage';
import Despacho360Page from './pages/Despacho360Page';
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
import CentralBitacoraPage from './pages/CentralBitacoraPage';
import Bitacora360Page from './pages/Bitacora360Page';
import CentralDespachosParralPage from './pages/CentralDespachosParralPage';
import CentralExpressPage from './pages/CentralExpressPage';
import BomberoEmergencyPage from './pages/BomberoEmergencyPage';
import CompanyPublicProfilePage from './pages/CompanyPublicProfilePage';
import Vision360CuartelesPage from './pages/Vision360CuartelesPage';
import CompaniasTvPage from './pages/CompaniasTvPage';
import SuperAdminImplementacionPage from './pages/SuperAdminImplementacionPage';
import Nodo360AlarmsPage from './pages/Nodo360AlarmsPage';
import CarroTabletPage from './pages/CarroTabletPage';

function RequireRoles({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!hasAnyRole(user, ...roles)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }
  return <>{children}</>;
}

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

  if (isRestrictedCentralista(user) && !canCentralOperatorAccess(location.pathname)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  if (import.meta.env.VITE_CARRO_KIOSK === '1' && !location.pathname.startsWith('/carro')) {
    return <Navigate to="/carro" replace />;
  }

  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/nosotros" element={<NosotrosPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/central/:slug" element={<DispatchPublicPage />} />
      <Route path="/cuartel/:slug" element={<CompanyPublicProfilePage />} />
      <Route path="/localizar/:token" element={<IncidentLocationPinPage />} />
      <Route path="/carro" element={<CarroTabletPage />} />
      <Route path="/carro/:slug" element={<CarroTabletPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="implementacion" element={<SuperAdminImplementacionPage />} />
        <Route path="companies" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE']}><CompaniesPage /></RequireRoles>} />
        <Route path="users" element={<RequireRoles roles={['KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN']}><UsersPage /></RequireRoles>} />
        <Route path="inventory" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL']}><InventoryPage /></RequireRoles>} />
        <Route path="inventory-audits" element={<InventoryAuditsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="hydrants" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL']}><HydrantsPage /></RequireRoles>} />
        <Route path="emergency-plans" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO']}><EmergencyPlansPage /></RequireRoles>} />
        <Route path="evacuation" element={<EvacuationPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="health" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO']}><HealthPage /></RequireRoles>} />
        <Route path="operational-map" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'SECRETARIO', 'OPERADOR_CENTRAL']}><OperationalMapPage /></RequireRoles>} />
        <Route path="incidents" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><IncidentsPage /></RequireRoles>} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="guard-log" element={<GuardLogPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="finance" element={<RequireRoles roles={['SUPER_ADMIN', 'TESORERO', 'AUDITOR', 'COMANDANTE']}><FinancePage /></RequireRoles>} />
        <Route path="membership" element={<RequireRoles roles={['SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN']}><MembershipPage /></RequireRoles>} />
        <Route path="nodo360" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><Nodo360Page /></RequireRoles>} />
        <Route path="motores" element={<MotoresPage />} />
        <Route path="fleet-logs" element={<FleetLogPage />} />
        <Route path="organigrama" element={<OrganigramaPage />} />
        <Route path="despacho360" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><Despacho360Page /></RequireRoles>} />
        <Route path="nodo360-alarms" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><Nodo360AlarmsPage /></RequireRoles>} />
        <Route path="emergencia-respuesta" element={<BomberoEmergencyPage />} />
        <Route path="central-despachos-parral" element={<CentralDespachosParralPage />} />
        <Route path="dispatch/global" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL', 'SECRETARIO']}><CentralGlobalPage /></RequireRoles>} />
        <Route path="central-express" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><CentralExpressPage /></RequireRoles>} />
        <Route path="vision360-cuarteles" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><Vision360CuartelesPage /></RequireRoles>} />
        <Route path="companias-tv" element={<RequireRoles roles={['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL']}><CompaniasTvPage /></RequireRoles>} />
        <Route path="central-operativa" element={<RequireRoles roles={['OPERADOR_CENTRAL', 'COMANDANTE', 'CAPITAN', 'SUPER_ADMIN']}><CentralOperativaPage /></RequireRoles>} />
        <Route path="bitacora360" element={<RequireRoles roles={['OPERADOR_CENTRAL', 'COMANDANTE', 'CAPITAN', 'SUPER_ADMIN']}><Bitacora360Page /></RequireRoles>} />
        <Route path="central-bitacora" element={<RequireRoles roles={['OPERADOR_CENTRAL', 'COMANDANTE', 'CAPITAN', 'SUPER_ADMIN']}><Bitacora360Page /></RequireRoles>} />
        <Route path="central-bitacora/registro" element={<RequireRoles roles={['OPERADOR_CENTRAL', 'COMANDANTE', 'CAPITAN', 'SUPER_ADMIN']}><CentralBitacoraPage /></RequireRoles>} />
        <Route path="central-despachos" element={<Navigate to="/despacho360" replace />} />
        <Route path="central-despachos/variantes" element={<Navigate to="/despacho360" replace />} />
        <Route path="botonera" element={<Navigate to="/despacho360" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
