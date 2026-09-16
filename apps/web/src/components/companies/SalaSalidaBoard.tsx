import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Calendar, Check, Hash, MapPin, Radio, Siren, Truck, Users, X } from 'lucide-react';
import RoleBadge from '../RoleBadge';
import { FirefighterPlaceholder } from '../FirefighterAvatar';
import { roleInfo } from '../../lib/roles';
import type { PublicEmergency } from '../dispatch/DispatchEmergenciesPanel';
import type { FleetVehicle, PublicCentral, RosterMember } from '../../pages/DispatchPublicPage';

type CrewCard = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleLabel?: string;
  photoUrl?: string | null;
  operativeNumber?: number | null;
  isMaquinista?: boolean;
  status?: string | null;
  duty: 'maquinista' | 'mando' | 'dotacion';
};

const RANK: Record<string, number> = {
  COMANDANTE: 80,
  CAPITAN: 70,
  ENCARGADO_MATERIAL: 50,
  BOMBERO_PROFESIONAL: 30,
  BOMBERO: 25,
};

const HERO_MS = 8000;
const BURST_MS = 10000;

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

function statusLabel(status?: string | null) {
  if (status === 'ON_SCENE') return 'En el lugar';
  if (status === 'LOCATION_MARKED') return 'Ubicación';
  if (status === 'GOING') return 'En camino';
  return null;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const clock = `${pick('hour')}:${pick('minute')}:${pick('second')}`;
  const period = (pick('dayPeriod') || '').replace(/\s+/g, ' ').trim();

  return (
    <div className="w-full text-right">
      <p className="whitespace-nowrap text-[28px] font-mono font-semibold leading-none tabular-nums tracking-tight text-[#67c8ff] drop-shadow-[0_0_22px_rgba(56,189,248,0.45)] lg:text-[34px]">
        {clock}
        {period ? <span className="ml-2 align-baseline text-[0.62em] font-semibold uppercase tracking-[0.08em]">{period}</span> : null}
      </p>
      <p className="mt-2 flex items-center justify-end gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-[#67c8ff]/70">
        <Calendar className="h-3.5 w-3.5" />
        {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  );
}

function CrewPhoto({
  person,
  onClick,
  disabled,
  live,
}: {
  person: CrewCard;
  onClick?: () => void;
  disabled?: boolean;
  live?: boolean;
}) {
  const [err, setErr] = useState(false);
  const src = publicMediaUrl(person.photoUrl);
  const show = src && !err;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title="Sacar de disponible"
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border bg-[#0b1824] disabled:cursor-default enabled:cursor-pointer enabled:hover:border-red-400/70 enabled:hover:opacity-90 ${
        live ? 'border-[#ef343f]/50 shadow-[0_0_14px_rgba(239,52,63,0.22)]' : 'border-white/10'
      }`}
    >
      {show ? (
        <img
          src={src}
          alt={person.name}
          onError={() => setErr(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <FirefighterPlaceholder className="h-full w-full" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-1.5 pb-1.5 pt-8">
        {person.operativeNumber != null && (
          <p className="text-center text-xl font-semibold tabular-nums leading-none text-white">
            {person.operativeNumber}
          </p>
        )}
      </div>
      {person.isMaquinista && (
        <span className="absolute left-1.5 top-1.5 rounded bg-amber-400 px-1 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-950">
          Maq.
        </span>
      )}
    </button>
  );
}

function buildCrew(data: PublicCentral, emergency: PublicEmergency | null): CrewCard[] {
  const byId = new Map<string, CrewCard>();
  const add = (card: CrewCard) => {
    const prev = byId.get(card.id);
    byId.set(card.id, prev ? { ...prev, ...card, status: card.status ?? prev.status } : card);
  };

  const dutyFor = (role: string, isMaquinista?: boolean): CrewCard['duty'] => {
    if (isMaquinista) return 'maquinista';
    if (role === 'COMANDANTE' || role === 'CAPITAN') return 'mando';
    return 'dotacion';
  };

  if (emergency?.crew?.length) {
    for (const c of emergency.crew) {
      add({
        id: c.id,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        role: c.role,
        roleLabel: c.roleLabel,
        photoUrl: c.photoUrl,
        operativeNumber: c.operativeNumber,
        isMaquinista: c.isMaquinista,
        status: c.status,
        duty: dutyFor(c.role, c.isMaquinista),
      });
    }
  } else if (emergency?.participants?.length) {
    for (const p of emergency.participants) {
      const roster = data.roster.members.find((m) => {
        const full = `${m.firstName} ${m.lastName}`.trim();
        return full === p.name || (p.firstName && m.firstName === p.firstName && m.lastName === p.lastName);
      });
      if (roster) {
        add({
          id: roster.id,
          name: roster.fullName,
          role: roster.role,
          roleLabel: roster.roleLabel,
          photoUrl: roster.photoUrl,
          operativeNumber: roster.operativeNumber,
          isMaquinista: roster.isMaquinista,
          duty: dutyFor(roster.role, roster.isMaquinista),
        });
      }
    }
  }

  if (byId.size === 0) {
    const available: RosterMember[] = data.roster.members.filter((m) => m.stationAvailable);
    for (const m of available) {
      add({
        id: m.id,
        name: m.fullName,
        role: m.role,
        roleLabel: m.roleLabel,
        photoUrl: m.photoUrl,
        operativeNumber: m.operativeNumber,
        isMaquinista: m.isMaquinista,
        duty: dutyFor(m.role, m.isMaquinista),
      });
    }
    for (const m of data.maquinistas.members.filter((x) => x.maquinistaAvailable)) {
      add({
        id: m.id,
        name: m.fullName,
        role: m.role,
        roleLabel: m.roleLabel,
        photoUrl: m.photoUrl,
        isMaquinista: true,
        duty: 'maquinista',
      });
    }
  }

  return [...byId.values()].sort((a, b) => {
    const dutyRank = { maquinista: 0, mando: 1, dotacion: 2 };
    const d = dutyRank[a.duty] - dutyRank[b.duty];
    if (d !== 0) return d;
    const r = (RANK[b.role] ?? 0) - (RANK[a.role] ?? 0);
    if (r !== 0) return r;
    return (a.operativeNumber ?? 9999) - (b.operativeNumber ?? 9999);
  });
}

function resolveVehicles(data: PublicCentral, emergency: PublicEmergency | null): FleetVehicle[] {
  const fleet = data.fleet.vehicles;
  const toFleet = (v: NonNullable<PublicEmergency['vehicles']>[number]): FleetVehicle => {
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
    };
  };

  if (emergency?.vehicles?.length) {
    return emergency.vehicles.slice(0, 3).map(toFleet);
  }

  const ranked = [...fleet].sort((a, b) => {
    const score = (v: FleetVehicle) => (v.status === 'OPERATIVO' ? 2 : 0) + (v.imageUrl ? 1 : 0);
    return score(b) - score(a);
  });
  return ranked.slice(0, 3);
}

type Props = {
  data: PublicCentral;
  emergency: PublicEmergency | null;
  operativeNumber: string;
  onOperativeNumber: (value: string) => void;
  onToggleByNumber: (markAvailableOrNum?: boolean | number, explicitNum?: number) => void;
  onToggleMember: (member: RosterMember) => void;
  togglingId?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export default function SalaSalidaBoard({
  data,
  emergency,
  operativeNumber,
  onOperativeNumber,
  onToggleByNumber,
  onToggleMember,
  togglingId,
  inputRef,
}: Props) {
  const vehicles = useMemo(() => resolveVehicles(data, emergency), [data, emergency]);
  const crew = useMemo(() => buildCrew(data, emergency), [data, emergency]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [logoBroken, setLogoBroken] = useState(false);
  const [brokenHero, setBrokenHero] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState(false);
  const emergencyId = emergency?.id ?? null;

  const heroPool = vehicles.filter((v) => publicMediaUrl(v.imageUrl) && !brokenHero[v.id]);
  const rotating = heroPool.length > 0 ? heroPool : vehicles;
  const hero = rotating[heroIndex % Math.max(rotating.length, 1)] ?? vehicles[0];
  const heroSrc = hero && !brokenHero[hero.id] ? publicMediaUrl(hero.imageUrl) : null;
  const logoSrc = !logoBroken ? publicMediaUrl(data.logoUrl) : null;
  const live = Boolean(emergency);
  const typeLabel = emergency?.type?.split(' — ')[1] || emergency?.type;
  const emergencyCode = emergency?.emergencyCodeId || emergency?.code;
  const busy = Boolean(togglingId);
  const canMark = Boolean(operativeNumber) && !busy;
  const vehicleKey = vehicles.map((v) => v.id).join('|');
  const rotatingKey = rotating.map((v) => v.id).join('|');

  useEffect(() => {
    setHeroIndex(0);
  }, [vehicleKey]);

  useEffect(() => {
    if (rotating.length < 2) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % rotating.length);
    }, HERO_MS);
    return () => window.clearInterval(id);
  }, [rotating.length, rotatingKey]);

  useEffect(() => {
    if (!emergencyId) {
      setBurst(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBurst(false);
      return;
    }
    setBurst(true);
    const t = window.setTimeout(() => setBurst(false), BURST_MS);
    return () => window.clearTimeout(t);
  }, [emergencyId]);

  return (
    <section className="relative flex min-h-0 flex-1 overflow-hidden bg-[#071019] text-[#e7edf4]">
      <div className="pointer-events-none absolute inset-0">
        {heroSrc ? (
          <img
            key={hero?.id}
            src={heroSrc}
            alt={hero?.patent}
            onError={() => hero && setBrokenHero((prev) => ({ ...prev, [hero.id]: true }))}
            className={`h-full w-full object-cover object-center scale-105 contrast-110 transition-opacity duration-700 ${
              live ? 'sala-salida-hero-live' : 'opacity-55 grayscale-[25%]'
            }`}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_70%_40%,#12324a_0%,#071019_62%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071019] via-[#071019]/82 to-[#071019]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071019] via-transparent to-[#071019]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(56,189,248,0.12),transparent_42%)]" />
        {live && <div className="sala-salida-vignette" />}
      </div>

      {live && <div className={burst ? 'sala-salida-frame' : 'sala-salida-frame-hold'} />}

      {burst && emergency && (
        <div className="sala-salida-overlay" aria-hidden>
          <div className="sala-salida-siren-sweep" />
          <div className="sala-salida-pop relative mx-8 max-w-4xl text-center">
            <div className="relative mx-auto mb-5 h-24 w-24">
              <span className="sala-salida-ring" />
              <span className="sala-salida-ring sala-salida-ring-delay" />
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.65)]">
                <Siren className="sala-salida-siren-icon h-12 w-12 text-white" />
              </div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-300">Emergencia en curso</p>
            <p className="mt-3 text-4xl font-black leading-tight text-white drop-shadow-[0_0_24px_rgba(239,68,68,0.55)] lg:text-6xl">
              {emergencyCode ? `${emergencyCode} · ${typeLabel}` : typeLabel}
            </p>
            {emergency.address && (
              <p className="mt-4 flex items-center justify-center gap-2 text-lg text-red-100 lg:text-2xl">
                <MapPin className="h-6 w-6 shrink-0 text-red-400" />
                {emergency.address}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-6 py-5 lg:px-10 lg:py-7">
        <p className={`mb-3 text-lg font-black uppercase tracking-[0.18em] lg:text-2xl ${
          live
            ? 'sala-salida-hold-glow text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.55)]'
            : 'text-red-500 drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]'
        }`}>
          Dotación disponible para emergencias
        </p>
        <header className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                onError={() => setLogoBroken(true)}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-[#38bdf8]/50 object-cover shadow-[0_0_24px_rgba(56,189,248,0.25)] lg:h-20 lg:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-600/20 lg:h-20 lg:w-20">
                <Siren className="h-8 w-8 text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#67c8ff]">
                Nodo360 · {data.number}ª Compañía
              </p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight lg:text-5xl">{data.name}</h1>
              <p className="mt-1 text-sm text-[#89a0b3]">{data.city}{data.address ? ` · ${data.address}` : ''}</p>
            </div>
          </div>

          <div className="flex w-[300px] shrink-0 flex-col items-stretch gap-3">
            <LiveClock />
            <form
              className="rounded-2xl border border-[#38bdf8]/35 bg-[#0b2736]/90 p-3 shadow-[0_0_24px_rgba(56,189,248,0.12)] backdrop-blur-sm"
              onSubmit={(e) => {
                e.preventDefault();
                onToggleByNumber();
              }}
            >
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#67c8ff]">
                <Hash className="h-3.5 w-3.5" /> N° operativo
              </p>
              <input
                ref={inputRef}
                data-station-pad
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={operativeNumber}
                onChange={(e) => onOperativeNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="528"
                className="mb-2 w-full rounded-xl border border-[#38bdf8]/40 bg-[#07111a] px-3 py-2 text-center font-mono text-2xl font-semibold text-[#e7edf4] placeholder-[#1879ac] outline-none focus:border-[#67c8ff]"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="submit"
                  disabled={!canMark}
                  className="rounded-lg bg-[#38bdf8] px-1 py-1.5 text-[10px] font-black uppercase text-[#071019] disabled:opacity-40"
                >
                  Marcar
                </button>
                <button
                  type="button"
                  disabled={!canMark}
                  onClick={() => onToggleByNumber(true)}
                  className="inline-flex items-center justify-center gap-0.5 rounded-lg bg-emerald-600 px-1 py-1.5 text-[10px] font-bold uppercase text-white disabled:opacity-40"
                >
                  <Check className="h-3 w-3" /> Sí
                </button>
                <button
                  type="button"
                  disabled={!canMark}
                  onClick={() => onToggleByNumber(false)}
                  className="inline-flex items-center justify-center gap-0.5 rounded-lg bg-slate-700 px-1 py-1.5 text-[10px] font-bold uppercase text-slate-100 disabled:opacity-40"
                >
                  <X className="h-3 w-3" /> No
                </button>
              </div>
            </form>
          </div>
        </header>

        {live && (
          <div className={`mt-5 min-w-0 ${burst ? 'opacity-0' : 'sala-salida-pop'}`}>
            <p className="sala-salida-hold-glow text-xl font-semibold text-red-100 lg:text-3xl">
              {emergencyCode ? `${emergencyCode} · ${typeLabel}` : typeLabel}
            </p>
            {emergency?.address && (
              <p className="mt-1 flex items-center gap-2 text-base text-[#e7c9cb] lg:text-xl">
                <MapPin className="h-5 w-5 shrink-0 text-[#ef343f]" />
                {emergency.address}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {vehicles.map((v) => {
            const active = v.id === hero?.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  const idx = rotating.findIndex((x) => x.id === v.id);
                  if (idx >= 0) setHeroIndex(idx);
                }}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm transition-colors ${
                  live && active
                    ? `border-[#ef343f]/70 bg-[#3a151b]/80 ${burst ? 'sala-salida-chip-flash' : 'sala-salida-chip-hold'}`
                    : active
                      ? 'border-[#38bdf8]/60 bg-[#0b2736]/80 shadow-[0_0_20px_rgba(56,189,248,0.18)]'
                      : live
                        ? 'border-[#ef343f]/25 bg-black/40'
                        : 'border-white/10 bg-black/35'
                }`}
              >
                <Truck className={`h-6 w-6 ${live && active ? 'text-[#ef343f]' : active ? 'text-[#67c8ff]' : 'text-[#89a0b3]'}`} />
                <div className="text-left">
                  <p className="font-mono text-2xl font-semibold leading-none">{v.patent}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[#89a0b3]">
                    {v.type}{v.brand ? ` · ${v.brand}` : ''}{v.model ? ` ${v.model}` : ''}
                  </p>
                </div>
              </button>
            );
          })}
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            live
              ? 'border-[#ef343f]/35 bg-[#3a151b]/55 text-[#ff8a90]'
              : 'border-white/10 bg-black/35 text-[#89a0b3]'
          }`}>
            <Users className={`h-4 w-4 ${live ? 'text-[#ef343f]' : 'text-[#67c8ff]'}`} />
            {crew.length} {live ? 'en salida' : 'en sala'}
          </div>
        </div>

        <div className="mt-auto min-h-0 pt-6">
          {crew.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-[#89a0b3]">
              <Radio className="h-5 w-5 text-[#67c8ff]" />
              Sin dotación marcada. Ingresá el N° operativo arriba para marcarte en sala.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
              {crew.map((person) => (
                <article key={person.id} className="min-w-0">
                  <CrewPhoto
                    person={person}
                    live={live}
                    disabled={busy}
                    onClick={() => {
                      const member = data.roster.members.find((m) => m.id === person.id);
                      if (member?.stationAvailable) {
                        onToggleMember(member);
                        return;
                      }
                      if (person.operativeNumber != null) onToggleByNumber(false, person.operativeNumber);
                    }}
                  />
                  <p className="mt-1.5 truncate text-xs font-semibold leading-tight">{person.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <RoleBadge role={person.role} size="xs" contrast />
                    {person.isMaquinista && person.duty === 'maquinista' && (
                      <span className="rounded bg-amber-400/15 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-200">
                        Maquinista
                      </span>
                    )}
                  </div>
                  {statusLabel(person.status) && (
                    <p className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wide ${live ? 'text-[#ef343f]' : 'text-[#67c8ff]'}`}>
                      {statusLabel(person.status)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#698297]">
          <span className="inline-flex items-center gap-2">
            <Siren className="h-3.5 w-3.5 text-[#67c8ff]" />
            Pantalla de sala · Tema Salida
          </span>
          <span>{roleInfo('BOMBERO').short} · Nodo360</span>
        </footer>
      </div>
    </section>
  );
}
