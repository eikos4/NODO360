import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Truck, Package, Clock,
  CheckCircle2, Siren, ChevronRight, LayoutDashboard,
  CalendarCheck, FileText, ShoppingCart,
  Wallet, Wrench, FlameKindling, BarChart3,
  TrendingUp, MapPin, Activity, Bell, BookOpen, ClipboardCheck, Fuel,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán / Oficial Operativo',
  ENCARGADO_MATERIAL: 'Encargado Material Mayor',
  SECRETARIO: 'Secretario/a',
  TESORERO: 'Tesorero/a',
  BOMBERO: 'Bombero Operativo',
  AUDITOR: 'Auditor / Inspector',
};

const ROLE_MODULES: Record<string, { label: string; path: string; icon: React.ElementType; color: string; desc: string }[]> = {
  SUPER_ADMIN: [
    { label: 'Compañías', path: '/companies', icon: Building2, color: 'text-blue-400', desc: 'Gestionar todas las compañías' },
    { label: 'Usuarios', path: '/users', icon: Users, color: 'text-emerald-400', desc: 'Administrar personal y roles' },
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Vehículos y equipamiento' },
    { label: 'Finanzas', path: '/finance', icon: Wallet, color: 'text-yellow-400', desc: 'Presupuesto y ejecución' },
    { label: 'Compras', path: '/purchases', icon: ShoppingCart, color: 'text-orange-400', desc: 'OC y facturación' },
    { label: 'Documentos', path: '/documents', icon: FileText, color: 'text-cyan-400', desc: 'Gestión documental' },
    { label: 'Emergencias', path: '/incidents', icon: FlameKindling, color: 'text-red-400', desc: 'Registro de incidentes' },
    { label: 'Mantención', path: '/maintenance', icon: Wrench, color: 'text-slate-400', desc: 'Mantención de flota' },
    { label: 'Turnos', path: '/shifts', icon: CalendarCheck, color: 'text-indigo-400', desc: 'Guardia y turnos' },
    { label: 'Bitácora', path: '/guard-log', icon: BookOpen, color: 'text-emerald-400', desc: 'Libro de guardia del día' },
    { label: 'Alertas', path: '/alerts', icon: Siren, color: 'text-red-400', desc: 'Vencimientos críticos' },
  ],
  COMANDANTE: [
    { label: 'Compañías', path: '/companies', icon: Building2, color: 'text-blue-400', desc: 'Vista general de compañías' },
    { label: 'Personal', path: '/users', icon: Users, color: 'text-emerald-400', desc: 'Personal activo' },
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Vehículos y equipamiento' },
    { label: 'Emergencias', path: '/incidents', icon: FlameKindling, color: 'text-red-400', desc: 'Registro de incidentes' },
    { label: 'Alertas', path: '/alerts', icon: Siren, color: 'text-red-400', desc: 'Vencimientos críticos' },
    { label: 'Turnos', path: '/shifts', icon: CalendarCheck, color: 'text-indigo-400', desc: 'Guardia y turnos' },
    { label: 'Bitácora', path: '/guard-log', icon: BookOpen, color: 'text-emerald-400', desc: 'Libro de guardia del día' },
  ],
  ENCARGADO_MATERIAL: [
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Vehículos y equipamiento' },
    { label: 'Auditoría física', path: '/inventory-audits', icon: ClipboardCheck, color: 'text-violet-400', desc: 'Conteo físico de inventario' },
    { label: 'Libro flota', path: '/fleet-logs', icon: Fuel, color: 'text-orange-400', desc: 'Combustible y operación diaria' },
    { label: 'Mantención', path: '/maintenance', icon: Wrench, color: 'text-slate-400', desc: 'Mantención de flota' },
    { label: 'Alertas', path: '/alerts', icon: Siren, color: 'text-red-400', desc: 'Vencimientos críticos' },
    { label: 'Compras', path: '/purchases', icon: ShoppingCart, color: 'text-orange-400', desc: 'Órdenes de compra' },
  ],
  SECRETARIO: [
    { label: 'Documentos', path: '/documents', icon: FileText, color: 'text-cyan-400', desc: 'Gestión documental' },
    { label: 'Personal', path: '/users', icon: Users, color: 'text-emerald-400', desc: 'Personal activo' },
    { label: 'Turnos', path: '/shifts', icon: CalendarCheck, color: 'text-indigo-400', desc: 'Guardia y turnos' },
    { label: 'Bitácora', path: '/guard-log', icon: BookOpen, color: 'text-emerald-400', desc: 'Libro de guardia del día' },
    { label: 'Compras', path: '/purchases', icon: ShoppingCart, color: 'text-orange-400', desc: 'Órdenes de compra' },
  ],
  TESORERO: [
    { label: 'Finanzas', path: '/finance', icon: Wallet, color: 'text-yellow-400', desc: 'Presupuesto y ejecución' },
    { label: 'Compras', path: '/purchases', icon: ShoppingCart, color: 'text-orange-400', desc: 'OC y facturación' },
    { label: 'Documentos', path: '/documents', icon: FileText, color: 'text-cyan-400', desc: 'Documentos financieros' },
  ],
  CAPITAN: [
    { label: 'Emergencias', path: '/incidents', icon: FlameKindling, color: 'text-red-400', desc: 'Registro de incidentes' },
    { label: 'Turnos', path: '/shifts', icon: CalendarCheck, color: 'text-indigo-400', desc: 'Guardia y turnos' },
    { label: 'Bitácora', path: '/guard-log', icon: BookOpen, color: 'text-emerald-400', desc: 'Libro de guardia del día' },
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Vehículos y equipamiento' },
    { label: 'Alertas', path: '/alerts', icon: Siren, color: 'text-red-400', desc: 'Vencimientos críticos' },
  ],
  BOMBERO: [
    { label: 'Turnos', path: '/shifts', icon: CalendarCheck, color: 'text-indigo-400', desc: 'Ver mi guardia' },
    { label: 'Bitácora', path: '/guard-log', icon: BookOpen, color: 'text-emerald-400', desc: 'Registrar novedades de guardia' },
    { label: 'Emergencias', path: '/incidents', icon: FlameKindling, color: 'text-red-400', desc: 'Registro de incidentes' },
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Equipamiento disponible' },
  ],
  AUDITOR: [
    { label: 'Auditoría física', path: '/inventory-audits', icon: ClipboardCheck, color: 'text-violet-400', desc: 'Conteo físico vs sistema' },
    { label: 'Inventario', path: '/inventory', icon: Package, color: 'text-purple-400', desc: 'Consulta de inventario' },
    { label: 'Documentos', path: '/documents', icon: FileText, color: 'text-cyan-400', desc: 'Revisión documental' },
    { label: 'Finanzas', path: '/finance', icon: Wallet, color: 'text-yellow-400', desc: 'Revisión presupuestaria' },
    { label: 'Alertas', path: '/alerts', icon: Siren, color: 'text-red-400', desc: 'Estado de vencimientos' },
  ],
};

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [selectedCia, setSelectedCia] = useState<string>('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedCia],
    queryFn: () => api.get('/dashboard/stats', { params: selectedCia ? { companyId: selectedCia } : {} }).then(r => r.data),
    refetchInterval: 30000,
  });
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });
  const { data: alerts } = useQuery({
    queryKey: ['alerts', selectedCia],
    queryFn: () => api.get('/alerts', { params: selectedCia ? { companyId: selectedCia } : {} }).then(r => r.data),
  });
  const { data: financeDash } = useQuery({
    queryKey: ['finance-dash'],
    queryFn: () => api.get('/finance/dashboard').then(r => r.data),
  });

  const role = user?.role ?? 'BOMBERO';
  const modules = ROLE_MODULES[role] ?? ROLE_MODULES['BOMBERO'];
  const totalExpired = alerts?.summary?.totalExpired ?? 0;
  const totalSoon = alerts?.summary?.totalExpiringSoon ?? 0;
  const allAlertItems = [
    ...(alerts?.expired?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'vehicle', variant: 'expired', dateStr: r.nextMaintenanceAt })),
    ...(alerts?.expired?.equipment ?? []).map((r: any) => ({ ...r, kind: 'equipment', variant: 'expired', dateStr: r.expiresAt })),
    ...(alerts?.expiringSoon?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'vehicle', variant: 'soon', dateStr: r.nextMaintenanceAt })),
    ...(alerts?.expiringSoon?.equipment ?? []).map((r: any) => ({ ...r, kind: 'equipment', variant: 'soon', dateStr: r.expiresAt })),
  ].sort((a, b) => daysUntil(a.dateStr) - daysUntil(b.dateStr)).slice(0, 5);

  const vehicleRate = stats?.vehicles?.total > 0 ? Math.round((stats.vehicles.operative / stats.vehicles.total) * 100) : 0;
  const equipRate   = stats?.equipment?.total > 0 ? Math.round((stats.equipment.operative / stats.equipment.total) * 100) : 0;
  const execRate    = financeDash?.budget?.executionRate ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'COMANDANTE';

  return (
    <div className="space-y-6">

      {/* Header bienvenida */}
      <div className="bg-gradient-to-r from-red-600/10 via-slate-900 to-slate-900 border border-red-600/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mb-1">NODO 360 — Plataforma Operativa</p>
          <h1 className="text-xl font-bold text-white">{greeting}, {user?.firstName} {user?.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-xs text-slate-300 font-medium">
              <Activity className="w-3 h-3 text-emerald-400" />
              {ROLE_LABELS[role] ?? role}
            </span>
            {user?.companyId && companies?.find((c: any) => c.id === user.companyId) && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-xs text-slate-400">
                <Building2 className="w-3 h-3" />
                Cía. {companies.find((c: any) => c.id === user.companyId)?.number}
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-red-600/10 border border-red-600/20 rounded-2xl">
          <FlameKindling className="w-8 h-8 text-red-400" />
        </div>
      </div>

      {/* Filtro por compañía (solo admins) */}
      {isSuperAdmin && companies?.length > 0 && (
        <div className="flex items-center gap-3">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCia('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${!selectedCia ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
              Todas las compañías
            </button>
            {companies.map((c: any) => (
              <button key={c.id} onClick={() => setSelectedCia(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${selectedCia === c.id ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                Cía. {c.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPIs principales */}
      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Compañías activas', value: stats?.companies ?? 0, icon: Building2, bg: 'bg-blue-600/10', border: 'border-blue-600/20', ic: 'text-blue-400', vc: 'text-blue-400', sub: 'Registradas en el sistema', to: '/companies' },
            { label: 'Personal activo', value: stats?.users ?? 0, icon: Users, bg: 'bg-emerald-600/10', border: 'border-emerald-600/20', ic: 'text-emerald-400', vc: 'text-emerald-400', sub: 'Bomberos registrados', to: '/users' },
            { label: 'Flota operativa', value: `${stats?.vehicles?.operative ?? 0} / ${stats?.vehicles?.total ?? 0}`, icon: Truck, bg: vehicleRate < 70 ? 'bg-orange-600/10' : 'bg-slate-800', border: vehicleRate < 70 ? 'border-orange-600/20' : 'border-slate-700', ic: 'text-orange-400', vc: vehicleRate < 70 ? 'text-orange-400' : 'text-white', sub: `${vehicleRate}% operativos`, to: '/inventory' },
            { label: 'Equipamiento', value: `${stats?.equipment?.operative ?? 0} / ${stats?.equipment?.total ?? 0}`, icon: Package, bg: 'bg-purple-600/10', border: 'border-purple-600/20', ic: 'text-purple-400', vc: 'text-purple-400', sub: `${equipRate}% operativo`, to: '/inventory' },
            { label: 'Alertas vencidas', value: totalExpired, icon: Siren, bg: totalExpired > 0 ? 'bg-red-600/10' : 'bg-slate-800', border: totalExpired > 0 ? 'border-red-600/30' : 'border-slate-700', ic: totalExpired > 0 ? 'text-red-400' : 'text-slate-500', vc: totalExpired > 0 ? 'text-red-400' : 'text-white', sub: 'Acción inmediata', to: '/alerts' },
            { label: 'Vencen en 30 días', value: totalSoon, icon: Clock, bg: totalSoon > 0 ? 'bg-yellow-600/10' : 'bg-slate-800', border: totalSoon > 0 ? 'border-yellow-600/20' : 'border-slate-700', ic: totalSoon > 0 ? 'text-yellow-400' : 'text-slate-500', vc: totalSoon > 0 ? 'text-yellow-400' : 'text-white', sub: 'Próximos a vencer', to: '/alerts' },
            { label: 'Ejecución presupuestaria', value: `${execRate}%`, icon: BarChart3, bg: execRate > 90 ? 'bg-red-600/10' : 'bg-slate-800', border: execRate > 90 ? 'border-red-600/20' : 'border-slate-700', ic: execRate > 90 ? 'text-red-400' : 'text-slate-400', vc: execRate > 90 ? 'text-red-400' : 'text-white', sub: `$${(financeDash?.budget?.totalExecuted ?? 0).toLocaleString('es-CL')} ejecutado`, to: '/finance' },
            { label: 'Total facturado', value: `$${(financeDash?.invoices?.amount ?? 0).toLocaleString('es-CL')}`, icon: Wallet, bg: 'bg-indigo-600/10', border: 'border-indigo-600/20', ic: 'text-indigo-400', vc: 'text-indigo-400', sub: `${financeDash?.invoices?.total ?? 0} facturas`, to: '/purchases' },
          ].map(s => (
            <Link key={s.label} to={s.to}
              className={`${s.bg} border ${s.border} rounded-2xl p-4 hover:brightness-110 transition-all group`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</p>
                <div className="w-7 h-7 bg-slate-900/50 rounded-lg flex items-center justify-center shrink-0">
                  <s.icon className={`w-3.5 h-3.5 ${s.ic}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${s.vc}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Barras de estado operativo */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Flota operativa', rate: vehicleRate, bar: vehicleRate >= 70 ? 'bg-emerald-500' : vehicleRate >= 40 ? 'bg-yellow-500' : 'bg-red-500', icon: Truck, color: 'text-slate-300' },
            { label: 'Equipamiento operativo', rate: equipRate, bar: equipRate >= 70 ? 'bg-emerald-500' : equipRate >= 40 ? 'bg-yellow-500' : 'bg-red-500', icon: Package, color: 'text-slate-300' },
            { label: 'Ejecución presupuestaria', rate: execRate, bar: execRate <= 70 ? 'bg-emerald-500' : execRate <= 90 ? 'bg-yellow-500' : 'bg-red-500', icon: TrendingUp, color: 'text-slate-300' },
          ].map(b => (
            <div key={b.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
                  <p className="text-xs font-medium text-slate-400">{b.label}</p>
                </div>
                <span className="text-sm font-bold text-white">{b.rate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-700 ${b.bar}`} style={{ width: `${Math.min(b.rate, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compañías overview */}
        {isSuperAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600/15 rounded-lg flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Compañías</h2>
              </div>
              <Link to="/companies" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {!companies?.length ? (
              <p className="text-sm text-slate-500 text-center py-8">Sin compañías registradas</p>
            ) : (
              <div className="space-y-1">
                {companies.slice(0, 6).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-300">{c.number}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{c.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-300">{c._count?.users ?? 0}</p>
                        <p className="text-[10px] text-slate-600">personal</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-300">{c._count?.vehicles ?? 0}</p>
                        <p className="text-[10px] text-slate-600">carros</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alertas activas */}
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${!isSuperAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalExpired > 0 ? 'bg-red-600/15' : 'bg-slate-800'}`}>
                <Bell className={`w-3.5 h-3.5 ${totalExpired > 0 ? 'text-red-400' : 'text-slate-500'}`} />
              </div>
              <h2 className="text-sm font-bold text-white">Alertas activas</h2>
              {(totalExpired + totalSoon) > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${totalExpired > 0 ? 'bg-red-600/20 text-red-400 border-red-600/30' : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'}`}>
                  {totalExpired + totalSoon}
                </span>
              )}
            </div>
            <Link to="/alerts" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {totalExpired === 0 && totalSoon === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">¡Todo al día!</p>
              <p className="text-xs text-slate-500">Sin alertas activas en este momento</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {allAlertItems.map((item: any) => {
                const days = daysUntil(item.dateStr);
                const isExpired = days < 0;
                return (
                  <div key={item.id + item.kind}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isExpired ? 'bg-red-600/5 border-red-600/20' : 'bg-yellow-600/5 border-yellow-600/20'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-600/20' : 'bg-yellow-600/20'}`}>
                      {item.kind === 'vehicle'
                        ? <Truck className={`w-3.5 h-3.5 ${isExpired ? 'text-red-400' : 'text-yellow-400'}`} />
                        : <Package className={`w-3.5 h-3.5 ${isExpired ? 'text-red-400' : 'text-yellow-400'}`} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {item.kind === 'vehicle' ? `${item.brand} ${item.model}` : item.name}
                      </p>
                      <p className="text-[10px] text-slate-500">Cía. {item.company?.number} — {item.company?.name}</p>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
                      {isExpired ? `−${Math.abs(days)}d` : `+${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Módulos por perfil */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-red-600/15 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-red-400" />
          </div>
          <h2 className="text-sm font-bold text-white">Accesos rápidos</h2>
          <span className="text-xs text-slate-500 ml-1">— Módulos disponibles para tu perfil</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {modules.map(m => (
            <Link key={m.path} to={m.path}
              className="group flex flex-col items-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-2xl transition-all text-center">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 group-hover:border-slate-500 transition-colors">
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">{m.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500" />
          BY KODESK.CL
        </span>
        <span>NODO 360 · Bomberos de Chile</span>
      </div>
    </div>
  );
}
