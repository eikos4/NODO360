import { useState, createElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Truck, Package, ShieldAlert,
  Wrench, DollarSign, FileText, ShoppingCart, Bell,
  ChevronRight, Flame, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, TrendingDown, Activity,
  CalendarDays, MapPin, Zap, BarChart3, FileDown,
  Radio, Timer, Siren, Target, Wallet, LineChart,
} from 'lucide-react';
import { api } from '../lib/api';
import { downloadPdf } from '../lib/pdf/usePdfDownload';
import { Nodo360Report } from '../lib/pdf/Nodo360Report';
import Nodo360Reports from '../components/nodo360/Nodo360Reports';
import Nodo360HubVisual from '../components/nodo360/Nodo360HubVisual';

/* ── helpers ── */
const money  = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CL')}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'S.Admin', COMANDANTE: 'Cdte.', CAPITAN: 'Capitán',
  ENCARGADO_MATERIAL: 'Enc.Mat.', SECRETARIO: 'Secret.',
  TESORERO: 'Tesorero', BOMBERO: 'Bombero', AUDITOR: 'Auditor',
};

const STATUS_COLOR: Record<string, string> = {
  OPERATIVO: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EN_REPARACION: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  FUERA_DE_SERVICIO: 'bg-red-500/15 text-red-400 border-red-500/30',
};
const STATUS_LABEL: Record<string, string> = {
  OPERATIVO: 'Operativo', EN_REPARACION: 'En reparación', FUERA_DE_SERVICIO: 'Fuera de servicio',
};

/* ── mini bar chart ── */
function MiniBar({ value, max, color = 'bg-red-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{value}</span>
    </div>
  );
}

/* ── sparkline mensual ── */
function MonthChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-14">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full bg-red-600/70 rounded-sm transition-all hover:bg-red-500"
            style={{ height: `${Math.max((d.count / max) * 48, d.count > 0 ? 4 : 0)}px` }}
            title={`${d.month}: ${d.count}`}
          />
          <span className="text-[8px] text-slate-600">{d.month.slice(0, 1)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({
  label, value, sub, icon: Icon, iconColor, bg, border, trend, trendVal,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconColor: string; bg: string; border: string;
  trend?: 'up' | 'down' | 'neutral'; trendVal?: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {trendVal && (
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
          <span className={`text-[11px] font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>{trendVal}</span>
        </div>
      )}
    </div>
  );
}

/* ── Section card ── */
function Section({ title, icon: Icon, color, children, linkTo, linkLabel }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode; linkTo?: string; linkLabel?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
            {linkLabel ?? 'Ver todo'}<ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Donut-like stat row ── */
function StatRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-semibold text-white">{value} <span className="text-slate-600">({pct}%)</span></span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function Nodo360Page() {
  const [section, setSection] = useState<'panel' | 'reports'>('panel');
  const [selectedId, setSelectedId] = useState<string>('');

  const { data: companies, isLoading: loadingCias } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });

  const enabled = !!selectedId;

  const { data: allUsers,      isLoading: lU } = useQuery({ queryKey: ['users'],          queryFn: () => api.get('/users').then(r => r.data),          enabled });
  const { data: allVehicles,   isLoading: lV } = useQuery({ queryKey: ['vehicles'],        queryFn: () => api.get('/vehicles').then(r => r.data),        enabled });
  const { data: allEquipment,  isLoading: lE } = useQuery({ queryKey: ['equipment'],       queryFn: () => api.get('/equipment').then(r => r.data),       enabled });
  const { data: allIncidents,  isLoading: lI } = useQuery({ queryKey: ['incidents'],       queryFn: () => api.get('/incidents').then(r => r.data),       enabled });
  const { data: allMaint,      isLoading: lM } = useQuery({ queryKey: ['maintenances'],    queryFn: () => api.get('/maintenance').then(r => r.data),     enabled });
  const { isLoading: lA } = useQuery({ queryKey: ['alerts'],          queryFn: () => api.get('/alerts').then(r => r.data),          enabled });
  const { data: allBudgets,    isLoading: lF } = useQuery({ queryKey: ['budgets', new Date().getFullYear()], queryFn: () => api.get('/finance/budgets', { params: { year: new Date().getFullYear() } }).then(r => r.data), enabled });
  const { data: allDocs,       isLoading: lD } = useQuery({ queryKey: ['documents'],       queryFn: () => api.get('/documents').then(r => r.data),       enabled });
  const { data: allPurchases,  isLoading: lP } = useQuery({ queryKey: ['purchases'],       queryFn: () => api.get('/purchases').then(r => r.data),       enabled });

  const loadingPanel = lU || lV || lE || lI || lM || lA || lF || lD || lP;

  /* ── Filtrar todo por compañía seleccionada ── */
  const company    = (companies ?? []).find((c: any) => c.id === selectedId);
  const cUsers     = (allUsers     ?? []).filter((x: any) => x.companyId     === selectedId);
  const cVehicles  = (allVehicles  ?? []).filter((x: any) => x.companyId     === selectedId);
  const cEquip     = (allEquipment ?? []).filter((x: any) => x.companyId     === selectedId);
  const cIncidents = (allIncidents ?? []).filter((x: any) => x.companyId     === selectedId);
  const cMaint     = (allMaint     ?? []).filter((x: any) => x.vehicle?.companyId === selectedId);
  const cBudgets   = (allBudgets   ?? []).filter((x: any) => x.companyId     === selectedId);
  const cDocs      = (allDocs      ?? []).filter((x: any) => x.companyId     === selectedId || !x.companyId);
  const cPurchases = (allPurchases ?? []).filter((x: any) => x.companyId     === selectedId);

  const now       = new Date();
  const in30days  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear  = new Date(now.getFullYear(), 0, 1);

  /* ── Calcular stats ── */
  const activeUsers = cUsers.filter((u: any) => u.isActive).length;
  const roleCounts  = cUsers.reduce((acc: any, u: any) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; }, {});

  const vOp   = cVehicles.filter((v: any) => v.status === 'OPERATIVO').length;
  const vRep  = cVehicles.filter((v: any) => v.status === 'EN_REPARACION').length;
  const vFs   = cVehicles.filter((v: any) => v.status === 'FUERA_DE_SERVICIO').length;
  const vExpM = cVehicles.filter((v: any) => v.nextMaintenanceAt && new Date(v.nextMaintenanceAt) < now).length;
  const vSoonM= cVehicles.filter((v: any) => v.nextMaintenanceAt && new Date(v.nextMaintenanceAt) >= now && new Date(v.nextMaintenanceAt) <= in30days).length;
  const vTypes = cVehicles.reduce((acc: any, v: any) => { acc[v.type] = (acc[v.type] ?? 0) + 1; return acc; }, {});

  const eOp    = cEquip.filter((e: any) => e.status === 'OPERATIVO').length;
  const eRep   = cEquip.filter((e: any) => e.status === 'EN_REPARACION').length;
  const eFs    = cEquip.filter((e: any) => e.status === 'FUERA_DE_SERVICIO').length;
  const eExp   = cEquip.filter((e: any) => e.expiresAt && new Date(e.expiresAt) < now).length;
  const eSoon  = cEquip.filter((e: any) => e.expiresAt && new Date(e.expiresAt) >= now && new Date(e.expiresAt) <= in30days).length;
  const eCats  = cEquip.reduce((acc: any, e: any) => { acc[e.category] = (acc[e.category] ?? 0) + (e.quantity ?? 1); return acc; }, {});

  const incThisMonth = cIncidents.filter((i: any) => new Date(i.dispatchedAt) >= startOfMonth).length;
  const incThisYear  = cIncidents.filter((i: any) => new Date(i.dispatchedAt) >= startOfYear).length;
  const incOpen      = cIncidents.filter((i: any) => !i.closedAt).length;
  const incByType    = cIncidents.reduce((acc: any, i: any) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; }, {});
  const incByMonth   = Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(now.getFullYear(), idx, 1);
    return { month: d.toLocaleString('es-CL', { month: 'short' }), count: cIncidents.filter((i: any) => new Date(i.dispatchedAt).getMonth() === idx).length };
  });

  const maintCost     = cMaint.reduce((s: number, m: any) => s + (m.cost ?? 0), 0);
  const maintYearCost = cMaint.filter((m: any) => new Date(m.date) >= startOfYear).reduce((s: number, m: any) => s + (m.cost ?? 0), 0);

  const totalPlanned  = cBudgets.reduce((s: number, b: any) => s + Number(b.planned ?? 0), 0);
  const totalExecF    = cBudgets.reduce((s: number, b: any) => s + Number(b.executed ?? 0), 0);
  const execRate      = totalPlanned > 0 ? Math.round((totalExecF / totalPlanned) * 100) : 0;
  const budgetByCat   = cBudgets.map((b: any) => ({ category: b.category, planned: Number(b.planned), executed: Number(b.executed) }));

  const pendingPurch  = cPurchases.filter((p: any) => p.status === 'PENDIENTE').length;
  const approvedPurch = cPurchases.filter((p: any) => p.status === 'APROBADA').length;
  const purchTotal    = cPurchases.reduce((s: number, p: any) => s + Number(p.totalAmount ?? 0), 0);

  const expiredDocCount = cDocs.filter((d: any) => d.expiresAt && new Date(d.expiresAt) < now).length;

  const alertExpVeh  = vExpM;
  const alertSoonVeh = vSoonM;
  const alertExpEqp  = eExp;
  const alertSoonEqp = eSoon;
  const alertExpDoc  = expiredDocCount;
  const alertTotal   = alertExpVeh + alertSoonVeh + alertExpEqp + alertSoonEqp + alertExpDoc;

  /* ── Estructuras para la vista ── */
  const users     = { list: cUsers,     stats: { total: cUsers.length, active: activeUsers, roleCounts } };
  const vehicles  = { list: cVehicles,  stats: { total: cVehicles.length, operativo: vOp, enReparacion: vRep, fueraDeServicio: vFs, expiredMaint: vExpM, soonMaint: vSoonM, byType: vTypes } };
  const equip     = { list: cEquip,     stats: { total: cEquip.length, operativo: eOp, enReparacion: eRep, fueraDeServicio: eFs, expired: eExp, expiringSoon: eSoon, byCategory: eCats } };
  const incidents = { recent: [...cIncidents].sort((a: any, b: any) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()).slice(0, 10), stats: { total: cIncidents.length, thisMonth: incThisMonth, thisYear: incThisYear, open: incOpen, byType: incByType, byMonth: incByMonth } };
  const maint     = { recent: [...cMaint].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5), stats: { total: cMaint.length, thisYear: cMaint.filter((m: any) => new Date(m.date) >= startOfYear).length, totalCost: maintCost, yearCost: maintYearCost } };
  const finance   = { budgets: cBudgets, stats: { totalPlanned, totalExecuted: totalExecF, remaining: totalPlanned - totalExecF, execRate, byCategory: budgetByCat } };
  const docs      = { recent: [...cDocs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) };
  const purchases = { recent: [...cPurchases].sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()).slice(0, 5), stats: { total: cPurchases.length, pending: pendingPurch, approved: approvedPurch, totalAmount: purchTotal } };
  const alerts    = { expiredVehicles: alertExpVeh, soonVehicles: alertSoonVeh, expiredEquipment: alertExpEqp, soonEquipment: alertSoonEqp, expiredDocuments: alertExpDoc, total: alertTotal };

  const panel     = enabled && !loadingPanel ? true : null;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">NODO360</h1>
            <p className="text-sm text-slate-400">
              {section === 'panel' ? 'Panel unificado por compañía' : 'Centro de reportes y analytics BI'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSection('panel')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${section === 'panel' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Target className="w-3.5 h-3.5" /> Panel operativo
            </button>
            <button
              onClick={() => setSection('reports')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${section === 'reports' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LineChart className="w-3.5 h-3.5" /> Reportes BI
            </button>
          </div>
          {/* Selector de compañía */}
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 transition-colors min-w-[220px]"
          >
            <option value="">— Seleccionar compañía —</option>
            {(companies ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª Cía. — {c.name}</option>
            ))}
          </select>

          {/* Exportar PDF */}
          {section === 'panel' && panel && (
            <button
              onClick={() => downloadPdf(
                createElement(Nodo360Report, {
                  company, users, vehicles, equip, incidents, maint, finance, docs, purchases, alerts,
                }),
                `nodo360_cia_${company?.number}_${company?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <FileDown className="w-4 h-4" />PDF
            </button>
          )}
        </div>
      </div>

      {/* ── REPORTES BI ── */}
      {section === 'reports' && (
        <Nodo360Reports
          companyId={selectedId || companies?.[0]?.id || ''}
          companies={companies ?? []}
          onCompanyChange={setSelectedId}
        />
      )}

      {/* ── Hub visual ── */}
      {section === 'panel' && !selectedId && (
        <Nodo360HubVisual
          companies={companies ?? []}
          onSelectCompany={id => {
            setSelectedId(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* ── LOADING ── */}
      {section === 'panel' && selectedId && loadingPanel && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {/* ══ PANEL PRINCIPAL ══ */}
      {section === 'panel' && panel && !loadingPanel && (
        <>
          {/* ── Banner compañía ── */}
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-600/30">
                  {company?.number}ª
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{company?.name}</h2>
                  <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />{company?.city}, {company?.region}
                  </p>
                  {company?.phone && <p className="text-slate-500 text-xs mt-0.5">📞 {company.phone}</p>}
                </div>
              </div>
              {alertTotal > 0 && (
                <div className="flex items-center gap-2 bg-red-600/15 border border-red-600/30 rounded-xl px-4 py-3">
                  <Siren className="w-5 h-5 text-red-400 animate-pulse" />
                  <div>
                    <p className="text-red-400 font-bold text-sm">{alertTotal} alerta{alertTotal !== 1 ? 's' : ''} activa{alertTotal !== 1 ? 's' : ''}</p>
                    <p className="text-red-500/70 text-xs">Requieren atención</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPIs principales ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiCard label="Personal activo" value={users?.stats?.active ?? 0}
              sub={`de ${users?.stats?.total ?? 0} totales`}
              icon={Users} iconColor="text-blue-400" bg="bg-blue-600/10" border="border-blue-600/20" />
            <KpiCard label="Vehículos" value={vehicles?.stats?.total ?? 0}
              sub={`${vehicles?.stats?.operativo ?? 0} operativos`}
              icon={Truck} iconColor="text-orange-400" bg="bg-orange-600/10" border="border-orange-600/20" />
            <KpiCard label="Equipamiento" value={equip?.stats?.total ?? 0}
              sub={`${equip?.stats?.expired ?? 0} vencidos`}
              icon={Package} iconColor="text-purple-400" bg="bg-purple-600/10" border="border-purple-600/20" />
            <KpiCard label="Emergencias mes" value={incidents?.stats?.thisMonth ?? 0}
              sub={`${incidents?.stats?.total ?? 0} históricas`}
              icon={ShieldAlert} iconColor="text-red-400" bg="bg-red-600/10" border="border-red-600/20" />
            <KpiCard label="En curso" value={incidents?.stats?.open ?? 0}
              sub="Emergencias abiertas"
              icon={Radio} iconColor="text-yellow-400" bg="bg-yellow-600/10" border="border-yellow-600/20" />
            <KpiCard label="Mantenciones" value={maint?.stats?.thisYear ?? 0}
              sub={`Costo: ${money(maint?.stats?.yearCost ?? 0)}`}
              icon={Wrench} iconColor="text-slate-300" bg="bg-slate-800" border="border-slate-700" />
            <KpiCard label="Presupuesto" value={`${finance?.stats?.execRate ?? 0}%`}
              sub={`Ejec. ${money(finance?.stats?.totalExecuted ?? 0)}`}
              icon={Wallet} iconColor="text-emerald-400" bg="bg-emerald-600/10" border="border-emerald-600/20" />
            <KpiCard label="Alertas críticas" value={alertTotal}
              sub={`${alerts?.expiredVehicles ?? 0} veh. + ${alerts?.expiredEquipment ?? 0} EPP`}
              icon={Bell} iconColor={alertTotal > 0 ? 'text-red-400' : 'text-slate-400'}
              bg={alertTotal > 0 ? 'bg-red-600/10' : 'bg-slate-800'}
              border={alertTotal > 0 ? 'border-red-600/30' : 'border-slate-700'} />
          </div>

          {/* ── FILA 2: Personal + Vehículos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Personal */}
            <Section title="Personal" icon={Users} color="bg-blue-600" linkTo="/users" linkLabel="Ver personal">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Distribución por rol</span>
                  <span className="text-white font-semibold">{users?.stats?.total ?? 0} total</span>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(users?.stats?.roleCounts ?? {}).map(([role, count]) => (
                    <StatRow key={role} label={ROLE_LABELS[role] ?? role} value={count as number}
                      total={users?.stats?.total ?? 0} color="bg-blue-500" />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{users?.stats?.active ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Activos</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-slate-400">{(users?.stats?.total ?? 0) - (users?.stats?.active ?? 0)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Inactivos</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Vehículos */}
            <Section title="Flota Vehicular" icon={Truck} color="bg-orange-600" linkTo="/inventory" linkLabel="Ver inventario">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <StatRow label="Operativos" value={vehicles?.stats?.operativo ?? 0} total={vehicles?.stats?.total ?? 0} color="bg-emerald-500" />
                  <StatRow label="En reparación" value={vehicles?.stats?.enReparacion ?? 0} total={vehicles?.stats?.total ?? 0} color="bg-yellow-500" />
                  <StatRow label="Fuera de servicio" value={vehicles?.stats?.fueraDeServicio ?? 0} total={vehicles?.stats?.total ?? 0} color="bg-red-500" />
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Por tipo</p>
                  <div className="space-y-1.5">
                    {Object.entries(vehicles?.stats?.byType ?? {}).slice(0, 5).map(([type, count]) => (
                      <MiniBar key={type} value={count as number} max={vehicles?.stats?.total ?? 1} color="bg-orange-500" />
                    ))}
                  </div>
                </div>
                {(vehicles?.stats?.expiredMaint ?? 0) + (vehicles?.stats?.soonMaint ?? 0) > 0 && (
                  <div className="flex gap-2">
                    {(vehicles?.stats?.expiredMaint ?? 0) > 0 && (
                      <div className="flex-1 bg-red-600/10 border border-red-600/20 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-red-400">{vehicles.stats.expiredMaint}</p>
                        <p className="text-[10px] text-slate-500">Mant. vencida</p>
                      </div>
                    )}
                    {(vehicles?.stats?.soonMaint ?? 0) > 0 && (
                      <div className="flex-1 bg-orange-600/10 border border-orange-600/20 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-orange-400">{vehicles.stats.soonMaint}</p>
                        <p className="text-[10px] text-slate-500">Mant. próxima</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* ── FILA 3: Emergencias (chart) + Equipamiento ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Emergencias */}
            <Section title="Emergencias" icon={ShieldAlert} color="bg-red-600" linkTo="/incidents" linkLabel="Ver emergencias">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total año', value: incidents?.stats?.thisYear ?? 0, color: 'text-white' },
                    { label: 'Este mes', value: incidents?.stats?.thisMonth ?? 0, color: 'text-blue-400' },
                    { label: 'En curso', value: incidents?.stats?.open ?? 0, color: 'text-yellow-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Gráfico de barras mensual */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Emergencias por mes — {new Date().getFullYear()}</p>
                  <MonthChart data={incidents?.stats?.byMonth ?? []} />
                </div>
                {/* Top tipos */}
                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  <p className="text-xs text-slate-500 mb-2">Tipos más frecuentes</p>
                  {Object.entries(incidents?.stats?.byType ?? {})
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 4)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate max-w-[65%]">{type}</span>
                        <span className="text-red-400 font-semibold">{String(count)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </Section>

            {/* Equipamiento */}
            <Section title="Equipamiento EPP" icon={Package} color="bg-purple-600" linkTo="/inventory" linkLabel="Ver inventario">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <StatRow label="Operativo" value={equip?.stats?.operativo ?? 0} total={equip?.stats?.total ?? 0} color="bg-emerald-500" />
                  <StatRow label="En reparación" value={equip?.stats?.enReparacion ?? 0} total={equip?.stats?.total ?? 0} color="bg-yellow-500" />
                  <StatRow label="Fuera de servicio" value={equip?.stats?.fueraDeServicio ?? 0} total={equip?.stats?.total ?? 0} color="bg-red-500" />
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Por categoría</p>
                  <div className="space-y-1.5">
                    {Object.entries(equip?.stats?.byCategory ?? {}).slice(0, 5).map(([cat, qty]) => (
                      <MiniBar key={cat} value={qty as number} max={equip?.stats?.total ?? 1} color="bg-purple-500" />
                    ))}
                  </div>
                </div>
                {(equip?.stats?.expired ?? 0) + (equip?.stats?.expiringSoon ?? 0) > 0 && (
                  <div className="flex gap-2">
                    {(equip?.stats?.expired ?? 0) > 0 && (
                      <div className="flex-1 bg-red-600/10 border border-red-600/20 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-red-400">{equip.stats.expired}</p>
                        <p className="text-[10px] text-slate-500">EPP vencido</p>
                      </div>
                    )}
                    {(equip?.stats?.expiringSoon ?? 0) > 0 && (
                      <div className="flex-1 bg-orange-600/10 border border-orange-600/20 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-orange-400">{equip.stats.expiringSoon}</p>
                        <p className="text-[10px] text-slate-500">Vence pronto</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* ── FILA 4: Finanzas + Alertas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Finanzas */}
            <Section title="Finanzas" icon={DollarSign} color="bg-emerald-700" linkTo="/finance" linkLabel="Ver finanzas">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500">Presupuesto</p>
                    <p className="text-base font-bold text-white mt-0.5">{money(finance?.stats?.totalPlanned ?? 0)}</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500">Ejecutado</p>
                    <p className="text-base font-bold text-red-400 mt-0.5">{money(finance?.stats?.totalExecuted ?? 0)}</p>
                  </div>
                </div>
                {/* Barra de ejecución */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Tasa de ejecución</span>
                    <span className={`font-bold ${
                      (finance?.stats?.execRate ?? 0) > 90 ? 'text-red-400' :
                      (finance?.stats?.execRate ?? 0) > 70 ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>{finance?.stats?.execRate ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (finance?.stats?.execRate ?? 0) > 90 ? 'bg-red-500' :
                        (finance?.stats?.execRate ?? 0) > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(finance?.stats?.execRate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  <p className="text-xs text-slate-500 mb-2">Por categoría</p>
                  {(finance?.stats?.byCategory ?? []).slice(0, 4).map((b: any) => {
                    const r = b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0;
                    return (
                      <div key={b.category} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 w-28 truncate">{b.category}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r}%` }} />
                        </div>
                        <span className="text-slate-500 w-8 text-right">{r}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* Alertas */}
            <Section title="Alertas y Vencimientos" icon={Bell} color="bg-red-700" linkTo="/alerts" linkLabel="Ver alertas">
              <div className="space-y-3">
                {alertTotal === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    <p className="text-emerald-400 font-semibold text-sm">Todo al día</p>
                    <p className="text-slate-500 text-xs">Sin alertas activas</p>
                  </div>
                ) : (
                  <>
                    {[
                      { label: 'Mantenciones vencidas', value: alerts?.expiredVehicles ?? 0, icon: Truck, color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/20' },
                      { label: 'Mantenciones próximas', value: alerts?.soonVehicles ?? 0, icon: Truck, color: 'text-orange-400', bg: 'bg-orange-600/10', border: 'border-orange-600/20' },
                      { label: 'EPP vencido', value: alerts?.expiredEquipment ?? 0, icon: Package, color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/20' },
                      { label: 'EPP próximo a vencer', value: alerts?.soonEquipment ?? 0, icon: Package, color: 'text-orange-400', bg: 'bg-orange-600/10', border: 'border-orange-600/20' },
                      { label: 'Documentos vencidos', value: alerts?.expiredDocuments ?? 0, icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-600/10', border: 'border-yellow-600/20' },
                    ].filter(a => a.value > 0).map(a => (
                      <div key={a.label} className={`flex items-center justify-between ${a.bg} border ${a.border} rounded-xl px-4 py-3`}>
                        <div className="flex items-center gap-2.5">
                          <a.icon className={`w-4 h-4 ${a.color}`} />
                          <span className="text-sm text-slate-300">{a.label}</span>
                        </div>
                        <span className={`text-lg font-bold ${a.color}`}>{a.value}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Section>
          </div>

          {/* ── FILA 5: Emergencias recientes + Mantenciones ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Emergencias recientes */}
            <Section title="Últimas Emergencias" icon={ShieldAlert} color="bg-red-600" linkTo="/incidents">
              <div className="space-y-2">
                {(incidents?.recent ?? []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Sin emergencias registradas</p>
                ) : (
                  (incidents?.recent ?? []).slice(0, 5).map((inc: any) => (
                    <div key={inc.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 bg-red-600/15 rounded-lg flex items-center justify-center shrink-0">
                          <Flame className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{inc.type}</p>
                          <p className="text-xs text-slate-500 truncate">{inc.address}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${inc.closedAt ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'bg-yellow-600/10 text-yellow-400 border-yellow-600/20'}`}>
                          {inc.closedAt ? 'Cerrado' : 'Activo'}
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">{fmtDate(inc.dispatchedAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Mantenciones recientes */}
            <Section title="Mantenciones Recientes" icon={Wrench} color="bg-slate-600" linkTo="/maintenance">
              <div className="space-y-2">
                {(maint?.recent ?? []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Sin mantenciones registradas</p>
                ) : (
                  (maint?.recent ?? []).slice(0, 5).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{m.vehicle?.patent} — {m.vehicle?.brand} {m.vehicle?.model}</p>
                          <p className="text-xs text-slate-500 truncate">{m.type}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {m.cost && <p className="text-xs font-semibold text-emerald-400">{money(m.cost)}</p>}
                        <p className="text-xs text-slate-600">{fmtDate(m.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>

          {/* ── FILA 6: Compras + Documentos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Compras */}
            <Section title="Compras y OC" icon={ShoppingCart} color="bg-amber-700" linkTo="/purchases">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total OC', value: purchases?.stats?.total ?? 0, color: 'text-white' },
                    { label: 'Pendientes', value: purchases?.stats?.pending ?? 0, color: 'text-yellow-400' },
                    { label: 'Aprobadas', value: purchases?.stats?.approved ?? 0, color: 'text-emerald-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-right">Total monto: <span className="text-white font-semibold">{money(purchases?.stats?.totalAmount ?? 0)}</span></p>
                <div className="space-y-1.5">
                  {(purchases?.recent ?? []).slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
                      <span className="text-slate-300 truncate max-w-[60%]">{p.description}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                        p.status === 'APROBADA' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' :
                        p.status === 'PENDIENTE' ? 'bg-yellow-600/10 text-yellow-400 border-yellow-600/20' :
                        p.status === 'RECIBIDA'  ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' :
                        'bg-red-600/10 text-red-400 border-red-600/20'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Documentos */}
            <Section title="Documentos" icon={FileText} color="bg-cyan-700" linkTo="/documents">
              <div className="space-y-2">
                {(docs?.recent ?? []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Sin documentos</p>
                ) : (
                  (docs?.recent ?? []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 bg-cyan-600/15 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.category}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {d.expiresAt && new Date(d.expiresAt) < new Date() ? (
                          <span className="text-xs bg-red-600/10 text-red-400 border border-red-600/20 px-2 py-0.5 rounded-full">Vencido</span>
                        ) : (
                          <p className="text-xs text-slate-600">{fmtDate(d.createdAt)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>

        </>
      )}
    </div>
  );
}
