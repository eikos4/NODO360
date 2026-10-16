import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, CheckCircle2, Cloud, CloudRain, CloudSun, Droplets, Maximize2, Minimize2, MapPin, Phone,
  Shield, Siren, Smartphone, Sun, Truck, Users, Wind, XCircle, Clock, MessageSquare,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';
import { useEmergencyLiveSocket } from '../hooks/useEmergencyLiveSocket';
import { subscribeAnyDispatchLive } from '../lib/dispatch-live-sync';
import { cn } from '../lib/utils';
import PublicOsmMap, { PARRAL_CENTER } from '../components/map/PublicOsmMap';
import type { CentralParralThemeTokens } from '../lib/central-parral-theme';
import { useCentralSceneBackground } from '../lib/central-scene-backgrounds';

const POLL_MS = 2_500;

type CallPerson = {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  photoUrl?: string | null;
  operativeNumber?: number | null;
  phone?: string | null;
  companyNumber?: number | null;
  devices: number;
  push: string;
  pushLabel: string;
  sentAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  response: string | null;
  responseLabel: string;
  respondedAt: string | null;
};

type CallIncident = {
  id: string;
  code: string;
  type: string;
  address: string;
  status: string;
  dispatchedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  company: { id: string; number: number; name: string };
  vehicles: { patent: string; type: string }[];
  alarm: {
    queuedAt: string | null;
    targeted: number;
    devices: number;
    queued: number;
    sent: number;
    opened: number;
    acked: number;
    failed: number;
    going: number;
    onScene: number;
    notGoing: number;
  };
  people: CallPerson[];
};

type CallBoard = { generatedAt: string; incidents: CallIncident[] };

function fmtClock(d: Date) {
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtHm(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function elapsed(from: string, now: Date) {
  const secs = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function secsBetween(from: string, to: string | null) {
  if (!to) return null;
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function CentralLlamadosPage() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { tokens: th, isDark } = useCentralParralTheme();
  const [params, setParams] = useSearchParams();
  const requestedId = params.get('id');
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.title = 'Nodo360 · Llamados';
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const { data } = useQuery({
    queryKey: ['call-board'],
    queryFn: () => api.get<CallBoard>('/incidents/call-board').then((r) => r.data),
    refetchInterval: POLL_MS,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['call-board'] });
  };

  useEmergencyLiveSocket({ token, onEvent: refresh });
  useEffect(() => subscribeAnyDispatchLive(refresh), [qc]);

  const incidents = data?.incidents ?? [];
  const selected = useMemo(() => {
    if (requestedId) return incidents.find((row) => row.id === requestedId) ?? incidents[0] ?? null;
    return incidents[0] ?? null;
  }, [incidents, requestedId]);
  const idle = !selected;

  useEffect(() => {
    if (selected && requestedId !== selected.id) {
      setParams({ id: selected.id }, { replace: true });
    }
  }, [selected, requestedId, setParams]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <div className={cn('llamados-board relative flex h-full min-h-0 flex-col overflow-hidden', idle ? 'bg-black' : th.page)}>
      {!idle && (
        <div className={cn('flex shrink-0 items-center gap-3 border-b px-4 py-2', th.header)}>
          {incidents.length > 1 && (
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
              {incidents.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setParams({ id: row.id })}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-bold',
                    selected?.id === row.id ? th.btnGhostActive : th.btnGhost,
                  )}
                >
                  {row.code}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className={cn('hidden items-center gap-1.5 text-[11px] font-black uppercase tracking-widest sm:inline-flex', isDark ? 'text-red-300' : 'text-red-600')}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {elapsed(selected!.dispatchedAt, now)}
            </span>
            <p className={cn('font-mono text-xl font-black tabular-nums', th.clock)}>{fmtClock(now)}</p>
            <button type="button" onClick={toggleFullscreen} className={cn('rounded-lg border p-2', th.btnGhost)} title="Pantalla completa">
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <main className={cn('min-h-0 flex-1', idle ? 'overflow-hidden p-0' : 'overflow-y-auto p-3 sm:p-4')}>
        {idle ? (
          <WaitingState now={now} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
        ) : (
          <CallDetail call={selected!} now={now} th={th} isDark={isDark} />
        )}
      </main>

      <style>{`
        @keyframes llam-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes llam-flow { 0% { transform: translateX(-8px); opacity: .3; } 50% { opacity: 1; } 100% { transform: translateX(8px); opacity: .3; } }
        @keyframes llam-siren { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.45); } 50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } }
        @keyframes llam-ring { 0%,100% { transform: rotate(0deg); } 15% { transform: rotate(8deg); } 30% { transform: rotate(-8deg); } 45% { transform: rotate(4deg); } 60% { transform: rotate(0); } }
        @keyframes llam-bar { from { width: 0; } }
        .llam-rise { animation: llam-rise .45s ease both; }
        .llam-flow { animation: llam-flow 1.2s ease-in-out infinite; }
        .llam-siren { animation: llam-siren 1.4s ease-out infinite; }
        .llam-ring { animation: llam-ring 1.8s ease-in-out infinite; }
        .llam-bar { animation: llam-bar .8s ease-out both; }
        .llam-pipe { color: #0f172a; }
      `}</style>
    </div>
  );
}

function weatherLabel(code?: number | null) {
  if (code == null) return 'Parral';
  if (code === 0) return 'Despejado';
  if (code <= 3) return 'Parcial';
  if (code <= 48) return 'Nublado';
  if (code <= 67) return 'Lluvia';
  if (code <= 77) return 'Nieve';
  if (code <= 82) return 'Chubascos';
  return 'Inestable';
}

function WeatherGlyph({ code, className }: { code?: number | null; className?: string }) {
  if (code != null && code >= 51) return <CloudRain className={className} />;
  if (code != null && code >= 1 && code <= 3) return <CloudSun className={className} />;
  if (code != null && code >= 45) return <Cloud className={className} />;
  return <Sun className={className} />;
}

function useParralWeather() {
  const [tempC, setTempC] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [precip, setPrecip] = useState<number | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const [lat, lng] = PARRAL_CENTER;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation&timezone=America/Santiago`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((j) => {
        const t = j?.current?.temperature_2m;
        const c = j?.current?.weather_code;
        const w = j?.current?.wind_speed_10m;
        const h = j?.current?.relative_humidity_2m;
        const p = j?.current?.precipitation;
        if (typeof t === 'number') setTempC(Math.round(t));
        if (typeof c === 'number') setCode(c);
        if (typeof w === 'number') setWind(Math.round(w));
        if (typeof h === 'number') setHumidity(Math.round(h));
        if (typeof p === 'number') setPrecip(p);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);
  return { tempC, code, wind, humidity, precip };
}

function WaitingState({
  now, fullscreen, onToggleFullscreen,
}: {
  now: Date;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const weather = useParralWeather();
  const { data: incidentList } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.get('/incidents').then((r) => r.data as { dispatchedAt?: string }[]),
    staleTime: 20_000,
  });
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayCount = (Array.isArray(incidentList) ? incidentList : []).filter((row) => {
    if (!row.dispatchedAt) return false;
    return new Date(row.dispatchedAt).getTime() >= startToday;
  }).length;
  const weekday = now.toLocaleDateString('es-CL', { weekday: 'long' });
  const dateLabel = now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const [lat, lng] = PARRAL_CENTER;
  const sceneSrc = useCentralSceneBackground(true);

  return (
    <div className="llamados-idle relative h-full min-h-0 overflow-hidden">
      <img
        src={sceneSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/15" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid shrink-0 items-start gap-4 lg:grid-cols-[minmax(240px,1fr)_auto_minmax(240px,1fr)]">
          <div className="keep-on-color flex max-w-sm flex-col gap-2 text-white">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3">
                <WeatherGlyph code={weather.code} className="h-10 w-10 text-amber-300" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Parral</p>
                  <p className="font-mono text-4xl font-black leading-none">
                    {weather.tempC != null ? `${weather.tempC}°C` : '—'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/85">{weatherLabel(weather.code)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-[12px] font-semibold shadow-lg backdrop-blur-md">
              <p className="flex items-center gap-2 text-white/90">
                <Droplets className="h-3.5 w-3.5 text-sky-300" />
                Humedad {weather.humidity != null ? `${weather.humidity}%` : '—'}
              </p>
              <p className="mt-1 flex items-center gap-2 text-white/90">
                <Wind className="h-3.5 w-3.5 text-sky-300" />
                Viento {weather.wind != null ? `${weather.wind} km/h` : '—'}
              </p>
              <p className="mt-1 flex items-center gap-2 text-white/80">
                <CloudRain className="h-3.5 w-3.5 text-sky-300" />
                {weather.precip != null && weather.precip > 0 ? `Precipitación ${weather.precip} mm` : 'Sin precipitaciones'}
              </p>
            </div>
            <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-white/80">
              <MapPin className="h-3.5 w-3.5 text-red-400" />
              Parral, Región del Maule · {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>

          <div className="keep-on-color order-first text-center text-white lg:order-none">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl xl:text-6xl">
              NODO<span className="text-red-500">360</span>
            </h1>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/85">
              Conecta. Coordina. Responde.
            </p>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.18em]">Central de despacho</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Cuerpo de Bomberos de Parral
            </p>
          </div>

          <div className="keep-on-color ml-auto flex items-start gap-2 text-white">
            <div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-right shadow-lg backdrop-blur-md">
              <p className="flex items-center justify-end gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="capitalize">{weekday}</span>
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-white/85">{dateLabel}</p>
              <p className="mt-2 font-mono text-4xl font-black tabular-nums leading-none xl:text-5xl">{timeLabel}</p>
            </div>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-xl border border-white/25 bg-white/10 p-2 text-white backdrop-blur-md"
              title="Pantalla completa"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/95 px-8 py-8 text-center shadow-2xl shadow-black/30">
            <span className="llam-siren mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
              <Siren className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">Esperando despacho</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-[#334155]">
              Dejá esta pantalla abierta. Al despachar se ve el envío a teléfonos, quién recibió la alarma y quién va.
            </p>
          </div>
        </div>

        <div className="keep-on-color grid shrink-0 grid-cols-2 gap-2 rounded-[1.6rem] border border-white/15 bg-black/15 p-3 backdrop-blur-[2px] sm:grid-cols-3 lg:grid-cols-5">
          <IdleStat icon={Phone} tone="text-sky-300" value={0} label="Llamados activos" hint="Sin novedades" />
          <IdleStat icon={Truck} tone="text-red-400" value={0} label="Unidades en camino" hint="Sin unidades en ruta" />
          <IdleStat icon={Users} tone="text-white/80" value={0} label="Bomberos en emergencia" hint="Sin personal despachado" />
          <IdleStat icon={CheckCircle2} tone="text-emerald-400" value={todayCount} label="Emergencias hoy" hint={todayCount ? 'Registradas hoy' : 'Sin novedades'} />
          <IdleStat
            icon={Shield}
            tone="text-emerald-300"
            value="En línea"
            label="Sistema Operativo"
            hint="Todos los servicios funcionando correctamente."
            wide
          />
        </div>
      </div>
    </div>
  );
}

function IdleStat({
  icon: Icon, tone, value, label, hint, wide,
}: {
  icon: typeof Phone;
  tone: string;
  value: number | string;
  label: string;
  hint: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl px-3 py-2', wide && 'col-span-2 sm:col-span-1 lg:col-span-1')}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={cn('font-black leading-none text-white', typeof value === 'number' ? 'text-2xl' : 'text-base')}>{value}</p>
        <p className="truncate text-[11px] font-bold text-white">{label}</p>
        <p className="truncate text-[10px] font-medium text-white/70">{hint}</p>
      </div>
    </div>
  );
}

function CallDetail({
  call, now, th, isDark,
}: {
  call: CallIncident;
  now: Date;
  th: CentralParralThemeTokens;
  isDark: boolean;
}) {
  const a = call.alarm;
  const target = a.targeted || a.devices || call.people.length || 1;
  const pending = call.people.filter((p) => !p.response).length;
  const confirmedVa = a.going + a.onScene;
  const avgSecs = averageResponse(call);
  const hasMap = call.latitude != null && call.longitude != null;
  const center: [number, number] = hasMap ? [call.latitude!, call.longitude!] : PARRAL_CENTER;
  const events = buildEvents(call);
  const times = call.people
    .map((p) => ({
      person: p,
      at: p.respondedAt ?? p.acknowledgedAt,
      secs: secsBetween(call.dispatchedAt, p.respondedAt ?? p.acknowledgedAt),
    }))
    .filter((row) => row.at)
    .sort((x, y) => (x.secs ?? 0) - (y.secs ?? 0));

  const sending = call.people.filter((p) => p.push === 'queued' || p.push === 'sent' || p.push === 'opened' || p.push === 'acked');

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      <section className={cn('llam-rise flex flex-wrap items-center gap-4 rounded-2xl border p-4', isDark ? 'border-red-500/40 bg-gradient-to-r from-red-950/70 to-transparent' : 'border-red-200 bg-gradient-to-r from-red-50 to-white')}>
        <span className="keep-on-color llam-siren flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
          <Siren className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-red-300' : 'text-red-600')}>
            {call.company.number}ª {call.company.name}
          </p>
          <h1 className={cn('font-mono text-2xl font-black tracking-tight sm:text-3xl', th.title)}>{call.code}</h1>
          <p className={cn('font-semibold', th.subtitle)}>{call.type} · {call.address}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {call.vehicles.map((v) => (
            <span key={v.patent} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black', th.btnGhost)}>
              <Truck className="h-3.5 w-3.5 text-emerald-500" /> {v.patent}
            </span>
          ))}
          <div className={cn('rounded-2xl border px-4 py-2 text-center', th.card)}>
            <p className={cn('text-[10px] font-black uppercase tracking-widest', th.kpiLabel)}>Tiempo desde ingreso</p>
            <p className={cn('font-mono text-2xl font-black tabular-nums', isDark ? 'text-red-300' : 'text-red-600')}>{elapsed(call.dispatchedAt, now)}</p>
          </div>
        </div>
        <div className={cn('h-28 w-full overflow-hidden rounded-2xl border sm:w-56', th.mapWrap)}>
          <PublicOsmMap
            center={center}
            zoom={14}
            theme={th.mapTheme}
            markers={[{ id: call.id, lat: center[0], lng: center[1], active: true, label: call.code }]}
            className="h-full w-full"
          />
        </div>
      </section>

      <section className="llam-pipe grid gap-2 lg:grid-cols-6">
        <PipelineCard n={1} title="Central de despacho" delay={0}>
          <div className="relative min-h-[210px] overflow-hidden rounded-xl">
            <img src="/llamados/central-operadora.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="keep-on-color llam-siren absolute left-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-white">
              <Siren className="h-6 w-6" />
            </span>
            <div className="keep-on-color absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="text-[11px] font-bold leading-snug">Se activa la alarma</p>
              <p className="font-mono text-sm font-black">{call.code}</p>
              <p className="text-[10px] text-white/85">{call.type}</p>
              <p className="text-[10px] text-white/70">{call.address}</p>
            </div>
          </div>
        </PipelineCard>

        <PipelineCard n={2} title="Sistema NODO360" delay={80}>
          <div className="flex h-full flex-col items-center justify-center gap-2 px-1 py-1">
            <img src="/llamados/nodo360-cloud.jpg" alt="NODO360" className="h-24 w-auto object-contain" />
            <p className="text-center text-[11px] font-semibold leading-snug text-slate-600">
              Envía notificaciones a los teléfonos de la compañía
            </p>
            <ul className="w-full space-y-1 text-[11px] font-semibold text-slate-700">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-sky-500" /> Llamada telefónica</li>
              <li className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-sky-500" /> Notificación en la app</li>
              <li className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-sky-500" /> Mensaje de texto (SMS)</li>
            </ul>
          </div>
        </PipelineCard>

        <PipelineCard n={3} title="Envío a teléfonos" delay={160}>
          <ul className="space-y-1.5">
            {(sending.slice(0, 5).length ? sending.slice(0, 5) : call.people.slice(0, 5)).map((p, i) => {
              const sendingNow = p.push === 'queued';
              return (
                <li key={p.userId} className="flex items-center gap-2" style={{ animationDelay: `${i * 80}ms` }}>
                  <img src="/llamados/telefono.jpg" alt="" className={cn('h-9 w-6 rounded object-cover shadow-sm', sendingNow && 'llam-ring')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-slate-900">{p.firstName} {p.lastName.split(' ')[0]}</p>
                    <p className="truncate text-[10px] text-slate-500">{formatPhone(p)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-[10px] font-black', sendingNow ? 'text-amber-500' : 'text-emerald-500')}>
                      {sendingNow ? 'Enviando…' : p.push === 'failed' ? 'Error' : 'Enviado'}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">{fmtHm(p.sentAt)}</p>
                  </div>
                </li>
              );
            })}
            {call.people.length === 0 && <p className="text-xs text-slate-500">Encolando destinos…</p>}
          </ul>
        </PipelineCard>

        <PipelineCard n={4} title="Recepción en teléfonos" delay={240}>
          <PhonePreview call={call} now={now} />
        </PipelineCard>

        <PipelineCard n={5} title="Confirmación de respuestas" delay={320}>
          <ul className="space-y-1.5">
            {call.people.slice(0, 5).map((p) => {
              const va = p.response === 'GOING' || p.response === 'ON_SCENE';
              const no = p.response === 'NOT_GOING' || p.response === 'NOT_AVAILABLE';
              return (
                <li key={p.userId} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
                  <span className={cn(
                    'keep-on-color flex h-6 w-6 items-center justify-center rounded-full text-white',
                    va ? 'bg-emerald-500' : no ? 'bg-red-500' : 'bg-amber-400',
                  )}>
                    {va ? <CheckCircle2 className="h-4 w-4" /> : no ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-slate-900">{p.firstName}</p>
                    <p className={cn('text-[10px] font-bold', va ? 'text-emerald-600' : no ? 'text-red-500' : 'text-amber-600')}>{confirmLabel(p)}</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500">
                    <p>{fmtHm(p.respondedAt ?? p.acknowledgedAt)}</p>
                    <p>{secsBetween(call.dispatchedAt, p.respondedAt ?? p.acknowledgedAt) ?? '—'}s</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </PipelineCard>

        <PipelineCard n={6} title="Estado final" delay={400}>
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-2 py-2">
              <span className="keep-on-color flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"><Users className="h-4 w-4" /></span>
              <div>
                <p className="text-lg font-black leading-none text-emerald-700">{confirmedVa}</p>
                <p className="text-[10px] font-bold text-emerald-700">Bomberos confirman</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-2 py-2">
              <span className="keep-on-color flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"><XCircle className="h-4 w-4" /></span>
              <div>
                <p className="text-lg font-black leading-none text-red-600">{a.notGoing}</p>
                <p className="text-[10px] font-bold text-red-600">Bombero no va</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-2 py-2">
              <span className="keep-on-color flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white"><Clock className="h-4 w-4" /></span>
              <div>
                <p className="text-lg font-black leading-none text-amber-700">{pending}</p>
                <p className="text-[10px] font-bold text-amber-700">Sin respuesta</p>
              </div>
            </div>
            <Link to={hasMap ? `/operational-map?incident=${call.id}` : '/operational-map'} className="keep-on-color mt-auto inline-flex w-full items-center justify-center gap-1 rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-black text-white shadow-md shadow-sky-200">
              <MapPin className="h-3.5 w-3.5" /> Ver en mapa
            </Link>
          </div>
        </PipelineCard>
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Kpi th={th} icon={Phone} value={target} label="Teléfonos objetivo" hint="de la compañía" />
        <Kpi th={th} icon={CheckCircle2} value={a.sent} label="Notificaciones enviadas" hint={`${pct(a.sent, target)}%`} bar={pct(a.sent, target)} tone="ok" />
        <Kpi th={th} icon={Smartphone} value={a.opened} label="Respuestas recibidas" hint={`${pct(a.opened, target)}%`} bar={pct(a.opened, target)} tone="info" />
        <Kpi th={th} icon={CheckCircle2} value={confirmedVa} label="Confirman · VA" hint={`${pct(confirmedVa, target)}%`} bar={pct(confirmedVa, target)} tone="ok" />
        <Kpi th={th} icon={XCircle} value={a.notGoing} label="No va" hint={`${pct(a.notGoing, target)}%`} bar={pct(a.notGoing, target)} tone="bad" />
        <Kpi th={th} icon={Clock} value={pending} label="Sin respuesta" hint={`${pct(pending, target)}%`} bar={pct(pending, target)} tone="wait" />
        <Kpi th={th} icon={Clock} value={avgSecs ?? '—'} label="Tiempo promedio" hint="de respuesta" suffix={avgSecs != null ? 's' : ''} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className={cn('overflow-hidden rounded-2xl border', th.card)}>
          <h2 className={cn('border-b px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]', th.cardHeader, th.cardTitle)}>
            Historial de eventos
          </h2>
          <table className="w-full text-left text-xs">
            <thead className={th.kpiLabel}>
              <tr>
                <th className="px-4 py-2 font-semibold">Hora</th>
                <th className="px-2 py-2 font-semibold">Evento</th>
                <th className="px-2 py-2 font-semibold">Detalle</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className={cn('border-t', th.borderSubtle)}>
                  <td className={cn('px-4 py-2 font-mono', th.title)}>{ev.time}</td>
                  <td className={cn('px-2 py-2 font-semibold', th.subtitle)}>{ev.event}</td>
                  <td className={cn('px-2 py-2', th.hint)}>{ev.detail}</td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black', ev.ok ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600')}>{ev.ok ? 'OK' : '…'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={cn('overflow-hidden rounded-2xl border', th.card)}>
          <h2 className={cn('border-b px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]', th.cardHeader, th.cardTitle)}>
            Tiempos de respuesta
          </h2>
          <table className="w-full text-left text-xs">
            <thead className={th.kpiLabel}>
              <tr>
                <th className="px-4 py-2 font-semibold">Bombero</th>
                <th className="px-2 py-2 font-semibold">Estado</th>
                <th className="px-2 py-2 font-semibold">Hora</th>
                <th className="px-4 py-2 font-semibold">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {times.length === 0 ? (
                <tr><td colSpan={4} className={cn('px-4 py-6', th.hint)}>Todavía no hay confirmaciones en la app.</td></tr>
              ) : times.map((row) => (
                <tr key={row.person.userId} className={cn('border-t', th.borderSubtle)}>
                  <td className={cn('px-4 py-2 font-semibold', th.title)}>{row.person.fullName}</td>
                  <td className={cn('px-2 py-2 font-bold', responseColor(row.person.response, isDark))}>{confirmLabel(row.person)}</td>
                  <td className={cn('px-2 py-2 font-mono', th.subtitle)}>{fmtHm(row.at)}</td>
                  <td className={cn('px-4 py-2 font-mono font-black', th.title)}>{row.secs ?? 0}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PipelineCard({
  n, title, children, delay,
}: {
  n: number;
  title: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <article
      className="llam-rise relative flex flex-col rounded-2xl border border-sky-100 bg-white p-3 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      {n < 6 && (
        <span className="pointer-events-none absolute -right-3 top-10 z-10 hidden text-2xl font-black text-sky-500 lg:block">
          ➜
        </span>
      )}
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-sky-600">
        {n}. {title}
      </p>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  );
}

function PhonePreview({ call, now }: { call: CallIncident; now: Date }) {
  const weekday = now.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' });
  return (
    <div className="keep-on-color mx-auto w-[158px] rounded-[1.85rem] border-[5px] border-[#0f172a] bg-[#0b1220] p-2 shadow-xl">
      <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[#334155]" />
      <p className="text-center font-mono text-lg font-black leading-none text-white">{fmtClock(now).slice(0, 5)}</p>
      <p className="mb-2 text-center text-[8px] capitalize text-white/70">{weekday}</p>
      <div className="rounded-2xl bg-red-600 p-2 text-white shadow-md">
        <p className="text-[8px] font-black tracking-widest">NODO360</p>
        <p className="truncate text-[11px] font-black leading-tight">{call.type}</p>
        <p className="truncate font-mono text-[9px] text-white/90">{call.code}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <span className="rounded-md bg-emerald-500 py-1.5 text-center text-[9px] font-black text-white">Voy</span>
        <span className="rounded-md bg-red-500 py-1.5 text-center text-[9px] font-black text-white">No voy</span>
      </div>
      <div className="mt-2 rounded-lg bg-white/10 px-2 py-1 text-[8px] text-white/90">
        <p className="font-bold">Llamada entrante</p>
        <p className="truncate text-white/70">NODO360 · {call.type}</p>
      </div>
      <div className="mt-1 rounded-lg bg-white/10 px-2 py-1 text-[8px] text-white/90">
        <p className="font-bold">SMS</p>
        <p className="truncate font-mono text-white/70">{call.code}</p>
      </div>
    </div>
  );
}

function formatPhone(p: CallPerson) {
  if (p.phone) return p.phone;
  if (p.operativeNumber) return `N° ${p.operativeNumber}`;
  return 'App Nodo360';
}

function Kpi({
  th, icon: Icon, value, label, hint, bar, tone, suffix,
}: {
  th: CentralParralThemeTokens;
  icon: typeof Users;
  value: number | string;
  label: string;
  hint: string;
  bar?: number;
  tone?: 'ok' | 'info' | 'bad' | 'wait';
  suffix?: string;
}) {
  const color = tone === 'ok' ? 'bg-emerald-500' : tone === 'info' ? 'bg-sky-500' : tone === 'bad' ? 'bg-red-500' : tone === 'wait' ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <div className={cn('rounded-2xl border px-3 py-3', th.card)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', th.kpiLabel)} />
        <span className={cn('text-2xl font-black tabular-nums', th.kpiValue)}>{value}{suffix}</span>
      </div>
      <p className={cn('mt-1 text-[11px] font-black uppercase tracking-wide', th.title)}>{label}</p>
      <p className={cn('text-[10px]', th.kpiLabel)}>{hint}</p>
      {bar != null && (
        <div className={cn('mt-2 h-1.5 overflow-hidden rounded-full', th.listRow)}>
          <div className={cn('llam-bar h-full rounded-full', color)} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

function responseColor(status: string | null, isDark: boolean) {
  if (status === 'GOING' || status === 'ON_SCENE') return isDark ? 'text-emerald-300' : 'text-emerald-700';
  if (status === 'NOT_GOING' || status === 'NOT_AVAILABLE') return isDark ? 'text-red-300' : 'text-red-700';
  return isDark ? 'text-amber-200' : 'text-amber-700';
}

function confirmLabel(p: CallPerson) {
  if (p.response === 'GOING' || p.response === 'ON_SCENE') return 'Confirmó · VA';
  if (p.response === 'NOT_GOING' || p.response === 'NOT_AVAILABLE') return 'No va';
  if (p.push === 'acked') return 'Confirmó';
  if (p.push === 'opened') return 'Recibida';
  return 'Sin respuesta';
}

function averageResponse(call: CallIncident) {
  const values = call.people
    .map((p) => secsBetween(call.dispatchedAt, p.respondedAt ?? p.acknowledgedAt))
    .filter((n): n is number => n != null);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function buildEvents(call: CallIncident) {
  const rows: { id: string; time: string; event: string; detail: string; ok: boolean; at: number }[] = [
    {
      id: 'alarm',
      time: fmtHm(call.dispatchedAt),
      event: 'Alarma activada',
      detail: `${call.code} — ${call.type}`,
      ok: true,
      at: new Date(call.dispatchedAt).getTime(),
    },
  ];
  if (call.alarm.queuedAt) {
    rows.push({
      id: 'queue',
      time: fmtHm(call.alarm.queuedAt),
      event: 'Envío de notificaciones',
      detail: `Se inicia envío a ${call.alarm.targeted || call.people.length} teléfonos`,
      ok: true,
      at: new Date(call.alarm.queuedAt).getTime(),
    });
  }
  for (const p of call.people) {
    if (p.sentAt) {
      rows.push({
        id: `sent-${p.userId}`,
        time: fmtHm(p.sentAt),
        event: 'Notificación enviada',
        detail: p.fullName,
        ok: p.push !== 'failed',
        at: new Date(p.sentAt).getTime(),
      });
    }
  }
  return rows.sort((a, b) => a.at - b.at).slice(0, 10);
}
