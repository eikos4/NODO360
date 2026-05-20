import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, Wrench, Gauge, Calendar, DollarSign,
  Building2, CheckCircle2, AlertTriangle, Clock,
  ChevronDown, MapPin, Hash, Tag, ImageOff,
  ShieldCheck, ClipboardList, Activity, Flame,
  TrendingUp, Search, X, FileDown, Fuel,
} from 'lucide-react';
import { api } from '../lib/api';
import { createElement } from 'react';
import { MotorReport } from '../lib/pdf/MotorReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

/* ── helpers ── */
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = (n?: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const STATUS_META: Record<string, { label: string; color: string; border: string; dot: string; bg: string }> = {
  OPERATIVO:         { label: 'Operativo',         color: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10' },
  EN_REPARACION:     { label: 'En reparación',     color: 'text-yellow-400',  border: 'border-yellow-500/40',  dot: 'bg-yellow-400 animate-pulse', bg: 'bg-yellow-500/10' },
  FUERA_DE_SERVICIO: { label: 'Fuera de servicio', color: 'text-red-400',     border: 'border-red-500/40',     dot: 'bg-red-400',    bg: 'bg-red-500/10' },
};

const TYPE_META: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  PREVENTIVA: { label: 'Preventiva', color: 'text-blue-400',   dot: 'bg-blue-500',   icon: ShieldCheck },
  CORRECTIVA: { label: 'Correctiva', color: 'text-red-400',    dot: 'bg-red-500',    icon: AlertTriangle },
  REVISION:   { label: 'Revisión',   color: 'text-yellow-400', dot: 'bg-yellow-500', icon: ClipboardList },
};

const VEHICLE_AGE = (year: number) => new Date().getFullYear() - year;

/* ── KPI card ── */
function KpiCard({ label, value, sub, icon: Icon, color, bg, border }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bg: string; border: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 flex flex-col gap-1.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* ── Timeline item ── */
function TimelineItem({ maint, isLast }: { maint: any; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[maint.type] ?? TYPE_META.PREVENTIVA;
  const Icon = meta.icon;

  return (
    <div className="flex gap-4">
      {/* Eje vertical */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 ${
          maint.type === 'CORRECTIVA' ? 'bg-red-600/15 border-red-500/40' :
          maint.type === 'REVISION'   ? 'bg-yellow-600/15 border-yellow-500/40' :
          'bg-blue-600/15 border-blue-500/40'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-700/60 mt-1" style={{ minHeight: 24 }} />}
      </div>

      {/* Contenido */}
      <div className={`flex-1 mb-4 rounded-2xl border transition-all cursor-pointer ${
        open ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      }`} onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  maint.type === 'CORRECTIVA' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  maint.type === 'REVISION'   ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>{meta.label}</span>
                <span className="text-xs text-slate-500">{fmt(maint.date)}</span>
                {maint.cost != null && (
                  <span className="text-xs font-semibold text-emerald-400">{money(maint.cost)}</span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-1 line-clamp-1">{maint.description}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        {open && (
          <div className="px-4 pb-4 border-t border-slate-700 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Trabajo realizado</p>
              <p className="text-sm text-slate-300 leading-relaxed">{maint.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {maint.workshopName && (
                <div className="bg-slate-900 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />Taller</p>
                  <p className="text-xs text-slate-200">{maint.workshopName}</p>
                </div>
              )}
              <div className="bg-slate-900 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />Costo</p>
                <p className="text-xs font-bold text-emerald-400">{money(maint.cost)}</p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Fecha</p>
                <p className="text-xs text-slate-200">{fmt(maint.date)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function MotoresPage() {
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterCia, setFilterCia] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: vehicles, isLoading: loadingV } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data),
  });
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });
  const { data: allMaint, isLoading: loadingM } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then(r => r.data),
  });

  /* Vehículo seleccionado */
  const vehicle = (vehicles ?? []).find((v: any) => v.id === selectedId);

  /* Mantenciones filtradas para el vehículo seleccionado */
  const rawMaint = (allMaint ?? [])
    .filter((m: any) => m.vehicleId === selectedId)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredMaint = rawMaint.filter((m: any) => {
    const matchType = !filterType || m.type === filterType;
    return matchType;
  });

  /* Lista de vehículos filtrada para el selector lateral */
  const filteredVehicles = (vehicles ?? []).filter((v: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${v.patent} ${v.brand} ${v.model} ${v.type}`.toLowerCase().includes(q);
    const matchCia = !filterCia || v.companyId === filterCia;
    return matchQ && matchCia;
  });

  /* Stats del vehículo */
  const totalCost     = rawMaint.reduce((s: number, m: any) => s + (m.cost ?? 0), 0);
  const yearMaint     = rawMaint.filter((m: any) => new Date(m.date).getFullYear() === new Date().getFullYear()).length;
  const correctivas   = rawMaint.filter((m: any) => m.type === 'CORRECTIVA').length;
  const preventivas   = rawMaint.filter((m: any) => m.type === 'PREVENTIVA').length;

  const nextMaint      = vehicle?.nextMaintenanceAt;
  const nextDays       = nextMaint ? daysUntil(nextMaint) : null;
  const maintExpired   = nextMaint && new Date(nextMaint) < new Date();
  const maintSoon      = nextDays !== null && nextDays >= 0 && nextDays <= 30;

  const sm = vehicle ? STATUS_META[vehicle.status] : null;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Motores</h1>
            <p className="text-sm text-slate-400">Hoja de vida y línea de tiempo por vehículo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={selectedId ? `/fleet-logs?vehicleId=${selectedId}` : '/fleet-logs'}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30"
          >
            <Fuel className="w-4 h-4" /> Libro flota
          </Link>
          {vehicles?.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{vehicles.length}</p>
              <p className="text-xs text-slate-500">vehículos registrados</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ══ SIDEBAR DE SELECCIÓN ══ */}
        <div className="lg:w-72 shrink-0 space-y-3">
          {/* Filtros */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Patente, marca, modelo..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
            </div>
            <select
              value={filterCia} onChange={e => setFilterCia(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">Todas las compañías</option>
              {(companies ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>
              ))}
            </select>
          </div>

          {/* Lista de vehículos */}
          <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin pr-0.5">
            {loadingV ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-8 bg-slate-900 border border-slate-800 rounded-xl">
                <Truck className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Sin vehículos</p>
              </div>
            ) : (
              filteredVehicles.map((v: any) => {
                const s = STATUS_META[v.status];
                const isSelected = v.id === selectedId;
                const expired = v.nextMaintenanceAt && new Date(v.nextMaintenanceAt) < new Date();
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'bg-orange-600/15 border-orange-500/50 shadow-lg shadow-orange-600/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Miniatura o ícono */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                        {v.imageUrl
                          ? <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                          : <Truck className="w-5 h-5 text-slate-600" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-white font-mono truncate">{v.patent}</p>
                          {expired && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{v.brand} {v.model} · {v.year}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-orange-500/20">
                        <span className="text-[10px] text-orange-400 font-medium">{v.type}</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══ PANEL PRINCIPAL ══ */}
        <div className="flex-1 min-w-0">

          {/* PLACEHOLDER */}
          {!selectedId && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                <Truck className="w-8 h-8 text-orange-500/50" />
              </div>
              <p className="text-slate-400 font-medium">Selecciona un vehículo</p>
              <p className="text-slate-600 text-sm">para ver su hoja de vida completa</p>
            </div>
          )}

          {/* HOJA DE VIDA */}
          {vehicle && (
            <div className="space-y-5">

              {/* ── Banner vehículo ── */}
              <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Imagen de fondo si existe */}
                {vehicle.imageUrl && (
                  <div className="absolute inset-0">
                    <img src={vehicle.imageUrl} alt={vehicle.patent} className="w-full h-full object-cover opacity-15" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/80" />
                  </div>
                )}

                <div className="relative flex flex-col sm:flex-row gap-5 p-5">
                  {/* Foto */}
                  <div className="w-full sm:w-48 h-36 bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-700">
                    {vehicle.imageUrl
                      ? <img src={vehicle.imageUrl} alt={vehicle.patent} className="w-full h-full object-cover" />
                      : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                          <Truck className="w-12 h-12 text-slate-600" />
                          <span className="text-xs text-slate-600">Sin imagen</span>
                        </div>
                      )
                    }
                  </div>

                  {/* Datos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="font-mono font-bold text-2xl text-white">{vehicle.patent}</span>
                          {sm && (
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${sm.bg} ${sm.color} ${sm.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                              {sm.label}
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-slate-200">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Tag className="w-3.5 h-3.5" />{vehicle.type}
                          <span className="text-slate-700">·</span>
                          <Calendar className="w-3.5 h-3.5" />{vehicle.year} ({VEHICLE_AGE(vehicle.year)} años)
                          {vehicle.company && (
                            <>
                              <span className="text-slate-700">·</span>
                              <Building2 className="w-3.5 h-3.5" />Cía. {vehicle.company?.number ?? ''}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Botón PDF */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => downloadPdf(
                        createElement(MotorReport, {
                          vehicle,
                          maintenances: rawMaint,
                          company: companies?.find((c: any) => c.id === vehicle.companyId),
                        }),
                        `motor_${vehicle.patent}_${new Date().toISOString().split('T')[0]}.pdf`
                      )}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors">
                      <FileDown className="w-3.5 h-3.5" />Exportar PDF
                    </button>
                  </div>
                  {/* Mini stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><Gauge className="w-3 h-3" />Kilómetros</p>
                        <p className="text-sm font-bold text-white">{vehicle.kilometers?.toLocaleString('es-CL') ?? 0} km</p>
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><Wrench className="w-3 h-3" />Últ. mantención</p>
                        <p className="text-sm font-bold text-white">{fmt(vehicle.lastMaintenanceAt)}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${maintExpired ? 'bg-red-600/10 border border-red-600/20' : maintSoon ? 'bg-orange-600/10 border border-orange-600/20' : 'bg-slate-800/60'}`}>
                        <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />Próx. mantención
                        </p>
                        <p className={`text-sm font-bold ${maintExpired ? 'text-red-400' : maintSoon ? 'text-orange-400' : 'text-white'}`}>
                          {nextMaint ? fmt(nextMaint) : '—'}
                        </p>
                        {nextDays !== null && (
                          <p className={`text-[10px] mt-0.5 ${maintExpired ? 'text-red-500' : maintSoon ? 'text-orange-500' : 'text-slate-600'}`}>
                            {maintExpired ? `Venció hace ${Math.abs(nextDays)} días` : `En ${nextDays} días`}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><Activity className="w-3 h-3" />Mantenciones</p>
                        <p className="text-sm font-bold text-white">{rawMaint.length} registros</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── KPIs de mantención ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Costo total histórico" value={money(totalCost)} icon={DollarSign}
                  color="text-emerald-400" bg="bg-emerald-600/10" border="border-emerald-600/20" />
                <KpiCard label="Mantenciones este año" value={yearMaint} icon={Calendar}
                  color="text-blue-400" bg="bg-blue-600/10" border="border-blue-600/20" />
                <KpiCard label="Preventivas" value={preventivas} sub="Programadas"
                  icon={ShieldCheck} color="text-blue-400" bg="bg-slate-800" border="border-slate-700" />
                <KpiCard label="Correctivas" value={correctivas} sub="No programadas"
                  icon={AlertTriangle} color={correctivas > 0 ? 'text-red-400' : 'text-slate-400'}
                  bg={correctivas > 0 ? 'bg-red-600/10' : 'bg-slate-800'}
                  border={correctivas > 0 ? 'border-red-600/20' : 'border-slate-700'} />
              </div>

              {/* ── Alerta de mantención ── */}
              {maintExpired && (
                <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/30 rounded-2xl p-4">
                  <div className="w-9 h-9 bg-red-600/20 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-400">Mantención vencida</p>
                    <p className="text-xs text-red-500/70">La fecha de próxima mantención ({fmt(nextMaint)}) ya ha pasado. Programar revisión urgente.</p>
                  </div>
                </div>
              )}
              {!maintExpired && maintSoon && (
                <div className="flex items-center gap-3 bg-orange-600/10 border border-orange-600/30 rounded-2xl p-4">
                  <div className="w-9 h-9 bg-orange-600/20 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-400">Mantención próxima</p>
                    <p className="text-xs text-orange-500/70">Vence el {fmt(nextMaint)} — en {nextDays} días. Coordinar con taller.</p>
                  </div>
                </div>
              )}

              {/* ── Línea de tiempo ── */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-orange-600/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Línea de tiempo</h3>
                      <p className="text-xs text-slate-500">{rawMaint.length} intervenciones registradas</p>
                    </div>
                  </div>
                  {/* Filtro tipo */}
                  <div className="flex gap-1.5">
                    {['', 'PREVENTIVA', 'CORRECTIVA', 'REVISION'].map(t => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                          filterType === t
                            ? t === 'CORRECTIVA' ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                            : t === 'REVISION'   ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                            : t === 'PREVENTIVA' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                            : 'bg-slate-700 text-slate-200 border border-slate-600'
                            : 'text-slate-500 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        {t === '' ? 'Todas' : TYPE_META[t]?.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  {loadingM ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}
                    </div>
                  ) : filteredMaint.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3">
                      <Wrench className="w-10 h-10 text-slate-700" />
                      <p className="text-slate-500 text-sm">
                        {rawMaint.length === 0
                          ? 'Sin mantenciones registradas para este vehículo'
                          : 'Sin resultados para el filtro seleccionado'
                        }
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Año actual primero */}
                      {(Array.from(new Set(filteredMaint.map((m: any) => new Date(m.date).getFullYear()))) as number[])
                        .sort((a, b) => b - a)
                        .map((year: any) => {
                          const yearItems = filteredMaint.filter((m: any) => new Date(m.date).getFullYear() === year);
                          const yearCost  = yearItems.reduce((s: number, m: any) => s + (m.cost ?? 0), 0);
                          return (
                            <div key={year}>
                              {/* Separador de año */}
                              <div className="flex items-center gap-3 mb-4">
                                <div className="bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                  {year}
                                </div>
                                <div className="flex-1 h-px bg-slate-800" />
                                <span className="text-xs text-slate-600">{yearItems.length} intervención{yearItems.length !== 1 ? 'es' : ''} · {money(yearCost)}</span>
                              </div>

                              {/* Items del año */}
                              {yearItems.map((m: any, idx: number) => (
                                <TimelineItem key={m.id} maint={m} isLast={idx === yearItems.length - 1} />
                              ))}
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* ── Distribución por tipo ── */}
              {rawMaint.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['PREVENTIVA', 'CORRECTIVA', 'REVISION'] as const).map(type => {
                    const items  = rawMaint.filter((m: any) => m.type === type);
                    const cost   = items.reduce((s: number, m: any) => s + (m.cost ?? 0), 0);
                    const meta   = TYPE_META[type];
                    const pct    = rawMaint.length > 0 ? Math.round((items.length / rawMaint.length) * 100) : 0;
                    const Icon   = meta.icon;
                    return (
                      <div key={type} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                          <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{items.length}</p>
                        <p className="text-xs text-slate-500 mb-3">{pct}% del total · {money(cost)}</p>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-1.5 ${meta.dot} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
