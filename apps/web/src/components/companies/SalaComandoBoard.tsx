import { useEffect, useMemo, useState } from 'react';
import { Flame, MapPin, Navigation, Radio, Siren, Thermometer, Truck, Users } from 'lucide-react';
import PublicOsmMap, { PARRAL_CENTER } from '../map/PublicOsmMap';
import type { PublicEmergency } from '../dispatch/DispatchEmergenciesPanel';
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

function unitKind(v: FleetVehicle, dispatched: Set<string>): 'salida' | 'cuartel' | 'disponible' | 'fuera' {
  const key = v.patent || v.id;
  if (dispatched.has(key) || dispatched.has(v.id)) return 'salida';
  if (v.status !== 'OPERATIVO') return 'fuera';
  return dispatched.size > 0 ? 'cuartel' : 'disponible';
}

const KIND_UI = {
  salida: { label: 'En salida', className: 'bg-red-600 text-white', ring: 'border-red-500/50' },
  cuartel: { label: 'En cuartel', className: 'bg-emerald-500 text-emerald-950', ring: 'border-emerald-400/40' },
  disponible: { label: 'Disponible', className: 'bg-cyan-400 text-cyan-950', ring: 'border-cyan-400/40' },
  fuera: { label: 'Fuera de servicio', className: 'bg-slate-600 text-slate-100', ring: 'border-white/10' },
};

type Props = {
  data: PublicCentral;
  emergency: PublicEmergency | null;
};

export default function SalaComandoBoard({ data, emergency }: Props) {
  const [now, setNow] = useState(new Date());
  const [tempC, setTempC] = useState<number | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({});

  const live = Boolean(emergency);
  const typeLabel = emergency?.type?.split(' — ')[1] || emergency?.type || 'Sin emergencia activa';
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
    return [...fromEmergency, ...rest].slice(0, 3);
  }, [data.fleet.vehicles, emergency, dispatchedKeys]);

  const hero = units.find((v) => publicMediaUrl(v.imageUrl) && !brokenImg[v.id]) ?? units[0];
  const heroSrc = hero && !brokenImg[hero.id] ? publicMediaUrl(hero.imageUrl) : publicMediaUrl(data.headquartersImageUrl);
  const crewCount = emergency?.crew?.length || data.roster.stats.available;
  const todayCount = data.recentEmergencies.filter((e) => {
    const d = new Date(e.dispatchedAt);
    return d.toDateString() === now.toDateString();
  }).length;
  const goingPatent = units.find((v) => unitKind(v, dispatchedKeys) === 'salida')?.patent;

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
    <section className="relative flex min-h-0 flex-1 overflow-hidden bg-[#071018] text-white">
      <div className="pointer-events-none absolute inset-0">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
            onError={() => hero && setBrokenImg((p) => ({ ...p, [hero.id]: true }))}
            className="h-full w-full object-cover object-center opacity-45 saturate-110 contrast-110"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_40%,#1a3048,transparent_55%),radial-gradient(circle_at_80%_20%,#3a151b,transparent_40%),#071018]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071018] via-[#071018]/88 to-[#071018]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071018] via-transparent to-[#071018]/70" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 gap-4 p-4 lg:gap-5 lg:p-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                onError={() => setLogoBroken(true)}
                className="h-14 w-14 shrink-0 rounded-full border-2 border-white/20 object-cover lg:h-16 lg:w-16"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-600/20 lg:h-16 lg:w-16">
                <Siren className="h-7 w-7 text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight lg:text-4xl">
                {data.number}ª {data.name}
              </h1>
              <p className="mt-0.5 text-sm text-white/55">
                {data.city}{data.address ? ` · ${data.address}` : ''}
              </p>
            </div>
          </header>

          <div
            className={`flex items-center gap-4 rounded-[28px] border px-5 py-4 lg:px-6 lg:py-5 ${
              live
                ? 'border-red-500/40 bg-gradient-to-r from-red-950/90 via-red-900/55 to-transparent shadow-[0_0_40px_rgba(220,38,38,0.25)]'
                : 'border-white/10 bg-black/35'
            }`}
          >
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl lg:h-20 lg:w-20 ${
              live ? 'bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.55)]' : 'bg-white/10'
            }`}>
              <Flame className="h-9 w-9 text-white lg:h-10 lg:w-10" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${live ? 'text-red-300' : 'text-white/45'}`}>
                {live ? 'Emergencia en curso' : 'En cuartel'}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-4xl font-black leading-none tracking-tight lg:text-6xl">
                  {live ? (emergencyCode || '10-X') : '—'}
                </span>
                <span className="text-lg font-semibold uppercase tracking-wide text-white/80 lg:text-2xl">
                  {typeLabel}
                </span>
              </p>
              {live && emergency?.address && (
                <p className="mt-2 flex items-center gap-2 text-sm text-white/75 lg:text-base">
                  <MapPin className="h-4 w-4 shrink-0 text-red-400" />
                  {emergency.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {goingPatent && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
                <Truck className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="font-mono text-xl font-semibold leading-none">{goingPatent}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">Carro en salida</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
              <Users className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-xl font-semibold leading-none">{crewCount}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                  {live ? 'en salida · personal despachado' : 'personal disponible'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]">
            <div className="flex min-h-0 flex-col">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                Unidades despachadas
              </p>
              <div className="grid min-h-0 grid-cols-3 gap-3">
                {units.map((v) => {
                  const kind = unitKind(v, dispatchedKeys);
                  const ui = KIND_UI[kind];
                  const src = !brokenImg[v.id] ? publicMediaUrl(v.imageUrl) : null;
                  return (
                    <article
                      key={v.id}
                      className={`flex min-h-0 flex-col overflow-hidden rounded-3xl border bg-black/45 backdrop-blur-md ${ui.ring}`}
                    >
                      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0b1824]">
                        {src ? (
                          <img
                            src={src}
                            alt={v.patent}
                            onError={() => setBrokenImg((p) => ({ ...p, [v.id]: true }))}
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full min-h-[110px] items-center justify-center">
                            <Truck className="h-10 w-10 text-white/25" />
                          </div>
                        )}
                        <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${ui.className}`}>
                          {ui.label}
                        </span>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="font-mono text-lg font-semibold leading-none lg:text-xl">{v.patent}</p>
                        <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-white/45">
                          {v.type}{v.model ? ` · ${v.model}` : ''}
                        </p>
                      </div>
                    </article>
                  );
                })}
                {units.length === 0 && (
                  <div className="col-span-3 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-5 py-8 text-white/50">
                    <Truck className="h-5 w-5" />
                    Sin carros cargados en esta compañía.
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                Mapa en tiempo real
              </p>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/50">
                <PublicOsmMap
                  center={mapCenter}
                  focus={point}
                  zoom={point ? 15 : 13}
                  theme="dark"
                  className="h-full w-full"
                  markers={point ? [{
                    id: emergency?.id ?? 'punto',
                    lat: point[0],
                    lng: point[1],
                    label: emergency?.address || 'Emergencia',
                    tone: 'active',
                  }] : []}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#071018]/50 to-transparent px-4 py-3">
                  <p className="text-xs font-semibold text-white/80">
                    {emergency?.address || data.city}
                  </p>
                </div>
                {routeUrl && (
                  <a
                    href={routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-900 shadow-lg"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Ver ruta
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex w-[250px] shrink-0 flex-col gap-3 lg:w-[300px]">
          <div className="rounded-3xl border border-white/10 bg-black/45 px-5 py-4 backdrop-blur-md">
            <p className="font-mono text-5xl font-semibold leading-none tabular-nums tracking-tight lg:text-6xl">
              {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <p className="mt-2 text-xs capitalize text-white/55">
              {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-cyan-300">
              <Thermometer className="h-4 w-4" />
              {tempC != null ? `${tempC}°C` : '—'}
              <span className="text-white/45">· {data.city}</span>
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Estado general</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <Truck className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-white/70">Carros operativos</span>
                <span className="font-mono text-lg font-semibold">
                  {data.fleet.stats.operativo}/{data.fleet.stats.total}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Users className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-white/70">Personal disponible</span>
                <span className="font-mono text-lg font-semibold">{data.roster.stats.available}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                  <Flame className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-white/70">Emergencias hoy</span>
                <span className="font-mono text-lg font-semibold">{todayCount || data.emergencyStats.active}</span>
              </li>
            </ul>
          </div>

          <div className={`mt-auto rounded-3xl border px-4 py-4 backdrop-blur-md ${
            live
              ? 'border-red-500/40 bg-red-950/50 shadow-[0_0_28px_rgba(220,38,38,0.18)]'
              : 'border-cyan-400/25 bg-cyan-950/30'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                live ? 'bg-red-600 text-white' : 'bg-cyan-400 text-cyan-950'
              }`}>
                <Radio className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">Sistema de alarmas</p>
                <p className={`text-lg font-black uppercase ${live ? 'text-red-300' : 'text-cyan-200'}`}>
                  {live ? 'Alarma activa' : 'Activo'}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
