import { Link } from 'react-router-dom';
import {
  Zap, ShieldAlert, Siren, Bell, Building2, Users, Flame,
  Package, Wrench, Gauge, Droplets, Calendar, FileText, ShoppingCart,
  DollarSign, HandCoins, BarChart3, GraduationCap, Map, BookOpen, ClipboardCheck, HeartPulse, Truck, ChevronRight
} from 'lucide-react';

/* ── Data ── */
const GROUPS = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: Zap,
    color: '#ef4444',
    tailwindColor: 'bg-red-500',
    x: 32, y: 30,
    side: 'left' as const,
    modules: [
      { label: 'Emergencias', icon: Zap, route: '/incidents' },
      { label: 'Despacho360', icon: Siren, route: '/despacho360' },
      { label: 'Central Express', icon: Droplets, route: '/central-express' },
      { label: 'Central Pública', icon: Flame, route: '/central-despachos-parral' },
      { label: 'Alertas', icon: Bell, route: '/alerts' },
    ],
  },
  {
    id: 'institucional',
    label: 'Institucional',
    icon: Building2,
    color: '#8b5cf6',
    tailwindColor: 'bg-violet-500',
    x: 32, y: 65,
    side: 'left' as const,
    modules: [
      { label: 'Personas', icon: Users, route: '/users' },
      { label: 'Guardias', icon: Calendar, route: '/shifts' },
      { label: 'Salud', icon: HeartPulse, route: '/health' },
      { label: 'Capacitaciones', icon: GraduationCap, route: '/training' },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    icon: Package,
    color: '#22c55e',
    tailwindColor: 'bg-emerald-500',
    x: 68, y: 30,
    side: 'right' as const,
    modules: [
      { label: 'Flota', icon: Truck, route: '/motores' },
      { label: 'Inventario', icon: Package, route: '/inventory' },
      { label: 'Bitácora', icon: BookOpen, route: '/guard-log' },
      { label: 'Mapa 360', icon: Map, route: '/operational-map' },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: DollarSign,
    color: '#f59e0b',
    tailwindColor: 'bg-amber-500',
    x: 68, y: 65,
    side: 'right' as const,
    modules: [
      { label: 'Documentos', icon: FileText, route: '/documents' },
      { label: 'Cuotas', icon: HandCoins, route: '/membership' },
      { label: 'Compras', icon: ShoppingCart, route: '/purchases' },
      { label: 'Auditoría', icon: ClipboardCheck, route: '/inventory-audits' },
    ],
  },
];

const BOTTOM_MODULES = [
  { label: 'Motores', icon: Gauge, route: '/motores', color: '#3b82f6' },
  { label: 'Mantención', icon: Wrench, route: '/maintenance', color: '#3b82f6' },
  { label: 'Reportes BI', icon: BarChart3, route: '/reports', color: '#3b82f6' },
];

const CENTER = { x: 50, y: 47 };

/* ── Helpers ── */
function getModulePositions(group: typeof GROUPS[0]) {
  const moduleSpacing = 7.5;
  const startY = group.y - ((group.modules.length - 1) * moduleSpacing) / 2;
  const moduleX = group.side === 'left' ? 13 : 87;

  return group.modules.map((mod, i) => ({
    ...mod,
    x: moduleX,
    y: startY + i * moduleSpacing,
    color: group.color,
  }));
}

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const cpOffset = Math.abs(dx) * 0.55;
  const cp1x = x1 + (dx > 0 ? cpOffset : -cpOffset);
  const cp2x = x2 - (dx > 0 ? cpOffset : -cpOffset);
  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}

/* ── Component ── */
type Props = {
  companies?: any[];
  onSelectCompany: (id: string) => void;
};

export default function Nodo360HubVisual({ companies = [], onSelectCompany }: Props) {
  return (
    <div className="space-y-8">
      {/* HEADER TEXTS */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-[0.2em] mb-2">Plataforma integral</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
          Un solo <span className="text-red-600 dark:text-red-500">nodo</span>, toda tu operación conectada
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed max-w-lg mx-auto">
          NODO360 centraliza emergencias, recursos, personal y administración de cada compañía de bomberos
          en tiempo real. Todo lo que necesitas, en un solo lugar.
        </p>
      </div>

      {/* ── SVG MIND MAP ── */}
      <div className="relative w-full max-w-5xl mx-auto" style={{ aspectRatio: '16/9' }}>
        {/* Subtle radial glow behind the center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 bg-red-400/10 dark:bg-red-600/15 rounded-full blur-3xl" />
        </div>

        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            {GROUPS.map(g => (
              <linearGradient key={`grad-${g.id}`} id={`grad-${g.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={g.color} stopOpacity="0.7" />
                <stop offset="100%" stopColor={g.color} stopOpacity="0.3" />
              </linearGradient>
            ))}
          </defs>

          {/* Center → Group connections (solid, thicker) */}
          {GROUPS.map(g => (
            <path
              key={`c-${g.id}`}
              d={cubicPath(CENTER.x, CENTER.y, g.x, g.y)}
              fill="none"
              stroke={g.color}
              strokeWidth="0.35"
              strokeOpacity="0.5"
            />
          ))}

          {/* Group → Module connections (dashed, thinner) */}
          {GROUPS.map(g => {
            const modules = getModulePositions(g);
            return modules.map((m, i) => (
              <path
                key={`m-${g.id}-${i}`}
                d={cubicPath(g.x, g.y, m.x, m.y)}
                fill="none"
                stroke={g.color}
                strokeWidth="0.2"
                strokeOpacity="0.4"
                strokeDasharray="1.2 0.8"
              />
            ));
          })}

          {/* Center → Bottom modules (dashed) */}
          {BOTTOM_MODULES.map((m, i) => {
            const bx = 38 + i * 12;
            const by = 88;
            return (
              <path
                key={`bot-${i}`}
                d={cubicPath(CENTER.x, CENTER.y, bx, by)}
                fill="none"
                stroke={m.color}
                strokeWidth="0.2"
                strokeOpacity="0.35"
                strokeDasharray="1 0.8"
              />
            );
          })}
        </svg>

        {/* ── CENTER NODE ── */}
        <div className="absolute z-40" style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%`, transform: 'translate(-50%, -50%)' }}>
          <div className="relative">
            {/* Ping rings */}
            <div className="absolute inset-0 rounded-full bg-red-500/25 animate-ping" style={{ animationDuration: '3s', transform: 'scale(1.8)' }} />
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s', transform: 'scale(2.4)' }} />
            {/* Main circle */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-[3px] border-red-300/60 shadow-2xl shadow-red-500/40 flex flex-col items-center justify-center">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 text-white drop-shadow-lg" />
              <span className="text-[10px] sm:text-xs md:text-sm font-black text-white tracking-widest mt-0.5">
                NODO<span className="text-red-200">360</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── GROUP NODES ── */}
        {GROUPS.map(g => {
          const Icon = g.icon;
          return (
            <div
              key={g.id}
              className="absolute z-20"
              style={{ left: `${g.x}%`, top: `${g.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-md border border-white/20"
                style={{ backgroundColor: g.color }}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">{g.label}</span>
              </div>
            </div>
          );
        })}

        {/* ── MODULE NODES ── */}
        {GROUPS.map(g => {
          const modules = getModulePositions(g);
          return modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                to={m.route}
                className="absolute z-30 group"
                style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all group-hover:border-slate-300 dark:group-hover:border-slate-500 group-hover:scale-105">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white whitespace-nowrap">
                    {m.label}
                  </span>
                  {/* Small connector dash */}
                  <span className="w-3 h-[2px] rounded-full opacity-30" style={{ backgroundColor: m.color }} />
                </div>
              </Link>
            );
          });
        })}

        {/* ── BOTTOM MODULES ── */}
        {BOTTOM_MODULES.map((m, i) => {
          const Icon = m.icon;
          const bx = 38 + i * 12;
          return (
            <Link
              key={m.label}
              to={m.route}
              className="absolute z-30 group"
              style={{ left: `${bx}%`, top: '88%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all group-hover:border-slate-300 dark:group-hover:border-slate-500 group-hover:scale-105">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white whitespace-nowrap">
                  {m.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── CUARTELES ── */}
      {companies.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Selecciona un cuartel para el panel operativo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {companies.map((c: any) => (
              <button
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                className="group flex flex-col justify-between p-4 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-red-600/10 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600/40 rounded-2xl text-left transition-all shadow-sm h-28"
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl font-black text-red-600 group-hover:text-red-700 transition-colors">
                    {c.number}ª
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-red-500 dark:group-hover:text-red-400 shrink-0 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{c.city}, {c.region}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Activa</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
