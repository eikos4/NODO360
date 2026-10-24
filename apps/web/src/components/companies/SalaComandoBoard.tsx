import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3, Building2, Clock, Cloud, Droplets, Flame, Home, MapPin, Moon, Navigation,
  Settings, Siren, Sun, Truck, Users, Volume2,
} from 'lucide-react';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../map/PublicOsmMap';
import type { PublicEmergency } from '../dispatch/DispatchEmergenciesPanel';
import { vehicleTypeAbbrev } from '../../lib/vehicle-types';
import type { FleetVehicle, PublicCentral } from '../../pages/DispatchPublicPage';

function publicMediaUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
      if (api) {
        const base = new URL(api, window.location.origin);
        return `${base.origin}${parsed.pathname}${parsed.search}`;
      }
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function emergencyPoint(emergency: PublicEmergency | null): [number, number] | null {
  if (!emergency) return null;
  const lat = emergency.confirmedLatitude ?? emergency.latitude ?? emergency.dispatchLatitude;
  const lng = emergency.confirmedLongitude ?? emergency.longitude ?? emergency.dispatchLongitude;
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;
  return [Number(lat), Number(lng)];
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function elapsedHms(from: string | undefined, now: Date) {
  if (!from) return '00:00:00';
  const ms = Math.max(0, now.getTime() - new Date(from).getTime());
  const s = Math.floor(ms / 1000);
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

function typeCode(type: string, idx: number) {
  return `${vehicleTypeAbbrev(type)}-${idx + 1}`;
}

type Kind = 'salida' | 'cuartel' | 'disponible' | 'sin';

const KIND_UI: Record<Kind, { label: string; badge: string; ring: string }> = {
  salida: { label: 'En salida', badge: 'bg-amber-400 text-amber-950', ring: 'border-white/10' },
  cuartel: { label: 'En cuartel', badge: 'bg-emerald-500 text-emerald-950', ring: 'border-white/10' },
  disponible: { label: 'Disponible', badge: 'bg-cyan-400 text-cyan-950', ring: 'border-white/10' },
  sin: { label: 'Sin despacho', badge: 'bg-slate-500 text-white', ring: 'border-white/10' },
};

function unitKind(v: FleetVehicle, dispatched: Set<string>, live: boolean): Kind {
  if (dispatched.has(v.id) || dispatched.has(v.patent)) return 'salida';
  if (v.status !== 'OPERATIVO') return 'sin';
  return live ? 'cuartel' : 'disponible';
}

function codeDot(code: string) {
  if (/10-0/.test(code)) return 'bg-red-500';
  if (/10-2/.test(code)) return 'bg-emerald-400';
  if (/10-6/.test(code)) return 'bg-cyan-400';
  if (/10-1/.test(code)) return 'bg-amber-400';
  return 'bg-slate-400';
}

export const COMANDO_THEME_KEY = 'nodo360_comando_board_theme';

export function readComandoDark(fallback = true) {
  try {
    const stored = localStorage.getItem(COMANDO_THEME_KEY);
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
  } catch { /* ignore */ }
  return fallback;
}

function persistComandoDark(next: boolean) {
  try { localStorage.setItem(COMANDO_THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
}

function comandoTone(isDark: boolean) {
  if (isDark) {
    return {
      page: 'sala-comando bg-[#050b16] text-white',
      titleBox: 'bg-[#050b16]/70',
      title: 'keep-on-color text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]',
      muted: 'keep-on-color text-white/80',
      motto: 'keep-on-color text-white/70',
      clock: 'keep-on-color text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]',
      date: 'keep-on-color text-white/75',
      weather: 'border-white/15 bg-[#1a2b3f]',
      weatherIcon: 'text-sky-300',
      weatherVal: 'keep-on-color text-white',
      weatherCity: 'keep-on-color text-white/75',
      alertLive: 'border-red-500/35 bg-gradient-to-r from-red-950/85 via-red-900/35 to-transparent',
      alertIdle: 'border-white/10 bg-black/35',
      flameIdle: 'bg-white/10',
      chipIdle: 'bg-white/10 text-white/50',
      type: 'text-white/90',
      address: 'text-white/75',
      divider: 'bg-white/25',
      section: 'keep-on-color text-white/70',
      unit: 'bg-[#122033]',
      unitRing: 'border-white/10',
      unitPhoto: 'bg-[#1a2838]',
      map: 'border-white/10 bg-[#0a1520]',
      legend: 'border-white/10 bg-[#071018]/90 text-white/75',
      route: 'bg-white/10 text-white hover:bg-white/20',
      card: 'border-white/15 bg-[#152436]',
      cardLabel: 'keep-on-color text-white/70',
      alarmLive: 'border-red-500/45 bg-gradient-to-r from-red-700 to-red-900 shadow-[0_0_28px_rgba(220,38,38,0.28)] text-white',
      alarmIdle: 'border-red-500/25 bg-red-950/40 text-white',
      alarmSub: 'text-white/70',
      link: 'text-sky-300',
      histEmpty: 'text-white/40',
      histRow: 'bg-white/5',
      histTime: 'text-white/45',
      histCode: 'text-white',
      histType: 'text-white/85',
      histAddr: 'text-white/40',
      footer: 'border-white/15 bg-[#1a2b3f]',
      footerNav: 'keep-on-color text-white/80',
      footerHint: 'keep-on-color text-white/70',
      kpi: 'border-white/15 bg-[#152436]',
      kpiTitle: 'keep-on-color text-white',
      kpiSub: 'keep-on-color text-white/70',
      kpiCyan: 'bg-cyan-500/15 text-cyan-300',
      kpiBlue: 'bg-sky-500/15 text-sky-300',
      kpiSlate: 'bg-white/10 text-white/70',
      themeBtn: 'border-white/15 bg-black/35 text-white hover:bg-black/55',
      statLabel: 'keep-on-color text-white/85',
      statVal: 'keep-on-color text-white',
    };
  }
  return {
    page: 'sala-comando sala-comando-light bg-slate-100 text-slate-900',
    titleBox: 'bg-white/90 shadow-sm',
    title: 'text-slate-900',
    muted: 'text-slate-600',
    motto: 'text-slate-500',
    clock: 'text-slate-900',
    date: 'text-slate-500',
    weather: 'border-slate-200 bg-white shadow-sm',
    weatherIcon: 'text-sky-600',
    weatherVal: 'text-slate-900',
    weatherCity: 'text-slate-500',
    alertLive: 'border-red-200 bg-gradient-to-r from-red-50 via-red-50/80 to-transparent',
    alertIdle: 'border-slate-200 bg-white shadow-sm',
    flameIdle: 'bg-slate-100 text-slate-500',
    chipIdle: 'bg-slate-100 text-slate-500',
    type: 'text-slate-800',
    address: 'text-slate-600',
    divider: 'bg-slate-200',
    section: 'text-slate-500',
    unit: 'bg-white',
    unitRing: 'border-slate-200',
    unitPhoto: 'bg-slate-200',
    map: 'border-slate-200 bg-white',
    legend: 'border-slate-200 bg-white/95 text-slate-600 shadow-sm',
    route: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    card: 'border-slate-200 bg-white shadow-sm',
    cardLabel: 'text-slate-500',
    alarmLive: 'keep-on-color border-red-300 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-200',
    alarmIdle: 'border-red-200 bg-red-50 text-red-950',
    alarmSub: 'text-red-700/80',
    link: 'text-sky-700',
    histEmpty: 'text-slate-400',
    histRow: 'bg-slate-50',
    histTime: 'text-slate-400',
    histCode: 'text-slate-900',
    histType: 'text-slate-700',
    histAddr: 'text-slate-400',
    footer: 'border-slate-200 bg-white shadow-sm',
    footerNav: 'text-slate-600',
    footerHint: 'text-slate-500',
    kpi: 'border-slate-200 bg-white shadow-sm',
    kpiTitle: 'text-slate-900',
    kpiSub: 'text-slate-500',
    kpiCyan: 'bg-cyan-50 text-cyan-700',
    kpiBlue: 'bg-sky-50 text-sky-700',
    kpiSlate: 'bg-slate-100 text-slate-600',
    themeBtn: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
    statLabel: 'text-slate-700',
    statVal: 'text-slate-900',
  };
}

type Props = {
  data: PublicCentral;
  emergency: PublicEmergency | null;
  isDark?: boolean;
  onToggleTheme?: () => void;
};

export default function SalaComandoBoard({ data, emergency, isDark: isDarkProp, onToggleTheme }: Props) {
  const [localDark, setLocalDark] = useState(() => readComandoDark(true));
  const isDark = isDarkProp ?? localDark;
  const t = comandoTone(isDark);
  const toggleTheme = onToggleTheme ?? (() => {
    setLocalDark((prev) => {
      const next = !prev;
      persistComandoDark(next);
      return next;
    });
  });
  const [now, setNow] = useState(new Date());
  const [tempC, setTempC] = useState<number | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({});

  const live = Boolean(emergency);
  const typeLabel = (emergency?.type?.split(' — ')[1] || emergency?.type || 'Sin emergencia activa').toUpperCase();
  const emergencyCode = emergency?.emergencyCodeId || emergency?.code;
  const point = emergencyPoint(emergency);
  const mapCenter = point ?? PARRAL_CENTER;
  const logoSrc = !logoBroken ? publicMediaUrl(data.logoUrl) : null;

  const dispatchedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const v of emergency?.vehicles ?? []) {
      if (v.id) set.add(v.id);
      if (v.patent) set.add(v.patent);
    }
    return set;
  }, [emergency]);

  const units = useMemo(() => {
    const fleet = data.fleet.vehicles;
    const fromEmergency = (emergency?.vehicles ?? []).map((v) => {
      const fromFleet = fleet.find((f) => f.patent === v.patent || f.id === v.id);
      return {
        id: v.id ?? fromFleet?.id ?? v.patent,
        patent: v.patent,
        brand: v.brand ?? fromFleet?.brand ?? '',
        model: v.model ?? fromFleet?.model ?? '',
        type: v.type,
        status: fromFleet?.status ?? 'OPERATIVO',
        statusLabel: fromFleet?.statusLabel ?? 'Operativo',
        imageUrl: v.imageUrl ?? fromFleet?.imageUrl ?? null,
        fuelLevelPercent: fromFleet?.fuelLevelPercent ?? null,
        principalMaquinista: fromFleet?.principalMaquinista ?? null,
      } satisfies FleetVehicle;
    });
    const rest = fleet.filter((f) => !dispatchedKeys.has(f.id) && !dispatchedKeys.has(f.patent));
    const merged = [...fromEmergency, ...rest];
    const seen = new Set<string>();
    return merged.filter((v) => {
      if (seen.has(v.id) || seen.has(v.patent)) return false;
      seen.add(v.id);
      seen.add(v.patent);
      return true;
    }).slice(0, 4);
  }, [data.fleet.vehicles, emergency, dispatchedKeys]);

  const hero = units.find((v) => publicMediaUrl(v.imageUrl) && !brokenImg[v.id]) ?? units[0];
  const heroSrc = hero && !brokenImg[hero.id] ? publicMediaUrl(hero.imageUrl) : publicMediaUrl(data.headquartersImageUrl);
  const crewOut = live ? (emergency?.crew?.length || 0) : data.roster.stats.available;
  const todayCount = data.recentEmergencies.filter((e) => new Date(e.dispatchedAt).toDateString() === now.toDateString()).length;
  const going = units.find((v) => unitKind(v, dispatchedKeys, live) === 'salida') ?? units[0];
  const recent = data.recentEmergencies.filter((e) => e.id !== emergency?.id).slice(0, 4);

  const markers: OsmMarker[] = useMemo(() => {
    const list: OsmMarker[] = [];
    if (point && emergency) {
      list.push({
        id: emergency.id,
        lat: point[0],
        lng: point[1],
        label: emergency.address || 'Emergencia',
        tone: 'active',
      });
    }
    for (const v of data.liveVehicles ?? []) {
      if (!Number.isFinite(v.latitude) || !Number.isFinite(v.longitude)) continue;
      list.push({
        id: `live-${v.id}`,
        lat: v.latitude,
        lng: v.longitude,
        label: v.patent,
        tone: 'truck',
      });
    }
    return list;
  }, [point, emergency, data.liveVehicles]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const [lat, lng] = mapCenter;
    const ctrl = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=America/Santiago`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((j) => {
        const t = j?.current?.temperature_2m;
        if (typeof t === 'number') setTempC(Math.round(t));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [mapCenter[0], mapCenter[1]]);

  const routeUrl = point
    ? `https://www.google.com/maps/dir/?api=1&destination=${point[0]},${point[1]}`
    : null;

  return (
    <section className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${t.page}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
            onError={() => hero && setBrokenImg((p) => ({ ...p, [hero.id]: true }))}
            className="sala-comando-hero absolute -right-[6%] top-0 h-[78%] w-[68%] object-cover object-[70%_40%]"
          />
        ) : null}
        <div className="sala-comando-hero-shade" />
        <div className="sala-comando-hero-grade" />
        <div className="sala-comando-hero-vignette" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-4 lg:px-7 lg:pt-5">
        <header className="mb-3 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                onError={() => setLogoBroken(true)}
                className="h-14 w-14 shrink-0 rounded-full border-2 border-amber-400/70 object-cover lg:h-[60px] lg:w-[60px]"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/50 bg-red-600/20">
                <Siren className="h-7 w-7 text-red-400" />
              </div>
            )}
            <div className={`min-w-0 rounded-2xl px-3 py-1.5 backdrop-blur-sm ${t.titleBox}`}>
              <h1 className={`truncate text-[22px] font-black leading-tight lg:text-[30px] ${t.title}`}>
                {data.name}
              </h1>
              <p className={`mt-0.5 text-[13px] font-medium ${t.muted}`}>
                {[data.address?.split(',')[0]?.trim(), data.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
              </p>
            </div>
          </div>

          <p className={`hidden min-w-0 flex-1 pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] lg:block ${t.motto}`}>
            Disciplina · Servicio · Trabajo en equipo
          </p>

            <div className="flex shrink-0 items-start gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${t.themeBtn}`}
              title={isDark ? 'Tema claro' : 'Tema oscuro'}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {isDark ? 'Claro' : 'Oscuro'}
            </button>
            <div className="text-right">
              <p className={`font-mono text-[34px] font-black leading-none tabular-nums tracking-tight lg:text-[40px] ${t.clock}`}>
                {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </p>
              <p className={`mt-1 text-[11px] capitalize ${t.date}`}>
                {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${t.weather}`}>
              <Cloud className={`h-5 w-5 ${t.weatherIcon}`} />
              <div>
                <p className={`text-lg font-black leading-none ${t.weatherVal}`}>{tempC != null ? `${tempC}°C` : '—'}</p>
                <p className={`mt-0.5 text-[10px] ${t.weatherCity}`}>{data.city}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className={`relative overflow-hidden rounded-3xl border px-5 py-4 ${
              live ? t.alertLive : t.alertIdle
            }`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[22px] ${
                  live ? 'keep-on-color bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.55)]' : t.flameIdle
                }`}>
                  <Flame className="h-10 w-10" />
                </div>
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                    live ? 'keep-on-color bg-red-600 text-white' : t.chipIdle
                  }`}>
                    {live ? 'Emergencia en curso' : 'En cuartel'}
                  </span>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-[42px] font-black leading-none tracking-tight lg:text-[52px]">
                      {live ? (emergencyCode || '10-X') : '—'}
                    </span>
                    <span className={`hidden h-10 w-px sm:block ${t.divider}`} />
                    <span className={`text-xl font-bold uppercase tracking-wide lg:text-2xl ${t.type}`}>
                      {typeLabel}
                    </span>
                  </p>
                  {live && emergency?.address && (
                    <p className={`mt-2 flex items-center gap-1.5 text-[15px] ${t.address}`}>
                      <MapPin className="h-4 w-4 text-red-500" />
                      {emergency.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Kpi
                icon={<Truck className="h-5 w-5" />}
                title={going?.patent || '—'}
                sub={going ? `${going.type}${going.model ? ` · ${going.model}` : ''}` : 'Sin carro'}
                tone="cyan"
                t={t}
              />
              <Kpi
                icon={<Users className="h-5 w-5" />}
                title={`${crewOut} ${live ? 'en salida' : 'disponible'}`}
                sub={live ? 'Personal despachado' : 'Personal en sala'}
                tone="blue"
                t={t}
              />
              <Kpi
                icon={<Clock className="h-5 w-5" />}
                title={live ? elapsedHms(emergency?.dispatchedAt, now) : '00:00:00'}
                sub="Tiempo desde despacho"
                tone="slate"
                t={t}
              />
            </div>

            <div>
              <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.22em] ${t.section}`}>Unidades despachadas</p>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {units.map((v, i) => {
                  const dispatched = dispatchedKeys.has(v.id) || dispatchedKeys.has(v.patent);
                  const shownKind: Kind = dispatched
                    ? 'salida'
                    : v.status !== 'OPERATIVO'
                      ? 'sin'
                      : i === 1
                        ? 'cuartel'
                        : i === 2
                          ? 'disponible'
                          : i >= 3
                            ? 'sin'
                            : live
                              ? 'cuartel'
                              : 'disponible';
                  const ui = KIND_UI[shownKind];
                  const src = !brokenImg[v.id] ? publicMediaUrl(v.imageUrl) : null;
                  return (
                    <article key={v.id} className={`overflow-hidden rounded-2xl border ${t.unit} ${isDark ? ui.ring : t.unitRing}`}>
                      <div className={`relative h-[92px] overflow-hidden ${t.unitPhoto}`}>
                        {src ? (
                          <img
                            src={src}
                            alt={v.patent}
                            onError={() => setBrokenImg((p) => ({ ...p, [v.id]: true }))}
                            className="h-full w-full object-cover object-center saturate-[1.08] brightness-125"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Truck className="h-9 w-9 text-white/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6">
                          <p className="keep-on-color font-mono text-[15px] font-black leading-none text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">{v.patent}</p>
                          <p className="keep-on-color mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85">{typeCode(v.type, i)}</p>
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${ui.badge}`}>
                          {ui.label}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.22em] ${t.section}`}>Mapa en tiempo real</p>
              <div className={`relative min-h-[180px] flex-1 overflow-hidden rounded-3xl border ${t.map}`}>
                <PublicOsmMap
                  center={mapCenter}
                  focus={point}
                  zoom={point ? 14 : 13}
                  theme={isDark ? 'dark' : 'light'}
                  className="h-full w-full"
                  markers={markers}
                />
                <div className={`absolute left-3 top-3 w-[168px] rounded-2xl border p-3 text-[11px] backdrop-blur-md ${t.legend}`}>
                  <LegendDot color="bg-red-500" label="Emergencia actual" icon={<Flame className="h-3 w-3" />} />
                  <LegendDot color="bg-emerald-400" label="Unidades en ruta" icon={<Truck className="h-3 w-3" />} />
                  <LegendDot color="bg-cyan-300" label="Cuarteles" icon={<Home className="h-3 w-3" />} />
                  <LegendDot color="bg-sky-400" label="Hidrantes" icon={<Droplets className="h-3 w-3" />} />
                  <LegendDot color="bg-amber-400" label="Puntos de interés" icon={<MapPin className="h-3 w-3" />} />
                  {routeUrl && (
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide ${t.route}`}
                    >
                      <Navigation className="h-3 w-3" /> Ver ruta
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            <div className={`rounded-3xl border p-4 ${t.card}`}>
              <p className={`mb-3 text-[11px] font-black uppercase tracking-[0.2em] ${t.cardLabel}`}>Estado general</p>
              <ul className="space-y-2.5">
                <StatRow icon={<Truck className="h-4 w-4" />} iconBg={isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'} label="Carros operativos" value={`${data.fleet.stats.operativo} / ${data.fleet.stats.total}`} t={t} />
                <StatRow icon={<Users className="h-4 w-4" />} iconBg={isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-700'} label="Personal disponible" value={String(data.roster.stats.available)} t={t} />
                <StatRow icon={<Flame className="h-4 w-4" />} iconBg={isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'} label="Emergencias hoy" value={String(todayCount || data.emergencyStats.active)} t={t} />
              </ul>
            </div>

            <div className={`rounded-3xl border px-4 py-3.5 ${live ? t.alarmLive : t.alarmIdle}`}>
              <div className="flex items-center gap-3">
                <Volume2 className="h-7 w-7" />
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${t.alarmSub}`}>Sistema de alarmas</p>
                  <p className="text-2xl font-black uppercase leading-none">Activo</p>
                </div>
              </div>
            </div>

            <div className={`flex min-h-0 flex-1 flex-col rounded-3xl border p-4 ${t.card}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${t.cardLabel}`}>Últimas emergencias</p>
                <span className={`text-[11px] font-semibold ${t.link}`}>Ver todas</span>
              </div>
              <ul className="min-h-0 flex-1 space-y-2 overflow-hidden">
                {recent.length === 0 && (
                  <li className={`text-xs ${t.histEmpty}`}>Sin historial reciente.</li>
                )}
                {recent.map((e) => {
                  const code = e.emergencyCodeId || e.code || '10-X';
                  const label = e.type?.split(' — ')[1] || e.type;
                  return (
                    <li key={e.id} className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 ${t.histRow}`}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${codeDot(code)}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`flex items-baseline gap-2 text-[11px] ${t.histTime}`}>
                          <span className="font-mono">
                            {new Date(e.dispatchedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <span className={`font-bold ${t.histCode}`}>{code}</span>
                        </p>
                        <p className={`truncate text-[12px] font-semibold ${t.histType}`}>{label}</p>
                        <p className={`truncate text-[11px] ${t.histAddr}`}>{e.address}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>

        <footer className={`relative z-10 mt-3 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${t.footer}`}>
          <div className="flex items-center gap-2.5">
            <span className="keep-on-color flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white">N</span>
            <div>
              <p className={`text-sm font-black tracking-tight ${t.kpiTitle}`}>Nodo<span className="text-red-500">360</span></p>
              <p className={`text-[9px] uppercase tracking-[0.16em] ${t.kpiSub}`}>Conecta · Coordina · Responde</p>
            </div>
          </div>
          <nav className={`hidden items-center gap-5 text-[10px] font-bold uppercase tracking-[0.14em] md:flex ${t.footerNav}`}>
            <span className="text-red-500">Sala de máquinas</span>
            <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Compañías</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Personal</span>
            <span className="inline-flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" /> Hidrantes</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Reportes</span>
            <span className="inline-flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Configuración</span>
          </nav>
          <p className={`hidden text-right text-[9px] uppercase tracking-[0.16em] lg:block ${t.footerHint}`}>
            Tecnología al servicio<br />de quienes salvan vidas
          </p>
        </footer>
      </div>
    </section>
  );
}

function Kpi({
  icon, title, sub, tone, t,
}: { icon: ReactNode; title: string; sub: string; tone: 'cyan' | 'blue' | 'slate'; t: ReturnType<typeof comandoTone> }) {
  const iconWrap = tone === 'cyan' ? t.kpiCyan : tone === 'blue' ? t.kpiBlue : t.kpiSlate;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${t.kpi}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>{icon}</span>
      <div className="min-w-0">
        <p className={`truncate font-mono text-[17px] font-black leading-none ${t.kpiTitle}`}>{title}</p>
        <p className={`mt-1 truncate text-[10px] uppercase tracking-wide ${t.kpiSub}`}>{sub}</p>
      </div>
    </div>
  );
}

function StatRow({ icon, iconBg, label, value, t }: { icon: ReactNode; iconBg: string; label: string; value: string; t: ReturnType<typeof comandoTone> }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      <span className={`flex-1 text-[13px] ${t.statLabel}`}>{label}</span>
      <span className={`font-mono text-[18px] font-black ${t.statVal}`}>{value}</span>
    </li>
  );
}

function LegendDot({ color, label, icon }: { color: string; label: string; icon: React.ReactNode }) {
  return (
    <p className="mb-1.5 flex items-center gap-2 text-white/75 last:mb-0">
      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${color} text-slate-950`}>{icon}</span>
      {label}
    </p>
  );
}
