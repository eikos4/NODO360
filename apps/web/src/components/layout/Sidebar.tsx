import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Package,
  Truck, FileText, ShieldAlert, Wrench, DollarSign,
  Flame, Bell, ShoppingCart, Zap, Gauge, Network, Siren, Megaphone, Droplets, Shield, HandCoins, Signpost,
  GraduationCap, Map, BookOpen, ClipboardCheck, Fuel, HeartPulse, PanelLeftClose, PanelLeft, Radio, Globe
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import SidebarCompanias360 from './SidebarCompanias360';
import UserIdentityBlock from './UserIdentityBlock';
import { useAuthCompany } from '../../hooks/useAuthCompany';

const SIDEBAR_COMPACT_KEY = 'nodo360_sidebar_compact';

export type NavItem = { to: string; label: string; icon: React.ElementType; roles: string[]; soon?: boolean };
export const navItems: NavItem[] = [
  { to: '/emergencia-respuesta', label: 'Mi emergencia', icon: Siren, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'BOMBERO', 'ENCARGADO_MATERIAL'] },
  { to: '/nodo360',    label: 'NODO360',      icon: Zap,             roles: ['ALL'] },
  { to: '/central-operativa', label: 'Central en vivo', icon: Radio, roles: ['OPERADOR_CENTRAL', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'] },
  { to: '/despacho360', label: 'Despacho360', icon: Siren, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] },
  { to: '/central-express', label: 'Central Express', icon: Zap, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] },
  { to: '/central-despachos-parral', label: 'Central Parral', icon: Flame, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] },
  { to: '/dispatch/global', label: 'Central Global', icon: Globe, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL', 'SECRETARIO'] },
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['ALL'] },
  { to: '/alerts',     label: 'Alertas',      icon: Bell,            roles: ['ALL'] },
  { to: '/announcements', label: 'Comunicados', icon: Megaphone,     roles: ['ALL'] },
  { to: '/operational-map', label: 'Mapa 360', icon: Map, roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'ENCARGADO_MATERIAL', 'SECRETARIO', 'OPERADOR_CENTRAL'] },
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
  { to: '/incidents',  label: 'Emergencias',  icon: ShieldAlert,     roles: ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] },
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
  const company = useAuthCompany();
  const role = user?.role ?? '';
  const [compact, setCompact] = useState(
    () => localStorage.getItem(SIDEBAR_COMPACT_KEY) === 'true',
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COMPACT_KEY, String(compact));
  }, [compact]);

  const visibleItems = navItems.filter(
    (item) => item.roles.includes('ALL') || item.roles.includes(role)
  );

  const companias360After =
    (['/central-despachos-parral', '/despacho360', '/nodo360'] as const).find((to) =>
      visibleItems.some((i) => i.to === to),
    ) ?? '/nodo360';

  const itemLayout = compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5';

  return (
    <aside
      className={cn(
        'hidden md:flex bg-slate-900 border-r border-slate-800 flex-col shrink-0 transition-[width] duration-200',
        compact ? 'w-[4.25rem]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-slate-800',
          compact ? 'justify-center px-2 py-4' : 'gap-3 px-6 py-5',
        )}
      >
        <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        {!compact && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-none">NODO360</p>
            <p className="text-xs text-slate-400 mt-0.5">Gestión Bomberos</p>
          </div>
        )}
      </div>

      <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-thin', compact ? 'px-1.5' : 'px-3')}>
        {visibleItems.map((item) => {
          const node = item.soon ? (
            <div
              key={item.to}
              title={compact ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none',
                itemLayout,
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!compact && (
                <>
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Próx.</span>
                </>
              )}
            </div>
          ) : item.to === '/nodo360' ? (
            <NavLink
              key={item.to}
              to={item.to}
              title={compact ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-xl text-sm font-bold transition-all mb-1',
                  itemLayout,
                  isActive
                    ? 'bg-red-600 !text-white shadow-lg shadow-red-600/30'
                    : 'bg-red-600/15 text-red-400 border border-red-600/30 hover:bg-red-600 hover:!text-white',
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!compact && (
                <>
                  {item.label}
                  <span className="ml-auto text-[9px] font-semibold bg-red-500/30 px-1.5 py-0.5 rounded">HUB</span>
                </>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              title={compact ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  itemLayout,
                  isActive
                    ? 'bg-red-600 !text-white border border-red-600 shadow-md shadow-red-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!compact && item.label}
            </NavLink>
          );

          return (
            <div key={item.to}>
              {node}
              {item.to === companias360After && (
                <SidebarCompanias360
                  compact={compact}
                  roles={['ALL']}
                  userRole={role}
                  companyNumber={company?.number}
                />
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn('border-t border-slate-800', compact ? 'px-1.5 py-3' : 'px-3 py-4')}>
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          title={compact ? 'Mostrar menú completo' : 'Ocultar etiquetas — solo iconos'}
          className={cn(
            'w-full flex items-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mb-3',
            compact ? 'justify-center p-2.5' : 'gap-2 px-3 py-2 text-xs font-medium',
          )}
        >
          {compact ? <PanelLeft className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
          {!compact && <span>Solo iconos</span>}
        </button>

        <UserIdentityBlock variant="sidebar" compact={compact} />
      </div>
    </aside>
  );
}
