import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, Package, CheckCircle2,
  Building2, Search, RefreshCw, Siren, ShieldAlert,
  CalendarX, CalendarClock, FileDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { createElement } from 'react';
import { AlertsReport } from '../lib/pdf/AlertsReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const urgencyMeta = (days: number) => {
  if (days < 0) return { label: `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`, color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/30', dot: 'bg-red-500', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (days === 0) return { label: 'Vence HOY', color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/30', dot: 'bg-red-500 animate-pulse', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (days <= 7) return { label: `Vence en ${days} día${days !== 1 ? 's' : ''}`, color: 'text-orange-400', bg: 'bg-orange-600/10', border: 'border-orange-600/30', dot: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
  return { label: `Vence en ${days} días`, color: 'text-yellow-400', bg: 'bg-yellow-600/10', border: 'border-yellow-600/30', dot: 'bg-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
};

export default function AlertsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vehicle' | 'equipment'>('all');
  const [filterCia, setFilterCia] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then(r => r.data),
    refetchInterval: 60000,
  });

  const totalExpired = data?.summary?.totalExpired ?? 0;
  const totalSoon = data?.summary?.totalExpiringSoon ?? 0;
  const allClear = totalExpired === 0 && totalSoon === 0;

  const allItems = [
    ...(data?.expired?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'vehicle', variant: 'expired' as const, dateStr: r.nextMaintenanceAt })),
    ...(data?.expired?.equipment ?? []).map((r: any) => ({ ...r, kind: 'equipment', variant: 'expired' as const, dateStr: r.expiresAt })),
    ...(data?.expiringSoon?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'vehicle', variant: 'soon' as const, dateStr: r.nextMaintenanceAt })),
    ...(data?.expiringSoon?.equipment ?? []).map((r: any) => ({ ...r, kind: 'equipment', variant: 'soon' as const, dateStr: r.expiresAt })),
  ].sort((a, b) => daysUntil(a.dateStr) - daysUntil(b.dateStr));

  const companies = [...new Map(allItems.map(i => [i.company?.name, i.company])).values()].filter(Boolean);

  const filtered = allItems.filter(item => {
    const q = search.toLowerCase();
    const name = item.kind === 'vehicle' ? `${item.brand} ${item.model} ${item.patent}` : `${item.name} ${item.code}`;
    const mQ = !q || name.toLowerCase().includes(q) || item.company?.name?.toLowerCase().includes(q);
    const mT = filterType === 'all' || item.kind === filterType;
    const mC = !filterCia || item.company?.name === filterCia;
    return mQ && mT && mC;
  });

  const expiredItems = filtered.filter(i => i.variant === 'expired');
  const soonItems = filtered.filter(i => i.variant === 'soon');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Alertas y Vencimientos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Equipamiento y mantenciones pendientes de atención</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button
              onClick={() => downloadPdf(
                createElement(AlertsReport, { alertsData: data }),
                `nodo360_alertas_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              <FileDown className="w-3.5 h-3.5" />Exportar PDF
            </button>
          )}
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${totalExpired > 0 ? 'bg-red-600/10 border-red-600/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${totalExpired > 0 ? 'bg-red-600/20' : 'bg-slate-800'}`}>
              <Siren className={`w-6 h-6 ${totalExpired > 0 ? 'text-red-400' : 'text-slate-600'}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold ${totalExpired > 0 ? 'text-red-400' : 'text-white'}`}>{totalExpired}</p>
              <p className="text-sm text-slate-400 font-medium">Vencidos — acción inmediata</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${totalSoon > 0 ? 'bg-yellow-600/10 border-yellow-600/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${totalSoon > 0 ? 'bg-yellow-600/20' : 'bg-slate-800'}`}>
              <CalendarClock className={`w-6 h-6 ${totalSoon > 0 ? 'text-yellow-400' : 'text-slate-600'}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold ${totalSoon > 0 ? 'text-yellow-400' : 'text-white'}`}>{totalSoon}</p>
              <p className="text-sm text-slate-400 font-medium">Vencen en 30 días</p>
            </div>
          </div>
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${allClear ? 'bg-emerald-600/10 border-emerald-600/30' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${allClear ? 'bg-emerald-600/20' : 'bg-slate-800'}`}>
              <CheckCircle2 className={`w-6 h-6 ${allClear ? 'text-emerald-400' : 'text-slate-600'}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${allClear ? 'text-emerald-400' : 'text-white'}`}>{allClear ? '¡Todo al día!' : 'Requiere atención'}</p>
              <p className="text-sm text-slate-400 font-medium">Estado general del inventario</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner all clear */}
      {!isLoading && allClear && (
        <div className="text-center py-20 bg-slate-900 border border-emerald-600/20 rounded-2xl">
          <div className="w-16 h-16 bg-emerald-600/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-white font-bold text-lg">Sin alertas activas</p>
          <p className="text-slate-500 text-sm mt-1">Todo el inventario está al día</p>
        </div>
      )}

      {/* Filtros */}
      {!isLoading && !allClear && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, patente, código..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
            </div>
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              {([['all', 'Todos'], ['vehicle', '🚒 Vehículos'], ['equipment', '📦 Equipamiento']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterType === v ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            {companies.length > 1 && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select value={filterCia} onChange={e => setFilterCia(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 appearance-none">
                  <option value="">Todas las compañías</option>
                  {companies.map((c: any) => <option key={c.name} value={c.name}>Cía. {c.number} — {c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Sección VENCIDOS */}
          {expiredItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-red-600/15 rounded-lg flex items-center justify-center">
                  <CalendarX className="w-4 h-4 text-red-400" />
                </div>
                <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">Vencidos — requieren acción inmediata</h2>
                <span className="text-xs font-bold text-red-400 bg-red-600/20 border border-red-600/30 px-2 py-0.5 rounded-full">{expiredItems.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {expiredItems.map(item => <AlertCard key={item.id + item.kind} item={item} />)}
              </div>
            </section>
          )}

          {/* Sección PRÓXIMOS */}
          {soonItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-yellow-600/15 rounded-lg flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-yellow-400" />
                </div>
                <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wide">Próximos a vencer — 30 días</h2>
                <span className="text-xs font-bold text-yellow-400 bg-yellow-600/20 border border-yellow-600/30 px-2 py-0.5 rounded-full">{soonItems.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {soonItems.map(item => <AlertCard key={item.id + item.kind} item={item} />)}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Sin resultados para ese filtro</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ item }: { item: any }) {
  const days = daysUntil(item.dateStr);
  const urg = urgencyMeta(days);
  const isVehicle = item.kind === 'vehicle';

  return (
    <div className={`group bg-slate-900 border ${urg.border} rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-black/20`}>
      {/* Banner */}
      <div className={`${urg.bg} border-b border-slate-800 px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${urg.badge}`}>
            {isVehicle ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {isVehicle ? 'Vehículo · Mantención' : 'Equipamiento'}
            </p>
            <p className="font-mono font-bold text-white text-xs">
              {isVehicle ? item.patent : item.code}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${urg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
          {days < 0 ? 'VENCIDO' : days === 0 ? 'HOY' : `${days}d`}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm font-semibold text-slate-200 mb-0.5">
          {isVehicle ? `${item.brand} ${item.model}` : item.name}
        </p>
        {isVehicle && item.vehicleType && (
          <p className="text-[11px] text-slate-500 mb-2">{item.vehicleType}</p>
        )}
        {!isVehicle && item.category && (
          <p className="text-[11px] text-slate-500 mb-2">{item.category}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Building2 className="w-3 h-3" />
            <span>Cía. {item.company?.number} — {item.company?.name}</span>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold ${urg.color}`}>{fmt(item.dateStr)}</p>
            <p className={`text-[10px] ${urg.color} opacity-80`}>{urg.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
