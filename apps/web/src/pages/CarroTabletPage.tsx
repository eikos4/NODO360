import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, Building2, Car, CheckCircle2, ClipboardList, Cloud, CloudOff, CloudRain,
  CloudSun, Droplet, Flame, Fuel, Gauge, GraduationCap, HeartPulse, HelpCircle, History, Home,
  Loader2, MapPin, Maximize2, Megaphone, Moon, Navigation, Package, PenLine, Radio, Search, Shield,
  ShieldAlert, Siren, Sun, Trees, Truck, Users, Volume2, VolumeX, Wifi, Wrench, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SalaPinGate, { type SalaLockPreview } from '../components/dispatch/SalaPinGate';
import RadioPttPanel from '../components/radio/RadioPttPanel';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../components/map/PublicOsmMap';
import { type PublicEmergency } from '../components/dispatch/DispatchEmergenciesPanel';
import { COMPANIAS360 } from '../lib/companias360';
import { clearSalaToken, readSalaToken, salaAuthHeaders, writeSalaToken } from '../lib/sala-auth';
import { clearCarroVehicle, readCarroVehicle, writeCarroVehicle } from '../lib/carro-session';
import {
  enqueueTimelineHit,
  flushTimelineQueue,
  listPendingHits,
} from '../lib/carro-offline-queue';
import { carroSopForType } from '../lib/carro-sop';
import {
  carroMaterialsForType,
  materialChecklistSummary,
  readCarroMaterials,
  writeCarroMaterials,
} from '../lib/carro-materials';
import { EMERGENCY_MAIN_TYPES } from '../lib/emergency-codes';
import { incidentNavigatePoint, openGoogleMapsDirections } from '../lib/incident-location-pin';
import { vehicleTypeAbbrev, vehicleTypeShortLabel } from '../lib/vehicle-types';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { nodotrackTone, type NodotrackTone } from '../lib/nodotrack-theme';
import { useEmergencyLiveSocket } from '../hooks/useEmergencyLiveSocket';
import { usePublicDispatchAlarm } from '../hooks/usePublicDispatchAlarm';
import { type IncidentTimelineKind } from '../lib/incident-timeline';

type FleetVehicle = {
  id: string;
  patent: string;
  brand: string;
  model: string;
  year?: number;
  type: string;
  statusLabel: string;
  imageUrl?: string | null;
  kilometers?: number;
  fuelLevelPercent?: number | null;
  lastFuelLiters?: number | null;
  fuelUpdatedAt?: string | null;
  lastMaintenanceAt?: string | null;
  nextMaintenanceAt?: string | null;
  principalMaquinista?: {
    firstName: string;
    lastName: string;
    maquinistaAvailable?: boolean;
  } | null;
};

type PublicCentral = {
  name: string;
  number: number;
  city?: string | null;
  address?: string | null;
  fleet: { vehicles: FleetVehicle[]; stats?: { total: number; operativo: number } };
  maquinistas?: {
    principal?: { firstName: string; lastName: string; maquinistaAvailable?: boolean } | null;
    members?: { firstName: string; lastName: string; maquinistaAvailable?: boolean; maquinistaPrincipal?: boolean }[];
    stats?: { available: number; total: number };
  };
  recentEmergencies: PublicEmergency[];
  emergencyStats?: { active: number; total: number };
};

type TimelineEvent = { id: string; kind: string; label: string; note?: string | null; occurredAt: string };
type NearHydrant = {
  id: string;
  code: string;
  address?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
};

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

const CARRO_OPS: Array<{ kind: IncidentTimelineKind; label: string; hint: string; icon: typeof Truck; danger?: boolean }> = [
  { kind: 'EN_CAMINO', label: 'En camino', hint: 'Salimos al siniestro', icon: Truck },
  { kind: 'EN_LUGAR', label: 'En el lugar', hint: 'Llegada al destino', icon: MapPin },
  { kind: 'RECONOCIMIENTO', label: 'Reconocimiento', hint: 'Evaluación inicial', icon: Search },
  { kind: 'HIDRANTE', label: 'Hidrante', hint: 'Abastecimiento', icon: Droplet },
  { kind: 'ATAQUE_INTERIOR', label: 'Ataque interior', hint: 'Ingreso a recinto', icon: Flame },
  { kind: 'CONTROLADO', label: 'Controlado', hint: 'Situación controlada', icon: CheckCircle2 },
];

const CARRO_CRITICAL: Array<{ kind: IncidentTimelineKind; label: string; hint: string; icon: typeof Truck }> = [
  { kind: 'MAYDAY', label: 'MAYDAY', hint: 'Bombero en peligro', icon: Megaphone },
  { kind: 'BOMBERO_HERIDO', label: 'Bombero herido', hint: 'Lesión en servicio', icon: HeartPulse },
  { kind: 'ACCIDENTE_RUTA', label: 'Accidente ruta', hint: 'Unidad siniestrada', icon: AlertTriangle },
  { kind: 'UNIDAD_AVERIADA', label: 'Avería', hint: 'Falla mecánica', icon: Wrench },
];

const CARRO_RETURN: Array<{ kind: IncidentTimelineKind; label: string; hint: string; icon: typeof Truck }> = [
  { kind: 'REGRESO', label: 'Regreso', hint: 'Volvemos a cuartel', icon: Navigation },
  { kind: 'EN_CUARTEL', label: 'En cuartel', hint: 'Ya en la compañía', icon: Home },
  { kind: 'DISPONIBLE', label: 'Disponible', hint: 'Listos para otro llamado', icon: CheckCircle2 },
];

const CARRO_SUPPORT: Array<{ kind: IncidentTimelineKind; label: string; hint: string; icon: typeof Truck }> = [
  { kind: 'SAMU', label: 'SAMU', hint: 'Ambulancia / salud', icon: HeartPulse },
  { kind: 'CARABINEROS', label: 'Carabineros', hint: 'Apoyo policial', icon: Shield },
  { kind: 'SEGUNDA_ALARMA', label: '2ª alarma', hint: 'Más compañías', icon: Siren },
  { kind: 'APOYO', label: 'Apoyo Cías', hint: 'Otras compañías', icon: Users },
];

function crewStatusLabel(status?: string | null) {
  if (status === 'ON_SCENE') return 'En el lugar';
  if (status === 'GOING') return 'En camino';
  if (status === 'NOT_AVAILABLE') return 'No voy';
  return status || '—';
}

function formatPinStatus(e: PublicEmergency) {
  if (e.hasFieldGps || e.locationPinAt) return 'Pin confirmado en terreno';
  if (e.hasCoordinates) return 'Pin de despacho';
  return 'Sin coordenadas';
}

function formatWhenShort(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatWhenDay(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function weatherLabel(code?: number | null) {
  if (code == null) return 'Parral';
  if (code === 0) return 'Despejado';
  if (code <= 3) return 'Parcial';
  if (code <= 48) return 'Nublado / niebla';
  if (code <= 67) return 'Lluvia';
  if (code <= 77) return 'Nieve';
  if (code <= 82) return 'Chubascos';
  return 'Inestable';
}

function WeatherIcon({ code, className }: { code?: number | null; className?: string }) {
  if (code != null && code >= 51) return <CloudRain className={className} />;
  if (code != null && code >= 1 && code <= 3) return <CloudSun className={className} />;
  if (code != null && code >= 45) return <Cloud className={className} />;
  return <Sun className={className} />;
}

function useCabinaClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function useCabinaWeather(lat: number, lng: number) {
  const [tempC, setTempC] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=America/Santiago`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((j) => {
        const t = j?.current?.temperature_2m;
        const c = j?.current?.weather_code;
        const w = j?.current?.wind_speed_10m;
        if (typeof t === 'number') setTempC(Math.round(t));
        if (typeof c === 'number') setCode(c);
        if (typeof w === 'number') setWind(Math.round(w));
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [lat, lng]);
  return { tempC, code, wind };
}

function vehicleLabel(v: Pick<FleetVehicle, 'type' | 'patent' | 'brand'>, idx = 0) {
  return `${vehicleTypeAbbrev(v.type)}-${idx + 1}${v.patent ? ` · ${v.patent}` : ''}`;
}

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

function vehicleTypeVisual(type?: string) {
  const code = vehicleTypeAbbrev(type);
  if (code === 'BF' || code === 'F') return { code, Icon: Trees, tint: 'from-emerald-700/80 to-emerald-950' };
  if (code === 'Q') return { code, Icon: Building2, tint: 'from-sky-700/80 to-slate-950' };
  if (code === 'R' || code === 'RX') return { code, Icon: Wrench, tint: 'from-amber-700/80 to-slate-950' };
  if (code === 'S') return { code, Icon: HeartPulse, tint: 'from-rose-700/80 to-slate-950' };
  if (code === 'Z') return { code, Icon: Droplet, tint: 'from-cyan-700/80 to-slate-950' };
  if (code === 'H') return { code, Icon: ShieldAlert, tint: 'from-orange-700/80 to-slate-950' };
  if (code === 'K' || code === 'J') return { code, Icon: Car, tint: 'from-violet-700/80 to-slate-950' };
  return { code: code || 'B', Icon: Flame, tint: 'from-red-800/80 to-slate-950' };
}

function VehiclePhoto({
  vehicle,
  label,
  className = 'h-36',
  compact = false,
}: {
  vehicle: Pick<FleetVehicle, 'imageUrl' | 'type' | 'patent'>;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const src = publicMediaUrl(vehicle.imageUrl);
  const show = Boolean(src) && !broken;
  const { code, Icon, tint } = vehicleTypeVisual(vehicle.type);
  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {show ? (
        <img
          src={src!}
          alt={label}
          className="h-full w-full object-cover object-center"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${tint} ${compact ? 'gap-0' : 'gap-2'}`}>
          <Icon className={compact ? 'h-5 w-5 text-white' : 'h-12 w-12 text-white/90'} />
          {!compact && <span className="text-lg font-black tracking-widest text-white">{code}</span>}
        </div>
      )}
      {!compact && (
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-black tracking-widest text-emerald-300 backdrop-blur-sm">
          {code}
        </span>
      )}
    </div>
  );
}

function NodotrackThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors ${
        isDark
          ? 'border-emerald-500/25 bg-[#0b1220]/90 text-emerald-200 hover:bg-emerald-500/10'
          : 'border-emerald-200 bg-white/95 text-emerald-800 hover:bg-emerald-50'
      }`}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function CarroIndexShell({
  tone,
  isDark,
  onToggleTheme,
  children,
}: {
  tone: NodotrackTone;
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`nodotrack-root relative flex min-h-[100dvh] flex-col overflow-hidden ${tone.shell}`}>
      <div className={`pointer-events-none absolute -top-24 right-0 h-[480px] w-[480px] rounded-full blur-3xl ${tone.shellGlowA}`} />
      <div className={`pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full blur-3xl ${tone.shellGlowB}`} />
      <NodotrackThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col">{children}</div>
    </div>
  );
}

function CarroBrandMark({ tone }: { tone: NodotrackTone }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/nodotrack-icon.png"
        alt=""
        className={`h-11 w-11 rounded-xl border shadow-sm ${
          tone.mapTheme === 'dark'
            ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
            : 'border-emerald-200'
        }`}
      />
      <div>
        <p className="flex items-baseline gap-0 leading-none">
          <span className={`text-lg font-black tracking-tight ${tone.brandNodo}`}>Nodo</span>
          <span className={`text-lg font-black tracking-tight ${tone.brandTrack}`}>Track</span>
        </p>
        <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.22em] ${tone.brandSub}`}>Cabina</p>
      </div>
    </div>
  );
}

async function getTabletGps() {
  if (!navigator.geolocation) return null;
  return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export default function CarroTabletPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tone = nodotrackTone(isDark);
  const [lockedPreview, setLockedPreview] = useState<SalaLockPreview | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [salaToken, setSalaToken] = useState('');
  const [data, setData] = useState<PublicCentral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicleId, setVehicleId] = useState(params.get('vehiculo') || (slug ? readCarroVehicle(slug) : ''));
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [posting, setPosting] = useState(false);
  const [here, setHere] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hydrants, setHydrants] = useState<NearHydrant[]>([]);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [sheet, setSheet] = useState<'codes' | 'fuel' | 'sop' | 'note' | 'materials' | 'help' | null>(null);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingHits, setPendingHits] = useState(0);
  const [fuelKm, setFuelKm] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelFull, setFuelFull] = useState(false);
  const [fuelSaving, setFuelSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [matChecked, setMatChecked] = useState<Record<string, boolean>>({});
  const [matExtras, setMatExtras] = useState<string[]>([]);
  const [matNew, setMatNew] = useState('');
  const [matReady, setMatReady] = useState(false);
  const [previewVehicleId, setPreviewVehicleId] = useState<string | null>(null);
  const cabinaNow = useCabinaClock();
  const weather = useCabinaWeather(PARRAL_CENTER[0], PARRAL_CENTER[1]);

  const load = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}`, { headers: salaAuthHeaders(slug) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Central no disponible');
      }
      const json = await res.json();
      if (json?.locked) {
        clearSalaToken(slug);
        setSalaToken('');
        setLockedPreview(json as SalaLockPreview);
        setData(null);
        setError(null);
        return;
      }
      setLockedPreview(null);
      setSalaToken(readSalaToken(slug));
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Central no disponible');
      setData(null);
      setLockedPreview(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  const refreshPending = useCallback(() => {
    if (!slug) {
      setPendingHits(0);
      return;
    }
    setPendingHits(listPendingHits(slug).length);
  }, [slug]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', tone.metaThemeColor);
    document.title = 'NodoTrack';
    return () => {
      if (meta) meta.setAttribute('content', prev || '#dc2626');
    };
  }, [tone.metaThemeColor]);

  useEmergencyLiveSocket({
    slug,
    salaToken,
    enabled: Boolean(slug) && !lockedPreview && Boolean(data),
    onEvent: () => { void load(); },
  });

  const emergencies = data?.recentEmergencies ?? [];
  const selectedVehicleEarly = (data?.fleet?.vehicles ?? []).find((v) => v.id === vehicleId) ?? null;
  const activeForAlarm = useMemo(() => {
    const open = emergencies.filter((e) => e.status === 'ACTIVA' && !e.closedAt);
    if (!selectedVehicleEarly) return [] as PublicEmergency[];
    return open.filter((e) =>
      (e.vehicles ?? []).some((v) => v.id === selectedVehicleEarly.id || v.patent === selectedVehicleEarly.patent),
    );
  }, [emergencies, selectedVehicleEarly]);

  usePublicDispatchAlarm(
    activeForAlarm.map((e) => ({
      id: e.id,
      status: e.status,
      emergencyCodeId: e.emergencyCodeId,
      radioMessage: e.radioMessage,
      dispatchedAt: e.dispatchedAt,
    })),
    { enabled: Boolean(selectedVehicleEarly) && !lockedPreview, muted: alarmMuted },
  );

  useEffect(() => {
    void getTabletGps().then(setHere);
    const t = window.setInterval(() => { void getTabletGps().then(setHere); }, 20000);
    return () => window.clearInterval(t);
  }, []);

  // Reportar GPS del carro a central
  useEffect(() => {
    if (!slug || !vehicleId || !here || lockedPreview || !salaToken) return;
    const body = JSON.stringify({
      vehicleId,
      latitude: here.latitude,
      longitude: here.longitude,
      incidentId: activeForAlarm[0]?.id ?? null,
    });
    const send = () => {
      void fetch(`${apiBase}/dispatch/public/${slug}/vehicle-location`, {
        method: 'POST',
        headers: { ...salaAuthHeaders(slug), 'Content-Type': 'application/json' },
        body,
      }).catch(() => undefined);
    };
    send();
    const t = window.setInterval(send, 20000);
    return () => window.clearInterval(t);
  }, [slug, vehicleId, here?.latitude, here?.longitude, lockedPreview, salaToken, activeForAlarm[0]?.id]);

  // Hidrantes cerca del destino o del carro
  useEffect(() => {
    if (!slug || lockedPreview || !salaToken) {
      setHydrants([]);
      return;
    }
    const lat = activeForAlarm[0]
      ? incidentNavigatePoint(activeForAlarm[0])?.lat ?? here?.latitude
      : here?.latitude;
    const lng = activeForAlarm[0]
      ? incidentNavigatePoint(activeForAlarm[0])?.lng ?? here?.longitude
      : here?.longitude;
    if (lat == null || lng == null) return;
    let cancelled = false;
    void fetch(
      `${apiBase}/dispatch/public/${slug}/hydrants-near?lat=${lat}&lng=${lng}&km=3`,
      { headers: salaAuthHeaders(slug) },
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const items = Array.isArray(json?.items) ? json.items : [];
        setHydrants(
          items.filter(
            (h: NearHydrant) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setHydrants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, salaToken, lockedPreview, activeForAlarm[0]?.id, here?.latitude, here?.longitude]);

  const vehicles = data?.fleet?.vehicles ?? [];
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  useEffect(() => {
    if (!slug || !vehicleId) return;
    writeCarroVehicle(slug, vehicleId);
    if (params.get('vehiculo') !== vehicleId) {
      setParams({ vehiculo: vehicleId }, { replace: true });
    }
  }, [slug, vehicleId]);

  useEffect(() => {
    if (!selectedVehicle) {
      setMatReady(false);
      return;
    }
    setMatReady(false);
    const stored = readCarroMaterials(selectedVehicle.id);
    setMatChecked(stored.checked);
    setMatExtras(stored.extras);
    setMatNew('');
    setMatReady(true);
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (!selectedVehicle) return;
    setFuelKm(String(selectedVehicle.kilometers ?? ''));
    setFuelLiters('');
    setFuelFull(false);
  }, [selectedVehicle?.id, selectedVehicle?.kilometers]);

  useEffect(() => {
    if (!selectedVehicle?.id || !matReady) return;
    writeCarroMaterials(selectedVehicle.id, { checked: matChecked, extras: matExtras });
  }, [selectedVehicle?.id, matChecked, matExtras, matReady]);

  const active = useMemo(() => {
    const open = emergencies.filter((e) => e.status === 'ACTIVA' && !e.closedAt);
    if (selectedVehicle) {
      const mine = open.find((e) => (e.vehicles ?? []).some((v) => v.id === selectedVehicle.id || v.patent === selectedVehicle.patent));
      if (mine) return mine;
    }
    return open[0] ?? null;
  }, [emergencies, selectedVehicle]);

  const dest = active ? incidentNavigatePoint(active) : null;

  const loadTimeline = useCallback(async () => {
    if (!slug || !active?.id) {
      setEvents([]);
      return;
    }
    const res = await fetch(`${apiBase}/incident-timeline/public/${slug}/incident/${active.id}`, {
      headers: salaAuthHeaders(slug),
    });
    if (!res.ok) return;
    const json = await res.json();
    setEvents(Array.isArray(json) ? json : []);
  }, [slug, active?.id]);

  useEffect(() => { void loadTimeline(); }, [loadTimeline]);

  const flushOffline = useCallback(async () => {
    if (!slug || !navigator.onLine) return;
    const { sent } = await flushTimelineQueue(apiBase, (s) => salaAuthHeaders(s));
    refreshPending();
    if (sent > 0) {
      toast.success(`${sent} hito${sent === 1 ? '' : 's'} enviados (cola offline)`);
      await loadTimeline();
      await load();
    }
  }, [slug, refreshPending, load, loadTimeline]);

  useEffect(() => {
    refreshPending();
    const onOnline = () => {
      setOnline(true);
      void flushOffline();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (navigator.onLine) void flushOffline();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshPending, flushOffline]);

  const unlockSala = async (pin: string) => {
    if (!slug) return;
    setUnlocking(true);
    setPinError(null);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? 'PIN incorrecto');
      writeSalaToken(slug, body.token);
      setSalaToken(body.token);
      setLoading(true);
      await load();
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'PIN incorrecto');
    } finally {
      setUnlocking(false);
    }
  };

  const pushKind = async (kind: IncidentTimelineKind, noteOverride?: string) => {
    if (!slug || !active) return toast.error('No hay emergencia activa');
    const vehicleTag = selectedVehicle
      ? `${vehicleTypeAbbrev(selectedVehicle.type)} · ${selectedVehicle.patent}`
      : undefined;
    const note = [noteOverride?.trim(), vehicleTag].filter(Boolean).join(' · ') || undefined;

    if (kind === 'COMENTARIO' && (!noteOverride || noteOverride.trim().length < 3)) {
      return toast.error('Escribe al menos 3 caracteres');
    }

    if (!navigator.onLine) {
      enqueueTimelineHit({ slug, incidentId: active.id, kind, note });
      refreshPending();
      toast.success('Guardado offline — se enviará al recuperar red');
      return;
    }

    setPosting(true);
    try {
      const res = await fetch(`${apiBase}/incident-timeline/public/${slug}`, {
        method: 'POST',
        headers: { ...salaAuthHeaders(slug), 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: active.id, kind, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? 'No se pudo registrar');
      toast.success('Registrado');
      await loadTimeline();
      await load();
    } catch (e: unknown) {
      enqueueTimelineHit({ slug, incidentId: active.id, kind, note });
      refreshPending();
      toast.error(
        e instanceof Error
          ? `${e.message} — quedó en cola offline`
          : 'Sin red — quedó en cola offline',
      );
    } finally {
      setPosting(false);
    }
  };

  const saveFuel = async () => {
    if (!slug || !selectedVehicle) return;
    const odometerKm = Number(fuelKm);
    const liters = fuelLiters.trim() ? Number(fuelLiters) : undefined;
    if (!Number.isFinite(odometerKm) || odometerKm < 0) {
      return toast.error('Odómetro inválido');
    }
    if (liters != null && (!Number.isFinite(liters) || liters <= 0)) {
      return toast.error('Litros inválidos');
    }
    setFuelSaving(true);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/fleet-fuel`, {
        method: 'POST',
        headers: { ...salaAuthHeaders(slug), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          odometerKm,
          fuelLiters: liters,
          fullTank: fuelFull,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? 'No se pudo guardar');
      toast.success('Combustible / odómetro registrado');
      setSheet(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setFuelSaving(false);
    }
  };

  const navigateMaps = () => {
    if (!dest) return toast.error('Esta emergencia no tiene GPS');
    openGoogleMapsDirections(dest.lat, dest.lng, here ?? undefined);
  };

  const markers: OsmMarker[] = [];
  if (dest) markers.push({ id: 'destino', lat: dest.lat, lng: dest.lng, label: active?.code, tone: 'active', active: true });
  if (here) markers.push({ id: 'carro', lat: here.latitude, lng: here.longitude, label: selectedVehicle?.patent ?? 'Carro', tone: 'truck' });
  for (const h of hydrants) {
    markers.push({
      id: `hyd-${h.id}`,
      lat: h.latitude,
      lng: h.longitude,
      label: h.code,
      tone: 'hydrant',
    });
  }

  if (!slug) {
    return (
      <CarroIndexShell tone={tone} isDark={isDark} onToggleTheme={toggleTheme}>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center p-6 sm:p-8">
          <CarroBrandMark tone={tone} />
          <h1 className={`mt-8 text-3xl font-black tracking-tight sm:text-4xl ${tone.ink}`}>Elige compañía</h1>
          <p className={`mt-2 max-w-xl text-sm ${tone.soft}`}>
            Esta tablet queda en el carro. Primero la compañía, después el PIN de sala de máquinas.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANIAS360.map((cia) => (
              <Link
                key={cia.slug}
                to={`/carro/${cia.slug}`}
                className={`rounded-2xl border px-4 py-5 text-left shadow-sm transition-colors ${tone.border} ${tone.card} ${tone.cardHover}`}
              >
                <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>{cia.short}</p>
                <p className={`mt-1 text-2xl font-black ${tone.ink}`}>{cia.number}ª</p>
                <p className={`text-sm ${tone.soft}`}>{cia.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </CarroIndexShell>
    );
  }

  if (loading && !lockedPreview) {
    return (
      <CarroIndexShell tone={tone} isDark={isDark} onToggleTheme={toggleTheme}>
        <div className={`flex flex-1 items-center justify-center ${tone.loader}`}>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abriendo sala de máquinas…
        </div>
      </CarroIndexShell>
    );
  }

  if (lockedPreview) {
    return (
      <>
        <NodotrackThemeToggle isDark={isDark} onToggle={toggleTheme} />
        <SalaPinGate
          variant="carro"
          carroDark={isDark}
          preview={lockedPreview}
          unlocking={unlocking}
          error={pinError}
          onSubmit={(pin) => { void unlockSala(pin); }}
          onBack={() => navigate('/carro')}
        />
      </>
    );
  }

  if (error || !data) {
    return (
      <CarroIndexShell tone={tone} isDark={isDark} onToggleTheme={toggleTheme}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className={`font-bold ${tone.ink}`}>Sala no disponible</p>
          <p className={`text-sm ${tone.muted}`}>{error}</p>
          <Link to="/carro" className={`text-sm font-semibold ${tone.accent}`}>
            Elegir otra compañía
          </Link>
        </div>
      </CarroIndexShell>
    );
  }

  if (!selectedVehicle) {
    const preview =
      vehicles.find((v) => v.id === previewVehicleId) ??
      vehicles[0] ??
      null;
    const history = (data.recentEmergencies ?? []).slice(0, 8);
    const activeCount =
      data.emergencyStats?.active ??
      history.filter((e) => e.status === 'ACTIVA' && !e.closedAt).length;
    const recentCrew = (() => {
      const map = new Map<string, { name: string; count: number; lastStatus?: string | null }>();
      for (const e of history) {
        for (const m of e.crew ?? []) {
          const name = m.name || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
          if (!name) continue;
          const prev = map.get(m.id) ?? { name, count: 0, lastStatus: m.status };
          prev.count += 1;
          prev.lastStatus = m.status ?? prev.lastStatus;
          map.set(m.id, prev);
        }
      }
      return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
    })();
    const clockTime = cabinaNow.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const clockDate = cabinaNow.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return (
      <CarroIndexShell tone={tone} isDark={isDark} onToggleTheme={toggleTheme}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CarroBrandMark tone={tone} />
              <p className={`mt-6 text-[10px] font-black uppercase tracking-[0.18em] ${tone.accent}`}>
                {data.number}ª {data.name}
                {data.city ? ` · ${data.city}` : ''}
              </p>
              <h1 className={`mt-1 text-3xl font-black tracking-tight sm:text-4xl ${tone.ink}`}>
                ¿Qué carro es esta tablet?
              </h1>
              <p className={`mt-1 max-w-xl text-sm ${tone.muted}`}>
                Queda guardado en este equipo. Revisá clima, historial y ficha antes de confirmar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={`min-w-[9.5rem] rounded-2xl border px-4 py-3 shadow-sm ${tone.border} ${tone.card}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>Hora</p>
                <p className={`mt-1 font-mono text-2xl font-black tabular-nums ${tone.ink}`}>{clockTime}</p>
                <p className={`mt-0.5 text-[11px] capitalize ${tone.muted}`}>{clockDate}</p>
              </div>
              <div className={`min-w-[9.5rem] rounded-2xl border px-4 py-3 shadow-sm ${tone.border} ${tone.card}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>Clima</p>
                <div className="mt-1 flex items-center gap-2">
                  <WeatherIcon code={weather.code} className={`h-6 w-6 ${tone.accent}`} />
                  <p className={`text-2xl font-black tabular-nums ${tone.ink}`}>
                    {weather.tempC != null ? `${weather.tempC}°` : '—'}
                  </p>
                </div>
                <p className={`mt-0.5 text-[11px] ${tone.muted}`}>
                  {weatherLabel(weather.code)}
                  {weather.wind != null ? ` · viento ${weather.wind} km/h` : ''}
                </p>
              </div>
              <div className={`min-w-[9.5rem] rounded-2xl border px-4 py-3 shadow-sm ${tone.border} ${tone.card}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>Guardia</p>
                <p className={`mt-1 text-2xl font-black tabular-nums ${tone.ink}`}>
                  {activeCount}
                  <span className={`ml-1 text-sm font-semibold ${tone.muted}`}>activas</span>
                </p>
                <p className={`mt-0.5 text-[11px] ${tone.muted}`}>
                  Maq. {data.maquinistas?.stats?.available ?? 0}/{data.maquinistas?.stats?.total ?? 0}
                  {' · '}
                  Flota {data.fleet?.stats?.operativo ?? vehicles.length}/{data.fleet?.stats?.total ?? vehicles.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-3">
              <p className={`text-xs font-semibold ${tone.soft}`}>Elegí el material mayor de esta tablet</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicles.map((v, i) => {
                  const label = vehicleLabel(v, i);
                  const selected = preview?.id === v.id;
                  const mats = carroMaterialsForType(v.type);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPreviewVehicleId(v.id)}
                      className={`overflow-hidden rounded-2xl border text-left transition-all ${
                        selected
                          ? `ring-2 ring-emerald-500 ${tone.border} ${tone.card}`
                          : `${tone.border} ${tone.card} ${tone.cardHover}`
                      }`}
                    >
                      <VehiclePhoto vehicle={v} label={label} className="h-36" />
                      <div className="space-y-1.5 px-3 py-3">
                        <p className={`text-lg font-black ${tone.ink}`}>{label}</p>
                        <p className={`text-xs ${tone.accentSoft}`}>{vehicleTypeShortLabel(v.type)}</p>
                        <p className={`text-[11px] ${tone.muted}`}>
                          {v.brand} {v.model}
                          {v.year ? ` · ${v.year}` : ''} · {v.statusLabel}
                        </p>
                        <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-semibold ${tone.soft}`}>
                          {v.kilometers != null && (
                            <span className="inline-flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              {v.kilometers.toLocaleString('es-CL')} km
                            </span>
                          )}
                          {v.fuelLevelPercent != null && (
                            <span className="inline-flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {v.fuelLevelPercent}%
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {mats.length} ítems tip.
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {vehicles.length === 0 && (
                <p className={`text-sm ${tone.muted}`}>Esta compañía no tiene carros cargados.</p>
              )}
            </section>

            <aside className="space-y-3">
              {preview ? (
                <div className={`overflow-hidden rounded-2xl border shadow-sm ${tone.border} ${tone.card}`}>
                  <VehiclePhoto
                    vehicle={preview}
                    label={vehicleLabel(preview, Math.max(0, vehicles.findIndex((v) => v.id === preview.id)))}
                    className="h-44"
                  />
                  <div className="space-y-3 p-4">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>
                        Ficha del carro
                      </p>
                      <h2 className={`text-xl font-black ${tone.ink}`}>
                        {vehicleLabel(preview, Math.max(0, vehicles.findIndex((v) => v.id === preview.id)))}
                      </h2>
                      <p className={`text-sm ${tone.soft}`}>{vehicleTypeShortLabel(preview.type)}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className={`rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Marca / modelo</dt>
                        <dd className={`font-bold ${tone.ink}`}>
                          {preview.brand} {preview.model}
                        </dd>
                      </div>
                      <div className={`rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Año</dt>
                        <dd className={`font-bold ${tone.ink}`}>{preview.year ?? '—'}</dd>
                      </div>
                      <div className={`rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Odómetro</dt>
                        <dd className={`font-bold ${tone.ink}`}>
                          {preview.kilometers != null
                            ? `${preview.kilometers.toLocaleString('es-CL')} km`
                            : '—'}
                        </dd>
                      </div>
                      <div className={`rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Combustible</dt>
                        <dd className={`font-bold ${tone.ink}`}>
                          {preview.fuelLevelPercent != null ? `${preview.fuelLevelPercent}%` : '—'}
                          {preview.lastFuelLiters != null ? ` · ${preview.lastFuelLiters} L` : ''}
                        </dd>
                      </div>
                      <div className={`col-span-2 rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Estado</dt>
                        <dd className={`font-bold ${tone.ink}`}>{preview.statusLabel}</dd>
                      </div>
                      <div className={`col-span-2 rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <dt className={tone.muted}>Maquinista asignado</dt>
                        <dd className={`font-bold ${tone.ink}`}>
                          {preview.principalMaquinista
                            ? `${preview.principalMaquinista.firstName} ${preview.principalMaquinista.lastName}`
                            : 'Sin asignar'}
                        </dd>
                      </div>
                    </dl>
                    <div>
                      <p className={`mb-1.5 text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>
                        Material típico
                      </p>
                      <ul className={`flex flex-wrap gap-1.5`}>
                        {carroMaterialsForType(preview.type).slice(0, 8).map((m) => (
                          <li
                            key={m.id}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${tone.border} ${tone.soft}`}
                          >
                            {m.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVehicleId(preview.id)}
                      className="keep-on-color flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-black text-emerald-950 hover:bg-emerald-400"
                    >
                      <Truck className="h-5 w-5" /> Usar este carro en la tablet
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border p-6 text-center ${tone.border} ${tone.card}`}>
                  <Truck className={`mx-auto h-8 w-8 ${tone.accent}`} />
                  <p className={`mt-2 font-bold ${tone.ink}`}>Sin carros</p>
                  <p className={`text-sm ${tone.muted}`}>No hay flota cargada para esta compañía.</p>
                </div>
              )}

              <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
                <p className={`mb-2 flex items-center gap-2 text-xs font-semibold ${tone.ink}`}>
                  <History className={`h-3.5 w-3.5 ${tone.accent}`} /> Historial de alarmas
                </p>
                {history.length === 0 ? (
                  <p className={`text-sm ${tone.muted}`}>Sin emergencias recientes.</p>
                ) : (
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {history.map((e) => (
                      <li key={e.id} className={`rounded-xl border px-2.5 py-2 ${tone.border}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold ${tone.ink}`}>
                            {e.code} · {e.type}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-black uppercase ${
                              e.status === 'ACTIVA' ? 'text-red-500' : tone.muted
                            }`}
                          >
                            {e.status}
                          </span>
                        </div>
                        <p className={`mt-0.5 truncate text-[11px] ${tone.soft}`}>{e.address}</p>
                        <p className={`mt-0.5 text-[10px] ${tone.muted}`}>
                          {formatWhenDay(e.dispatchedAt)}
                          {e.vehicles?.length
                            ? ` · ${(e.vehicles ?? []).map((v) => v.patent).join(', ')}`
                            : ''}
                        </p>
                        {(e.crew?.length ?? 0) > 0 && (
                          <p className={`mt-1 text-[10px] ${tone.muted}`}>
                            Participaron:{' '}
                            {(e.crew ?? [])
                              .slice(0, 4)
                              .map((m) => m.name || m.firstName)
                              .filter(Boolean)
                              .join(', ')}
                            {(e.crew?.length ?? 0) > 4 ? '…' : ''}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
                <p className={`mb-2 flex items-center gap-2 text-xs font-semibold ${tone.ink}`}>
                  <Users className={`h-3.5 w-3.5 ${tone.accent}`} /> Quién participó (reciente)
                </p>
                {recentCrew.length === 0 ? (
                  <p className={`text-sm ${tone.muted}`}>Aún no hay respuestas registradas.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {recentCrew.map((m) => (
                      <li key={m.name} className={`flex items-center justify-between gap-2 text-sm ${tone.soft}`}>
                        <span className={`truncate font-semibold ${tone.ink}`}>{m.name}</span>
                        <span className={`shrink-0 text-[10px] font-bold ${tone.muted}`}>
                          {m.count} llamado{m.count === 1 ? '' : 's'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>

          <button type="button" onClick={() => navigate('/carro')} className={`text-sm font-semibold ${tone.accent}`}>
            Elegir otra compañía
          </button>
        </div>
      </CarroIndexShell>
    );
  }

  const kinds = new Set(events.map((e) => e.kind));
  const vehicleIdx = Math.max(0, vehicles.findIndex((v) => v.id === selectedVehicle.id));
  const crew = active?.crew?.length ? active.crew : [];
  const principalMaq =
    data?.maquinistas?.principal ??
    data?.maquinistas?.members?.find((m) => m.maquinistaPrincipal) ??
    null;
  const sop = carroSopForType(selectedVehicle.type);
  const materialItems = carroMaterialsForType(selectedVehicle.type);
  const matSummary = materialChecklistSummary(materialItems, matChecked, matExtras);
  const timelineSorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  const submitNote = async () => {
    const text = noteText.trim();
    if (text.length < 3) return toast.error('Escribe al menos 3 caracteres');
    await pushKind('COMENTARIO', text);
    setNoteText('');
    setSheet(null);
  };

  const markAllMaterials = (on: boolean) => {
    const next: Record<string, boolean> = {};
    for (const item of materialItems) next[item.id] = on;
    for (const extra of matExtras) next[`extra:${extra}`] = on;
    setMatChecked(next);
  };

  const registerMaterials = async () => {
    await pushKind('COMENTARIO', matSummary.line);
    setSheet(null);
  };

  const addExtraMaterial = () => {
    const label = matNew.trim();
    if (!label) return;
    if (matExtras.includes(label) || materialItems.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
      return toast.error('Ya está en la lista');
    }
    setMatExtras((prev) => [...prev, label]);
    setMatChecked((prev) => ({ ...prev, [`extra:${label}`]: true }));
    setMatNew('');
  };

  const renderActionGrid = (
    actions: Array<{ kind: IncidentTimelineKind; label: string; hint: string; icon: typeof Truck }>,
    opts?: { danger?: boolean },
  ) => (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const used = kinds.has(action.kind);
        return (
          <button
            key={action.kind}
            type="button"
            disabled={posting}
            onClick={() => void pushKind(action.kind)}
            className={`rounded-xl border px-2.5 py-2.5 text-left ${
              opts?.danger
                ? used
                  ? 'border-red-500/50 bg-red-600/20'
                  : 'border-red-500/40 bg-red-600/10 hover:bg-red-600/20'
                : used
                  ? tone.actionUsed
                  : tone.actionIdle
            }`}
          >
            <Icon className={`mb-1 h-4 w-4 ${opts?.danger ? 'text-red-500' : tone.accent}`} />
            <p className={`text-xs font-bold ${tone.ink}`}>{action.label}</p>
            <p className={`text-[10px] ${tone.muted}`}>{action.hint}</p>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`nodotrack-root flex h-[100dvh] min-h-0 flex-col ${tone.shell}`}>
      <header className={`flex shrink-0 items-center gap-3 border-b px-4 py-2.5 ${tone.header}`}>
        <div className={`h-11 w-16 overflow-hidden rounded-lg border ${tone.border} ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
          <VehiclePhoto compact vehicle={selectedVehicle} label={vehicleLabel(selectedVehicle, vehicleIdx)} className="h-11" />
        </div>
        <div className="min-w-0">
          <p className={`truncate text-sm font-black ${tone.ink}`}>{vehicleLabel(selectedVehicle, vehicleIdx)}</p>
          <p className={`text-[10px] uppercase tracking-widest ${tone.accent}`}>
            {data.number}ª {data.name}
            {selectedVehicle.kilometers != null ? ` · ${selectedVehicle.kilometers.toLocaleString('es-CL')} km` : ''}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tone.border} ${
              online ? tone.accent : 'text-amber-500'
            }`}
            title={online ? 'En línea' : 'Sin red — cola offline activa'}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {online ? 'Online' : 'Offline'}
            {pendingHits > 0 ? ` · ${pendingHits}` : ''}
          </span>
          <button
            type="button"
            onClick={() => setSheet('codes')}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title="Códigos 10-X"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSheet('fuel')}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title="Combustible / odómetro"
          >
            <Fuel className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSheet('sop')}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title="SOP del material"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAlarmMuted((m) => !m)}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title={alarmMuted ? 'Activar alarma' : 'Silenciar alarma'}
          >
            {alarmMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title={isDark ? 'Tema claro' : 'Tema oscuro'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              clearCarroVehicle(slug);
              setVehicleId('');
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
          >
            Cambiar carro
          </button>
          <button
            type="button"
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className={`rounded-lg border p-2 ${tone.border} ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
            title="Pantalla completa"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        className={`flex shrink-0 gap-2 overflow-x-auto border-b px-3 py-2 ${tone.header}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {[
          {
            id: 'en-camino',
            label: 'En camino',
            Icon: Truck,
            onClick: () => void pushKind('EN_CAMINO'),
            disabled: !active || posting,
            primary: false,
          },
          {
            id: 'en-lugar',
            label: 'En el lugar',
            Icon: MapPin,
            onClick: () => void pushKind('EN_LUGAR'),
            disabled: !active || posting,
            primary: false,
          },
          {
            id: 'nav',
            label: 'Navegar',
            Icon: Navigation,
            onClick: navigateMaps,
            disabled: !dest,
            primary: true,
          },
          {
            id: 'note',
            label: 'Anotar',
            Icon: PenLine,
            onClick: () => setSheet('note'),
            disabled: !active,
            primary: false,
          },
          {
            id: 'mat',
            label: `Material ${matSummary.ok}/${matSummary.total}`,
            Icon: Package,
            onClick: () => setSheet('materials'),
            disabled: false,
            primary: false,
          },
          {
            id: 'codes',
            label: '10-X',
            Icon: HelpCircle,
            onClick: () => setSheet('codes'),
            disabled: false,
            primary: false,
          },
          {
            id: 'fuel',
            label: 'Combustible',
            Icon: Fuel,
            onClick: () => setSheet('fuel'),
            disabled: false,
            primary: false,
          },
          {
            id: 'sop',
            label: 'SOP',
            Icon: BookOpen,
            onClick: () => setSheet('sop'),
            disabled: false,
            primary: false,
          },
          {
            id: 'help',
            label: 'Ayuda',
            Icon: GraduationCap,
            onClick: () => setSheet('help'),
            disabled: false,
            primary: false,
          },
          {
            id: 'samu',
            label: 'SAMU',
            Icon: HeartPulse,
            onClick: () => void pushKind('SAMU'),
            disabled: !active || posting,
            primary: false,
          },
          {
            id: 'carab',
            label: 'Carabineros',
            Icon: Shield,
            onClick: () => void pushKind('CARABINEROS'),
            disabled: !active || posting,
            primary: false,
          },
          {
            id: '2a',
            label: '2ª alarma',
            Icon: Siren,
            onClick: () => void pushKind('SEGUNDA_ALARMA'),
            disabled: !active || posting,
            primary: false,
          },
        ].map((btn) => {
          const Icon = btn.Icon;
          return (
            <button
              key={btn.id}
              type="button"
              disabled={btn.disabled}
              onClick={btn.onClick}
              className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 min-w-[4.5rem] disabled:opacity-40 ${
                btn.primary
                  ? 'keep-on-color border-emerald-500 bg-emerald-500 text-emerald-950'
                  : `${tone.border} ${tone.card} ${isDark ? 'text-emerald-100' : 'text-emerald-900'}`
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold leading-tight">{btn.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[1.4fr_400px]">
        <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm ${tone.border} ${tone.card}`}>
          <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
            <p className={`text-xs font-semibold ${tone.soft}`}>
              Mapa · {hydrants.length ? `${hydrants.length} hidrantes` : 'sin hidrantes cerca'}
            </p>
            {dest ? (
              <button
                type="button"
                onClick={navigateMaps}
                className="keep-on-color inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-emerald-950 shadow-sm hover:bg-emerald-400"
              >
                <Navigation className="h-4 w-4" /> Navegar
              </button>
            ) : (
              <span className={`text-[11px] ${tone.muted}`}>Sin GPS de destino</span>
            )}
          </div>
          <div className="nodotrack-map-host min-h-0 flex-1">
            <PublicOsmMap
              center={dest ? [dest.lat, dest.lng] : here ? [here.latitude, here.longitude] : PARRAL_CENTER}
              focus={dest ? [dest.lat, dest.lng] : null}
              markers={markers}
              zoom={dest ? 15 : 13}
              theme={tone.mapTheme}
              className="h-full min-h-[280px] w-full"
            />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
            {!active ? (
              <div className="py-6 text-center">
                <Wrench className={`mx-auto h-6 w-6 ${tone.accent}`} />
                <p className={`mt-2 font-bold ${tone.ink}`}>En cuartel</p>
                <p className={`text-sm ${tone.muted}`}>Sin emergencia activa para este carro.</p>
                {selectedVehicle.fuelLevelPercent != null && (
                  <p className={`mt-3 text-xs ${tone.soft}`}>
                    Combustible est. {selectedVehicle.fuelLevelPercent}%
                    {selectedVehicle.kilometers != null
                      ? ` · ${selectedVehicle.kilometers.toLocaleString('es-CL')} km`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>
                      {active.code} · {active.status}
                    </p>
                    <h2 className={`text-xl font-black ${tone.ink}`}>{active.type}</h2>
                  </div>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${tone.border} ${tone.soft}`}>
                    {formatPinStatus(active)}
                  </span>
                </div>
                <p className={`mt-1 flex items-center gap-1 text-sm ${tone.soft}`}>
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${tone.accent}`} /> {active.address}
                </p>
                {active.radioMessage ? (
                  <div className={`mt-2 rounded-xl border px-2.5 py-2 ${tone.border} ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/80'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>
                      Mensaje radial
                    </p>
                    <p className={`mt-0.5 text-xs leading-relaxed ${tone.ink}`}>
                      <Siren className="mr-1 inline h-3.5 w-3.5" />
                      {active.radioMessage}
                    </p>
                  </div>
                ) : null}
                {active.description ? (
                  <p className={`mt-2 text-xs leading-relaxed ${tone.muted}`}>
                    <span className={`font-semibold ${tone.soft}`}>Detalle: </span>
                    {active.description}
                  </p>
                ) : null}
                <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] ${tone.muted}`}>
                  <span>Despacho {formatWhenShort(active.dispatchedAt)}</span>
                  {active.alarmBy ? <span>Alarma: {active.alarmBy}</span> : null}
                  {active.locationPinAt ? (
                    <span>Pin {formatWhenShort(active.locationPinAt)}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!dest}
                  onClick={navigateMaps}
                  className="keep-on-color mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  <Navigation className="h-6 w-6" /> Navegar con Google Maps
                </button>
              </>
            )}
          </div>

          {active && (
            <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
              <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Bitácora del llamado
              </p>
              {timelineSorted.length === 0 ? (
                <p className={`text-sm ${tone.muted}`}>Aún no hay hitos registrados.</p>
              ) : (
                <ol className="relative max-h-48 space-y-0 overflow-y-auto border-l pl-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                  {timelineSorted.map((ev) => (
                    <li key={ev.id} className="relative pb-3 last:pb-0">
                      <span
                        className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 ${
                          isDark ? 'border-[#0b1220] bg-emerald-400' : 'border-white bg-emerald-600'
                        }`}
                      />
                      <p className={`text-[10px] font-bold tabular-nums ${tone.muted}`}>
                        {formatWhenShort(ev.occurredAt)}
                      </p>
                      <p className={`text-sm font-semibold ${tone.ink}`}>{ev.label || ev.kind}</p>
                      {ev.note ? <p className={`text-[11px] ${tone.muted}`}>{ev.note}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
              {pendingHits > 0 && (
                <p className={`mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-500`}>
                  <CloudOff className="h-3.5 w-3.5" />
                  {pendingHits} hito{pendingHits === 1 ? '' : 's'} en cola offline
                </p>
              )}
              <button
                type="button"
                disabled={posting}
                onClick={() => setSheet('note')}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold ${tone.border} ${tone.actionIdle}`}
              >
                <PenLine className="h-3.5 w-3.5" /> Anotar en bitácora
              </button>
            </div>
          )}

          <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className={`flex items-center gap-2 text-xs font-semibold ${tone.ink}`}>
                <Package className={`h-3.5 w-3.5 ${tone.accent}`} /> Material del carro
              </p>
              <button
                type="button"
                onClick={() => setSheet('materials')}
                className={`text-[11px] font-bold ${tone.accent}`}
              >
                Revisar
              </button>
            </div>
            <p className={`text-sm font-bold ${tone.ink}`}>
              {matSummary.ok}/{matSummary.total} listos
            </p>
            <p className={`mt-0.5 text-[11px] ${tone.muted}`}>
              {matSummary.missing.length === 0
                ? 'Todo marcado — podés registrar en bitácora.'
                : `Falta: ${matSummary.missing.slice(0, 3).join(', ')}${matSummary.missing.length > 3 ? '…' : ''}`}
            </p>
            {active && (
              <button
                type="button"
                disabled={posting}
                onClick={() => void registerMaterials()}
                className={`mt-2 w-full rounded-xl border py-2 text-xs font-bold ${tone.border} ${tone.actionIdle}`}
              >
                <ClipboardList className="mr-1 inline h-3.5 w-3.5" />
                Registrar checklist en bitácora
              </button>
            )}
          </div>

          {active && (
            <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
              <p className={`mb-2 flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Users className="h-3.5 w-3.5 text-red-500" /> Quién va
              </p>
              {principalMaq ? (
                <p className={`mb-2 text-[11px] ${tone.soft}`}>
                  Maquinista a cargo:{' '}
                  <span className={`font-bold ${tone.ink}`}>
                    {principalMaq.firstName} {principalMaq.lastName}
                  </span>
                </p>
              ) : (
                <p className={`mb-2 text-[11px] ${tone.muted}`}>Sin maquinista a cargo de guardia</p>
              )}
              {crew.length === 0 ? (
                <p className={`text-sm ${tone.muted}`}>Aún nadie marcó Voy / En el lugar.</p>
              ) : (
                <ul className="max-h-36 space-y-1.5 overflow-y-auto">
                  {crew.map((m) => (
                    <li key={m.id} className={`flex items-center justify-between gap-2 text-sm ${tone.soft}`}>
                      <span className={`truncate font-semibold ${tone.ink}`}>
                        {m.operativeNumber != null ? `N° ${m.operativeNumber} · ` : ''}
                        {m.name || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()}
                        {m.isMaquinista ? (
                          <span className={`ml-1 text-[10px] font-bold ${tone.accent}`}>MAQ</span>
                        ) : null}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold uppercase ${tone.muted}`}>
                        {crewStatusLabel(m.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {active && (
            <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
              <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Apoyos rápidos
              </p>
              {renderActionGrid(CARRO_SUPPORT)}
            </div>
          )}

          {active && (
            <div className={`rounded-2xl border-2 border-red-500/40 bg-red-600/10 p-3 shadow-sm`}>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-red-500">Crítico</p>
              {renderActionGrid(CARRO_CRITICAL, { danger: true })}
            </div>
          )}

          {active && (
            <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
              <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Operación
              </p>
              {renderActionGrid(CARRO_OPS)}
            </div>
          )}

          {active && (
            <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
              <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Cierre / regreso
              </p>
              {renderActionGrid(CARRO_RETURN)}
            </div>
          )}

          <div className={`rounded-2xl border p-3 shadow-sm ${tone.border} ${tone.card}`}>
            <p className={`mb-1 flex items-center gap-2 text-xs font-semibold ${tone.ink}`}>
              <BookOpen className={`h-3.5 w-3.5 ${tone.accent}`} /> {sop.title}
            </p>
            <ul className={`space-y-1 text-[11px] leading-snug ${tone.muted}`}>
              {sop.steps.map((step) => (
                <li key={step}>· {step}</li>
              ))}
            </ul>
          </div>

          {active && salaToken ? (
            <RadioPttPanel
              variant="bar"
              incidentId={active.id}
              incidentLabel={`${active.code} · ${active.type}`}
              enabled
              canTalk
              isDark={isDark}
              showListenLog
              salaToken={salaToken}
              salaSlug={slug}
            />
          ) : active && token ? (
            <RadioPttPanel
              variant="bar"
              incidentId={active.id}
              incidentLabel={`${active.code} · ${active.type}`}
              enabled
              canTalk
              isDark={isDark}
              showListenLog
            />
          ) : (
            <div className={`rounded-2xl border p-3 text-sm shadow-sm ${tone.border} ${tone.card} ${tone.muted}`}>
              <p className={`flex items-center gap-2 font-semibold ${tone.ink}`}>
                <Radio className={`h-4 w-4 ${tone.accent}`} /> Radio
              </p>
              <p className="mt-1 text-[12px]">
                Desbloqueá la sala con PIN para hablar por radio desde la cabina.
              </p>
            </div>
          )}
        </aside>
      </div>

      {sheet &&
        createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheet(null);
          }}
        >
          <div
            className={`relative z-[10001] max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border p-4 shadow-2xl ${tone.border} ${tone.card}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={`text-sm font-black ${tone.ink}`}>
                {sheet === 'codes' && 'Códigos 10-X'}
                {sheet === 'fuel' && 'Combustible / odómetro'}
                {sheet === 'sop' && sop.title}
                {sheet === 'note' && 'Anotar en bitácora'}
                {sheet === 'materials' && 'Material del carro'}
                {sheet === 'help' && 'Ayuda · cabina'}
              </p>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className={`rounded-lg border p-1.5 ${tone.border} ${tone.soft}`}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sheet === 'note' && (
              <div className="space-y-3">
                <p className={`text-xs ${tone.muted}`}>
                  Queda en la bitácora del llamado (visible en central). Ejemplo: “Llevamos material completo”, “Falta ERA”, etc.
                </p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Escribí la anotación…"
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${tone.border} ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                />
                <div className="flex flex-wrap gap-2">
                  {['Material completo', 'Falta material', 'Dotación completa', 'Solicito apoyo'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setNoteText(quick)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${tone.border} ${tone.soft}`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={posting || !active}
                  onClick={() => void submitNote()}
                  className="keep-on-color flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Guardar anotación
                </button>
              </div>
            )}

            {sheet === 'materials' && (
              <div className="space-y-3">
                <p className={`text-xs ${tone.muted}`}>
                  Checklist de salida / llegada. Se guarda en esta tablet y podés mandarlo a la bitácora del llamado.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => markAllMaterials(true)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold ${tone.border} ${tone.actionIdle}`}
                  >
                    Marcar todo
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllMaterials(false)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold ${tone.border} ${tone.soft}`}
                  >
                    Limpiar
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {materialItems.map((item) => (
                    <li key={item.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${tone.border} ${
                          matChecked[item.id] ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(matChecked[item.id])}
                          onChange={(e) =>
                            setMatChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                          className="h-5 w-5 rounded"
                        />
                        <span className={`text-sm font-semibold ${tone.ink}`}>{item.label}</span>
                      </label>
                    </li>
                  ))}
                  {matExtras.map((extra) => {
                    const key = `extra:${extra}`;
                    return (
                      <li key={key}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${tone.border} ${
                            matChecked[key] ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(matChecked[key])}
                            onChange={(e) =>
                              setMatChecked((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                            className="h-5 w-5 rounded"
                          />
                          <span className={`flex-1 text-sm font-semibold ${tone.ink}`}>{extra}</span>
                          <button
                            type="button"
                            className={`text-[10px] font-bold ${tone.muted}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setMatExtras((prev) => prev.filter((x) => x !== extra));
                              setMatChecked((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }}
                          >
                            Quitar
                          </button>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={matNew}
                    onChange={(e) => setMatNew(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExtraMaterial();
                      }
                    }}
                    placeholder="Agregar ítem…"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm ${tone.border} ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                  />
                  <button
                    type="button"
                    onClick={addExtraMaterial}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${tone.border} ${tone.accent}`}
                  >
                    +
                  </button>
                </div>
                <p className={`text-[11px] font-semibold ${tone.soft}`}>{matSummary.line}</p>
                <button
                  type="button"
                  disabled={posting || !active}
                  onClick={() => void registerMaterials()}
                  className="keep-on-color flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  {active ? 'Registrar en bitácora' : 'Abrí un llamado para registrar'}
                </button>
              </div>
            )}

            {sheet === 'codes' && (
              <ul className="space-y-2">
                {EMERGENCY_MAIN_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <li key={t.id} className={`rounded-xl border px-3 py-2 ${tone.border}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${tone.accent}`} />
                        <span className={`text-sm font-black tabular-nums ${tone.ink}`}>{t.code}</span>
                        <span className={`text-sm ${tone.soft}`}>{t.label}</span>
                      </div>
                      {t.subdivisions?.length ? (
                        <ul className={`mt-1.5 space-y-0.5 pl-6 text-[11px] ${tone.muted}`}>
                          {t.subdivisions.map((s) => (
                            <li key={s.id}>
                              <span className="font-semibold">{s.code}</span> — {s.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {sheet === 'fuel' && (
              <div className="space-y-3">
                <p className={`text-xs ${tone.muted}`}>
                  Registro en flota de la compañía desde esta tablet (PIN de sala).
                </p>
                <label className="block">
                  <span className={`text-[11px] font-semibold ${tone.soft}`}>Odómetro (km)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={fuelKm}
                    onChange={(e) => setFuelKm(e.target.value)}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${tone.border} ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                  />
                </label>
                <label className="block">
                  <span className={`text-[11px] font-semibold ${tone.soft}`}>Litros cargados (opcional)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${tone.border} ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                  />
                </label>
                <label className={`flex items-center gap-2 text-sm ${tone.soft}`}>
                  <input
                    type="checkbox"
                    checked={fuelFull}
                    onChange={(e) => setFuelFull(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Estanque lleno
                </label>
                {selectedVehicle.fuelLevelPercent != null && (
                  <p className={`text-[11px] ${tone.muted}`}>
                    Nivel estimado actual: {selectedVehicle.fuelLevelPercent}%
                    {selectedVehicle.lastFuelLiters != null
                      ? ` · última carga ${selectedVehicle.lastFuelLiters} L`
                      : ''}
                  </p>
                )}
                <button
                  type="button"
                  disabled={fuelSaving}
                  onClick={() => void saveFuel()}
                  className="keep-on-color flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {fuelSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fuel className="h-4 w-4" />}
                  Guardar en flota
                </button>
              </div>
            )}

            {sheet === 'sop' && (
              <ul className={`space-y-2 text-sm leading-relaxed ${tone.soft}`}>
                {sop.steps.map((step, i) => (
                  <li key={step} className={`rounded-xl border px-3 py-2 ${tone.border}`}>
                    <span className={`mr-2 font-black ${tone.accent}`}>{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            )}

            {sheet === 'help' && (
              <div className={`space-y-3 text-sm ${tone.soft}`}>
                <p className={`text-xs ${tone.muted}`}>
                  Guía rápida de la tablet en cabina (NodoTrack).
                </p>
                {[
                  {
                    t: 'Accesos directos',
                    d: 'La barra bajo el header concentra lo urgente: En camino, En el lugar, Navegar, Anotar, Material, 10-X, Combustible, apoyos.',
                  },
                  {
                    t: 'Material del carro',
                    d: 'Marcá lo que llevan al salir. Queda guardado en esta tablet. Con un llamado activo podés mandar el resumen a la bitácora.',
                  },
                  {
                    t: 'Anotar',
                    d: 'Texto libre al llamado (ej. “Material completo”, “Falta ERA”). Lo ve central en la bitácora.',
                  },
                  {
                    t: 'Offline',
                    d: 'Sin red, los hitos se encolan y se envían al recuperar señal. El indicador Online/Offline está en el header.',
                  },
                  {
                    t: 'Radio',
                    d: 'Desbloqueá la sala con el PIN de máquinas para PTT desde cabina.',
                  },
                ].map((row) => (
                  <div key={row.t} className={`rounded-xl border px-3 py-2.5 ${tone.border}`}>
                    <p className={`font-black ${tone.ink}`}>{row.t}</p>
                    <p className={`mt-0.5 text-[12px] leading-snug ${tone.muted}`}>{row.d}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
