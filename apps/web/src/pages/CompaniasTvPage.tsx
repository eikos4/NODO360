import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Maximize2, Minimize2, Radio, Siren, Truck, Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import FirefighterAvatar from '../components/FirefighterAvatar';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import { vehicleTypeAbbrev } from '../lib/vehicle-types';

type RosterMember = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleLabel?: string;
  photoUrl?: string | null;
  stationAvailable: boolean;
};

type MaquinistaMember = {
  id: string;
  firstName: string;
  lastName: string;
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
  imageUrl?: string | null;
};

type TvCompany = {
  id: string;
  number: number;
  name: string;
  city: string;
  logoUrl?: string | null;
  headquartersImageUrl?: string | null;
  dispatchAvailable?: boolean;
  roster: { members: RosterMember[]; stats: { total: number; available: number } };
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
  companies: TvCompany[];
  activeEmergencies: ActiveEmergency[];
};

const FALLBACK_HQ =
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=900&fit=crop&q=80';

function publicMediaUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
      if (apiBase) {
        const base = new URL(apiBase, window.location.origin);
        return `${base.origin}${parsed.pathname}${parsed.search}`;
      }
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function companyTitle(c: TvCompany) {
  if (/compañ[ií]a/i.test(c.name)) return c.name;
  return `${c.number}ª Compañía · ${c.city}`;
}

function isOperativa(c: TvCompany) {
  return c.roster.stats.available >= 4 && c.fleet.stats.operativo > 0 && c.maquinistas.stats.available > 0;
}

function tvGridClass(n: number) {
  if (n <= 1) return 'grid-cols-1 grid-rows-1';
  if (n === 2) return 'grid-cols-2 grid-rows-1';
  if (n <= 4) return 'grid-cols-2 grid-rows-2';
  if (n <= 6) return 'grid-cols-3 grid-rows-2';
  if (n <= 9) return 'grid-cols-3 grid-rows-3';
  return 'grid-cols-4 auto-rows-fr';
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CompaniasTvPage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['companias-tv'],
    queryFn: () => api.get<GlobalPayload>('/dispatch/central/global').then((r) => r.data),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    const unsub = subscribeAnyDispatchLive(() => {
      void qc.invalidateQueries({ queryKey: ['companias-tv'] });
    });
    return unsub;
  }, [qc]);

  const companies = data?.companies ?? [];
  const emergencies = (data?.activeEmergencies ?? []).filter((e) => e.status === 'ACTIVA');
  const city = companies[0]?.city ?? 'Parral';

  const totals = useMemo(
    () =>
      companies.reduce(
        (acc, c) => {
          acc.people += c.roster.stats.available;
          acc.fleet += c.fleet.stats.operativo;
          acc.maq += c.maquinistas.stats.available;
          if (isOperativa(c)) acc.ready += 1;
          return acc;
        },
        { people: 0, fleet: 0, maq: 0, ready: 0 },
      ),
    [companies],
  );

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07090d] text-white">
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 bg-black/40 px-5 py-3">
        <div className="min-w-0">
          <p className="text-xl font-black tracking-tight leading-none">
            NODO<span className="text-red-500">360</span>
          </p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/50">
            Cuerpo de Bomberos de {city}
          </p>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <StatChip icon={Users} value={totals.people} label="dotación" />
          <StatChip icon={Truck} value={totals.fleet} label="unidades" />
          <StatChip icon={Radio} value={totals.maq} label="maquinistas" />
          <StatChip icon={CheckCircle2} value={totals.ready} label="operativas" tone="ok" />
          {emergencies.length > 0 && (
            <StatChip icon={Siren} value={emergencies.length} label="activas" tone="alert" />
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400 sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
          <p className="font-mono text-3xl font-black tabular-nums tracking-tight">{fmtClock(now)}</p>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <Link
            to="/vision360-cuarteles"
            className="hidden rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/50 hover:bg-white/10 hover:text-white sm:inline"
          >
            Vision360
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3">
        {isLoading && companies.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40">Cargando compañías…</div>
        ) : companies.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40">Sin compañías activas</div>
        ) : (
          <div className={cn('grid h-full min-h-0 gap-3', tvGridClass(companies.length))}>
            {companies.map((company) => (
              <CompanyTvCard
                key={company.id}
                company={company}
                emergencies={emergencies.filter(
                  (e) =>
                    e.companyId === company.id ||
                    e.company?.number === company.number ||
                    e.company?.name === company.name,
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Users;
  value: number;
  label: string;
  tone?: 'ok' | 'alert';
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn(
        'h-4 w-4',
        tone === 'alert' ? 'text-red-400' : tone === 'ok' ? 'text-emerald-400' : 'text-white/50',
      )} />
      <span className={cn(
        'text-lg font-black tabular-nums',
        tone === 'alert' ? 'text-red-400' : 'text-white',
      )}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-white/45">{label}</span>
    </div>
  );
}

function CompanyTvCard({
  company,
  emergencies,
}: {
  company: TvCompany;
  emergencies: ActiveEmergency[];
}) {
  const [hqBroken, setHqBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const available = company.roster.members.filter((m) => m.stationAvailable);
  const vehicles = company.fleet.vehicles.filter((v) => v.status === 'OPERATIVO');
  const extraPeople = Math.max(0, available.length - 8);
  const operativa = isOperativa(company);
  const cuartelOff = company.dispatchAvailable === false;
  const inEmergency = emergencies.length > 0;
  const hq =
    (!hqBroken && publicMediaUrl(company.headquartersImageUrl)) ||
    publicMediaUrl(vehicles.find((v) => v.imageUrl)?.imageUrl) ||
    FALLBACK_HQ;
  const logo = !logoBroken ? publicMediaUrl(company.logoUrl) : null;

  return (
    <article
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-3xl border shadow-2xl',
        inEmergency ? 'border-red-500/80' : operativa ? 'border-emerald-500/30' : 'border-white/10',
      )}
    >
      <img
        src={hq}
        alt=""
        onError={() => setHqBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/25" />

      <div className="relative flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg">
              {logo ? (
                <img src={logo} alt="" onError={() => setLogoBroken(true)} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-white">{company.number}ª</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55">
                {company.number}ª compañía
              </p>
              <h2 className="truncate text-xl font-black leading-tight text-white drop-shadow">
                {companyTitle(company)}
              </h2>
            </div>
          </div>
          {inEmergency ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <Siren className="h-3.5 w-3.5" /> Emergencia
            </span>
          ) : cuartelOff ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <AlertTriangle className="h-3.5 w-3.5" /> No disponible
            </span>
          ) : operativa ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <CheckCircle2 className="h-3.5 w-3.5" /> Operativa
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <AlertTriangle className="h-3.5 w-3.5" /> En espera
            </span>
          )}
        </div>

        {inEmergency && emergencies[0] && (
          <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-950/70 px-3 py-2">
            <p className="truncate text-sm font-black text-white">
              {emergencies[0].code} · {emergencies[0].type}
            </p>
            <p className="truncate text-xs text-red-100/80">{emergencies[0].address}</p>
          </div>
        )}

        <div className="mt-auto space-y-3 pt-4">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                <Users className="h-3.5 w-3.5" /> Dotación disponible
              </p>
              <span className="text-lg font-black tabular-nums text-white">{available.length}</span>
            </div>
            {available.length === 0 ? (
              <p className="text-sm text-white/45">Sin personal en cuartel</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {available.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex w-14 flex-col items-center">
                    <FirefighterAvatar
                      photoUrl={m.photoUrl}
                      fullName={m.fullName}
                      available
                      size="sm"
                      role={m.role}
                      className="!h-11 !w-11"
                    />
                    <p className="mt-1 w-full truncate text-center text-[10px] font-semibold text-white/85">
                      {m.firstName}
                    </p>
                  </div>
                ))}
                {extraPeople > 0 && (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xs font-black">
                    +{extraPeople}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                <Truck className="h-3.5 w-3.5" /> Unidades disponibles
              </p>
              <span className="text-lg font-black tabular-nums text-white">{vehicles.length}</span>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-sm text-white/45">Sin carros operativos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {vehicles.slice(0, 3).map((v, i) => {
                  const src = publicMediaUrl(v.imageUrl);
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-white/15 bg-black/40">
                      <div className="h-16 bg-slate-900">
                        {src ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/30">
                            <Truck className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] font-black text-emerald-300">{vehicleTypeAbbrev(v.type)}-{i + 1}</p>
                        <p className="truncate font-mono text-[11px] font-bold text-white">{v.patent}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
