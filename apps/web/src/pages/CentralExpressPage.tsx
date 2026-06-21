import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Flame, HardHat, Loader2, Mic, MicOff, Moon, Search, Settings, Shield,
  Siren, Sun, Truck, UserCog, Users, Volume2, VolumeX,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSimpleDispatch } from '../hooks/useQuickDispatch';
import { useCentralExpressTheme } from '../hooks/useCentralExpressTheme';
import type { CentralExpressThemeTokens } from '../lib/central-express-theme';
import { EMERGENCY_MAIN_TYPES } from '../lib/emergency-codes';
import type { CuartelItem } from '../components/botonera/CuartelOverviewPanel';
import CentralExpressMap from '../components/central-express/CentralExpressMap';
import CompanyMaquinistaAlert from '../components/dispatch/CompanyMaquinistaAlert';
import DispatchVoiceConfigToggle from '../components/dispatch/DispatchVoiceConfigToggle';
import { MAX_DISPATCH_VEHICLES } from '../lib/dispatch-selection';

function LiveClock({ th }: { th: CentralExpressThemeTokens }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right hidden sm:block">
      <p className={`text-lg font-mono font-bold tabular-nums ${th.title}`}>
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className={`text-[10px] capitalize ${th.subtitle}`}>
        {now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

function CompanyCard({
  c,
  isPrimary,
  isSupport,
  th,
  onSetPrimary,
  onSetSupport,
}: {
  c: CuartelItem & { lat?: number; lng?: number };
  isPrimary: boolean;
  isSupport: boolean;
  th: CentralExpressThemeTokens;
  onSetPrimary: () => void;
  onSetSupport: () => void;
}) {
  const operativa = c.roster.available >= 4 && c.fleet.operativo > 0 && c.maquinistas.available > 0;
  const statusClass = operativa ? th.companyStatusOk : th.companyStatusWarn;
  const statusLabel = operativa
    ? 'Operativa'
    : c.maquinistas.available === 0
      ? 'Sin maquinista'
      : 'Dotación mínima';

  return (
    <div
      className={`shrink-0 w-[168px] sm:w-auto sm:min-w-0 rounded-xl border p-3 text-left transition-all ${
        isPrimary ? th.companyCardSelected : isSupport ? 'border-sky-500/60 bg-sky-500/10 ring-1 ring-sky-500/40' : th.companyCard
      }`}
    >
      <button type="button" onClick={onSetPrimary} className="w-full text-left">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
            isPrimary ? 'bg-red-600 text-white' : isSupport ? 'bg-sky-600 text-white' : 'bg-slate-700 text-white'
          }`}>
            {c.number}
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold truncate ${th.text}`}>{c.number}ª Compañía</p>
            <p className={`text-[10px] truncate ${th.textMuted}`}>{c.city}</p>
          </div>
        </div>
        <Shield className={`w-4 h-4 shrink-0 ${isPrimary ? 'text-red-400' : isSupport ? 'text-sky-400' : 'text-slate-500'}`} />
      </div>

      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className={`rounded-lg p-1.5 text-center ${th.incidentRow}`}>
          <Users className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-0.5" />
          <p className={`text-sm font-bold ${th.text}`}>{c.roster.available}</p>
          <p className={`text-[8px] uppercase ${th.textMuted}`}>Disp.</p>
        </div>
        <div className={`rounded-lg p-1.5 text-center ${th.incidentRow}`}>
          <UserCog className="w-3.5 h-3.5 mx-auto text-sky-400 mb-0.5" />
          <p className={`text-sm font-bold ${th.text}`}>{c.maquinistas.available}</p>
          <p className={`text-[8px] uppercase ${th.textMuted}`}>Maq.</p>
        </div>
        <div className={`rounded-lg p-1.5 text-center ${th.incidentRow}`}>
          <HardHat className="w-3.5 h-3.5 mx-auto text-amber-400 mb-0.5" />
          <p className={`text-sm font-bold ${th.text}`}>{c.roster.total}</p>
          <p className={`text-[8px] uppercase ${th.textMuted}`}>Total</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: Math.min(c.fleet.operativo, 4) }).map((_, i) => (
          <span
            key={i}
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/25"
          >
            B-{c.number}{i > 0 ? i : ''}
          </span>
        ))}
      </div>

      <div className={`text-[9px] font-bold uppercase text-center py-1 rounded-lg border ${statusClass}`}>
        {statusLabel}
      </div>
      </button>
      {!isPrimary && (
        <button
          type="button"
          onClick={onSetSupport}
          className={`mt-2 w-full text-[9px] font-bold uppercase py-1 rounded-lg border transition ${
            isSupport
              ? 'border-sky-500 bg-sky-600 text-white'
              : 'border-slate-600 text-slate-400 hover:border-sky-500/50 hover:text-sky-400'
          }`}
        >
          {isSupport ? 'Apoyo ✓' : '+ Apoyo'}
        </button>
      )}
      {isPrimary && (
        <p className="mt-2 text-[9px] font-bold uppercase text-center text-red-400">Principal</p>
      )}
    </div>
  );
}

export default function CentralExpressPage() {
  const d = useSimpleDispatch();
  const user = useAuthStore((s) => s.user);
  const { tokens: th, toggleTheme, isDark } = useCentralExpressTheme();
  const [commune, setCommune] = useState('Parral');
  const [reference, setReference] = useState('');
  const [priority, setPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('ALTA');
  const [showConfig, setShowConfig] = useState(false);

  const cuarteles = (d.cuarteles ?? []) as CuartelItem[];

  const { data: mapData } = useQuery({
    queryKey: ['operational-map-express'],
    queryFn: () => api.get('/operational-map', { params: { incidentDays: 30 } }).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const vehicles = allVehicles as {
    id: string;
    patent: string;
    type?: string;
    companyId: string;
    status?: string;
    imageUrl?: string | null;
  }[];

  const selectedCuartel = cuarteles.find((c) => c.id === d.selectedCia);
  const supportCuartel = cuarteles.find((c) => c.id === d.secondaryCia);

  const vehiclesByCompany = useMemo(() => {
    return d.dispatchCompanyIds.map((cid) => {
      const c = cuarteles.find((x) => x.id === cid);
      return {
        companyId: cid,
        label: c ? `${c.number}ª — ${c.name}` : cid,
        isPrimary: cid === d.selectedCia,
        vehicles: d.dispatchableVehicles.filter((v) => v.companyId === cid),
      };
    });
  }, [d.dispatchCompanyIds, d.dispatchableVehicles, d.selectedCia, cuarteles]);

  const mapCompanies = useMemo(() => {
    const geo = mapData?.layers?.companies ?? [];
    return cuarteles
      .map((c) => {
        const g = geo.find((x: { id: string }) => x.id === c.id);
        if (!g) return null;
        return {
          id: c.id,
          number: c.number,
          name: c.name,
          lat: g.lat as number,
          lng: g.lng as number,
          rosterAvailable: c.roster.available,
          maquinistasAvailable: c.maquinistas.available,
          fleetOperativo: c.fleet.operativo,
        };
      })
      .filter(Boolean) as Parameters<typeof CentralExpressMap>[0]['companies'];
  }, [cuarteles, mapData]);

  const mapHydrants = useMemo(
    () => (mapData?.layers?.hydrants ?? []).slice(0, 40).map((h: { id: string; code: string; lat: number; lng: number; status?: string }) => ({
      id: h.id,
      code: h.code,
      lat: h.lat,
      lng: h.lng,
      status: h.status,
    })),
    [mapData],
  );

  const mapIncidents = useMemo(
    () => (mapData?.layers?.incidents ?? []).map((i: {
      id: string; code: string; type: string; address?: string; lat: number; lng: number; isOpen?: boolean;
    }) => ({
      id: i.id,
      code: i.code,
      type: i.type,
      address: i.address,
      lat: i.lat,
      lng: i.lng,
      isOpen: i.isOpen,
    })),
    [mapData],
  );

  const activeIncidents = useMemo(() => {
    const list = (d.incidents ?? []) as {
      id: string; code: string; type: string; address?: string;
      closedAt?: string | null; dispatchedAt?: string; vehicles?: { vehicle?: { patent?: string } }[];
    }[];
    return list.filter((i) => !i.closedAt).slice(0, 8);
  }, [d.incidents]);

  const footerStats = useMemo(() => {
    const bomDisp = cuarteles.reduce((a, c) => a + c.roster.available, 0);
    const bomTotal = cuarteles.reduce((a, c) => a + c.roster.total, 0);
    const carDisp = cuarteles.reduce((a, c) => a + c.fleet.operativo, 0);
    const carTotal = cuarteles.reduce((a, c) => a + c.fleet.total, 0);
    const enServicio = d.activeIncidents.length;
    return { bomDisp, bomTotal, bomEnServicio: enServicio * 4, carDisp, carTotal, carEnServicio: enServicio * 2 };
  }, [cuarteles, d.activeIncidents.length]);

  const emergLat = d.latitude ? parseFloat(d.latitude) : undefined;
  const emergLng = d.longitude ? parseFloat(d.longitude) : undefined;

  const handleGenerateDispatch = () => {
    const extra = [reference.trim(), priority !== 'ALTA' ? `Prioridad ${priority}` : ''].filter(Boolean).join(' · ');
    if (extra && !d.notes.includes(extra)) {
      d.setNotes(d.notes ? `${d.notes} · ${extra}` : extra);
    }
    void d.handleDispatch();
  };

  return (
    <div className={`flex flex-col min-h-[calc(100vh-3rem)] -m-4 sm:-m-6 transition-colors duration-300 ${th.page}`}>
      {/* Header */}
      <header className={`shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b ${th.header} ${th.headerBorder}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${th.brand}`}>Nodo 360</p>
            <h1 className={`text-base sm:text-lg font-black uppercase tracking-wide ${th.title}`}>
              Central Express
            </h1>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <span className={`px-3 py-1.5 rounded-lg ${th.navActive}`}>Despacho</span>
          <Link to="/incidents" className={`px-3 py-1.5 rounded-lg ${th.navIdle}`}>Incidentes</Link>
          <Link to="/operational-map" className={`px-3 py-1.5 rounded-lg ${th.navIdle}`}>Recursos</Link>
          <Link to="/despacho360" className={`px-3 py-1.5 rounded-lg ${th.navIdle}`}>Despacho360</Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <LiveClock th={th} />
          <button type="button" onClick={toggleTheme} className={`p-2 rounded-lg border ${th.btnGhost}`} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => d.setVoiceEnabled(!d.voiceEnabled)}
            className={`p-2 rounded-lg border ${d.voiceEnabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : th.btnGhost}`}
            title={d.voiceEnabled ? 'Voz asistente activada' : 'Voz asistente desactivada'}
          >
            {d.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => d.setMuted(!d.muted)} className={`p-2 rounded-lg border ${th.btnGhost}`}>
            {d.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((c) => !c)}
            className={`p-2 rounded-lg border ${showConfig ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : th.btnGhost}`}
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className={`hidden lg:block text-right pl-2 border-l ${th.headerBorder}`}>
            <p className={`text-xs font-semibold ${th.text}`}>{user?.firstName} {user?.lastName}</p>
            <p className={`text-[10px] ${th.subtitle}`}>Operador de Central</p>
          </div>
        </div>
      </header>

      {showConfig && (
        <div className={`shrink-0 border-b px-4 sm:px-6 py-4 ${th.header} ${th.headerBorder}`}>
          <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${th.cardTitle}`}>
            Configuración de despacho
          </h2>
          <DispatchVoiceConfigToggle enabled={d.voiceEnabled} onChange={d.setVoiceEnabled} />
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 p-3 sm:p-4 min-h-0 overflow-y-auto xl:overflow-hidden">
        {/* Left — form + vehicles */}
        <aside className="xl:col-span-3 flex flex-col gap-3 min-h-0 xl:overflow-y-auto scrollbar-thin">
          <div className={`rounded-xl border p-4 space-y-3 ${th.card} ${th.cardBorder}`}>
            <h2 className={`text-[11px] font-bold uppercase tracking-widest ${th.cardTitle}`}>Nueva emergencia</h2>

            <div>
              <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Tipo de emergencia</label>
              <select
                value={d.selectedType}
                onChange={(e) => d.setSelectedType(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${th.select}`}
              >
                <option value="">— Seleccionar clave —</option>
                {EMERGENCY_MAIN_TYPES.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Dirección</label>
              <input
                value={d.address}
                onChange={(e) => d.setAddress(e.target.value)}
                placeholder="Av. Libertad 123"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${th.input}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Comuna</label>
                <input
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${th.input}`}
                />
              </div>
              <div>
                <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-bold ${
                    priority === 'ALTA' ? 'text-red-500 border-red-500/50' : th.select
                  }`}
                >
                  <option value="ALTA">ALTA</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="BAJA">BAJA</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Referencia</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Casa 2 pisos, humo visible…"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${th.input}`}
              />
            </div>

            <div>
              <label className={`text-[10px] uppercase mb-1 block ${th.label}`}>Observaciones</label>
              <textarea
                value={d.notes}
                onChange={(e) => d.setNotes(e.target.value)}
                rows={2}
                className={`w-full rounded-lg border px-3 py-2 text-sm resize-none ${th.textarea}`}
              />
            </div>

            {d.selectedCia && (
              <CompanyMaquinistaAlert
                company={selectedCuartel ? { number: selectedCuartel.number, name: selectedCuartel.name } : d.company}
                availableCount={d.maquinistasAvailable}
              />
            )}
            {d.secondaryCia && supportCuartel && (
              <CompanyMaquinistaAlert
                company={{ number: supportCuartel.number, name: supportCuartel.name }}
                availableCount={d.secondaryMaquinistasAvailable}
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={d.searchAddress}
                disabled={d.geocoding}
                className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1 ${th.btnGhost}`}
              >
                {d.geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar
              </button>
              <button
                type="button"
                disabled={!d.canDispatch || d.dispatching}
                onClick={handleGenerateDispatch}
                className={`flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wide ${th.btnPrimary} disabled:opacity-40`}
              >
                {d.dispatching ? 'Despachando…' : 'Generar despacho'}
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-4 flex-1 min-h-[180px] ${th.card} ${th.cardBorder}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className={`text-[11px] font-bold uppercase tracking-widest ${th.cardTitle}`}>Carros disponibles</h2>
              <span className={`text-[10px] ${th.textMuted}`}>
                {d.selectedVehicles.length}/{MAX_DISPATCH_VEHICLES}
              </span>
            </div>
            <p className={`text-[10px] mb-3 ${th.textMuted}`}>
              Máx. {MAX_DISPATCH_VEHICLES} carros · {d.selectedCompanyIds.length || 1} compañía(s). Elige apoyo en las tarjetas del mapa.
            </p>
            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
              {vehiclesByCompany.length === 0 ? (
                <p className={`text-sm ${th.textMuted}`}>Selecciona una compañía principal</p>
              ) : vehiclesByCompany.map((group) => (
                <div key={group.companyId}>
                  <p className={`text-[10px] font-bold uppercase mb-1.5 ${group.isPrimary ? 'text-red-400' : 'text-sky-400'}`}>
                    {group.isPrimary ? 'Principal' : 'Apoyo'} · {group.label}
                  </p>
                  {group.vehicles.length === 0 ? (
                    <p className={`text-xs mb-2 ${th.textMuted}`}>Sin carros operativos</p>
                  ) : group.vehicles.map((v) => {
                    const on = d.selectedVehicles.includes(v.id);
                    const vehicle = vehicles.find((x) => x.id === v.id);
                    return (
                      <div key={v.id} className={`flex items-center gap-2 p-2 rounded-lg border mb-1.5 ${th.incidentRow}`}>
                        <div className="w-12 h-10 rounded-lg bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {vehicle?.imageUrl ? (
                            <img src={vehicle.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Truck className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold font-mono ${th.text}`}>{v.patent}</p>
                          <p className={`text-[10px] truncate ${th.textMuted}`}>{v.type ?? 'Carro bomba'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => d.toggleVehicle(v.id)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${
                            on ? 'bg-red-600 text-white' : `${th.btnSuccess} text-[10px] px-2 py-1`
                          }`}
                        >
                          {on ? 'Quitar' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center — companies + map */}
        <section className="xl:col-span-6 flex flex-col gap-3 min-h-0">
          <div>
            <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${th.cardTitle}`}>
              Disponibilidad por compañía
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 sm:overflow-visible">
              {cuarteles.map((c) => (
                <CompanyCard
                  key={c.id}
                  c={c}
                  isPrimary={c.id === d.selectedCia}
                  isSupport={c.id === d.secondaryCia}
                  th={th}
                  onSetPrimary={() => d.setSelectedCia(c.id)}
                  onSetSupport={() => d.setSecondaryCia(c.id === d.secondaryCia ? '' : c.id)}
                />
              ))}
            </div>
          </div>

          <div className={`flex-1 min-h-[280px] sm:min-h-[340px] xl:min-h-0 rounded-xl border overflow-hidden ${th.cardBorder}`}>
            <CentralExpressMap
              theme={th.mapTheme}
              companies={mapCompanies}
              hydrants={mapHydrants}
              incidents={mapIncidents}
              emergencyLat={emergLat}
              emergencyLng={emergLng}
              selectedCompanyId={d.selectedCia}
              supportCompanyId={d.secondaryCia}
              onSelectCompany={d.setSelectedCia}
              onPick={d.onMapPick}
              pickActive
              height="100%"
            />
          </div>
        </section>

        {/* Right — recommendation + incidents */}
        <aside className="xl:col-span-3 flex flex-col gap-3 min-h-0 xl:overflow-y-auto scrollbar-thin">
          <div className={`rounded-xl border p-4 space-y-3 ${th.card} ${th.cardBorder}`}>
            <h2 className={`text-[11px] font-bold uppercase tracking-widest ${th.cardTitle}`}>Recomendación de despacho</h2>
            {d.emergType ? (
              <div className={`rounded-lg border p-3 ${th.incidentRow}`}>
                <p className={`text-xs font-mono font-bold ${th.accent}`}>{d.emergType.code}</p>
                <p className={`text-sm ${th.text}`}>{d.emergType.label}</p>
                {d.address ? <p className={`text-xs mt-1 ${th.textMuted}`}>{d.address}, {commune}</p> : null}
              </div>
            ) : (
              <p className={`text-sm ${th.textMuted}`}>Selecciona tipo y dirección</p>
            )}

            <div className="space-y-1.5">
              {(d.selectedVehicles.length ? d.selectedVehicles : d.dispatchableVehicles.slice(0, MAX_DISPATCH_VEHICLES).map((v) => v.id)).map((vid) => {
                const v = vehicles.find((x) => x.id === vid);
                if (!v) return null;
                const cia = cuarteles.find((c) => c.id === v.companyId);
                return (
                  <label key={vid} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${th.incidentRow}`}>
                    <input
                      type="checkbox"
                      checked={d.selectedVehicles.includes(vid)}
                      onChange={() => d.toggleVehicle(vid)}
                      className="rounded border-slate-500"
                    />
                    <span className={`text-xs font-mono font-bold ${th.text}`}>{v.patent}</span>
                    <span className={`text-[10px] ${th.textMuted}`}>{cia ? `${cia.number}ª Cía.` : ''}</span>
                  </label>
                );
              })}
            </div>

            <p className={`text-xs ${th.textMuted}`}>
              {d.selectedVehicles.length}/{MAX_DISPATCH_VEHICLES} carro(s) · {d.selectedCompanyIds.length || 1} compañía(s) ·{' '}
              {cuarteles.find((c) => c.id === d.selectedCia)?.roster.available ?? 0} bomberos disp.
            </p>
            {d.secondaryCia && supportCuartel && (
              <p className={`text-[10px] ${th.textMuted}`}>
                Apoyo: {supportCuartel.number}ª {supportCuartel.name}
              </p>
            )}

            <button
              type="button"
              disabled={!d.canDispatch || d.dispatching}
              onClick={handleGenerateDispatch}
              className={`w-full py-3 rounded-xl text-sm font-black uppercase ${th.btnSuccess} disabled:opacity-40`}
            >
              {d.dispatching ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</span>
              ) : (
                'Confirmar despacho'
              )}
            </button>
          </div>

          <div className={`rounded-xl border p-4 flex-1 min-h-[200px] ${th.card} ${th.cardBorder}`}>
            <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${th.cardTitle}`}>Incidentes activos</h2>
            <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
              {activeIncidents.length ? activeIncidents.map((inc) => {
                const patents = (inc.vehicles ?? []).map((vv) => vv.vehicle?.patent).filter(Boolean);
                return (
                  <div key={inc.id} className={`p-3 rounded-lg border ${th.incidentRow}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Siren className="w-4 h-4 text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${th.text}`}>{inc.type}</p>
                          <p className={`text-[10px] font-mono ${th.textMuted}`}>{inc.code}</p>
                        </div>
                      </div>
                      {inc.dispatchedAt && (
                        <span className={`text-[9px] shrink-0 flex items-center gap-0.5 ${th.textMuted}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(inc.dispatchedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {inc.address ? <p className={`text-[10px] mt-1 truncate ${th.textMuted}`}>{inc.address}</p> : null}
                    {patents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {patents.map((p) => (
                          <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="inline-block mt-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                      En ruta / activo
                    </span>
                  </div>
                );
              }) : (
                <p className={`text-sm text-center py-6 ${th.textMuted}`}>Sin incidentes activos</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer stats */}
      <footer className={`shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-t text-[10px] sm:text-xs ${th.footer} ${th.footerBorder}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-500">Sistema operativo</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span><span className={th.statLabel}>Bomberos disp. </span><strong className={th.statValue}>{footerStats.bomDisp}</strong></span>
          <span><span className={th.statLabel}>En servicio </span><strong className={th.statValue}>{footerStats.bomEnServicio}</strong></span>
          <span><span className={th.statLabel}>Total </span><strong className={th.statValue}>{footerStats.bomTotal}</strong></span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span><span className={th.statLabel}>Carros disp. </span><strong className={th.statValue}>{footerStats.carDisp}</strong></span>
          <span><span className={th.statLabel}>En servicio </span><strong className={th.statValue}>{footerStats.carEnServicio}</strong></span>
          <span><span className={th.statLabel}>Total </span><strong className={th.statValue}>{footerStats.carTotal}</strong></span>
        </div>
        <Link to="/incidents" className={`font-semibold hover:underline ${th.accent}`}>
          Historial de despachos →
        </Link>
      </footer>
    </div>
  );
}
