import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Truck, Users, Siren, RefreshCw, Radio, AlertTriangle,
  CheckCircle2, UserX, Flame, Activity, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import FirefighterAvatar from '../components/FirefighterAvatar';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import { isCentralOperator } from '../lib/roleAccess';
import { useAuthStore } from '../store/authStore';

type RosterMember = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleLabel?: string;
  photoUrl?: string | null;
  stationAvailable: boolean;
  operativeNumber?: number | null;
  companyId?: string;
};

type MaquinistaMember = {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  photoUrl?: string | null;
  maquinistaAvailable: boolean;
  maquinistaPrincipal: boolean;
};

type FleetVehicle = {
  id: string;
  patent: string;
  brand: string;
  model: string;
  type: string;
  status: 'OPERATIVO' | 'EN_REPARACION' | 'FUERA_DE_SERVICIO';
  statusLabel: string;
  imageUrl?: string | null;
  principalMaquinista?: MaquinistaMember | null;
};

type VisionCompany = {
  id: string;
  number: number;
  name: string;
  city: string;
  logoUrl?: string | null;
  dispatchSlug?: string | null;
  roster: { members: RosterMember[]; stats: { total: number; available: number; unavailable: number } };
  maquinistas: { members: MaquinistaMember[]; stats: { total: number; available: number } };
  fleet: { vehicles: FleetVehicle[]; stats: { total: number; operativo: number } };
};

type ActiveEmergency = {
  id: string;
  code: string;
  type: string;
  address: string;
  status: string;
  companyId?: string;
  company?: { number: number; name: string };
};

type GlobalPayload = {
  companies: VisionCompany[];
  activeEmergencies: ActiveEmergency[];
};

function companyOperativa(c: VisionCompany) {
  return c.roster.stats.available >= 4 && c.fleet.stats.operativo > 0 && c.maquinistas.stats.available > 0;
}

const FALLBACK_TRUCK =
  'https://images.unsplash.com/photo-1544627669-70db9b2c9d1b?w=1200&h=700&fit=crop&q=80';

function VehicleHero({
  vehicle,
  company,
  operativa,
  inEmergency,
  availableCount,
}: {
  vehicle: FleetVehicle | null;
  company: VisionCompany;
  operativa: boolean;
  inEmergency: boolean;
  availableCount: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = !imgError && vehicle?.imageUrl ? vehicle.imageUrl : FALLBACK_TRUCK;
  const operativo = vehicle?.status === 'OPERATIVO';

  return (
    <div className="relative h-52 sm:h-60 overflow-hidden">
      <img
        src={src}
        alt={vehicle?.patent || company.name}
        onError={() => setImgError(true)}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 group-hover:scale-110',
          !operativo && vehicle && 'grayscale-[40%]',
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05080f]/80 via-transparent to-cyan-950/20" />
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {inEmergency && (
        <div className="absolute inset-0 bg-red-600/15 animate-pulse pointer-events-none" />
      )}

      {/* Logo + nombre */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-md" />
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="relative w-14 h-14 rounded-2xl object-cover border-2 border-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.45)]"
              />
            ) : (
              <div className="relative w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                <Building2 className="w-7 h-7 text-cyan-300" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300 drop-shadow">
              {company.number}ª · {company.city}
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate drop-shadow-lg">
              {company.name}
            </h2>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {inEmergency ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.6)] animate-pulse">
              <Siren className="w-3 h-3" /> Emergencia
            </span>
          ) : operativa ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/90 text-white border border-emerald-300/40 shadow-[0_0_14px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-3 h-3" /> Operativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/90 text-amber-950 border border-amber-300/50">
              <AlertTriangle className="w-3 h-3" /> Atención
            </span>
          )}
          <span className="text-[10px] font-black text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/10">
            {availableCount} disponibles
          </span>
        </div>
      </div>

      {/* Patente / carro principal */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-3">
        <div>
          {vehicle ? (
            <>
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-cyan-300/80">Unidad principal</p>
              <p className="font-mono text-2xl font-black text-white tracking-wider drop-shadow-lg leading-none">
                {vehicle.patent}
              </p>
              <p className="text-xs text-slate-200/90 font-semibold mt-0.5">
                {vehicle.type || `${vehicle.brand} ${vehicle.model}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-300 font-semibold">Sin carro asignado</p>
          )}
        </div>
        {vehicle && (
          <span
            className={cn(
              'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border backdrop-blur-md',
              operativo
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
                : 'bg-slate-800/70 text-slate-300 border-slate-600',
            )}
          >
            {vehicle.statusLabel || vehicle.status}
          </span>
        )}
      </div>
    </div>
  );
}

function FleetThumb({ vehicle }: { vehicle: FleetVehicle }) {
  const [err, setErr] = useState(false);
  const operativo = vehicle.status === 'OPERATIVO';
  return (
    <div
      className={cn(
        'relative w-20 h-14 rounded-lg overflow-hidden border shrink-0',
        operativo ? 'border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]' : 'border-slate-700 opacity-60',
      )}
      title={`${vehicle.patent} · ${vehicle.statusLabel}`}
    >
      {vehicle.imageUrl && !err ? (
        <img src={vehicle.imageUrl} alt={vehicle.patent} onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <Truck className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
        <p className="text-[8px] font-mono font-black text-white truncate text-center">{vehicle.patent}</p>
      </div>
    </div>
  );
}

function CompanyVisionCard({
  company,
  emergencies,
  flashIds,
}: {
  company: VisionCompany;
  emergencies: ActiveEmergency[];
  flashIds: Set<string>;
}) {
  const operativa = companyOperativa(company);
  const available = company.roster.members.filter((m) => m.stationAvailable);
  const operativoVehicles = company.fleet.vehicles.filter((v) => v.status === 'OPERATIVO');
  const otherVehicles = company.fleet.vehicles.filter((v) => v.status !== 'OPERATIVO');
  const primaryVehicle =
    operativoVehicles.find((v) => v.imageUrl) ||
    operativoVehicles[0] ||
    company.fleet.vehicles.find((v) => v.imageUrl) ||
    company.fleet.vehicles[0] ||
    null;
  const secondaryVehicles = company.fleet.vehicles.filter((v) => v.id !== primaryVehicle?.id);
  const companyEmergencies = emergencies.filter(
    (e) =>
      e.status === 'ACTIVA' &&
      (e.companyId === company.id ||
        e.company?.number === company.number ||
        e.company?.name === company.name),
  );
  const inEmergency = companyEmergencies.length > 0;
  const maq = primaryVehicle?.principalMaquinista;

  return (
    <article
      className={cn(
        'group relative rounded-3xl border overflow-hidden transition-all duration-500 vision360-card bg-[#070b14]',
        inEmergency
          ? 'border-red-500/70 shadow-[0_0_40px_rgba(239,68,68,0.28)]'
          : operativa
            ? 'border-cyan-500/35 shadow-[0_0_32px_rgba(34,211,238,0.12)] hover:border-cyan-400/55'
            : 'border-slate-700/80',
      )}
    >
      <VehicleHero
        vehicle={primaryVehicle}
        company={company}
        operativa={operativa}
        inEmergency={inEmergency}
        availableCount={available.length}
      />

      {companyEmergencies.length > 0 && (
        <div className="px-4 py-2 border-y border-red-500/25 bg-red-950/50 space-y-1">
          {companyEmergencies.slice(0, 2).map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <Siren className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="min-w-0">
                <p className="font-black text-red-100 truncate">{e.code} · {e.type}</p>
                <p className="text-[10px] text-red-300/70 truncate">{e.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Maquinista del carro principal */}
        {maq && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <FirefighterAvatar
              photoUrl={maq.photoUrl}
              fullName={maq.fullName || `${maq.firstName} ${maq.lastName}`}
              available={maq.maquinistaAvailable}
              size="sm"
              variant="maquinista"
              principal={maq.maquinistaPrincipal}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider font-black text-amber-400/80">Maquinista unidad</p>
              <p className="text-sm font-bold text-white truncate">
                {maq.firstName} {maq.lastName}
              </p>
            </div>
            <span
              className={cn(
                'text-[9px] font-black uppercase px-2 py-1 rounded-lg',
                maq.maquinistaAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400',
              )}
            >
              {maq.maquinistaAvailable ? 'Listo' : 'No disp.'}
            </span>
          </div>
        )}

        {/* Otras unidades en miniatura */}
        {secondaryVehicles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-cyan-500/70" /> Flota
              </p>
              <span className="text-[9px] text-slate-500 font-bold">
                {operativoVehicles.length} op. · {otherVehicles.length} fuera
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {secondaryVehicles.map((v) => (
                <FleetThumb key={v.id} vehicle={v} />
              ))}
            </div>
          </div>
        )}

        {/* Bomberos disponibles — foco principal */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] uppercase tracking-[0.16em] font-black text-emerald-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Dotación disponible
            </h3>
            <span className="text-sm font-black text-emerald-300 tabular-nums">{available.length}</span>
          </div>
          {available.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/80 px-3 py-5 text-center">
              <UserX className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 font-semibold">Sin bomberos disponibles</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {available.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col items-center gap-1.5 w-[4.5rem] rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/15 to-transparent px-1.5 py-2 transition-all',
                    flashIds.has(`m:${m.id}`) && 'vision360-flash-green scale-110 border-emerald-300/60',
                  )}
                >
                  <FirefighterAvatar
                    photoUrl={m.photoUrl}
                    fullName={m.fullName}
                    available
                    size="sm"
                    className="!w-11 !h-11 shadow-[0_0_14px_rgba(16,185,129,0.35)]"
                  />
                  <p className="text-[10px] font-bold text-emerald-50 text-center leading-tight line-clamp-2 w-full">
                    {m.firstName}
                  </p>
                  <p className="text-[8px] font-mono text-emerald-400/70">
                    {m.operativeNumber != null ? `N°${m.operativeNumber}` : '·'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {company.dispatchSlug && (
          <Link
            to={`/central/${company.dispatchSlug}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider transition-colors"
          >
            <Radio className="w-3.5 h-3.5" /> Sala pública
          </Link>
        )}
      </div>
    </article>
  );
}

export default function Vision360CuartelesPage() {
  const user = useAuthStore((s) => s.user);
  const isOperator = isCentralOperator(user?.role);
  const qc = useQueryClient();
  const prevRef = useRef<Map<string, boolean>>(new Map());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<{ id: string; text: string; at: number }[]>([]);
  const bootstrapped = useRef(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['vision360-cuarteles'],
    queryFn: () => api.get<GlobalPayload>('/dispatch/central/global').then((r) => r.data),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    const unsub = subscribeAnyDispatchLive(() => {
      void qc.invalidateQueries({ queryKey: ['vision360-cuarteles'] });
    });
    return unsub;
  }, [qc]);

  const pushFeed = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFeed((prev) => [{ id, text, at: Date.now() }, ...prev].slice(0, 8));
  }, []);

  const flash = useCallback((ids: string[]) => {
    setFlashIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    window.setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 2200);
  }, []);

  useEffect(() => {
    if (!data?.companies) return;
    const nextMap = new Map<string, boolean>();
    const newlyAvailable: string[] = [];
    const newlyUnavailable: string[] = [];

    data.companies.forEach((c) => {
      c.roster.members.forEach((m) => {
        nextMap.set(m.id, m.stationAvailable);
        const prev = prevRef.current.get(m.id);
        if (prev === undefined) return;
        if (!prev && m.stationAvailable) {
          newlyAvailable.push(m.id);
          const msg = `${m.fullName || `${m.firstName} ${m.lastName}`} disponible en ${c.number}ª`;
          pushFeed(msg);
          toast.success(msg, { icon: '🟢', duration: 3500 });
        }
        if (prev && !m.stationAvailable) {
          newlyUnavailable.push(m.id);
          pushFeed(`${m.firstName} ${m.lastName} ya no está disponible · ${c.number}ª`);
        }
      });
    });

    if (bootstrapped.current) {
      flash(newlyAvailable.map((id) => `m:${id}`));
    } else {
      bootstrapped.current = true;
    }
    prevRef.current = nextMap;
  }, [data, flash, pushFeed]);

  const companies = data?.companies ?? [];
  const emergencies = (data?.activeEmergencies ?? []).filter((e) => e.status === 'ACTIVA');

  const totals = useMemo(() => {
    return companies.reduce(
      (acc, c) => {
        acc.available += c.roster.stats.available;
        acc.total += c.roster.stats.total;
        acc.fleet += c.fleet.stats.operativo;
        acc.maq += c.maquinistas.stats.available;
        if (companyOperativa(c)) acc.operativas += 1;
        return acc;
      },
      { available: 0, total: 0, fleet: 0, maq: 0, operativas: 0 },
    );
  }, [companies]);

  return (
    <div className="min-h-full bg-[#05080f] text-slate-200">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-4 space-y-4 pb-10">
        {!isOperator && (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Vision360 Cuarteles</h1>
              <p className="text-xs text-slate-400">Vista dinámica de carros, dotación y disponibilidad en vivo</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0b1220] to-[#0b1220] p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-6 h-6 text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-black text-cyan-400">Monitoreo en vivo</p>
              <p className="text-sm font-bold text-white">
                {companies.length} cuarteles · {emergencies.length} emergencia{emergencies.length === 1 ? '' : 's'} activa{emergencies.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Disponibles', value: totals.available, color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
              { label: 'Carros OK', value: totals.fleet, color: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
              { label: 'Maquinistas', value: totals.maq, color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
              { label: 'Operativas', value: totals.operativas, color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
            ].map((s) => (
              <div key={s.label} className={cn('px-3 py-1.5 rounded-xl border text-center min-w-[76px]', s.color)}>
                <p className="text-lg font-black leading-none">{s.value}</p>
                <p className="text-[9px] uppercase tracking-wider font-bold opacity-80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Actualizar
          </button>
        </div>

        {feed.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none">
            <Flame className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            {feed.slice(0, 4).map((f) => (
              <span key={f.id} className="shrink-0 text-[11px] font-semibold text-emerald-200/90 border border-emerald-500/20 rounded-lg px-2 py-1 bg-emerald-500/5">
                {f.text}
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> Cargando cuarteles…
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-white">Sin compañías activas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((c) => (
              <CompanyVisionCard
                key={c.id}
                company={c}
                emergencies={emergencies}
                flashIds={flashIds}
              />
            ))}
          </div>
        )}

        {emergencies.length > 0 && (
          <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
              <Siren className="w-4 h-4" /> Emergencias activas en el cuerpo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {emergencies.map((e) => (
                <div key={e.id} className="rounded-xl border border-red-500/25 bg-black/30 px-3 py-2.5">
                  <p className="text-[10px] font-mono text-red-300">{e.code}</p>
                  <p className="text-sm font-bold text-white">{e.type}</p>
                  <p className="text-[11px] text-slate-400 truncate">{e.address}</p>
                  {e.company && (
                    <p className="text-[10px] text-red-400/80 mt-1 font-semibold">
                      {e.company.number}ª · {e.company.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
          <Radio className="w-3 h-3" /> Actualización automática · cambios de disponibilidad se destacan en vivo
        </p>
      </div>
    </div>
  );
}
