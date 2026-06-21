import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Siren, ShieldAlert, Users, CheckCircle2, UserX, RefreshCw, Truck, Fuel, Star,
  Search, SlidersHorizontal, Clock, Calendar, Radio, ChevronDown, ChevronUp, Volume2, Hash,
  Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import FirefighterAvatar, { FirefighterPlaceholder } from '../components/FirefighterAvatar';
import DispatchEmergenciesPanel, { type PublicEmergency } from '../components/dispatch/DispatchEmergenciesPanel';
import PublicEmergencyBanner from '../components/dispatch/PublicEmergencyBanner';
import EmergencyReturnCelebration from '../components/dispatch/EmergencyReturnCelebration';
import EmergencyBitacoraFinalizeModal from '../components/dispatch/EmergencyBitacoraFinalizeModal';
import { usePublicDispatchAlarm } from '../hooks/usePublicDispatchAlarm';
import {
  PUBLIC_POLL_MS_IDLE,
  PUBLIC_POLL_MS_URGENT,
  subscribeDispatchLive,
} from '../lib/dispatch-live-sync';
import { useDispatchPublicTheme } from '../hooks/useDispatchPublicTheme';
import type { DispatchPublicThemeTokens } from '../lib/dispatch-public-theme';

const DISMISSED_KEY = 'nodo360_public_emergency_dismissed';
const AUDIO_KEY = 'nodo360_public_audio_enabled';
const PENDING_BITACORA_KEY = 'nodo360_pending_bitacora';

function loadDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

function loadPendingBitacora(): string[] {
  try {
    const raw = sessionStorage.getItem(PENDING_BITACORA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingBitacora(ids: string[]) {
  sessionStorage.setItem(PENDING_BITACORA_KEY, JSON.stringify(ids));
}

function addPendingBitacora(id: string) {
  const next = [...new Set([...loadPendingBitacora(), id])];
  savePendingBitacora(next);
  return next;
}

function removePendingBitacora(id: string) {
  const next = loadPendingBitacora().filter((x) => x !== id);
  savePendingBitacora(next);
  return next;
}

async function closePublicEmergency(apiBase: string, slug: string, incidentId: string) {
  const res = await fetch(`${apiBase}/emergency-bitacora/public/${slug}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'No se pudo cerrar la emergencia');
  }
}

type RosterMember = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleLabel: string;
  photoUrl: string | null;
  stationAvailable: boolean;
  operativeNumber?: number | null;
};

type MaquinistaMember = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleLabel: string;
  photoUrl: string | null;
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
  fuelLevelPercent: number | null;
  principalMaquinista?: MaquinistaMember | null;
};

type PublicCentral = {
  id: string;
  slug: string;
  name: string;
  number: number;
  city: string;
  address: string;
  phone?: string | null;
  logoUrl?: string | null;
  headquartersImageUrl?: string | null;
  status: 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';
  roster: {
    members: RosterMember[];
    stats: { total: number; available: number; unavailable: number };
  };
  maquinistas: {
    members: MaquinistaMember[];
    principal: MaquinistaMember | null;
    stats: { total: number; available: number; unavailable: number };
  };
  fleet: {
    vehicles: FleetVehicle[];
    stats: { total: number; operativo: number };
  };
  recentEmergencies: PublicEmergency[];
  emergencyStats: { active: number; total: number };
};

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

const DEFAULT_HQ =
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&h=800&fit=crop';

function LiveClock({ th }: { th: DispatchPublicThemeTokens }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right">
      <p className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums tracking-wide ${th.clock}`}>
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className={`text-xs flex items-center justify-end gap-1 mt-0.5 capitalize ${th.clockDate}`}>
        <Calendar className="w-3.5 h-3.5" />
        {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

function CardPhoto({
  photoUrl,
  name,
  available,
  operativeNumber,
  th,
}: {
  photoUrl: string | null;
  name: string;
  available: boolean;
  operativeNumber?: number | null;
  th: DispatchPublicThemeTokens;
}) {
  const [err, setErr] = useState(false);
  const show = photoUrl && !err;
  return (
    <div className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden border ${th.cardPhotoBg} ${
      available ? th.cardPhotoBorderOn : th.cardPhotoBorderOff
    }`}>
      {show ? (
        <img
          src={photoUrl}
          alt={name}
          onError={() => setErr(true)}
          className={`w-full h-full object-cover object-top ${available ? '' : 'grayscale brightness-75'}`}
        />
      ) : (
        <FirefighterPlaceholder available={available} className="w-full h-full" />
      )}

      {/* N° operativo sobre la foto */}
      {operativeNumber != null ? (
        <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
          <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-2 px-2 flex items-end justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90">N°</span>
              <span className="text-4xl sm:text-[2.75rem] font-black text-white tabular-nums leading-none drop-shadow-lg">
                {operativeNumber}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md bg-black/50 text-[9px] text-slate-500 font-medium">
          Sin N° operativo
        </div>
      )}
    </div>
  );
}

export default function DispatchPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tokens: th, toggleTheme, isDark } = useDispatchPublicTheme();
  const [data, setData] = useState<PublicCentral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [maquinistaBusyId, setMaquinistaBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [operativeQuick, setOperativeQuick] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showFleet, setShowFleet] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => loadDismissed());
  const [audioEnabled, setAudioEnabled] = useState(() => sessionStorage.getItem(AUDIO_KEY) === '1');
  const [audioMuted, setAudioMuted] = useState(false);
  const pendingAudioReplayRef = useRef(false);
  const [showReturnCelebration, setShowReturnCelebration] = useState(false);
  const [bitacoraEmergency, setBitacoraEmergency] = useState<PublicEmergency | null>(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(false);
  const [pendingBitacoraIds, setPendingBitacoraIds] = useState<string[]>(() => loadPendingBitacora());
  const [highlightEmergencyId, setHighlightEmergencyId] = useState<string | null>(null);
  const emergenciesPanelRef = useRef<HTMLDivElement>(null);

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  const activeEmergencies = useMemo(
    () => (data?.recentEmergencies ?? []).filter((e) => e.status === 'ACTIVA'),
    [data?.recentEmergencies],
  );

  const visibleActiveEmergency = useMemo(
    () => activeEmergencies.find((e) => !dismissedIds.includes(e.id)) ?? null,
    [activeEmergencies, dismissedIds],
  );

  const onEmergency = !!visibleActiveEmergency;

  const { replay } = usePublicDispatchAlarm(activeEmergencies, {
    enabled: audioEnabled,
    muted: audioMuted,
  });

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Central no disponible');
      }
      setData(await res.json());
      setError(null);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Central no disponible';
      const msg = raw === 'Failed to fetch' || raw.includes('NetworkError')
        ? 'No se pudo conectar con la API. Comprueba que la API esté activa (npm run dev:api) y recarga la página.'
        : raw;
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const enableAudio = () => {
    sessionStorage.setItem(AUDIO_KEY, '1');
    setAudioEnabled(true);
    pendingAudioReplayRef.current = !!visibleActiveEmergency;
    toast.success('Avisos de alarma activados en este equipo', { duration: 2500 });
  };

  useEffect(() => {
    if (pendingAudioReplayRef.current && visibleActiveEmergency && audioEnabled && !audioMuted) {
      pendingAudioReplayRef.current = false;
      replay(visibleActiveEmergency);
    }
  }, [audioEnabled, visibleActiveEmergency, audioMuted, replay]);

  useEffect(() => {
    if (activeEmergencies.length === 0) return;
    const activeIds = new Set(activeEmergencies.map((e) => e.id));
    setDismissedIds((prev) => {
      const pruned = prev.filter((id) => activeIds.has(id));
      if (pruned.length !== prev.length) saveDismissed(pruned);
      return pruned;
    });
  }, [activeEmergencies]);

  const scrollToEmergenciesPanel = (emergencyId?: string) => {
    emergenciesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (emergencyId) {
      setHighlightEmergencyId(emergencyId);
      setTimeout(() => setHighlightEmergencyId(null), 4000);
    }
  };

  const finalizeEmergency = async (emergency: PublicEmergency) => {
    if (!slug) return;
    try {
      await closePublicEmergency(apiBase, slug, emergency.id);
      const next = [...new Set([...dismissedIds, emergency.id])];
      setDismissedIds(next);
      saveDismissed(next);
      setBitacoraEmergency(emergency);
      setShowReturnCelebration(true);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo finalizar la emergencia');
    }
  };

  const handleCelebrationClose = () => {
    setShowReturnCelebration(false);
    if (bitacoraEmergency) setShowBitacoraModal(true);
  };

  const openBitacoraForEmergency = (emergency: PublicEmergency) => {
    setBitacoraEmergency(emergency);
    setShowBitacoraModal(true);
  };

  useEffect(() => {
    if (!data?.recentEmergencies) return;
    const withBitacora = new Set(
      data.recentEmergencies.filter((e) => e.hasBitacora).map((e) => e.id),
    );
    setPendingBitacoraIds((prev) => {
      const pruned = prev.filter((id) => !withBitacora.has(id));
      if (pruned.length !== prev.length) savePendingBitacora(pruned);
      return pruned;
    });
  }, [data?.recentEmergencies]);

  useEffect(() => {
    load();
    const urgent = onEmergency || (data?.emergencyStats?.active ?? 0) > 0;
    const intervalMs = urgent ? PUBLIC_POLL_MS_URGENT : PUBLIC_POLL_MS_IDLE;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, onEmergency, data?.emergencyStats?.active]);

  useEffect(() => {
    const refresh = () => { void load(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    return subscribeDispatchLive(data?.id, () => { void load(); });
  }, [data?.id, load]);

  const handleBitacoraOmit = (emergency: PublicEmergency) => {
    const next = addPendingBitacora(emergency.id);
    setPendingBitacoraIds(next);
    setBitacoraEmergency(null);
    toast('Bitácora pendiente — complétala en Últimas emergencias', {
      icon: '📋',
      duration: 4500,
    });
    scrollToEmergenciesPanel(emergency.id);
    load();
  };

  const handleBitacoraSaved = () => {
    if (bitacoraEmergency) {
      const next = removePendingBitacora(bitacoraEmergency.id);
      setPendingBitacoraIds(next);
    }
    setShowBitacoraModal(false);
    setBitacoraEmergency(null);
    load();
  };

  const toggleMember = async (member: RosterMember) => {
    if (!slug || togglingId) return;
    setTogglingId(member.id);
    const next = !member.stationAvailable;
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, available: next }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
      const num = member.operativeNumber != null ? ` N°${member.operativeNumber}` : '';
      toast.success(next ? `${member.firstName}${num} disponible` : `${member.firstName}${num} no disponible`, { duration: 2000 });
    } catch {
      toast.error('Error al marcar disponibilidad');
    } finally {
      setTogglingId(null);
    }
  };

  const toggleByOperativeNumber = async (markAvailable?: boolean) => {
    const num = parseInt(operativeQuick.trim(), 10);
    if (!slug || togglingId || !num || num < 1 || num > 999) {
      toast.error('Ingresa un N° operativo válido (1–999)');
      return;
    }
    setTogglingId(`op-${num}`);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/availability/by-number`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operativeNumber: num,
          ...(markAvailable !== undefined ? { available: markAvailable } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'No encontrado');
      }
      const updated = await res.json();
      setData(updated);
      const member = updated.roster?.members?.find((m: RosterMember) => m.operativeNumber === num);
      toast.success(
        member?.stationAvailable
          ? `N°${num} — ${member.firstName} marcado disponible`
          : `N°${num} — ${member?.firstName ?? 'Bombero'} marcado no disponible`,
        { duration: 2500 },
      );
      setOperativeQuick('');
      setSearch('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al marcar por N° operativo');
    } finally {
      setTogglingId(null);
    }
  };

  const patchMaquinista = async (
    member: MaquinistaMember,
    payload: { available?: boolean; principal?: boolean },
    successMsg: string,
  ) => {
    if (!slug || maquinistaBusyId) return;
    setMaquinistaBusyId(member.id);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/maquinista`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, ...payload }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      setData(await res.json());
      toast.success(successMsg, { duration: 2000 });
    } catch {
      toast.error('Error al actualizar maquinista');
    } finally {
      setMaquinistaBusyId(null);
    }
  };

  const toggleMaquinista = (member: MaquinistaMember) => {
    const next = !member.maquinistaAvailable;
    patchMaquinista(
      member,
      { available: next },
      next
        ? `${member.firstName} maquinista disponible`
        : `${member.firstName} maquinista no disponible`,
    );
  };

  const setPrincipalMaquinista = (member: MaquinistaMember) => {
    patchMaquinista(
      member,
      { principal: true },
      `${member.firstName} es ahora maquinista principal`,
    );
  };

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.roster.members.filter((m) => {
      const opStr = m.operativeNumber != null ? String(m.operativeNumber) : '';
      const matchQ = !q
        || m.fullName.toLowerCase().includes(q)
        || m.roleLabel.toLowerCase().includes(q)
        || opStr.includes(q);
      const matchR = !roleFilter || m.role === roleFilter;
      return matchQ && matchR;
    });
  }, [data, search, roleFilter]);

  const roleOptions = useMemo(() => {
    if (!data) return [];
    const roles = new Map<string, string>();
    data.roster.members.forEach((m) => roles.set(m.role, m.roleLabel));
    return Array.from(roles.entries());
  }, [data]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${th.loading}`}>
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Cargando sala de máquinas…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center ${th.loading}`}>
        <ShieldAlert className="w-16 h-16 text-slate-400" />
        <h1 className={`text-xl font-bold ${th.errorTitle}`}>Central no disponible</h1>
        <p className="text-slate-500 max-w-md">{error}</p>
        {error?.includes('no disponible') && (
          <p className="text-slate-600 text-xs max-w-md">
            La compañía debe tener vista pública activada. Desde Despacho360 → activar pública, o ejecutar{' '}
            <code className="text-slate-400">npm run repair:dispatch-public</code> en la API.
          </p>
        )}
        <Link to="/login" className="text-sm text-red-400 hover:text-red-300">Acceso operadores NODO360</Link>
      </div>
    );
  }

  const { roster, maquinistas, fleet, recentEmergencies, emergencyStats } = data;
  const hqImage = data.headquartersImageUrl || DEFAULT_HQ;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(publicUrl)}&bgcolor=${th.qrBg}&color=${isDark ? 'ffffff' : '0f172a'}`;

  return (
    <div className={`min-h-screen transition-colors ${onEmergency ? th.pageEmergency : th.page}`}>
      {/* Audio + alarma activa */}
      {!audioEnabled && (
        <div className="bg-amber-950/90 border-b border-amber-600/40 px-4 py-3">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-amber-100 text-center sm:text-left">
              Activa el audio para escuchar las alarmas igual que en la central de despachos.
            </p>
            <button
              type="button"
              onClick={enableAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              Activar avisos de alarma
            </button>
          </div>
        </div>
      )}

      {visibleActiveEmergency && (
        <PublicEmergencyBanner
          emergency={visibleActiveEmergency}
          onFinalize={() => finalizeEmergency(visibleActiveEmergency)}
          onReplayAudio={audioEnabled && !audioMuted ? () => replay(visibleActiveEmergency) : undefined}
        />
      )}

      <EmergencyReturnCelebration
        open={showReturnCelebration}
        onClose={handleCelebrationClose}
        companyName={`${data.number}ª Compañía ${data.name}`}
      />

      <EmergencyBitacoraFinalizeModal
        open={showBitacoraModal}
        slug={slug ?? ''}
        emergency={bitacoraEmergency}
        apiBase={apiBase}
        onClose={() => setShowBitacoraModal(false)}
        onOmit={handleBitacoraOmit}
        onSaved={handleBitacoraSaved}
      />

      {/* Hero — logo, cuartel degradado, reloj */}
      <header className={`relative overflow-hidden border-b ${th.headerBorder}`}>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${hqImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: th.heroOverlay }}
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${th.heroFade}`} />
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-500/40 shadow-lg" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/20 border-2 border-red-500/40 flex items-center justify-center">
                <Siren className="w-7 h-7 text-red-400" />
              </div>
            )}
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${th.companyLabel}`}>{data.number}ª Compañía</p>
              <h1 className={`text-lg sm:text-2xl font-bold leading-tight ${th.title}`}>{data.name}</h1>
              <p className={`text-sm ${th.subtitle}`}>Sala de Máquinas</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-colors ${th.btnGhost}`}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <LiveClock th={th} />
          </div>
        </div>
        {audioEnabled && (
          <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 pb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setAudioMuted((m) => !m)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                audioMuted ? th.audioMuted : th.audioActive
              }`}
            >
              {audioMuted ? 'Audio silenciado' : '● Audio de alarma activo'}
            </button>
          </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Barra disponibilidad + estado */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className={`${th.card} rounded-2xl p-4 sm:p-5 flex gap-4 items-center`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className={`font-bold text-sm sm:text-base ${th.cardTitle}`}>Marca tu disponibilidad</h2>
              </div>
              <p className={`text-xs leading-relaxed ${th.cardText}`}>
                Indica que estás en el cuartel y disponible para ser llamado a emergencias.
                Busca tu nombre abajo o escanea el código QR.
              </p>
            </div>
            <img src={qrUrl} alt="QR sala de máquinas" className={`w-20 h-20 sm:w-24 sm:h-24 rounded-lg border shrink-0 ${isDark ? 'border-slate-600 bg-[#0a1628]' : 'border-slate-300 bg-white'}`} />
          </div>

          <div className={`${th.card} rounded-2xl p-4 sm:p-5`}>
            <h2 className={`font-bold text-sm sm:text-base mb-3 ${th.cardTitle}`}>Estado de la compañía</h2>
            {onEmergency && (
              <div className="mb-3 rounded-xl border-2 border-red-500/60 bg-red-950/40 px-4 py-3 flex items-center gap-3 animate-pulse">
                <Siren className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-200 uppercase tracking-wide">Dotación en emergencia</p>
                  <p className="text-xs text-red-300/80">Material mayor despachado · esperando regreso al cuartel</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill icon={CheckCircle2} value={roster.stats.available} label="Disponibles" color="emerald" th={th} />
              <StatPill icon={Truck} value={maquinistas.stats.available} label="Maq. habilitados" color="sky" th={th} />
              <StatPill icon={Siren} value={emergencyStats.active} label="En emergencia" color="red" th={th} />
              <StatPill icon={UserX} value={roster.stats.unavailable} label="No disponibles" color="slate" th={th} />
            </div>
          </div>
        </div>

        {/* Búsqueda + N° operativo rápido */}
        <div className="space-y-3">
          <div className={`rounded-2xl border p-4 ${th.operativePanel}`}>
            <p className={`text-xs font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
              <Hash className="w-4 h-4" />
              Marcar disponibilidad por N° operativo
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-[140px]">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={operativeQuick}
                  onChange={(e) => setOperativeQuick(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  onKeyDown={(e) => { if (e.key === 'Enter') toggleByOperativeNumber(); }}
                  placeholder="N°"
                  className={`w-full border rounded-xl px-4 py-3 text-2xl font-black text-center focus:outline-none ${th.operativeInput}`}
                />
              </div>
              <button
                type="button"
                disabled={!!togglingId || !operativeQuick}
                onClick={() => toggleByOperativeNumber()}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-amber-950 font-black text-sm transition-colors"
              >
                Marcar / alternar
              </button>
              <button
                type="button"
                disabled={!!togglingId || !operativeQuick}
                onClick={() => toggleByOperativeNumber(true)}
                className="px-4 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm"
              >
                Disponible
              </button>
              <button
                type="button"
                disabled={!!togglingId || !operativeQuick}
                onClick={() => toggleByOperativeNumber(false)}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-bold text-sm"
              >
                No disp.
              </button>
            </div>
            <p className={`text-[10px] mt-2 ${th.operativeHint}`}>
              Escribe tu número y Enter, o usa los botones. También puedes buscar abajo en la dotación.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${th.cardMuted}`} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o N° operativo…"
                className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none ${th.input}`}
              />
            </div>
          <div className="relative sm:w-48">
            <SlidersHorizontal className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${th.cardMuted}`} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm appearance-none focus:outline-none ${th.select}`}
            >
              <option value="">Filtrar por rol</option>
              {roleOptions.map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
          </div>
          {(search || roleFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setRoleFilter(''); }}
              className={`px-4 py-2.5 rounded-xl border text-sm ${th.filterBtn}`}
            >
              Ver todos
            </button>
          )}
          </div>
        </div>

        {/* Principal: bomberos + mapa */}
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-3">
            <h2 className={`text-base font-bold flex items-center gap-2 ${th.sectionTitle}`}>
              <Users className="w-5 h-5 text-emerald-400" />
              Dotación en cuartel
              {onEmergency && (
                <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                  En emergencia
                </span>
              )}
              <span className={`text-xs font-normal ml-1 ${th.sectionCount}`}>
                {filteredMembers.length} de {roster.stats.total}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredMembers.map((m) => {
                const on = m.stationAvailable;
                const busy = togglingId === m.id;
                const enServicio = onEmergency;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleMember(m)}
                    className={`text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.98] flex flex-col relative ${
                      enServicio
                        ? th.memberEmergency
                        : on
                          ? th.memberAvailable
                          : th.memberUnavailable
                    } ${busy ? 'opacity-60' : ''}`}
                  >
                    {enServicio && (
                      <div className="absolute inset-x-0 top-0 z-20 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-wider text-center py-1">
                        En emergencia
                      </div>
                    )}
                    <div className={`p-2.5 pb-0 relative ${enServicio ? 'pt-6' : ''}`}>
                      <span className={`absolute top-3 left-3 z-20 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        enServicio
                          ? 'bg-red-500 text-white'
                          : on ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-600 text-slate-200'
                      }`}>
                        {enServicio ? 'Despachado' : on ? 'Disponible' : 'No disp.'}
                      </span>
                      <CardPhoto
                        photoUrl={m.photoUrl}
                        name={m.fullName}
                        available={on && !enServicio}
                        operativeNumber={m.operativeNumber}
                        th={th}
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div>
                        <p className={`font-bold text-sm truncate ${th.memberName}`}>{m.firstName} {m.lastName}</p>
                        <p className={`text-[11px] ${th.memberRole}`}>{m.roleLabel}</p>
                      </div>
                      <span className={`mt-auto w-full text-center text-xs font-bold py-2 rounded-lg ${
                        on ? th.memberBtnOn : th.memberBtnOff
                      }`}>
                        {on ? 'Estoy disponible' : 'Marcar disponible'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredMembers.length === 0 && (
              <p className={`text-center py-12 rounded-2xl border ${th.emptyState}`}>
                No hay bomberos que coincidan con la búsqueda
              </p>
            )}
          </div>

          <div ref={emergenciesPanelRef} className="lg:col-span-1 lg:sticky lg:top-4">
            <DispatchEmergenciesPanel
              emergencies={recentEmergencies}
              pendingBitacoraIds={pendingBitacoraIds}
              highlightEmergencyId={highlightEmergencyId}
              onCompleteBitacora={openBitacoraForEmergency}
              theme={isDark ? 'dark' : 'light'}
            />
          </div>
        </div>

        {/* Maquinistas — habilitación y cargo */}
        {maquinistas.members.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`text-base font-bold flex items-center gap-2 ${th.sectionTitle}`}>
                <Truck className="w-5 h-5 text-sky-400" />
                Maquinistas
                <span className={`text-xs font-normal ${th.sectionCount}`}>
                  {maquinistas.stats.available} habilitados / {maquinistas.stats.total}
                </span>
              </h2>
              <p className={`text-[11px] ${th.cardMuted}`}>
                Marca disponibilidad como maquinista · luego puedes tomar el cargo
              </p>
            </div>

            {/* Maquinista a cargo */}
            <div className={`rounded-2xl border-2 p-4 sm:p-5 ${
              maquinistas.principal?.maquinistaAvailable
                ? th.maquinistaPanel
                : th.maquinistaPanelEmpty
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                Maquinista a cargo de guardia
              </p>
              {maquinistas.principal ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <FirefighterAvatar
                    photoUrl={maquinistas.principal.photoUrl}
                    fullName={maquinistas.principal.fullName}
                    available={maquinistas.principal.maquinistaAvailable}
                    size="lg"
                    variant="maquinista"
                    principal
                  />
                  <div className="text-center sm:text-left flex-1">
                    <p className={`text-xl font-bold ${th.memberName}`}>
                      {maquinistas.principal.firstName} {maquinistas.principal.lastName}
                    </p>
                    <p className={`text-sm ${th.memberRole}`}>{maquinistas.principal.roleLabel}</p>
                    <span className={`inline-block mt-2 text-xs font-bold uppercase px-3 py-1 rounded-full ${
                      maquinistas.principal.maquinistaAvailable
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {maquinistas.principal.maquinistaAvailable ? '● Habilitado' : 'No habilitado'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={`text-sm text-center py-2 ${th.cardMuted}`}>
                  Sin maquinista a cargo — un maquinista habilitado puede tomar el cargo abajo
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {maquinistas.members.map((m) => {
                const on = m.maquinistaAvailable;
                const busy = maquinistaBusyId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border flex flex-col overflow-hidden ${
                      m.maquinistaPrincipal
                        ? th.maquinistaCardPrincipal
                        : on
                          ? th.maquinistaCardOn
                          : th.maquinistaCardOff
                    } ${busy ? 'opacity-60' : ''}`}
                  >
                    <button
                      type="button"
                      disabled={!!maquinistaBusyId}
                      onClick={() => toggleMaquinista(m)}
                      className="flex flex-col items-center gap-2 p-4 w-full active:scale-[0.98] transition-transform"
                    >
                      <span className={`self-start text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        m.maquinistaPrincipal
                          ? 'bg-amber-500 text-amber-950'
                          : on
                            ? 'bg-sky-500 text-sky-950'
                            : 'bg-slate-600 text-slate-200'
                      }`}>
                        {m.maquinistaPrincipal ? 'A cargo' : on ? 'Habilitado' : 'No hab.'}
                      </span>
                      <FirefighterAvatar
                        photoUrl={m.photoUrl}
                        fullName={m.fullName}
                        available={on}
                        variant="maquinista"
                        principal={m.maquinistaPrincipal}
                      />
                      <div className="text-center w-full">
                        <p className={`font-bold text-sm truncate ${th.memberName}`}>{m.firstName} {m.lastName}</p>
                        <p className={`text-[11px] ${th.memberRole}`}>{m.roleLabel}</p>
                      </div>
                      <span className={`w-full text-center text-xs font-bold py-2 rounded-lg border ${
                        on
                          ? 'bg-sky-600/20 text-sky-300 border-sky-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {on ? 'Maquinista activo' : 'Marcar como maquinista'}
                      </span>
                    </button>
                    {on && !m.maquinistaPrincipal && (
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          disabled={!!maquinistaBusyId}
                          onClick={() => setPrincipalMaquinista(m)}
                          className="w-full text-[10px] font-bold uppercase py-2 rounded-lg border border-amber-500/50 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          Tomar cargo
                        </button>
                      </div>
                    )}
                    {m.maquinistaPrincipal && (
                      <p className="text-center text-[10px] font-bold uppercase text-amber-400 pb-3 flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        Maquinista a cargo
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Secundario: flota */}
        <div className="space-y-3">
          <CollapsibleSection
            title="Material mayor"
            icon={Truck}
            iconColor="text-orange-400"
            open={showFleet}
            onToggle={() => setShowFleet((v) => !v)}
            badge={`${fleet.stats.operativo} operativos`}
            th={th}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {fleet.vehicles.map((v) => (
                <div key={v.id} className={`flex gap-3 rounded-xl p-3 border ${th.fleetItem}`}>
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Truck className="w-6 h-6 text-slate-600" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold">{v.patent} · {v.type}</p>
                    <p className="text-slate-500">{v.statusLabel}</p>
                    {v.fuelLevelPercent != null && (
                      <p className="text-slate-400 flex items-center gap-1 mt-1">
                        <Fuel className="w-3 h-3" /> {v.fuelLevelPercent}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </main>

      <footer className={`border-t mt-8 py-5 px-4 ${th.footerBorder}`}>
        <div className={`max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] ${th.footer}`}>
          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Disponibilidad actualizada en tiempo real
          </p>
          <p className={`font-semibold ${th.footerText}`}>
            <span className="text-red-400">NODO</span>360 · Plataforma de gestión para bomberos
          </p>
          <p className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Emergencias 132 · {data.address}
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatPill({
  icon: Icon, value, label, color, th,
}: {
  icon: typeof Users;
  value: number;
  label: string;
  color: 'emerald' | 'sky' | 'red' | 'slate';
  th: DispatchPublicThemeTokens;
}) {
  const styles = {
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    red: 'text-red-400',
    slate: 'text-slate-400',
  };
  return (
    <div className={`rounded-xl p-3 text-center border ${th.statPill}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${styles[color]}`} />
      <p className={`text-xl font-bold ${styles[color]}`}>{value}</p>
      <p className={`text-[10px] uppercase ${th.statLabel}`}>{label}</p>
    </div>
  );
}

function CollapsibleSection({
  title, icon: Icon, iconColor, open, onToggle, badge, children, th,
}: {
  title: string;
  icon: typeof Truck;
  iconColor: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
  th: DispatchPublicThemeTokens;
}) {
  return (
    <div className={`${th.collapsible} border rounded-2xl overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${th.collapsibleBtn}`}
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className={`font-bold text-sm ${th.collapsibleTitle}`}>{title}</span>
        {badge && <span className={`text-[10px] ml-1 ${th.cardMuted}`}>{badge}</span>}
        <span className={`ml-auto ${th.cardMuted}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && <div className={`px-4 pb-4 border-t pt-3 ${th.collapsibleBorder}`}>{children}</div>}
    </div>
  );
}
