import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fuel, Plus, Trash2, Pencil, Truck, Gauge, User,
  Wrench, Search, FileDown, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { createElement } from 'react';
import { FleetLogReport } from '../lib/pdf/FleetLogReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

type Tab = 'resumen' | 'registro' | 'historial';
type LogType = 'COMBUSTIBLE' | 'SERVICIO' | 'OPERACION' | 'OTRO';

const TYPE_META: Record<LogType, { label: string; badge: string; icon: typeof Fuel }> = {
  COMBUSTIBLE: { label: 'Combustible', badge: 'bg-orange-600/20 text-orange-400 border-orange-500/30', icon: Fuel },
  SERVICIO: { label: 'Servicio', badge: 'bg-sky-600/20 text-sky-400 border-sky-500/30', icon: Wrench },
  OPERACION: { label: 'Operación', badge: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30', icon: Truck },
  OTRO: { label: 'Otro', badge: 'bg-slate-600/20 text-slate-400 border-slate-500/30', icon: Gauge },
};

const SERVICE_PRESETS = [
  'Carga diésel', 'Carga bencina', 'Lavado carro', 'Revisión pre-salida',
  'Cambio de aceite', 'Revisión neumáticos', 'Engrase', 'Otro',
];

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-orange-500';

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const money = (n?: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';

const EMPTY = {
  type: 'COMBUSTIBLE' as LogType,
  date: new Date().toISOString().slice(0, 16),
  vehicleId: '',
  driverId: '',
  odometerKm: '',
  fuelLiters: '',
  fuelCost: '',
  fuelStation: '',
  fullTank: true,
  serviceLabel: 'Carga diésel',
  description: '',
  notes: '',
};

export default function FleetLogPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL'].includes(user?.role ?? '');
  const canCreate = ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'CAPITAN', 'BOMBERO'].includes(user?.role ?? '');

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('resumen');
  const [companyFilter, setCompanyFilter] = useState(user?.companyId ?? '');
  const [vehicleFilter, setVehicleFilter] = useState(searchParams.get('vehicleId') ?? '');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['fleet-logs-stats', companyFilter, vehicleFilter],
    queryFn: () =>
      api.get('/fleet-logs/stats', {
        params: { companyId: companyFilter || undefined, vehicleId: vehicleFilter || undefined },
      }).then((r) => r.data),
  });

  const { data: consumptionChart } = useQuery({
    queryKey: ['fleet-consumption-chart', companyFilter, vehicleFilter],
    queryFn: () =>
      api.get('/fleet-logs/consumption-chart', {
        params: { companyId: companyFilter || undefined, vehicleId: vehicleFilter || undefined },
      }).then((r) => r.data),
    enabled: !!companyFilter,
  });

  const chartSeries = useMemo(() => {
    return (consumptionChart?.series ?? []).map((p: any) => ({
      ...p,
      label: new Date(p.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
    }));
  }, [consumptionChart]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['fleet-logs', companyFilter, vehicleFilter, typeFilter],
    queryFn: () =>
      api.get('/fleet-logs', {
        params: {
          companyId: companyFilter || undefined,
          vehicleId: vehicleFilter || undefined,
          type: typeFilter || undefined,
        },
      }).then((r) => r.data),
  });

  const ciaVehicles = useMemo(
    () => (vehicles ?? []).filter((v: { companyId: string }) => !companyFilter || v.companyId === companyFilter),
    [vehicles, companyFilter],
  );

  const ciaUsers = useMemo(
    () => (users ?? []).filter((u: { companyId?: string }) => !companyFilter || u.companyId === companyFilter),
    [users, companyFilter],
  );

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase();
    return (logs ?? []).filter((l: any) => {
      if (!q) return true;
      return (
        l.vehicle?.patent?.toLowerCase().includes(q) ||
        l.fuelStation?.toLowerCase().includes(q) ||
        l.serviceLabel?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        `${l.driver?.firstName} ${l.driver?.lastName}`.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fleet-logs'] });
    qc.invalidateQueries({ queryKey: ['fleet-logs-stats'] });
    qc.invalidateQueries({ queryKey: ['fleet-consumption-chart'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const create = useMutation({
    mutationFn: (body: unknown) => api.post('/fleet-logs', body),
    onSuccess: () => {
      toast.success('Registro guardado');
      setForm(EMPTY);
      setEditing(null);
      setTab('historial');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al guardar'),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.put(`/fleet-logs/${id}`, body),
    onSuccess: () => {
      toast.success('Registro actualizado');
      setForm(EMPTY);
      setEditing(null);
      setTab('historial');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/fleet-logs/${id}`),
    onSuccess: () => { toast.success('Eliminado'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const selectedVehicle = ciaVehicles.find((v: { id: string }) => v.id === form.vehicleId);

  const onVehicleChange = (vehicleId: string) => {
    const v = ciaVehicles.find((x: { id: string }) => x.id === vehicleId);
    setForm((f) => ({
      ...f,
      vehicleId,
      odometerKm: v ? String(v.kilometers) : f.odometerKm,
    }));
  };

  const buildPayload = () => ({
    type: form.type,
    date: new Date(form.date).toISOString(),
    vehicleId: form.vehicleId,
    driverId: form.driverId || undefined,
    odometerKm: parseInt(form.odometerKm, 10),
    fuelLiters: form.type === 'COMBUSTIBLE' ? parseFloat(form.fuelLiters) : undefined,
    fuelCost: form.fuelCost ? parseFloat(form.fuelCost) : undefined,
    fuelStation: form.fuelStation || undefined,
    fullTank: form.fullTank,
    serviceLabel: form.serviceLabel || undefined,
    description: form.description || undefined,
    notes: form.notes || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) { toast.error('Selecciona un vehículo'); return; }
    if (!form.odometerKm) { toast.error('Indica el odómetro / horómetro'); return; }
    if (form.type === 'COMBUSTIBLE' && !form.fuelLiters) { toast.error('Indica litros cargados'); return; }
    if (editing) update.mutate({ id: editing.id, body: buildPayload() });
    else create.mutate(buildPayload());
  };

  const openEdit = (log: any) => {
    setEditing(log);
    setForm({
      type: log.type,
      date: log.date.slice(0, 16),
      vehicleId: log.vehicleId,
      driverId: log.driverId ?? '',
      odometerKm: String(log.odometerKm),
      fuelLiters: log.fuelLiters != null ? String(log.fuelLiters) : '',
      fuelCost: log.fuelCost != null ? String(log.fuelCost) : '',
      fuelStation: log.fuelStation ?? '',
      fullTank: log.fullTank ?? false,
      serviceLabel: log.serviceLabel ?? '',
      description: log.description ?? '',
      notes: log.notes ?? '',
    });
    setTab('registro');
  };

  const exportPdf = async () => {
    await downloadPdf(
      createElement(FleetLogReport, {
        logs: filteredLogs,
        stats,
        companyFilter,
        companies: companies ?? [],
        vehicles: ciaVehicles,
      }),
      `libro-flota-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
    toast.success('PDF generado');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Fuel className="w-6 h-6 text-orange-400" />
            Libro de combustible y flota
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Registro operativo: cargas, odómetro, conductor y servicios diarios
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/motores" className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <Gauge className="w-4 h-4" /> Motores
          </Link>
          <Link to="/maintenance" className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <Wrench className="w-4 h-4" /> Mantención
          </Link>
          {filteredLogs.length > 0 && (
            <button type="button" onClick={exportPdf} className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <FileDown className="w-4 h-4" /> PDF
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ ...EMPTY, vehicleId: vehicleFilter }); setTab('registro'); }}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nuevo registro
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="min-w-[180px] flex-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Compañía</label>
          <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setVehicleFilter(''); }} className={inputCls}>
            <option value="">Todas</option>
            {companies?.map((c: { id: string; number: number; name: string }) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Vehículo</label>
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {ciaVehicles.map((v: { id: string; patent: string; brand: string; model: string }) => (
              <option key={v.id} value={v.id}>{v.patent} — {v.brand} {v.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {([
          ['resumen', 'Resumen'],
          ['registro', editing ? 'Editar' : 'Nuevo registro'],
          ['historial', 'Historial'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === id ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Registros', value: stats?.totalLogs ?? 0, color: 'text-white' },
              { label: 'Cargas combustible', value: stats?.fuelLogs ?? 0, color: 'text-orange-400' },
              { label: 'Litros (mes)', value: stats?.monthLiters ?? 0, color: 'text-amber-400' },
              { label: 'Costo (mes)', value: money(stats?.monthCost), color: 'text-emerald-400' },
              { label: 'Servicios', value: stats?.serviceLogs ?? 0, color: 'text-sky-400' },
              { label: 'Consumo L/100km', value: stats?.avgConsumptionLper100km ?? '—', color: 'text-violet-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {chartSeries.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    Consumo L/100 km por vehículo
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Entre cargas consecutivas de combustible</p>
                </div>
                {vehicleFilter && consumptionChart?.summary?.[0]?.avgConsumptionLper100km != null && (
                  <span className="text-xs font-mono text-violet-400 bg-violet-950/40 border border-violet-700/30 px-2 py-1 rounded-lg">
                    Promedio: {consumptionChart.summary[0].avgConsumptionLper100km} L/100km
                  </span>
                )}
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {vehicleFilter ? (
                    <LineChart data={chartSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit=" L" />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number) => [`${v} L/100km`, 'Consumo']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.patent ?? ''}
                      />
                      <Line type="monotone" dataKey="consumptionLper100km" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="L/100km" />
                    </LineChart>
                  ) : (
                    <BarChart data={consumptionChart?.summary?.filter((s: any) => s.avgConsumptionLper100km != null) ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="patent" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number) => [`${v} L/100km`, 'Promedio']}
                      />
                      <Bar dataKey="avgConsumptionLper100km" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="L/100km" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats?.byVehicle?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">Combustible por vehículo</h2>
              <div className="space-y-2">
                {stats.byVehicle.map((v: any) => (
                  <div key={v.vehicleId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-sm font-mono font-bold text-orange-400">{v.patent}</span>
                    <span className="text-xs text-slate-400">{v.logs} cargas · {v.liters} L · {money(v.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">Últimos registros</h2>
            {!filteredLogs.length ? (
              <p className="text-sm text-slate-500">Sin registros aún</p>
            ) : (
              <div className="space-y-2">
                {filteredLogs.slice(0, 8).map((log: any) => (
                  <LogRow key={log.id} log={log} onEdit={canEdit ? openEdit : undefined} onDelete={canEdit ? (id) => remove.mutate(id) : undefined} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'registro' && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-white">{editing ? 'Editar registro' : 'Nuevo registro operativo'}</h2>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_META) as LogType[]).map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                    form.type === t ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {TYPE_META[t].label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha y hora</label>
              <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Vehículo</label>
              <select value={form.vehicleId} onChange={(e) => onVehicleChange(e.target.value)} required className={inputCls}>
                <option value="">Seleccionar...</option>
                {ciaVehicles.map((v: { id: string; patent: string; brand: string; model: string; kilometers: number }) => (
                  <option key={v.id} value={v.id}>{v.patent} — {v.brand} {v.model} ({v.kilometers.toLocaleString()} km)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Odómetro / horómetro (km)</label>
              <input type="number" min={0} value={form.odometerKm} onChange={(e) => setForm((f) => ({ ...f, odometerKm: e.target.value }))} required className={inputCls} />
              {selectedVehicle && (
                <p className="text-[10px] text-slate-500 mt-1">Último registro sistema: {selectedVehicle.kilometers.toLocaleString()} km</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Conductor</label>
              <select value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))} className={inputCls}>
                <option value="">Sin asignar</option>
                {ciaUsers.map((u: { id: string; firstName: string; lastName: string; role: string }) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {form.type === 'COMBUSTIBLE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-orange-600/10 border border-orange-500/30 rounded-xl">
              <div>
                <label className="text-xs text-orange-300 mb-1 block">Litros cargados</label>
                <input type="number" step="0.1" min={0} value={form.fuelLiters} onChange={(e) => setForm((f) => ({ ...f, fuelLiters: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-orange-300 mb-1 block">Costo ($)</label>
                <input type="number" min={0} value={form.fuelCost} onChange={(e) => setForm((f) => ({ ...f, fuelCost: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-orange-300 mb-1 block">Estación / proveedor</label>
                <input value={form.fuelStation} onChange={(e) => setForm((f) => ({ ...f, fuelStation: e.target.value }))} className={inputCls} placeholder="Copec, Petrobras, estación interna..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-orange-200 cursor-pointer sm:col-span-2">
                <input type="checkbox" checked={form.fullTank} onChange={(e) => setForm((f) => ({ ...f, fullTank: e.target.checked }))} className="accent-orange-500" />
                Tanque lleno (full)
              </label>
            </div>
          )}

          {(form.type === 'SERVICIO' || form.type === 'OPERACION' || form.type === 'OTRO') && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo de servicio / operación</label>
              <select value={form.serviceLabel} onChange={(e) => setForm((f) => ({ ...f, serviceLabel: e.target.value }))} className={inputCls}>
                {SERVICE_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Detalle del registro..." />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setTab('historial'); setEditing(null); }} className="px-4 py-2 text-sm text-slate-400">Cancelar</button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="px-4 py-2 text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-xl disabled:opacity-50"
            >
              {editing ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {tab === 'historial' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar patente, estación..." className={`${inputCls} pl-9`} />
          </div>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Cargando...</p>
          ) : !filteredLogs.length ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <Fuel className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No hay registros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log: any) => (
                <LogRow key={log.id} log={log} onEdit={canEdit ? openEdit : undefined} onDelete={canEdit ? (id) => remove.mutate(id) : undefined} detailed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogRow({
  log,
  onEdit,
  onDelete,
  detailed,
}: {
  log: any;
  onEdit?: (log: any) => void;
  onDelete?: (id: string) => void;
  detailed?: boolean;
}) {
  const meta = TYPE_META[log.type as LogType] ?? TYPE_META.OTRO;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-orange-500/30 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-mono font-bold text-white">{log.vehicle?.patent}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${meta.badge}`}>{meta.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{fmt(log.date)} · {log.odometerKm.toLocaleString()} km</p>
          {log.driver && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" /> {log.driver.firstName} {log.driver.lastName}
            </p>
          )}
          {detailed && (
            <div className="mt-2 space-y-0.5 text-xs text-slate-400">
              {log.type === 'COMBUSTIBLE' && (
                <p className="text-orange-300">
                  {log.fuelLiters} L · {money(log.fuelCost)}
                  {log.fuelStation ? ` · ${log.fuelStation}` : ''}
                  {log.fullTank ? ' · Tanque lleno' : ''}
                </p>
              )}
              {log.serviceLabel && <p>{log.serviceLabel}</p>}
              {log.description && <p>{log.description}</p>}
              {log.notes && <p className="italic">{log.notes}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {onEdit && (
          <button type="button" onClick={() => onEdit(log)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(log.id)} className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
