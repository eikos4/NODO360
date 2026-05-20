import { useState } from 'react';
import { createElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import {
  Building2, Users, Truck, ShieldAlert, Wallet, HandCoins,
  AlertTriangle, LayoutGrid, BarChart3, Table2,
  Globe, Wrench, Package, BookOpen, Fuel, ClipboardCheck,
  GraduationCap, Signpost, FileDown,
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { downloadPdf } from '../../lib/pdf/usePdfDownload';
import { Nodo360BiReport } from '../../lib/pdf/Nodo360BiReport';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const money = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CL')}`;

const tooltipStyle = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#e2e8f0', fontWeight: 600 },
  itemStyle: { color: '#94a3b8' },
};

function ChartCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 h-[280px]">{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

type Props = {
  companyId: string;
  companies: any[];
  onCompanyChange: (id: string) => void;
};

export default function Nodo360Reports({ companyId, companies, onCompanyChange }: Props) {
  const [reportTab, setReportTab] = useState<'actual' | 'charts'>('actual');
  const [chartScope, setChartScope] = useState<'global' | 'company'>('global');
  const [year, setYear] = useState(new Date().getFullYear());

  const queryCompanyId = chartScope === 'company' && companyId ? companyId : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['nodo360-reports', year, queryCompanyId],
    queryFn: () =>
      api.get('/nodo360/reports', {
        params: { year, ...(queryCompanyId ? { companyId: queryCompanyId } : {}) },
      }).then(r => r.data),
  });

  const selected = data?.companies?.find((c: any) => c.id === companyId) ?? data?.companies?.[0];
  const chartSource = chartScope === 'company' && selected ? selected.charts : data?.global;
  const snapshotSource = chartScope === 'company' && selected ? selected.snapshot : data?.global?.totals;
  const comparison = data?.global?.companiesComparison ?? [];
  const stacked = data?.global?.stackedIncidentsByCompany ?? [];
  const companyKeys = comparison.map((c: any) => c.label);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-5">
      {/* Sub-header reportes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setReportTab('actual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportTab === 'actual' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Table2 className="w-4 h-4" /> Información actual
          </button>
          <button
            onClick={() => setReportTab('charts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportTab === 'charts' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" /> Analytics BI
          </button>
        </div>

        <div className="flex items-center gap-2">
          {reportTab === 'charts' && (
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setChartScope('global')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${chartScope === 'global' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
              >
                <Globe className="w-3.5 h-3.5" /> Global
              </button>
              <button
                onClick={() => setChartScope('company')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${chartScope === 'company' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
              >
                <Building2 className="w-3.5 h-3.5" /> Por cuartel
              </button>
            </div>
          )}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {selected && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (!selected) return;
                downloadPdf(
                  createElement(Nodo360BiReport, {
                    company: selected,
                    year,
                    generatedAt: data?.generatedAt,
                  }),
                  `nodo360-bi-cia${selected.number}_${year}_${new Date().toISOString().slice(0, 10)}.pdf`,
                ).catch(() => toast.error('Error al generar PDF'));
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF compañía
            </button>
          )}
          {reportTab === 'charts' && chartScope === 'company' && (
            <select
              value={companyId}
              onChange={e => onCompanyChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 min-w-[180px]"
            >
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reportTab === 'actual' ? (
        <>
          {/* Tabla comparativa por compañía */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-red-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Estado operativo por compañía — {year}</h3>
                <p className="text-xs text-slate-500">Vista consolidada en tiempo real de todos los cuarteles</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
                    <th className="px-5 py-3">Compañía</th>
                    <th className="px-3 py-3">Personal</th>
                    <th className="px-3 py-3">Flota</th>
                    <th className="px-3 py-3">% Op.</th>
                    <th className="px-3 py-3">Emerg. año</th>
                    <th className="px-3 py-3">Mes</th>
                    <th className="px-3 py-3">Presup.</th>
                    <th className="px-3 py-3">Cuotas</th>
                    <th className="px-3 py-3">Bitácora</th>
                    <th className="px-3 py-3">Flota L</th>
                    <th className="px-3 py-3">Auditorías</th>
                    <th className="px-3 py-3">Cert. venc.</th>
                    <th className="px-3 py-3">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.companies ?? []).map((c: any) => (
                    <tr
                      key={c.id}
                      onClick={() => onCompanyChange(c.id)}
                      className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 ${c.id === companyId ? 'bg-red-600/5' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-white">Cía. {c.number}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{c.name}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{c.snapshot.personnel.active}/{c.snapshot.personnel.total}</td>
                      <td className="px-3 py-3 text-slate-300">{c.snapshot.fleet.total}</td>
                      <td className="px-3 py-3">
                        <span className={c.snapshot.fleet.operativeRate >= 80 ? 'text-emerald-400' : 'text-yellow-400'}>
                          {c.snapshot.fleet.operativeRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-red-400 font-medium">{c.snapshot.incidents.year}</td>
                      <td className="px-3 py-3 text-slate-400">{c.snapshot.incidents.thisMonth}</td>
                      <td className="px-3 py-3 text-slate-300">{c.snapshot.finance.execRate}%</td>
                      <td className="px-3 py-3 text-emerald-400">{money(c.snapshot.social.collected)}</td>
                      <td className="px-3 py-3 text-emerald-400">{c.snapshot.guardLog?.entries ?? 0}</td>
                      <td className="px-3 py-3 text-orange-400">{c.snapshot.fleetLog?.totalLiters ?? 0}</td>
                      <td className="px-3 py-3 text-violet-400">{c.snapshot.inventoryAudit?.closed ?? 0}</td>
                      <td className="px-3 py-3 text-amber-400">{c.snapshot.training?.expired ?? 0}</td>
                      <td className="px-3 py-3">
                        {c.snapshot.alerts > 0 ? (
                          <span className="text-red-400 font-semibold">{c.snapshot.alerts}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalle compañía seleccionada */}
          {selected && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Personal activo', value: selected.snapshot.personnel.active, icon: Users, color: 'text-blue-400' },
                { label: 'Flota operativa', value: `${selected.snapshot.fleet.operativo}/${selected.snapshot.fleet.total}`, icon: Truck, color: 'text-orange-400' },
                { label: 'Emergencias año', value: selected.snapshot.incidents.year, icon: ShieldAlert, color: 'text-red-400' },
                { label: 'Novedades bitácora', value: selected.snapshot.guardLog?.entries ?? 0, icon: BookOpen, color: 'text-emerald-400' },
                { label: 'Litros combustible', value: `${selected.snapshot.fleetLog?.totalLiters ?? 0} L`, icon: Fuel, color: 'text-orange-400' },
                { label: 'L/100 km prom.', value: selected.snapshot.fleetLog?.avgConsumptionLper100km ?? '—', icon: Fuel, color: 'text-violet-400' },
                { label: 'Auditorías cerradas', value: selected.snapshot.inventoryAudit?.closed ?? 0, icon: ClipboardCheck, color: 'text-violet-400' },
                { label: 'Certif. vencidas', value: selected.snapshot.training?.expired ?? 0, icon: GraduationCap, color: selected.snapshot.training?.expired > 0 ? 'text-red-400' : 'text-slate-400' },
                { label: 'Simulacros OK', value: selected.snapshot.drills?.executed ?? 0, icon: Signpost, color: 'text-pink-400' },
                { label: 'Presupuesto ejecutado', value: money(selected.snapshot.finance.executed), icon: Wallet, color: 'text-emerald-400' },
                { label: 'Cuotas recaudadas', value: money(selected.snapshot.social.collected), icon: HandCoins, color: 'text-teal-400' },
                { label: 'Alertas activas', value: selected.snapshot.alerts, icon: AlertTriangle, color: selected.snapshot.alerts > 0 ? 'text-red-400' : 'text-slate-400' },
              ].map(item => (
                <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Cía. {selected.number} — {selected.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* KPIs scope */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {chartScope === 'global' ? (
              <>
                <Kpi label="Compañías" value={data?.global?.companiesCount ?? 0} color="text-white" />
                <Kpi label="Emergencias" value={data?.global?.totals?.incidentsYear ?? 0} color="text-red-400" sub={`Año ${year}`} />
                <Kpi label="Novedades bitácora" value={data?.global?.totals?.guardLogEntries ?? 0} color="text-emerald-400" />
                <Kpi label="Litros flota" value={data?.global?.totals?.fleetLiters ?? 0} color="text-orange-400" />
                <Kpi label="Auditorías cerradas" value={data?.global?.totals?.auditsClosed ?? 0} color="text-violet-400" />
                <Kpi label="Certif. vencidas" value={data?.global?.totals?.certsExpired ?? 0} color="text-amber-400" />
                <Kpi label="Cuotas sociales" value={money(data?.global?.totals?.socialCollected ?? 0)} color="text-teal-400" />
                <Kpi label="Alertas" value={data?.global?.totals?.alerts ?? 0} color="text-yellow-400" />
              </>
            ) : selected ? (
              <>
                <Kpi label="Cuartel" value={`${selected.number}ª`} color="text-white" sub={selected.name} />
                <Kpi label="Emergencias" value={selected.snapshot.incidents.year} color="text-red-400" />
                <Kpi label="Bitácora" value={selected.snapshot.guardLog?.entries ?? 0} color="text-emerald-400" />
                <Kpi label="Combustible" value={`${selected.snapshot.fleetLog?.totalLiters ?? 0} L`} color="text-orange-400" />
                <Kpi label="Auditorías" value={selected.snapshot.inventoryAudit?.closed ?? 0} color="text-violet-400" />
                <Kpi label="Cert. vencidas" value={selected.snapshot.training?.expired ?? 0} color="text-amber-400" />
                <Kpi label="Cuotas" value={money(selected.snapshot.social.collected)} color="text-teal-400" />
                <Kpi label="Alertas" value={selected.snapshot.alerts} color="text-red-400" />
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Emergencias por mes */}
            <ChartCard title="Emergencias por mes" subtitle={`Intervenciones ${year}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSource?.incidentsByMonth ?? data?.global?.incidentsByMonth}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="#ef4444" fill="url(#incGrad)" strokeWidth={2} name="Emergencias" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Comparación entre compañías - solo global */}
            {chartScope === 'global' && comparison.length > 1 && (
              <ChartCard title="Comparación entre cuarteles" subtitle="Emergencias del año por compañía">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="incidents" name="Emergencias" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="personnel" name="Personal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Tipos de emergencia */}
            <ChartCard title="Tipos de emergencia" subtitle="Distribución por categoría">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartSource?.incidentsByType ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${String(name).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(chartSource?.incidentsByType ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Estado flota */}
            <ChartCard title="Estado de la flota" subtitle="Vehículos por condición">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartSource?.fleetStatus ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                    {(chartSource?.fleetStatus ?? []).map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Presupuesto */}
            <ChartCard title="Ejecución presupuestaria" subtitle="Planificado vs ejecutado por categoría" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartSource?.budgetByCategory ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="planned" name="Planificado" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="executed" name="Ejecutado" fill="#10b981" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Cuotas sociales */}
            <ChartCard title="Tesorería social" subtitle="Recaudación mensual de cuotas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSource?.contributionsByMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                  <Line type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6' }} name="Recaudado" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Mantención */}
            <ChartCard title="Costos de mantención" subtitle="Gasto mensual en talleres">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSource?.maintenanceByMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                  <Bar dataKey="amount" name="Costo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Stacked incidents global */}
            {chartScope === 'global' && stacked.length > 0 && companyKeys.length > 0 && (
              <ChartCard title="Tendencia por cuartel" subtitle="Emergencias mensuales apiladas" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stacked}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {companyKeys.map((key, i) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Hidrantes */}
            {(chartSource?.hydrantStatus ?? []).some((h: any) => h.value > 0) && (
              <ChartCard title="Red de hidrantes" subtitle="Estado operativo">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartSource.hydrantStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                      {chartSource.hydrantStatus.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Comparación radar-style horizontal - global metrics */}
            {(chartSource?.guardEntriesByMonth ?? []).some((m: any) => m.count > 0) && (
              <ChartCard title="Bitácora de guardia" subtitle="Novedades por mes">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSource.guardEntriesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="#34d399" fill="#34d39933" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {(chartSource?.fleetFuelByMonth ?? []).some((m: any) => m.amount > 0) && (
              <ChartCard title="Libro flota" subtitle="Litros combustible por mes">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSource.fleetFuelByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} L`, 'Litros']} />
                    <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {chartScope === 'company' && (chartSource?.fleetConsumptionByVehicle ?? []).some((v: any) => v.avgConsumptionLper100km != null) && (
              <ChartCard title="Consumo L/100 km" subtitle="Por patente">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSource.fleetConsumptionByVehicle.filter((v: any) => v.avgConsumptionLper100km != null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="patent" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} L/100km`, '']} />
                    <Bar dataKey="avgConsumptionLper100km" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {(chartSource?.auditByResult ?? []).length > 0 && (
              <ChartCard title="Auditoría física" subtitle="Resultados">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartSource.auditByResult} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                      {chartSource.auditByResult.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {(chartSource?.certByCategory ?? []).length > 0 && (
              <ChartCard title="Capacitación" subtitle="Por categoría">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSource.certByCategory} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} width={72} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {chartScope === 'global' && comparison.length > 0 && (
              <ChartCard title="Comparación operativa" subtitle="Emergencias, bitácora y litros" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="incidents" name="Emergencias" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="guardEntries" name="Novedades" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fleetLiters" name="Litros" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {chartScope === 'global' && (
              <ChartCard title="Indicadores por cuartel" subtitle="% ejecución presupuesto y flota operativa">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} width={55} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="fleetOperativePct" name="% Flota op." fill="#f97316" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="budgetExecRate" name="% Presupuesto" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}

      <div className="text-center text-[10px] text-slate-600">
        Datos generados {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('es-CL') : '—'} · NODO360 Analytics BI
      </div>
    </div>
  );
}
