import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Radio, Siren, Truck, Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import FirefighterAvatar from '../components/FirefighterAvatar';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import { vehicleTypeAbbrev } from '../lib/vehicle-types';
import SalaSalidaBoard from '../components/companies/SalaSalidaBoard';
import type { PublicCentral } from './DispatchPublicPage';
import type { PublicEmergency } from '../components/dispatch/DispatchEmergenciesPanel';

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
  dispatchSlug?: string | null;
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
const SLIDE_MS = 60_000;

type Slide =
  | { kind: 'mural' }
  | { kind: 'salida'; company: TvCompany };

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
  return `${c.number}ª Compañía`;
}

function isOperativa(c: TvCompany) {
  return c.roster.stats.available >= 4 && c.fleet.stats.operativo > 0 && c.maquinistas.stats.available > 0;
}

type StatusTone = 'emergency' | 'ok' | 'warn' | 'off';

function companyStatus(c: TvCompany, inEmergency: boolean): {
  label: string;
  tone: StatusTone;
  icon: typeof Siren;
} {
  if (inEmergency) return { label: 'Emergencia', tone: 'emergency', icon: Siren };
  if (c.dispatchAvailable === false) return { label: 'No disponible', tone: 'off', icon: AlertTriangle };

  const people = c.roster.stats.available;
  const fleet = c.fleet.stats.operativo;
  const maq = c.maquinistas.stats.available;

  if (people >= 4 && fleet > 0 && maq > 0) return { label: 'Operativa', tone: 'ok', icon: CheckCircle2 };
  if (people === 0 && fleet === 0) return { label: 'Sin servicio', tone: 'off', icon: AlertTriangle };
  if (people === 0) return { label: 'Sin personal', tone: 'warn', icon: Users };
  if (fleet === 0) return { label: 'Sin unidad', tone: 'warn', icon: Truck };
  if (maq === 0) return { label: 'Sin maquinista', tone: 'warn', icon: Radio };
  if (people < 4) return { label: 'Dotación baja', tone: 'warn', icon: Users };
  return { label: 'Atención', tone: 'warn', icon: AlertTriangle };
}

const STATUS_BADGE: Record<StatusTone, string> = {
  emergency: 'bg-red-600 text-white',
  ok: 'bg-emerald-400 text-emerald-950',
  warn: 'bg-amber-400 text-amber-950',
  off: 'bg-slate-200 text-slate-900',
};

const STATUS_BORDER: Record<StatusTone, string> = {
  emergency: 'border-red-500',
  ok: 'border-emerald-400/70',
  warn: 'border-amber-400/50',
  off: 'border-white/20',
};

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

  const slides = useMemo<Slide[]>(() => {
    const salida = companies.filter((c) => c.dispatchSlug);
    return [{ kind: 'mural' }, ...salida.map((c) => ({ kind: 'salida' as const, company: c }))];
  }, [companies]);

  const [slideIndex, setSlideIndex] = useState(0);
  const current = slides[slideIndex] ?? slides[0];
  const isMural = !current || current.kind === 'mural';
  const salidaCompany = current?.kind === 'salida' ? current.company : null;
  const salidaSlug = salidaCompany?.dispatchSlug ?? null;

  useEffect(() => {
    if (slideIndex >= slides.length) setSlideIndex(0);
  }, [slideIndex, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = window.setTimeout(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [slideIndex, slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setSlideIndex((i) => (i + 1) % Math.max(slides.length, 1));
      if (e.key === 'ArrowLeft') setSlideIndex((i) => (i - 1 + slides.length) % Math.max(slides.length, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  const { data: sala } = useQuery({
    queryKey: ['companias-tv-sala', salidaSlug],
    queryFn: () => api.get<PublicCentral & { locked?: boolean }>(`/dispatch/public/${salidaSlug}`).then((r) => r.data),
    enabled: Boolean(salidaSlug),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    for (const c of companies) {
      if (!c.dispatchSlug) continue;
      void qc.prefetchQuery({
        queryKey: ['companias-tv-sala', c.dispatchSlug],
        queryFn: () => api.get(`/dispatch/public/${c.dispatchSlug}`).then((r) => r.data),
      });
    }
  }, [companies, qc]);

  useEffect(() => {
    if (sala?.locked && slides.length > 1) {
      const t = window.setTimeout(() => setSlideIndex((i) => (i + 1) % slides.length), 800);
      return () => window.clearTimeout(t);
    }
  }, [sala, slides.length]);

  const salaEmergency = useMemo<PublicEmergency | null>(() => {
    if (!sala || sala.locked) return null;
    return (sala.recentEmergencies ?? []).find((e) => e.status === 'ACTIVA') ?? null;
  }, [sala]);

  const nextLabel = useMemo(() => {
    if (slides.length < 2) return '';
    const next = slides[(slideIndex + 1) % slides.length];
    if (!next || next.kind === 'mural') return 'Muro de compañías';
    return `${next.company.number}ª · salida`;
  }, [slideIndex, slides]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <div className="companias-tv relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07090d] text-white">
      <div className="absolute inset-x-0 top-0 z-40 h-1 bg-white/10">
        <div
          key={slideIndex}
          className="companias-tv-progress h-full bg-red-500"
        />
      </div>

      {isMural && (
      <header className="flex shrink-0 items-center gap-4 border-b border-white/15 bg-[#0b1018] px-5 py-3 pt-4">
        <div className="min-w-0">
          <p className="keep-on-color text-xl font-black tracking-tight leading-none text-white">
            NODO<span className="text-red-500">360</span>
          </p>
          <p className="keep-on-color mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/80">
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
          <span className="keep-on-color hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300 sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
          <p className="keep-on-color font-mono text-3xl font-black tabular-nums tracking-tight text-white">{fmtClock(now)}</p>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-white/20 p-2 text-white hover:bg-white/10"
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <Link
            to="/vision360-cuarteles"
            className="keep-on-color hidden rounded-lg border border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 sm:inline"
          >
            Vision360
          </Link>
        </div>
      </header>
      )}

      <div key={slideIndex} className={cn('companias-tv-slide min-h-0 flex-1', isMural ? 'p-3' : 'flex flex-col')}>
        {isLoading && companies.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40">Cargando compañías…</div>
        ) : companies.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40">Sin compañías activas</div>
        ) : isMural ? (
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
        ) : sala && !sala.locked ? (
          <SalaSalidaBoard displayOnly data={sala} emergency={salaEmergency} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
            <p className="text-lg font-bold">Cargando sala de {salidaCompany?.number}ª…</p>
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex items-center justify-center gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-2 py-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSlideIndex((i) => (i - 1 + slides.length) % slides.length)}
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="keep-on-color min-w-[180px] text-center text-[11px] font-semibold uppercase tracking-wider text-white">
              {isMural ? 'Muro de compañías' : `Salida · ${salidaCompany?.number}ª`}
              <span className="ml-2 text-white/50">{slideIndex + 1}/{slides.length}</span>
            </p>
            <button
              type="button"
              onClick={() => setSlideIndex((i) => (i + 1) % slides.length)}
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="keep-on-color hidden rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wider text-white/70 sm:block">
            Siguiente: {nextLabel}
          </p>
        </div>
      )}
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
        tone === 'alert' ? 'text-red-400' : tone === 'ok' ? 'text-emerald-300' : 'text-sky-300',
      )} />
      <span className={cn(
        'keep-on-color text-lg font-black tabular-nums text-white',
        tone === 'alert' && 'text-red-400',
      )}>{value}</span>
      <span className="keep-on-color text-[11px] uppercase tracking-wider text-white/80">{label}</span>
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
  const inEmergency = emergencies.length > 0;
  const status = companyStatus(company, inEmergency);
  const StatusIcon = status.icon;
  const hq =
    (!hqBroken && publicMediaUrl(company.headquartersImageUrl)) ||
    publicMediaUrl(vehicles.find((v) => v.imageUrl)?.imageUrl) ||
    FALLBACK_HQ;
  const logo = !logoBroken ? publicMediaUrl(company.logoUrl) : null;

  return (
    <article
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-3xl border shadow-2xl',
        STATUS_BORDER[status.tone],
      )}
    >
      <img
        src={hq}
        alt=""
        onError={() => setHqBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

      <div className="relative flex min-h-0 flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-black/55 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-black shadow-lg">
              {logo ? (
                <img src={logo} alt="" onError={() => setLogoBroken(true)} className="h-full w-full object-cover" />
              ) : (
                <span className="keep-on-color text-xl font-black text-white">{company.number}ª</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="keep-on-color text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                {companyTitle(company)}
              </p>
              <h2 className="keep-on-color line-clamp-2 text-[15px] font-black leading-tight text-white">
                {company.name}
              </h2>
            </div>
          </div>
          <span className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg',
            STATUS_BADGE[status.tone],
          )}>
            <StatusIcon className="h-3.5 w-3.5" /> {status.label}
          </span>
        </div>

        {inEmergency && emergencies[0] && (
          <div className="mt-3 rounded-2xl border border-red-400/60 bg-red-700 px-3 py-2">
            <p className="keep-on-color truncate text-sm font-black text-white">
              {emergencies[0].code} · {emergencies[0].type}
            </p>
            <p className="keep-on-color truncate text-xs text-white/90">{emergencies[0].address}</p>
          </div>
        )}

        <div className="mt-auto space-y-3 rounded-2xl bg-black/70 p-3 ring-1 ring-white/15 backdrop-blur-md">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="keep-on-color flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                <Users className="h-3.5 w-3.5 text-sky-300" /> Dotación disponible
              </p>
              <span className="keep-on-color text-lg font-black tabular-nums text-white">{available.length}</span>
            </div>
            {available.length === 0 ? (
              <p className="keep-on-color text-sm font-medium text-white/80">Sin personal en cuartel</p>
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
                    <p className="keep-on-color mt-1 w-full truncate text-center text-[10px] font-semibold text-white">
                      {m.firstName}
                    </p>
                  </div>
                ))}
                {extraPeople > 0 && (
                  <div className="keep-on-color flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xs font-black text-white">
                    +{extraPeople}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="keep-on-color flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                <Truck className="h-3.5 w-3.5 text-emerald-300" /> Unidades disponibles
              </p>
              <span className="keep-on-color text-lg font-black tabular-nums text-white">{vehicles.length}</span>
            </div>
            {vehicles.length === 0 ? (
              <p className="keep-on-color text-sm font-medium text-white/80">Sin carros operativos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {vehicles.slice(0, 3).map((v, i) => {
                  const src = publicMediaUrl(v.imageUrl);
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-white/20 bg-[#101826]">
                      <div className="h-16 bg-[#0b1220]">
                        {src ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/50">
                            <Truck className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="keep-on-color text-[10px] font-black text-emerald-300">{vehicleTypeAbbrev(v.type)}-{i + 1}</p>
                        <p className="keep-on-color truncate font-mono text-[11px] font-bold text-white">{v.patent}</p>
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
