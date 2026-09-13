import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Truck, Users, Siren, RefreshCw, Radio, AlertTriangle,
  CheckCircle2, UserX, Shield, Moon, Sun, Cog,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import FirefighterAvatar from '../components/FirefighterAvatar';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
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

const ORDINALS = ['', 'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];

function companyTitle(c: VisionCompany) {
  const ordinal = ORDINALS[c.number] ?? `${c.number}ª`;
  if (/compañ[ií]a/i.test(c.name)) return c.name;
  return `${ordinal} Compañía de Bomberos de ${c.city}`;
}

const FALLBACK_TRUCK =
  'https://images.unsplash.com/photo-1544627669-70db9b2c9d1b?w=1200&h=700&fit=crop&q=80';

function CompanyCard({
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
  const [imgError, setImgError] = useState(false);
  const operativa = companyOperativa(company);
  const available = company.roster.members.filter((m) => m.stationAvailable);
  const operativoVehicles = company.fleet.vehicles.filter((v) => v.status === 'OPERATIVO');
  const primaryVehicle =
    operativoVehicles.find((v) => v.imageUrl) ||
    operativoVehicles[0] ||
    company.fleet.vehicles.find((v) => v.imageUrl) ||
    company.fleet.vehicles[0] ||
    null;
  const companyEmergencies = emergencies.filter(
    (e) =>
      e.status === 'ACTIVA' &&
      (e.companyId === company.id ||
        e.company?.number === company.number ||
        e.company?.name === company.name),
  );
  const inEmergency = companyEmergencies.length > 0;
  const hasPhoto = Boolean(primaryVehicle?.imageUrl) && !imgError;
  const accent = inEmergency || Boolean(primaryVehicle);

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border shadow-sm',
        isDark ? 'bg-[#17191e] border-white/10' : 'bg-white border-slate-100',
        accent && (isDark ? 'border-l-[3px] border-l-red-500' : 'border-l-[3px] border-l-red-600'),
      )}
    >
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <Shield className={cn('w-4 h-4 shrink-0', isDark ? 'text-red-400' : 'text-red-600')} />
            <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>
              {company.number}ª · {company.city}
            </span>
          </div>
          <h2 className={cn('mt-1.5 text-[17px] font-semibold leading-snug', isDark ? 'text-white' : 'text-slate-900')}>
            {companyTitle(company)}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {inEmergency ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
              <Siren className="w-3 h-3" /> Emergencia
            </span>
          ) : operativa ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Operativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3 h-3" /> Atención
            </span>
          )}
          <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-400')}>
            {available.length} disponible{available.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {inEmergency && companyEmergencies[0] && (
        <div className={cn('mx-5 mb-3 rounded-xl px-3 py-2 text-xs', isDark ? 'bg-red-950/50 text-red-200' : 'bg-red-50 text-red-800')}>
          <p className="font-semibold truncate">{companyEmergencies[0].code} · {companyEmergencies[0].type}</p>
          <p className="truncate opacity-80">{companyEmergencies[0].address}</p>
        </div>
      )}

      {hasPhoto && primaryVehicle ? (
        <div className="px-5">
          <div className="rounded-2xl overflow-hidden bg-slate-100">
            <img
              src={primaryVehicle.imageUrl || FALLBACK_TRUCK}
              alt={primaryVehicle.patent}
              onError={() => setImgError(true)}
              className={cn('w-full h-36 object-cover', primaryVehicle.status !== 'OPERATIVO' && 'grayscale')}
            />
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Unidad principal
              </p>
              <p className={cn('font-mono text-xl font-bold tracking-wide', isDark ? 'text-white' : 'text-slate-900')}>
                {primaryVehicle.patent}
              </p>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {primaryVehicle.type || `${primaryVehicle.brand} ${primaryVehicle.model}`}
              </p>
            </div>
            {primaryVehicle.status === 'OPERATIVO' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operativo
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 flex flex-col items-center justify-center">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            isDark ? 'bg-slate-800' : 'bg-slate-100',
          )}>
            <Truck className={cn('w-6 h-6', isDark ? 'text-slate-500' : 'text-slate-300')} />
          </div>
          <p className={cn('mt-2 text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>Sin carro asignado</p>
        </div>
      )}

      <div className="px-5 mt-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className={cn('text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5', isDark ? 'text-slate-400' : 'text-slate-400')}>
            <Users className="w-3.5 h-3.5" /> Dotación disponible
          </p>
          <span className={cn('text-sm font-semibold tabular-nums', isDark ? 'text-slate-300' : 'text-slate-500')}>
            {available.length}
          </span>
        </div>
        {available.length === 0 ? (
          <div className="flex flex-col items-center py-4">
            <UserX className={cn('w-8 h-8', isDark ? 'text-slate-600' : 'text-slate-200')} />
            <p className={cn('mt-1 text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>Sin bomberos disponibles</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {available.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col items-center w-[4.25rem]',
                  flashIds.has(`m:${m.id}`) && 'vision360-flash-green',
                )}
              >
                <FirefighterAvatar
                  photoUrl={m.photoUrl}
                  fullName={m.fullName}
                  available
                  size="sm"
                  role={m.role}
                  className="!w-10 !h-10"
                />
                <p className={cn('mt-1 text-[11px] font-medium text-center truncate w-full', isDark ? 'text-slate-200' : 'text-slate-700')}>
                  {m.firstName}
                </p>
                <p className={cn('text-[10px] truncate w-full text-center', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {m.roleLabel?.replace(/^Bombero\s+/i, '') || 'Voluntario'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {company.dispatchSlug ? (
        <Link
          to={`/central/${company.dispatchSlug}`}
          className={cn(
            'mt-4 mx-5 mb-4 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-wider',
            isDark
              ? 'text-slate-400 hover:text-red-300 hover:bg-red-950/40'
              : 'text-slate-400 hover:text-red-600 hover:bg-red-50',
          )}
        >
          <Radio className="w-3.5 h-3.5" /> Sala pública
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <div className="h-4" />
      )}
    </article>
  );
}

export default function Vision360CuartelesPage() {
  const { toggleTheme, isDark } = useCentralParralTheme();
  const qc = useQueryClient();
  const prevRef = useRef<Map<string, boolean>>(new Map());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<{ id: string; text: string; at: number }[]>([]);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const bootstrapped = useRef(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['vision360-cuarteles'],
    queryFn: () => api.get<GlobalPayload>('/dispatch/central/global').then((r) => r.data),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);

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

    data.companies.forEach((c) => {
      c.roster.members.forEach((m) => {
        nextMap.set(m.id, m.stationAvailable);
        const prev = prevRef.current.get(m.id);
        if (prev === undefined) return;
        if (!prev && m.stationAvailable) {
          newlyAvailable.push(m.id);
          const msg = `${m.fullName || `${m.firstName} ${m.lastName}`} disponible en ${c.number}ª`;
          pushFeed(msg);
          toast.success(msg, { duration: 3500 });
        }
        if (prev && !m.stationAvailable) {
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
        acc.fleet += c.fleet.stats.operativo;
        acc.maq += c.maquinistas.stats.available;
        if (companyOperativa(c)) acc.operativas += 1;
        return acc;
      },
      { available: 0, fleet: 0, maq: 0, operativas: 0 },
    );
  }, [companies]);

  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin', isDark ? 'bg-[#0f1115]' : 'bg-[#f4f6f8]')}>
      <header className={cn(
        'vision360-banner px-4 sm:px-6 py-4',
        isDark ? 'bg-[#111318] border-b border-white/5 text-white' : 'bg-[#111827] text-white',
      )}>
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <div>
              <p className="text-lg font-bold tracking-tight leading-none text-white">
                NODO<span className="text-red-500">360</span>
              </p>
              <p className="text-[11px] text-white mt-1">Conectando a quienes nos cuidan</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/20" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-red-500" /> Monitoreo en vivo
              </p>
              <p className="text-[12px] text-white mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {companies.length} cuarteles · {emergencies.length} emergencia{emergencies.length === 1 ? '' : 's'} activa{emergencies.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {[
              { icon: Users, label: 'disponibles', value: totals.available },
              { icon: Truck, label: 'carros OK', value: totals.fleet },
              { icon: Radio, label: 'maquinistas', value: totals.maq },
              { icon: Cog, label: 'operativas', value: totals.operativas },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-white">
                <s.icon className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white tabular-nums">{s.value}</span>
                <span className="text-[11px] text-white hidden md:inline">{s.label}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-white hover:bg-white/10"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => void refetch()}
              className="flex items-center gap-2 text-[12px] text-white hover:text-white"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
              <span className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-white">Actualizar</span>
                <span className="text-[10px] text-white">
                  {updatedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 pb-10">
        {feed.length > 0 && (
          <p className={cn('text-[12px] mb-4', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {feed.slice(0, 3).map((f) => f.text).join('  ·  ')}
          </p>
        )}

        {isLoading ? (
          <div className={cn('flex items-center justify-center py-24 gap-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
            <RefreshCw className="w-5 h-5 animate-spin" /> Cargando cuarteles…
          </div>
        ) : companies.length === 0 ? (
          <div className={cn('rounded-3xl border p-10 text-center bg-white', isDark && 'bg-[#17191e] border-white/10')}>
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-800')}>Sin compañías activas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((c) => (
              <CompanyCard
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
          <section className={cn('mt-5 rounded-3xl border p-4', isDark ? 'bg-[#17191e] border-red-500/30' : 'bg-white border-red-100')}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-red-600">
              <Siren className="w-4 h-4" /> Emergencias activas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {emergencies.map((e) => (
                <div key={e.id} className={cn('rounded-2xl border px-3 py-2.5', isDark ? 'border-white/10' : 'border-slate-100')}>
                  <p className="text-[11px] font-mono text-red-600">{e.code}</p>
                  <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{e.type}</p>
                  <p className={cn('text-[12px] truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>{e.address}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className={cn('mt-8 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]', isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400')}>
          <span>Sistema de monitoreo público</span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Actualización automática · cambios de disponibilidad en vivo
          </span>
          <span className="font-semibold">NODO<span className="text-red-500">360</span></span>
        </footer>
      </div>
    </div>
  );
}
