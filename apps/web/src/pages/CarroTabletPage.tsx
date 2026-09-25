import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Building2, Car, CheckCircle2, Droplet, Flame, HeartPulse, Home,
  Loader2, MapPin, Maximize2, Megaphone, Moon, Navigation, Radio, Search,
  ShieldAlert, Siren, Sun, Trees, Truck, Users, Volume2, VolumeX, Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SalaPinGate, { type SalaLockPreview } from '../components/dispatch/SalaPinGate';
import RadioPttPanel from '../components/radio/RadioPttPanel';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../components/map/PublicOsmMap';
import { type PublicEmergency } from '../components/dispatch/DispatchEmergenciesPanel';
import { COMPANIAS360 } from '../lib/companias360';
import { clearSalaToken, readSalaToken, salaAuthHeaders, writeSalaToken } from '../lib/sala-auth';
import { clearCarroVehicle, readCarroVehicle, writeCarroVehicle } from '../lib/carro-session';
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
  type: string;
  statusLabel: string;
  imageUrl?: string | null;
};

type PublicCentral = {
  name: string;
  number: number;
  fleet: { vehicles: FleetVehicle[] };
  maquinistas?: {
    principal?: { firstName: string; lastName: string; maquinistaAvailable?: boolean } | null;
    members?: { firstName: string; lastName: string; maquinistaAvailable?: boolean; maquinistaPrincipal?: boolean }[];
    stats?: { available: number; total: number };
  };
  recentEmergencies: PublicEmergency[];
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

function crewStatusLabel(status?: string | null) {
  if (status === 'ON_SCENE') return 'En el lugar';
  if (status === 'GOING') return 'En camino';
  if (status === 'NOT_AVAILABLE') return 'No voy';
  return status || '—';
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

  const pushKind = async (kind: IncidentTimelineKind) => {
    if (!slug || !active) return toast.error('No hay emergencia activa');
    setPosting(true);
    try {
      const note = selectedVehicle
        ? `${vehicleTypeAbbrev(selectedVehicle.type)} · ${selectedVehicle.patent}`
        : undefined;
      const res = await fetch(`${apiBase}/incident-timeline/public/${slug}`, {
        method: 'POST',
        headers: salaAuthHeaders(slug),
        body: JSON.stringify({ incidentId: active.id, kind, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? 'No se pudo registrar');
      toast.success('Registrado');
      await loadTimeline();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setPosting(false);
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
    return (
      <CarroIndexShell tone={tone} isDark={isDark} onToggleTheme={toggleTheme}>
        <div className="mx-auto w-full max-w-4xl flex-1 p-6 sm:p-8">
          <CarroBrandMark tone={tone} />
          <p className={`mt-8 text-[10px] font-black uppercase tracking-[0.18em] ${tone.accent}`}>
            {data.number}ª {data.name}
          </p>
          <h1 className={`mt-1 text-3xl font-black ${tone.ink}`}>¿Qué carro es esta tablet?</h1>
          <p className={`mt-1 text-sm ${tone.muted}`}>Queda guardado en este equipo hasta cambiar de carro.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v, i) => {
              const label = vehicleLabel(v, i);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition-colors ${tone.border} ${tone.card} ${tone.cardHover}`}
                >
                  <VehiclePhoto vehicle={v} label={label} className="h-40" />
                  <div className="px-4 py-3">
                    <p className={`text-lg font-black ${tone.ink}`}>{label}</p>
                    <p className={`text-xs ${tone.accentSoft}`}>{vehicleTypeShortLabel(v.type)}</p>
                    <p className={`mt-0.5 text-xs ${tone.muted}`}>
                      {v.brand} {v.model} · {v.statusLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {vehicles.length === 0 && <p className={`mt-4 text-sm ${tone.muted}`}>Esta compañía no tiene carros cargados.</p>}
          <button type="button" onClick={() => navigate('/carro')} className={`mt-6 text-sm font-semibold ${tone.accent}`}>
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
          <p className={`text-[10px] uppercase tracking-widest ${tone.accent}`}>{data.number}ª {data.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
          <div className="min-h-0 flex-1">
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
              </div>
            ) : (
              <>
                <p className={`text-[10px] font-black uppercase tracking-widest ${tone.accent}`}>
                  {active.code} · {active.status}
                </p>
                <h2 className={`text-xl font-black ${tone.ink}`}>{active.type}</h2>
                <p className={`mt-1 flex items-center gap-1 text-sm ${tone.soft}`}>
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${tone.accent}`} /> {active.address}
                </p>
                {active.radioMessage ? (
                  <p className={`mt-2 text-xs leading-relaxed ${tone.muted}`}>
                    <Siren className="mr-1 inline h-3.5 w-3.5" />
                    {active.radioMessage}
                  </p>
                ) : null}
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
    </div>
  );
}
