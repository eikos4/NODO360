import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Truck, Users, Siren, RefreshCw, Radio, AlertTriangle,
  CheckCircle2, UserX, Flame, Activity, Eye, Moon, Sun,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import FirefighterAvatar from '../components/FirefighterAvatar';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import { isCentralOperator } from '../lib/roleAccess';
import { useAuthStore } from '../store/authStore';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';

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
  isDark,
}: {
  vehicle: FleetVehicle | null;
  company: VisionCompany;
  operativa: boolean;
  inEmergency: boolean;
  availableCount: number;
  isDark: boolean;
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
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t to-transparent',
        isDark ? 'from-[#05080f] via-[#05080f]/55' : 'from-white via-white/70',
      )} />
      <div className={cn(
        'absolute inset-0 bg-gradient-to-r via-transparent',
        isDark ? 'from-[#05080f]/80 to-cyan-950/20' : 'from-white/80 to-cyan-100/30',
      )} />
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
              <div className={cn(
                'relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center',
                isDark
                  ? 'bg-slate-900/90 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                  : 'bg-white border-cyan-400 shadow-md',
              )}>
                <Building2 className="w-7 h-7 text-cyan-500" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className={cn(
              'text-[10px] font-black uppercase tracking-[0.2em] drop-shadow',
              isDark ? 'text-cyan-300' : 'text-cyan-800',
            )}>
              {company.number}ª · {company.city}
            </p>
            <h2 className={cn(
              'text-lg sm:text-xl font-black leading-tight truncate drop-shadow-lg',
              isDark ? 'text-[#fff]' : 'text-slate-900',
            )}>
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
          <span className={cn(
            'text-[10px] font-black backdrop-blur-sm px-2 py-0.5 rounded-lg border',
            isDark ? 'text-[#fff] bg-black/40 border-white/10' : 'text-slate-800 bg-white/85 border-slate-200',
          )}>
            {availableCount} disponibles
          </span>
        </div>
      </div>

      {/* Patente / carro principal */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-3">
        <div>
          {vehicle ? (
            <>
              <p className={cn(
                'text-[9px] uppercase tracking-[0.18em] font-bold',
                isDark ? 'text-cyan-300/80' : 'text-cyan-800',
              )}>Unidad principal</p>
              <p className={cn(
                'font-mono text-2xl font-black tracking-wider drop-shadow-lg leading-none',
                isDark ? 'text-[#fff]' : 'text-slate-900',
              )}>
                {vehicle.patent}
              </p>
              <p className={cn(
                'text-xs font-semibold mt-0.5',
                isDark ? 'text-slate-200/90' : 'text-slate-700',
              )}>
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
                ? isDark
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isDark
                  ? 'bg-slate-800/70 text-slate-300 border-slate-600'
                  : 'bg-white/90 text-slate-600 border-slate-300',
            )}
          >
            {vehicle.statusLabel || vehicle.status}
          </span>
        )}
      </div>
    </div>
  );
}

function FleetThumb({ vehicle, isDark }: { vehicle: FleetVehicle; isDark: boolean }) {
  const [err, setErr] = useState(false);
  const operativo = vehicle.status === 'OPERATIVO';
  return (
    <div
      className={cn(
        'relative w-20 h-14 rounded-lg overflow-hidden border shrink-0',
        operativo
          ? isDark
            ? 'border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
            : 'border-cyan-300 shadow-sm'
          : isDark
            ? 'border-slate-700 opacity-60'
            : 'border-slate-200 opacity-70',
      )}
      title={`${vehicle.patent} · ${vehicle.statusLabel}`}
    >
      {vehicle.imageUrl && !err ? (
        <img src={vehicle.imageUrl} alt={vehicle.patent} onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <div className={cn('w-full h-full flex items-center justify-center', isDark ? 'bg-slate-900' : 'bg-slate-100')}>
          <Truck className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div className={cn('absolute inset-x-0 bottom-0 px-1 py-0.5', isDark ? 'bg-black/70' : 'bg-white/90')}>
        <p className={cn(
          'text-[8px] font-mono font-black truncate text-center',
          isDark ? 'text-[#fff]' : 'text-slate-800',
        )}>{vehicle.patent}</p>
      </div>
    </div>
  );
}

function CompanyVisionCard({
  company,
  emergencies,
  flashIds,
  isDark,
}: {
  company: VisionCompany;
  emergencies: ActiveEmergency[];
  flashIds: Set<string>;
  isDark: boolean;
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
        'group relative rounded-3xl border overflow-hidden transition-all duration-500 vision360-card',
        isDark ? 'bg-[#070b14]' : 'bg-white shadow-sm',
        inEmergency
          ? isDark
            ? 'border-red-500/70 shadow-[0_0_40px_rgba(239,68,68,0.28)]'
            : 'border-red-400 shadow-md shadow-red-100'
          : operativa
            ? isDark
              ? 'border-cyan-500/35 shadow-[0_0_32px_rgba(34,211,238,0.12)] hover:border-cyan-400/55'
              : 'border-cyan-300 shadow-md shadow-cyan-100 hover:border-cyan-400'
            : isDark
              ? 'border-slate-700/80'
              : 'border-slate-200',
      )}
    >
      <VehicleHero
        vehicle={primaryVehicle}
        company={company}
        operativa={operativa}
        inEmergency={inEmergency}
        availableCount={available.length}
        isDark={isDark}
      />

      {companyEmergencies.length > 0 && (
        <div className={cn(
          'px-4 py-2 border-y space-y-1',
          isDark ? 'border-red-500/25 bg-red-950/50' : 'border-red-200 bg-red-50',
        )}>
          {companyEmergencies.slice(0, 2).map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <Siren className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="min-w-0">
                <p className={cn('font-black truncate', isDark ? 'text-red-100' : 'text-red-800')}>{e.code} · {e.type}</p>
                <p className={cn('text-[10px] truncate', isDark ? 'text-red-300/70' : 'text-red-600/80')}>{e.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Maquinista del carro principal */}
        {maq && (
          <div className={cn(
            'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
            isDark ? 'border-amber-500/25 bg-amber-500/5' : 'border-amber-200 bg-amber-50',
          )}>
            <FirefighterAvatar
              photoUrl={maq.photoUrl}
              fullName={maq.fullName || `${maq.firstName} ${maq.lastName}`}
              available={maq.maquinistaAvailable}
              size="sm"
              variant="maquinista"
              principal={maq.maquinistaPrincipal}
            />
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-[9px] uppercase tracking-wider font-black',
                isDark ? 'text-amber-400/80' : 'text-amber-700',
              )}>Maquinista unidad</p>
              <p className={cn('text-sm font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>
                {maq.firstName} {maq.lastName}
              </p>
            </div>
            <span
              className={cn(
                'text-[9px] font-black uppercase px-2 py-1 rounded-lg',
                maq.maquinistaAvailable
                  ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500',
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
                <FleetThumb key={v.id} vehicle={v} isDark={isDark} />
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
            <div className={cn(
              'rounded-2xl border border-dashed px-3 py-5 text-center',
              isDark ? 'border-slate-700/80' : 'border-slate-200 bg-slate-50',
            )}>
              <UserX className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 font-semibold">Sin bomberos disponibles</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {available.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col items-center gap-1.5 w-[4.5rem] rounded-2xl border px-1.5 py-2 transition-all',
                    isDark
                      ? 'border-emerald-400/25 bg-gradient-to-b from-emerald-500/15 to-transparent'
                      : 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-white',
                    flashIds.has(`m:${m.id}`) && 'vision360-flash-green scale-110 border-emerald-300/60',
                  )}
                >
                  <FirefighterAvatar
                    photoUrl={m.photoUrl}
                    fullName={m.fullName}
                    available
                    size="sm"
                    role={m.role}
                    className="!w-11 !h-11 shadow-[0_0_14px_rgba(16,185,129,0.35)]"
                  />
                  <p className={cn(
                    'text-[10px] font-bold text-center leading-tight line-clamp-2 w-full',
                    isDark ? 'text-emerald-50' : 'text-emerald-900',
                  )}>
                    {m.firstName}
                  </p>
                  <p className="text-[8px] font-semibold text-emerald-400/80 truncate w-full text-center" title={m.roleLabel}>
                    {m.roleLabel?.replace(/^Bombero\s+/i, '') || '·'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {company.dispatchSlug && (
          <Link
            to={`/central/${company.dispatchSlug}`}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-colors',
              isDark
                ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800',
            )}
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
  const { tokens: th, toggleTheme, isDark } = useCentralParralTheme();
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
    <div className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin transition-colors duration-300', th.shell)}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-4 space-y-4 pb-10">
        {!isOperator && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-11 h-11 rounded-xl border flex items-center justify-center',
                isDark ? 'bg-cyan-600/20 border-cyan-500/40' : 'bg-cyan-50 border-cyan-200',
              )}>
                <Eye className={cn('w-5 h-5', isDark ? 'text-cyan-300' : 'text-cyan-700')} />
              </div>
              <div>
                <h1 className={cn('text-xl font-black tracking-tight', th.title)}>Vision360 Cuarteles</h1>
                <p className={cn('text-xs', th.subtitle)}>Vista dinámica de carros, dotación y disponibilidad en vivo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={cn('p-2 rounded-lg border transition-colors', th.btnGhost)}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className={cn(
          'rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4',
          isDark
            ? 'border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0b1220] to-[#0b1220] shadow-[0_0_24px_rgba(34,211,238,0.08)]'
            : 'border-cyan-200 bg-white shadow-sm',
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className={cn('w-6 h-6', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <p className={cn('text-[10px] uppercase tracking-[0.18em] font-black', isDark ? 'text-cyan-400' : 'text-cyan-700')}>Monitoreo en vivo</p>
              <p className={cn('text-sm font-bold', th.title)}>
                {companies.length} cuarteles · {emergencies.length} emergencia{emergencies.length === 1 ? '' : 's'} activa{emergencies.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Disponibles', value: totals.available, color: isDark ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-emerald-800 border-emerald-200 bg-emerald-50' },
              { label: 'Carros OK', value: totals.fleet, color: isDark ? 'text-sky-300 border-sky-500/30 bg-sky-500/10' : 'text-sky-800 border-sky-200 bg-sky-50' },
              { label: 'Maquinistas', value: totals.maq, color: isDark ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-amber-800 border-amber-200 bg-amber-50' },
              { label: 'Operativas', value: totals.operativas, color: isDark ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' : 'text-cyan-800 border-cyan-200 bg-cyan-50' },
            ].map((s) => (
              <div key={s.label} className={cn('px-3 py-1.5 rounded-xl border text-center min-w-[76px]', s.color)}>
                <p className="text-lg font-black leading-none">{s.value}</p>
                <p className="text-[9px] uppercase tracking-wider font-bold opacity-80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isOperator && (
              <button
                type="button"
                onClick={toggleTheme}
                className={cn('p-2 rounded-xl border transition-colors', th.btnGhost)}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold', th.refreshBtn)}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Actualizar
            </button>
          </div>
        </div>

        {feed.length > 0 && (
          <div className={cn(
            'rounded-xl border px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none',
            isDark ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50',
          )}>
            <Flame className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            {feed.slice(0, 4).map((f) => (
              <span key={f.id} className={cn(
                'shrink-0 text-[11px] font-semibold border rounded-lg px-2 py-1',
                isDark
                  ? 'text-emerald-200/90 border-emerald-500/20 bg-emerald-500/5'
                  : 'text-emerald-800 border-emerald-200 bg-white',
              )}>
                {f.text}
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className={cn('flex items-center justify-center py-24 gap-2', th.subtitle)}>
            <RefreshCw className="w-5 h-5 animate-spin" /> Cargando cuarteles…
          </div>
        ) : companies.length === 0 ? (
          <div className={cn('rounded-2xl border p-10 text-center', isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white shadow-sm')}>
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className={cn('font-bold', th.title)}>Sin compañías activas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((c) => (
              <CompanyVisionCard
                key={c.id}
                company={c}
                emergencies={emergencies}
                flashIds={flashIds}
                isDark={isDark}
              />
            ))}
          </div>
        )}

        {emergencies.length > 0 && (
          <section className={cn(
            'rounded-2xl border p-4',
            isDark ? 'border-red-500/30 bg-red-950/20' : 'border-red-200 bg-red-50',
          )}>
            <h3 className={cn(
              'text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2',
              isDark ? 'text-red-400' : 'text-red-700',
            )}>
              <Siren className="w-4 h-4" /> Emergencias activas en el cuerpo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {emergencies.map((e) => (
                <div key={e.id} className={cn(
                  'rounded-xl border px-3 py-2.5',
                  isDark ? 'border-red-500/25 bg-black/30' : 'border-red-200 bg-white',
                )}>
                  <p className={cn('text-[10px] font-mono', isDark ? 'text-red-300' : 'text-red-600')}>{e.code}</p>
                  <p className={cn('text-sm font-bold', th.title)}>{e.type}</p>
                  <p className={cn('text-[11px] truncate', th.subtitle)}>{e.address}</p>
                  {e.company && (
                    <p className={cn('text-[10px] mt-1 font-semibold', isDark ? 'text-red-400/80' : 'text-red-600')}>
                      {e.company.number}ª · {e.company.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className={cn('text-center text-[10px] flex items-center justify-center gap-1', th.footer)}>
          <Radio className="w-3 h-3" /> Actualización automática · cambios de disponibilidad se destacan en vivo
        </p>
      </div>
    </div>
  );
}
