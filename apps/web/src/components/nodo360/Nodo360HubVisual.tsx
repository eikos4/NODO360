import { Link } from 'react-router-dom';
import {
  Zap, ShieldAlert, Siren, Bell, Megaphone, Building2, Users, Network, Flame,
  Package, Wrench, Gauge, Droplets, Shield, Calendar, FileText, ShoppingCart,
  DollarSign, HandCoins,   BarChart3, ChevronRight, Signpost, GraduationCap, Map, BookOpen, ClipboardCheck, Fuel, HeartPulse,
} from 'lucide-react';

const HUB_MODULES = [
  { label: 'Emergencias', icon: ShieldAlert, route: '/incidents', color: '#ef4444', group: 'Operaciones' },
  { label: 'Despacho360', icon: Siren, route: '/despacho360', color: '#f97316', group: 'Operaciones' },
  { label: 'Central Express', icon: Zap, route: '/central-express', color: '#8b5cf6', group: 'Operaciones' },
  { label: 'Central Parral', icon: Flame, route: '/central-despachos-parral', color: '#ea580c', group: 'Operaciones' },
  { label: 'Alertas', icon: Bell, route: '/alerts', color: '#eab308', group: 'Operaciones' },
  { label: 'Mapa 360', icon: Map, route: '/operational-map', color: '#06b6d4', group: 'Operaciones' },
  { label: 'Hidrantes', icon: Droplets, route: '/hydrants', color: '#0ea5e9', group: 'Operaciones' },
  { label: 'Planes', icon: Shield, route: '/emergency-plans', color: '#f43f5e', group: 'Operaciones' },
  { label: 'Simulacros', icon: Signpost, route: '/evacuation', color: '#ec4899', group: 'Operaciones' },
  { label: 'Inventario', icon: Package, route: '/inventory', color: '#f59e0b', group: 'Recursos' },
  { label: 'Auditoría', icon: ClipboardCheck, route: '/inventory-audits', color: '#8b5cf6', group: 'Recursos' },
  { label: 'Motores', icon: Gauge, route: '/motores', color: '#fb923c', group: 'Recursos' },
  { label: 'Libro flota', icon: Fuel, route: '/fleet-logs', color: '#f97316', group: 'Recursos' },
  { label: 'Mantención', icon: Wrench, route: '/maintenance', color: '#94a3b8', group: 'Recursos' },
  { label: 'Personal', icon: Users, route: '/users', color: '#8b5cf6', group: 'Institucional' },
  { label: 'Capacitación', icon: GraduationCap, route: '/training', color: '#a855f7', group: 'Institucional' },
  { label: 'Salud', icon: HeartPulse, route: '/health', color: '#8b5cf6', group: 'Institucional' },
  { label: 'Organigrama', icon: Network, route: '/organigrama', color: '#a78bfa', group: 'Institucional' },
  { label: 'Guardia', icon: Calendar, route: '/shifts', color: '#10b981', group: 'Institucional' },
  { label: 'Bitácora', icon: BookOpen, route: '/guard-log', color: '#34d399', group: 'Institucional' },
  { label: 'Comunicados', icon: Megaphone, route: '/announcements', color: '#c084fc', group: 'Institucional' },
  { label: 'Finanzas', icon: DollarSign, route: '/finance', color: '#22c55e', group: 'Administración' },
  { label: 'Cuotas', icon: HandCoins, route: '/membership', color: '#14b8a6', group: 'Administración' },
  { label: 'Compras', icon: ShoppingCart, route: '/purchases', color: '#f97316', group: 'Administración' },
  { label: 'Documentos', icon: FileText, route: '/documents', color: '#06b6d4', group: 'Administración' },
];

const GROUPS = [
  { name: 'Operaciones', color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/20' },
  { name: 'Recursos', color: 'text-amber-400', bg: 'bg-amber-600/10', border: 'border-amber-600/20' },
  { name: 'Institucional', color: 'text-purple-400', bg: 'bg-purple-600/10', border: 'border-purple-600/20' },
  { name: 'Administración', color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-600/20' },
];

type Props = {
  companies?: any[];
  onSelectCompany: (id: string) => void;
};

export default function Nodo360HubVisual({ companies = [], onSelectCompany }: Props) {
  const cx = 50;
  const cy = 50;
  const radius = 38;

  const nodes = HUB_MODULES.map((mod, i) => {
    const angle = (i / HUB_MODULES.length) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      ...mod,
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
    };
  });

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-red-400 uppercase tracking-[0.2em] mb-2">Plataforma integral</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          Un solo <span className="text-red-500">nodo</span>, toda tu operación conectada
        </h2>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          NODO360 centraliza emergencias, recursos, personal y administración de cada compañía de bomberos
          en tiempo real. Selecciona un cuartel para ver su panel o explora los módulos del ecosistema.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-3xl aspect-square max-h-[min(520px,80vw)]">
        <div className="absolute inset-[18%] rounded-full bg-red-600/10 blur-3xl animate-pulse" />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r="12" fill="url(#hubGlow)" />
          {nodes.map((node, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth="0.15"
              strokeOpacity="0.35"
              strokeDasharray="1 0.8"
            />
          ))}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#334155" strokeWidth="0.12" strokeDasharray="2 1.5" opacity="0.5" />
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping scale-150" style={{ animationDuration: '2.5s' }} />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 border-2 border-red-400/50 shadow-2xl shadow-red-600/40 flex flex-col items-center justify-center">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white mb-0.5" />
              <span className="text-[10px] sm:text-xs font-black text-white tracking-wider">NODO</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-red-200">360</span>
            </div>
          </div>
        </div>

        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <Link
              key={node.label}
              to={node.route}
              className="absolute z-10 group -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              title={node.label}
            >
              <div
                className="flex flex-col items-center gap-1"
                style={{ filter: `drop-shadow(0 0 8px ${node.color}40)` }}
              >
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center transition-all group-hover:border-white/30"
                  style={{
                    backgroundColor: `${node.color}18`,
                    borderColor: `${node.color}50`,
                  }}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: node.color }} />
                </div>
                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 group-hover:text-white whitespace-nowrap bg-slate-950/80 px-1.5 py-0.5 rounded-md">
                  {node.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
        {GROUPS.map(g => (
          <span key={g.name} className={`text-[10px] font-semibold px-3 py-1 rounded-full border ${g.bg} ${g.border} ${g.color}`}>
            {g.name}
          </span>
        ))}
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-400">
          {HUB_MODULES.length} módulos integrados
        </span>
      </div>

      {companies.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">Selecciona un cuartel para el panel operativo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c: any) => (
              <button
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                className="group flex items-center gap-3 p-4 bg-slate-800/60 hover:bg-red-600/10 border border-slate-700 hover:border-red-600/40 rounded-xl text-left transition-all"
              >
                <div className="w-11 h-11 bg-red-600/20 group-hover:bg-red-600 rounded-xl flex items-center justify-center text-red-400 group-hover:text-white font-bold text-sm shrink-0 transition-colors">
                  {c.number}ª
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-red-100">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.city}, {c.region}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-red-400 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {[
          { label: 'Módulos', value: `${HUB_MODULES.length}+`, sub: 'Ecosistema completo' },
          { label: 'Compañías', value: companies.length, sub: 'Cuarteles activos' },
          { label: 'Tiempo real', value: '24/7', sub: 'Datos sincronizados' },
          { label: 'Reportes BI', value: 'BI', sub: 'Analytics integrado', icon: BarChart3 },
        ].map(s => {
          const StatIcon = s.icon;
          return (
            <div key={s.label} className="text-center p-4 bg-slate-900 border border-slate-800 rounded-xl">
              {StatIcon && <StatIcon className="w-4 h-4 text-red-400 mx-auto mb-1" />}
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
