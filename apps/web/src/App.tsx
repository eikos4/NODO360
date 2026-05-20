import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
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
import BotoneraPage from './pages/BotoneraPage';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
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
        <Route path="botonera" element={<BotoneraPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
