import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Package,
  Truck, FileText, ShieldAlert, Wrench, DollarSign,
  Flame, Bell, ShoppingCart, Zap, Gauge, Network, Siren, HelpCircle, Megaphone, Droplets, Shield, HandCoins, Signpost,   GraduationCap, Map, BookOpen, ClipboardCheck, Fuel, HeartPulse,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

type NavItem = { to: string; label: string; icon: React.ElementType; roles: string[]; soon?: boolean };
const navItems: NavItem[] = [
  { to: '/nodo360',    label: 'NODO360',      icon: Zap,             roles: ['ALL'] },
  { to: '/botonera',   label: 'Botonera',     icon: Siren,           roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'] },
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['ALL'] },
  { to: '/alerts',     label: 'Alertas',      icon: Bell,            roles: ['ALL'] },
  { to: '/announcements', label: 'Comunicados', icon: Megaphone,     roles: ['ALL'] },
  { to: '/operational-map', label: 'Mapa 360', icon: Map, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'SECRETARIO'] },
  { to: '/hydrants',   label: 'Hidrantes',    icon: Droplets,        roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL'] },
  { to: '/emergency-plans', label: 'Planes Emergencia', icon: Shield, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] },
  { to: '/evacuation', label: 'Simulacros', icon: Signpost, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'ENCARGADO_MATERIAL'] },
  { to: '/companies',  label: 'Compañías',    icon: Building2,       roles: ['SUPER_ADMIN', 'COMANDANTE'] },
  { to: '/users',      label: 'Personal',     icon: Users,           roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'] },
  { to: '/training',   label: 'Capacitación', icon: GraduationCap,   roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] },
  { to: '/health',     label: 'Salud',        icon: HeartPulse,      roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] },
  { to: '/organigrama',label: 'Organigrama',  icon: Network,         roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] },
  { to: '/inventory',  label: 'Inventario',   icon: Package,         roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL'] },
  { to: '/inventory-audits', label: 'Auditoría física', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'AUDITOR'] },
  { to: '/incidents',  label: 'Emergencias',  icon: ShieldAlert,     roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'] },
  { to: '/maintenance',label: 'Mantención',   icon: Wrench,          roles: ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL'] },
  { to: '/motores',     label: 'Motores',      icon: Gauge,           roles: ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'CAPITAN'] },
  { to: '/fleet-logs',  label: 'Libro flota',  icon: Fuel,            roles: ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'CAPITAN', 'BOMBERO'] },
  { to: '/shifts',     label: 'Guardia',      icon: Truck,           roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'] },
  { to: '/guard-log',  label: 'Bitácora',     icon: BookOpen,        roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'BOMBERO', 'SECRETARIO'] },
  { to: '/documents',  label: 'Documentos',   icon: FileText,        roles: ['ALL'] },
  { to: '/purchases',  label: 'Compras',      icon: ShoppingCart,    roles: ['SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE'] },
  { to: '/finance',    label: 'Finanzas',     icon: DollarSign,      roles: ['SUPER_ADMIN', 'TESORERO', 'AUDITOR', 'COMANDANTE'] },
  { to: '/membership', label: 'Tesorería Social', icon: HandCoins,   roles: ['SUPER_ADMIN', 'TESORERO', 'SECRETARIO', 'COMANDANTE', 'AUDITOR', 'CAPITAN'] },
];

interface SidebarProps {
  onStartTour?: () => void;
}

export default function Sidebar({ onStartTour }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const visibleItems = navItems.filter(
    (item) => item.roles.includes('ALL') || item.roles.includes(role)
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-none">NODO360</p>
          <p className="text-xs text-slate-400 mt-0.5">Gestión Bomberos</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) =>
          item.soon ? (
            <div key={item.to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none">
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Próx.</span>
            </div>
          ) : item.to === '/nodo360' ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-1',
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-red-600/15 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              <span className="ml-auto text-[9px] font-semibold bg-red-500/30 px-1.5 py-0.5 rounded">HUB</span>
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-slate-300">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
