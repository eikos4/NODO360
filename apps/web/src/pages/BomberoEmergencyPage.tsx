import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  Siren, MapPin, Navigation, CheckCircle2, XCircle, UserX, Loader2,
  RefreshCw, Users, Truck, AlertTriangle, Crosshair, Radio, Building2, Volume2, VolumeX,
  Clock, Flag, Route, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { notifyDispatchLive, subscribeDispatchLive, subscribeAnyDispatchLive, PUBLIC_POLL_MS_IDLE, PUBLIC_POLL_MS_URGENT } from '../lib/dispatch-live-sync';
import { openGoogleMapsDirections } from '../lib/incident-location-pin';
import { usePublicDispatchAlarm } from '../hooks/usePublicDispatchAlarm';
import { COMPANIAS360 } from '../lib/companias360';
import { useThemeStore } from '../store/themeStore';
import { cn } from '../lib/utils';
import RadioPttPanel from '../components/radio/RadioPttPanel';

type ResponseStatus = 'GOING' | 'NOT_GOING' | 'NOT_AVAILABLE' | 'ON_SCENE' | 'LOCATION_MARKED';

const AUDIO_KEY = 'nodo360_public_audio_enabled';
const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

function ResponseChoiceButton({
  status,
  selectedStatus,
  animatingStatus,
  onSelect,
  disabled,
  className,
  selectedClassName,
  children,
}: {
  status: ResponseStatus;
  selectedStatus: ResponseStatus | null;
  animatingStatus: ResponseStatus | null;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
  selectedClassName?: string;
  children: React.ReactNode;
}) {
  const isSelected = selectedStatus === status;
  const isAnimating = animatingStatus === status;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        className,
        isSelected && selectedClassName,
        isSelected && 'z-10',
        isAnimating && 'response-choice-pop',
      )}
    >
      {isAnimating && (
        <span className="absolute inset-0 response-choice-flash pointer-events-none rounded-[inherit]" aria-hidden />
      )}
      {children}
    </button>
  );
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function estimateEtaMinutes(km: number): number {
  if (km <= 0) return 1;
  return Math.max(1, Math.round((km / 40) * 60));
}

function choiceHeadline(status: ResponseStatus | null): { title: string; accent: string } {
  switch (status) {
    case 'GOING':
      return { title: 'TU RESPUESTA EN CAMINO', accent: 'emerald' };
    case 'ON_SCENE':
      return { title: 'TU RESPUESTA EN EL LUGAR', accent: 'sky' };
    case 'NOT_GOING':
      return { title: 'TU RESPUESTA: NO VOY', accent: 'slate' };
    case 'NOT_AVAILABLE':
      return { title: 'TU RESPUESTA: NO DISPONIBLE', accent: 'amber' };
    case 'LOCATION_MARKED':
      return { title: 'UBICACIÓN DEL INCENDIO MARCADA', accent: 'red' };
    default:
      return { title: 'SIN RESPUESTA AÚN', accent: 'slate' };
  }
}

function resolveDispatchSlug(company: CompanyInfo | null): string | null {
  if (!company) return null;
  if (company.dispatchSlug) return company.dispatchSlug;
  return COMPANIAS360.find((c) => c.number === company.number)?.slug ?? null;
}

type CompanyInfo = {
  id: string;
  name: string;
  number: number;
  city: string;
  address?: string | null;
  logoUrl?: string | null;
  dispatchSlug?: string | null;
};

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  companyId: string;
  operativeNumber?: number | null;
  photoUrl?: string | null;
  stationAvailable: boolean;
};

type ActiveIncident = {
  id: string;
  code: string;
  type: string;
  address: string;
  dispatchedAt: string;
  emergencyCodeId?: string | null;
  radioMessage?: string;
  company: { number: number; name: string; city: string };
  vehicles: { patent: string; type: string }[];
  involvedAsSupport: boolean;
  dispatchGps: { latitude: number; longitude: number } | null;
  fieldGps: { latitude: number; longitude: number; confirmedAt?: string | null } | null;
  mapLat: number | null;
  mapLng: number | null;
  hasCoordinates: boolean;
  myResponse: {
    status: ResponseStatus;
    statusLabel: string;
  } | null;
  teamSummary: {
    going: number;
    notGoing: number;
    notAvailable: number;
    onScene: number;
    locationMarked: number;
    total: number;
    responses?: { status: ResponseStatus; statusLabel: string; user: { firstName: string; lastName: string } }[];
  };
};

function mapPublicEmergency(e: {
  id: string;
  code: string;
  type: string;
  address: string;
  dispatchedAt: string;
  emergencyCodeId?: string | null;
  radioMessage?: string;
  vehicles?: { patent: string; type: string }[];
  involvedAsSupport?: boolean;
  dispatchLatitude?: number | null;
  dispatchLongitude?: number | null;
  confirmedLatitude?: number | null;
  confirmedLongitude?: number | null;
  locationPinAt?: string | null;
  latitude?: number;
  longitude?: number;
  hasFieldGps?: boolean;
  hasCoordinates?: boolean;
}, company: CompanyInfo | null): ActiveIncident {
  return {
    id: e.id,
    code: e.code,
    type: e.type,
    address: e.address,
    dispatchedAt: e.dispatchedAt,
    emergencyCodeId: e.emergencyCodeId,
    radioMessage: e.radioMessage,
    company: company
      ? { number: company.number, name: company.name, city: company.city }
      : { number: 0, name: '', city: '' },
    vehicles: e.vehicles ?? [],
    involvedAsSupport: !!e.involvedAsSupport,
    dispatchGps:
      e.dispatchLatitude != null && e.dispatchLongitude != null
        ? { latitude: e.dispatchLatitude, longitude: e.dispatchLongitude }
        : null,
    fieldGps: e.hasFieldGps && e.confirmedLatitude != null && e.confirmedLongitude != null
      ? { latitude: e.confirmedLatitude, longitude: e.confirmedLongitude, confirmedAt: e.locationPinAt }
      : null,
    mapLat: e.latitude ?? null,
    mapLng: e.longitude ?? null,
    hasCoordinates: !!e.hasCoordinates,
    myResponse: null,
    teamSummary: {
      going: 0,
      notGoing: 0,
      notAvailable: 0,
      onScene: 0,
      locationMarked: 0,
      total: 0,
    },
  };
}

function FitPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0][0], lng: points[0][1] });
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend({ lat: p[0], lng: p[1] }));
    map.fitBounds(bounds, { bottom: 36, left: 36, right: 36, top: 36 });
  }, [map, points]);
  return null;
}

const DispatchIcon = () => (
  <div style={{ background: '#f97316', width: 14, height: 14, borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }}></div>
);

const FieldIcon = () => (
  <div style={{ background: '#22c55e', width: 18, height: 18, borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 12px #22c55e' }}></div>
);

const YouIcon = () => (
  <div style={{ background: '#3b82f6', width: 16, height: 16, borderRadius: '50%', border: '3px solid white' }}></div>
);

function useGps() {
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const capture = useCallback(() => new Promise<{ lat: number; lng: number; accuracy?: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setPos(next);
        setLocating(false);
        resolve(next);
      },
      (err) => {
        setLocating(false);
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }), []);

  return { pos, locating, capture, setPos };
}

function StatusBadge({ status }: { status: ResponseStatus | null }) {
  if (!status) return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Sin respuesta</span>;
  const styles: Record<ResponseStatus, string> = {
    GOING: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    NOT_GOING: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/40',
    NOT_AVAILABLE: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40',
    ON_SCENE: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    LOCATION_MARKED: 'bg-green-500/20 text-green-300 border-green-500/40',
  };
  const labels: Record<ResponseStatus, string> = {
    GOING: 'Voy',
    NOT_GOING: 'No voy',
    NOT_AVAILABLE: 'No disp.',
    ON_SCENE: 'En el lugar',
    LOCATION_MARKED: 'Ubicación marcada',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function IncidentCard({
  incident,
  selected,
  onSelect,
}: {
  incident: ActiveIncident;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        selected
          ? 'border-red-500/60 bg-red-100 dark:bg-red-950/30 ring-1 ring-red-500/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-mono text-red-600 dark:text-red-400">{incident.code}</p>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{incident.type}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{incident.address}</p>
        </div>
        <StatusBadge status={incident.myResponse?.status ?? null} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {incident.teamSummary.going} van</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-sky-400" /> {incident.teamSummary.onScene} en lugar</span>
        {incident.fieldGps && <span className="text-emerald-400 font-bold">GPS confirmado</span>}
      </div>
    </button>
  );
}

function getTimeElapsed(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'instantes';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  } catch {
    return '';
  }
}

export default function BomberoEmergencyPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'team'>('map');
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [urgentPoll, setUrgentPoll] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => sessionStorage.getItem(AUDIO_KEY) === '1');
  const [audioMuted, setAudioMuted] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<ResponseStatus | null>(null);
  const [animatingStatus, setAnimatingStatus] = useState<ResponseStatus | null>(null);
  const choiceAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAudioReplayRef = useRef(false);
  const { pos, locating, capture } = useGps();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['emergency-response-active'],
    queryFn: () => api.get('/emergency-response/active').then((r) => r.data),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const hasIncidents = (query.state.data?.incidents?.length ?? 0) > 0;
      return urgentPoll || hasIncidents ? PUBLIC_POLL_MS_URGENT : PUBLIC_POLL_MS_IDLE;
    },
  });

  const company: CompanyInfo | null = data?.company ?? null;
  const profile: UserProfile | null = data?.user ?? null;
  const incidents: ActiveIncident[] = data?.incidents ?? [];
  const dispatchSlug = resolveDispatchSlug(company);

  const { data: publicLive } = useQuery({
    queryKey: ['dispatch-public-live', dispatchSlug],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/dispatch/public/${dispatchSlug}`);
      if (!res.ok) throw new Error('No se pudo sincronizar con la sala pública');
      return res.json();
    },
    enabled: !!dispatchSlug,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const active = query.state.data?.emergencyStats?.active ?? 0;
      return active > 0 || urgentPoll ? PUBLIC_POLL_MS_URGENT : PUBLIC_POLL_MS_IDLE;
    },
  });

  const publicActiveCount = useMemo(
    () => (publicLive?.recentEmergencies ?? []).filter((e: { status: string }) => e.status === 'ACTIVA').length,
    [publicLive],
  );

  const displayIncidents: ActiveIncident[] = useMemo(() => {
    const fromPublic = (publicLive?.recentEmergencies ?? [])
      .filter((e: { status: string }) => e.status === 'ACTIVA')
      .map((e: Parameters<typeof mapPublicEmergency>[0]) => mapPublicEmergency(e, company));
    if (incidents.length === 0) return fromPublic;
    const ids = new Set(incidents.map((i) => i.id));
    const extras = fromPublic.filter((p: any) => !ids.has(p.id));
    return extras.length > 0 ? [...incidents, ...extras] : incidents;
  }, [incidents, publicLive, company]);

  const selected = displayIncidents.find((i) => i.id === selectedId) ?? displayIncidents[0] ?? null;
  const selectedChoice = optimisticStatus ?? selected?.myResponse?.status ?? null;

  useEffect(() => {
    setOptimisticStatus(selected?.myResponse?.status ?? null);
  }, [selected?.id, selected?.myResponse?.status]);

  useEffect(() => {
    return () => {
      if (choiceAnimTimer.current) clearTimeout(choiceAnimTimer.current);
    };
  }, []);

  const playChoiceAnimation = (status: ResponseStatus) => {
    setOptimisticStatus(status);
    setAnimatingStatus(status);
    if (choiceAnimTimer.current) clearTimeout(choiceAnimTimer.current);
    choiceAnimTimer.current = setTimeout(() => setAnimatingStatus(null), 700);
  };

  const alarmEmergencies = useMemo(
    () => displayIncidents.map((i) => ({
      id: i.id,
      status: 'ACTIVA' as const,
      emergencyCodeId: i.emergencyCodeId,
      radioMessage: i.radioMessage,
      dispatchedAt: i.dispatchedAt,
    })),
    [displayIncidents],
  );

  const { replay } = usePublicDispatchAlarm(alarmEmergencies, {
    enabled: audioEnabled,
    muted: audioMuted,
  });

  const enableAudio = () => {
    sessionStorage.setItem(AUDIO_KEY, '1');
    setAudioEnabled(true);
    pendingAudioReplayRef.current = displayIncidents.length > 0;
    toast.success('Avisos de alarma activados', { duration: 2500 });
  };

  useEffect(() => {
    if (pendingAudioReplayRef.current && selected && audioEnabled && !audioMuted) {
      pendingAudioReplayRef.current = false;
      replay({
        id: selected.id,
        status: 'ACTIVA',
        emergencyCodeId: selected.emergencyCodeId,
        radioMessage: selected.radioMessage,
        dispatchedAt: selected.dispatchedAt,
      });
    }
  }, [audioEnabled, audioMuted, replay, selected]);

  useEffect(() => {
    if (!selectedId && displayIncidents[0]) setSelectedId(displayIncidents[0].id);
  }, [displayIncidents, selectedId]);

  useEffect(() => {
    if (!user?.companyId) return;
    const refresh = () => {
      void refetch();
      if (dispatchSlug) {
        void qc.invalidateQueries({ queryKey: ['dispatch-public-live', dispatchSlug] });
      }
    };
    const unsubCompany = subscribeDispatchLive(
      user.companyId,
      refresh,
      () => {
        setUrgentPoll(true);
        toast('Emergencia despachada por la central', { duration: 5000, icon: '🔴' });
      },
    );
    const unsubAny = subscribeAnyDispatchLive(refresh);
    return () => {
      unsubCompany();
      unsubAny();
    };
  }, [user?.companyId, refetch, dispatchSlug, qc]);

  useEffect(() => {
    if (publicActiveCount > displayIncidents.length) {
      setUrgentPoll(true);
      void refetch();
    }
  }, [publicActiveCount, displayIncidents.length, refetch]);

  const respondMut = useMutation({
    mutationFn: (payload: { incidentId: string; status: string; latitude?: number; longitude?: number }) =>
      api.post(`/emergency-response/${payload.incidentId}/respond`, payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.involvedCompanyIds?.length) {
        notifyDispatchLive({ companyIds: res.involvedCompanyIds, incidentId: selected?.id });
      }
      qc.invalidateQueries({ queryKey: ['emergency-response-active'] });
      qc.invalidateQueries({ queryKey: ['operational-map'] });
    },
    onError: () => {
      toast.error('No se pudo registrar la respuesta');
      setOptimisticStatus(selected?.myResponse?.status ?? null);
    },
  });

  const markMut = useMutation({
    mutationFn: (payload: { incidentId: string; latitude: number; longitude: number; note?: string }) =>
      api.post(`/emergency-response/${payload.incidentId}/mark-location`, payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.involvedCompanyIds?.length) {
        notifyDispatchLive({ companyIds: res.involvedCompanyIds, incidentId: selected?.id });
      }
      qc.invalidateQueries({ queryKey: ['emergency-response-active'] });
      qc.invalidateQueries({ queryKey: ['operational-map'] });
    },
    onError: () => {
      toast.error('No se pudo marcar la ubicación');
      setOptimisticStatus(selected?.myResponse?.status ?? null);
    },
  });

  const busy = respondMut.isPending || markMut.isPending;

  const mapPoints = useMemo((): [number, number][] => {
    if (!selected) return [];
    const pts: [number, number][] = [];
    if (selected.dispatchGps) pts.push([selected.dispatchGps.latitude, selected.dispatchGps.longitude]);
    if (selected.fieldGps) pts.push([selected.fieldGps.latitude, selected.fieldGps.longitude]);
    if (pos) pts.push([pos.lat, pos.lng]);
    if (selected.mapLat != null && selected.mapLng != null) {
      pts.push([selected.mapLat, selected.mapLng]);
    }
    return pts;
  }, [selected, pos]);

  const mapCenter: [number, number] = mapPoints[0] ?? [-36.1431, -71.8261];

  const destCoords = useMemo(() => {
    if (!selected) return null;
    if (selected.fieldGps) return { lat: selected.fieldGps.latitude, lng: selected.fieldGps.longitude };
    if (selected.dispatchGps) return { lat: selected.dispatchGps.latitude, lng: selected.dispatchGps.longitude };
    if (selected.mapLat != null && selected.mapLng != null) return { lat: selected.mapLat, lng: selected.mapLng };
    return null;
  }, [selected]);

  const tripStats = useMemo(() => {
    if (!destCoords) return { totalKm: null as number | null, remainingKm: null as number | null, etaMin: null as number | null, progress: 0 };
    const totalKm = pos
      ? Math.max(haversineKm(pos, destCoords), 0.1)
      : null;
    // Sin GPS del bombero: estimar desde cuartel si hay map del incidente
    const remainingKm = pos && destCoords ? haversineKm(pos, destCoords) : totalKm;
    const etaMin = remainingKm != null ? estimateEtaMinutes(remainingKm) : null;
    const progress =
      selectedChoice === 'ON_SCENE' || selectedChoice === 'LOCATION_MARKED'
        ? 1
        : selectedChoice === 'GOING' && remainingKm != null && totalKm
          ? Math.min(0.92, Math.max(0.12, 1 - remainingKm / Math.max(totalKm * 1.4, remainingKm + 0.5)))
          : selectedChoice === 'GOING'
            ? 0.35
            : 0;
    return { totalKm, remainingKm, etaMin, progress };
  }, [destCoords, pos, selectedChoice]);

  const handleRespond = async (status: ResponseStatus, withGps = false) => {
    if (!selected) return;
    playChoiceAnimation(status);
    let latitude: number | undefined;
    let longitude: number | undefined;
    const wantGps = withGps || status === 'GOING' || status === 'ON_SCENE';
    if (wantGps) {
      try {
        const p = pos ?? await capture();
        latitude = p.lat;
        longitude = p.lng;
      } catch {
        if (withGps || status === 'ON_SCENE') {
          toast.error('Activa el GPS para confirmar tu posición');
          return;
        }
      }
    }
    respondMut.mutate({ incidentId: selected.id, status, latitude, longitude });
  };

  const handleMarkLocation = async () => {
    if (!selected) return;
    playChoiceAnimation('LOCATION_MARKED');
    try {
      const p = pos ?? await capture();
      markMut.mutate({ incidentId: selected.id, latitude: p.lat, longitude: p.lng });
    } catch {
      toast.error('No se pudo obtener GPS para marcar el incendio');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-4 pb-8">
      {!audioEnabled && (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/90 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-100 text-center sm:text-left">
            Activa el audio para escuchar la alarma cuando la central despache.
          </p>
          <button
            type="button"
            onClick={enableAudio}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm shrink-0 shadow-md transition-all active:scale-[0.97]"
          >
            <Volume2 className="w-4 h-4" />
            Activar avisos de alarma
          </button>
        </div>
      )}

      {company && profile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0b1220] p-3.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/40 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400 font-black truncate">
                {company.number}ª COMPAÑÍA {company.city?.toUpperCase()}
              </p>
              <p className="font-black text-slate-900 dark:text-white text-sm truncate leading-snug">
                {profile.fullName}
                {profile.operativeNumber != null && (
                  <span className="text-slate-500 font-bold"> · N° {profile.operativeNumber}</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Bombero Operativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {audioEnabled && (
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                  audioMuted
                    ? 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
                    : 'border-emerald-500/50 text-emerald-300 bg-emerald-500/15'
                }`}
              >
                {audioMuted ? (
                  <span className="flex items-center gap-1"><VolumeX className="w-3.5 h-3.5" /> Silenciado</span>
                ) : (
                  <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Alarma</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-100 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 flex items-start justify-between gap-3 shadow-md">
          <div>
            <p className="font-bold">No se pudo cargar emergencias</p>
            <p className="text-xs text-amber-200/80 mt-1">
              {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? (error instanceof Error ? error.message : 'Error de conexión con la API')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-amber-950 text-xs font-bold transition-all active:scale-[0.97]"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando emergencias…
        </div>
      ) : displayIncidents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-10 text-center shadow-inner">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
          <p className="font-bold text-slate-900 dark:text-white text-lg">Sin emergencias activas</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Cuando la central despache, aparecerá aquí al instante (sincronizado con la sala pública).
          </p>
          {publicActiveCount > 0 && (
            <p className="text-xs text-amber-400 mt-3 font-semibold animate-pulse">
              La sala pública reporta {publicActiveCount} emergencia(s) activa(s) — actualizando…
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Incident List (visible on desktop, or as a small switch list on mobile if more than 1) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Siren className="w-3.5 h-3.5 text-red-500" />
                Emergencias Activas ({displayIncidents.length})
              </h2>
              {displayIncidents.length > 1 && (
                <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {displayIncidents.length} ALERTAS
                </span>
              )}
            </div>

            {/* List for Desktop */}
            <div className="hidden lg:block space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {displayIncidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  selected={selected?.id === inc.id}
                  onSelect={() => setSelectedId(inc.id)}
                />
              ))}
            </div>

            {/* Micro selector for Mobile when there are multiple active incidents */}
            {displayIncidents.length > 1 && (
              <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {displayIncidents.map((inc, index) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => setSelectedId(inc.id)}
                    className={`shrink-0 text-xs px-3 py-2 rounded-xl font-bold border transition-all ${
                      selected?.id === inc.id
                        ? 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40 shadow-sm shadow-red-950/20'
                        : 'bg-white dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Alerta {index + 1}: {inc.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Selected Incident Detail */}
          <div className="lg:col-span-8">
            {selected && (
              <div className="space-y-4">
                
                {/* ─── MOBILE VIEW (diseño operativo bombero) ─── */}
                <div className="block lg:hidden space-y-3">
                  {/* 1. Emergencia activa — card roja */}
                  <div className="rounded-2xl border-2 border-red-500/70 bg-[#140a0e] p-4 shadow-[0_0_28px_rgba(239,68,68,0.18)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/15 via-transparent to-transparent pointer-events-none" />
                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-black font-mono uppercase bg-red-600 text-white px-2 py-0.5 rounded">
                          {selected.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <span className="text-[9px] font-black tracking-wider text-red-400 uppercase">Emergencia activa</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-600/25 border border-red-500/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(239,68,68,0.35)]">
                          <Flame className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-black text-white leading-tight">
                            {selected.emergencyCodeId ? `${selected.emergencyCodeId} — ` : ''}{selected.type}
                          </h2>
                          <p className="text-sm text-slate-300 mt-1 flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <span className="font-semibold">{selected.address}</span>
                          </p>
                        </div>
                      </div>

                      {selected.radioMessage && (
                        <div className="bg-black/50 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-300 leading-relaxed">
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1 font-sans font-bold">
                            <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Despacho Central
                          </div>
                          {selected.radioMessage}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-red-900/50 pt-2">
                        <span className="uppercase tracking-wider font-bold">
                          Despachado {new Date(selected.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-red-400 font-black uppercase flex items-center gap-1.5">
                          <svg width="36" height="10" viewBox="0 0 36 10" className="opacity-80" aria-hidden>
                            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points="0,5 4,5 6,2 8,8 10,4 12,6 14,5 18,5 20,1 22,9 24,3 26,7 28,5 36,5" />
                          </svg>
                          Hace {getTimeElapsed(selected.dispatchedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Estado de respuesta — card verde (si ya respondió) */}
                  {selectedChoice && (() => {
                    const head = choiceHeadline(selectedChoice);
                    const isGoing = selectedChoice === 'GOING' || selectedChoice === 'ON_SCENE';
                    return (
                      <div
                        className={cn(
                          'rounded-2xl border-2 p-4 relative overflow-hidden',
                          head.accent === 'emerald' && 'border-emerald-500/60 bg-[#0a1610] shadow-[0_0_24px_rgba(16,185,129,0.2)]',
                          head.accent === 'sky' && 'border-sky-500/60 bg-[#0a1218] shadow-[0_0_24px_rgba(14,165,233,0.2)]',
                          head.accent === 'amber' && 'border-amber-500/50 bg-[#161208]',
                          head.accent === 'slate' && 'border-slate-600/60 bg-[#10141c]',
                          head.accent === 'red' && 'border-red-500/50 bg-[#160a0c]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2
                              className={cn(
                                'w-7 h-7 shrink-0',
                                head.accent === 'emerald' && 'text-emerald-400',
                                head.accent === 'sky' && 'text-sky-400',
                                head.accent === 'amber' && 'text-amber-400',
                                head.accent === 'slate' && 'text-slate-400',
                                head.accent === 'red' && 'text-red-400',
                              )}
                            />
                            <h3 className="text-sm sm:text-base font-black text-white leading-tight tracking-wide">
                              {head.title}
                            </h3>
                          </div>
                          <span className="shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Respuesta enviada
                          </span>
                        </div>

                        {isGoing && (
                          <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">ETA estimada</p>
                                <p className="text-3xl font-black text-emerald-400 leading-none mt-0.5">
                                  {tripStats.etaMin != null ? `${tripStats.etaMin}` : '—'}
                                  <span className="text-sm ml-1 text-emerald-500/80">MIN</span>
                                </p>
                              </div>
                              {tripStats.remainingKm != null && (
                                <p className="text-xs font-bold text-slate-400">
                                  {tripStats.remainingKm.toFixed(1)} km restantes
                                </p>
                              )}
                            </div>

                            {/* Barra de progreso cuartel → incendio */}
                            <div className="relative px-1 pt-2 pb-1">
                              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                                  style={{ width: `${Math.round(tripStats.progress * 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-2 relative">
                                <div className="flex flex-col items-center gap-0.5">
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                  <span className="text-[8px] text-slate-500 font-bold uppercase">Cuartel</span>
                                </div>
                                <div
                                  className="absolute top-0 -translate-x-1/2 transition-all duration-700"
                                  style={{ left: `${Math.round(tripStats.progress * 100)}%` }}
                                >
                                  <div className="w-8 h-8 -mt-5 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                                    <Truck className="w-4 h-4 text-emerald-300" />
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                  <MapPin className="w-4 h-4 text-red-400" />
                                  <span className="text-[8px] text-slate-500 font-bold uppercase">Lugar</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3. Botones de respuesta */}
                  <div className="rounded-2xl border border-slate-700/80 bg-[#0b1220] p-3 space-y-2.5 shadow-md">
                    <div className="grid grid-cols-3 gap-2">
                      <ResponseChoiceButton
                        status="GOING"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('GOING')}
                        className="col-span-1 flex flex-col items-center justify-center gap-1 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 disabled:opacity-50 font-black"
                        selectedClassName="!bg-emerald-600 !border-emerald-400 !text-white shadow-[0_0_22px_rgba(16,185,129,0.55)] scale-[1.02]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] uppercase tracking-wide leading-tight text-center">
                          {selectedChoice === 'GOING' ? 'Voy en camino' : 'Voy'}
                        </span>
                      </ResponseChoiceButton>

                      <ResponseChoiceButton
                        status="NOT_GOING"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('NOT_GOING')}
                        className="flex flex-col items-center justify-center gap-1 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 disabled:opacity-50 font-bold"
                        selectedClassName="!bg-slate-600 !border-slate-400 !text-white shadow-[0_0_18px_rgba(148,163,184,0.35)] scale-[1.02]"
                      >
                        <XCircle className="w-5 h-5" />
                        <span className="text-[10px]">No voy</span>
                      </ResponseChoiceButton>

                      <ResponseChoiceButton
                        status="NOT_AVAILABLE"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('NOT_AVAILABLE')}
                        className="flex flex-col items-center justify-center gap-1 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-amber-500/80 disabled:opacity-50 font-bold"
                        selectedClassName="!bg-amber-600 !border-amber-400 !text-white shadow-[0_0_18px_rgba(245,158,11,0.45)] scale-[1.02]"
                      >
                        <UserX className="w-5 h-5" />
                        <span className="text-[10px]">No disponible</span>
                      </ResponseChoiceButton>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <ResponseChoiceButton
                        status="ON_SCENE"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('ON_SCENE')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent border border-sky-500/50 text-sky-400 disabled:opacity-50 font-bold text-xs"
                        selectedClassName="!bg-sky-600 !border-sky-400 !text-white shadow-[0_0_18px_rgba(14,165,233,0.45)]"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>En el lugar</span>
                      </ResponseChoiceButton>

                      <ResponseChoiceButton
                        status="LOCATION_MARKED"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy || locating}
                        onSelect={() => void handleMarkLocation()}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent border border-red-500/50 text-red-400 disabled:opacity-50 font-bold text-xs"
                        selectedClassName="!bg-red-600 !border-red-400 !text-white shadow-[0_0_18px_rgba(239,68,68,0.45)]"
                      >
                        {locating || markMut.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Crosshair className="w-4 h-4" />
                        )}
                        <span>Marcar Incendio</span>
                      </ResponseChoiceButton>
                    </div>
                  </div>

                  {/* Radio PTT del incidente */}
                  <RadioPttPanel
                    incidentId={selected.id}
                    incidentLabel={`${selected.code} · ${selected.type}`}
                    enabled
                    canTalk={
                      selectedChoice === 'GOING' ||
                      selectedChoice === 'ON_SCENE' ||
                      selectedChoice === 'LOCATION_MARKED' ||
                      user?.role === 'OPERADOR_CENTRAL' ||
                      user?.role === 'COMANDANTE' ||
                      user?.role === 'CAPITAN' ||
                      user?.role === 'SUPER_ADMIN'
                    }
                  />

                  {/* 4. Barra stats azul */}
                  <div className="rounded-2xl border border-sky-500/40 bg-[#0a1420] px-3 py-3 grid grid-cols-3 gap-1 shadow-[0_0_16px_rgba(14,165,233,0.12)]">
                    <div className="flex flex-col items-center text-center gap-0.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Despachado</span>
                      <span className="text-xs font-black text-white">
                        {new Date(selected.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-0.5 border-x border-sky-900/60">
                      <Route className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Distancia</span>
                      <span className="text-xs font-black text-white">
                        {tripStats.totalKm != null
                          ? `${tripStats.totalKm.toFixed(1)} km`
                          : tripStats.remainingKm != null
                            ? `${tripStats.remainingKm.toFixed(1)} km`
                            : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-0.5">
                      <Flag className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">ETA est.</span>
                      <span className="text-xs font-black text-white">
                        {tripStats.etaMin != null ? `${tripStats.etaMin} min` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* 5. Mapa / dotación (secundario) */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                    <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
                      <button
                        type="button"
                        onClick={() => setMobileTab('map')}
                        className={`flex-1 py-3 text-center text-xs font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                          mobileTab === 'map'
                            ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-500/5'
                            : 'border-transparent text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        MAPA E INDICACIONES
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileTab('team')}
                        className={`flex-1 py-3 text-center text-xs font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                          mobileTab === 'team'
                            ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-500/5'
                            : 'border-transparent text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        DOTACIÓN ({selected.teamSummary.total})
                      </button>
                    </div>

                    <div className="p-4">
                      {mobileTab === 'map' && (
                        <div className="space-y-3">
                          <div className="h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                            <Map defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }} defaultZoom={15} style={{ height: '100%', width: '100%' }} className="z-0" mapId="mobile-map" disableDefaultUI>
                              <FitPoints points={mapPoints.length ? mapPoints : [mapCenter]} />
                              {selected.dispatchGps && (
                                <AdvancedMarker position={{ lat: selected.dispatchGps.latitude, lng: selected.dispatchGps.longitude }}>
                                  <DispatchIcon />
                                </AdvancedMarker>
                              )}
                              {selected.fieldGps && (
                                <AdvancedMarker position={{ lat: selected.fieldGps.latitude, lng: selected.fieldGps.longitude }}>
                                  <FieldIcon />
                                </AdvancedMarker>
                              )}
                              {pos && (
                                <AdvancedMarker position={{ lat: pos.lat, lng: pos.lng }}>
                                  <YouIcon />
                                </AdvancedMarker>
                              )}
                            </Map>
                          </div>

                          <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 px-1 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Despacho</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Ubicación Confirmada</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Tu GPS</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={locating}
                              onClick={() => void capture().then(() => toast.success('GPS actualizado')).catch(() => toast.error('Error GPS'))}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              {locating ? 'GPS…' : 'Actualizar GPS'}
                            </button>
                            {(selected.fieldGps || selected.dispatchGps) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const gps = selected.fieldGps ?? selected.dispatchGps;
                                  if (gps) openGoogleMapsDirections(gps.latitude, gps.longitude);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-sky-400 text-xs font-bold border border-slate-200 dark:border-slate-700"
                              >
                                <Navigation className="w-3.5 h-3.5 text-sky-400 rotate-45" />
                                RUTA GOOGLE MAPS
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {mobileTab === 'team' && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" /> Material Mayor Despachado
                            </h4>
                            {selected.vehicles.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic">No hay carros asignados a este incidente</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {selected.vehicles.map((v) => (
                                  <span key={v.patent} className="text-[10px] font-mono bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5" /> {v.patent}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <hr className="border-slate-200 dark:border-slate-800" />

                          <div>
                            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2.5 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Dotación Respondiendo
                            </h4>

                            <div className="grid grid-cols-4 gap-1 text-[9px] mb-3">
                              <div className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 py-1 text-center rounded font-black">
                                {selected.teamSummary.going} van
                              </div>
                              <div className="bg-sky-500/10 text-sky-300 border border-sky-500/20 py-1 text-center rounded font-black">
                                {selected.teamSummary.onScene} lugar
                              </div>
                              <div className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 py-1 text-center rounded font-black">
                                {selected.teamSummary.notAvailable} no disp
                              </div>
                              <div className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 py-1 text-center rounded font-black">
                                {selected.teamSummary.notGoing} no van
                              </div>
                            </div>

                            {selected.teamSummary.responses && selected.teamSummary.responses.length > 0 ? (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {selected.teamSummary.responses.map((r, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">{r.user.firstName} {r.user.lastName}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                                      r.status === 'GOING' ? 'bg-emerald-500/15 text-emerald-400' :
                                      r.status === 'ON_SCENE' ? 'bg-sky-500/15 text-sky-400' :
                                      r.status === 'NOT_AVAILABLE' ? 'bg-amber-500/15 text-amber-400' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}>
                                      {r.statusLabel}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">Sin respuestas registradas</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── DESKTOP VIEW (Dual Column / Complete Dashboard) ─── */}
                <div className="hidden lg:block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xl">
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-red-50 dark:from-red-950/20 to-slate-50 dark:to-slate-900/50 flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
                          {selected.code}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Despachado: {new Date(selected.dispatchedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-[11px] text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-950/50 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Hace {getTimeElapsed(selected.dispatchedAt)}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selected.type}</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                        {selected.address}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={selectedChoice} />
                      {audioEnabled && !audioMuted && (
                        <button
                          type="button"
                          onClick={() => replay({
                            id: selected.id,
                            status: 'ACTIVA',
                            emergencyCodeId: selected.emergencyCodeId,
                            radioMessage: selected.radioMessage,
                            dispatchedAt: selected.dispatchedAt,
                          })}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-700"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> Repetir alarma
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body columns */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-800">
                    {/* Map (7 Columns) */}
                    <div className="col-span-7 h-[360px] relative border-r border-slate-200 dark:border-slate-800">
                      <Map defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }} defaultZoom={15} style={{ height: '100%', width: '100%' }} className="z-0" mapId="desktop-map" disableDefaultUI>
                        <FitPoints points={mapPoints.length ? mapPoints : [mapCenter]} />
                        {selected.dispatchGps && (
                          <AdvancedMarker position={{ lat: selected.dispatchGps.latitude, lng: selected.dispatchGps.longitude }}>
                            <DispatchIcon />
                          </AdvancedMarker>
                        )}
                        {selected.fieldGps && (
                          <AdvancedMarker position={{ lat: selected.fieldGps.latitude, lng: selected.fieldGps.longitude }}>
                            <FieldIcon />
                          </AdvancedMarker>
                        )}
                        {pos && (
                          <AdvancedMarker position={{ lat: pos.lat, lng: pos.lng }}>
                            <YouIcon />
                          </AdvancedMarker>
                        )}
                      </Map>
                      <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
                        <button
                          type="button"
                          disabled={locating}
                          onClick={() => void capture().then(() => toast.success('GPS actualizado')).catch(() => toast.error('Error GPS'))}
                          className="bg-white dark:bg-slate-900/90 text-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          {locating ? 'GPS…' : 'Actualizar GPS'}
                        </button>
                        {(selected.fieldGps || selected.dispatchGps) && (
                          <button
                            type="button"
                            onClick={() => {
                              const gps = selected.fieldGps ?? selected.dispatchGps;
                              if (gps) openGoogleMapsDirections(gps.latitude, gps.longitude);
                            }}
                            className="bg-white dark:bg-slate-900/90 text-sky-400 hover:text-sky-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
                          >
                            <Navigation className="w-3.5 h-3.5 rotate-45" />
                            Abrir Ruta (Google Maps)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details and Dotation Panel (5 Columns) */}
                    <div className="col-span-5 p-4 space-y-4 max-h-[360px] overflow-y-auto">
                      {selected.radioMessage && (
                        <div className="bg-amber-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 font-mono text-xs text-amber-800 dark:text-amber-300 leading-relaxed shadow-inner">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">MÓVIL / CENTRAL:</span>
                          {selected.radioMessage}
                        </div>
                      )}

                      {selected.vehicles.length > 0 && (
                        <div>
                          <h4 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Material Despachado
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.vehicles.map((v) => (
                              <span key={v.patent} className="text-[10px] font-mono bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {v.patent}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Dotación Respondiendo
                        </h4>
                        <div className="flex flex-wrap gap-1.5 text-[9px] mb-2.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-black">{selected.teamSummary.going} van</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20 font-black">{selected.teamSummary.onScene} en lugar</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-black">{selected.teamSummary.notAvailable} no disp.</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-black">{selected.teamSummary.notGoing} no van</span>
                        </div>
                        
                        {selected.teamSummary.responses && selected.teamSummary.responses.length > 0 && (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {selected.teamSummary.responses.map((r, idx) => (
                              <p key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/40 pb-1 last:border-0 last:pb-0">
                                <span>{r.user.firstName} {r.user.lastName}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                  r.status === 'GOING' ? 'bg-emerald-500/15 text-emerald-400' :
                                  r.status === 'ON_SCENE' ? 'bg-sky-500/15 text-sky-400' :
                                  r.status === 'NOT_AVAILABLE' ? 'bg-amber-500/15 text-amber-400' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>{r.statusLabel}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Desktop) */}
                  <div className="p-6 bg-white dark:bg-slate-900/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <ResponseChoiceButton
                        status="GOING"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('GOING')}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 font-black text-white text-sm shadow-md border border-emerald-500/20"
                        selectedClassName="!bg-emerald-600 !shadow-[0_0_22px_rgba(16,185,129,0.45)] scale-[1.02]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirmar asistencia (Voy)</span>
                      </ResponseChoiceButton>
                      <ResponseChoiceButton
                        status="NOT_GOING"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('NOT_GOING')}
                        className="px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 active:scale-[0.98] disabled:opacity-50 font-bold text-slate-600 dark:text-slate-300 text-sm border border-slate-200 dark:border-slate-700"
                        selectedClassName="!bg-slate-600 !text-white !border-slate-400"
                      >
                        No voy
                      </ResponseChoiceButton>
                      <ResponseChoiceButton
                        status="NOT_AVAILABLE"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('NOT_AVAILABLE')}
                        className="px-5 py-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/45 hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.98] disabled:opacity-50 font-bold text-amber-800 dark:text-amber-300 text-sm border border-amber-300 dark:border-amber-800/40"
                        selectedClassName="!bg-amber-600 !text-white !border-amber-400"
                      >
                        No disp.
                      </ResponseChoiceButton>
                      <ResponseChoiceButton
                        status="ON_SCENE"
                        selectedStatus={selectedChoice}
                        animatingStatus={animatingStatus}
                        disabled={busy}
                        onSelect={() => void handleRespond('ON_SCENE')}
                        className="px-5 py-3.5 rounded-xl bg-sky-600/80 hover:bg-sky-500 active:scale-[0.98] disabled:opacity-50 font-bold text-white text-sm border border-sky-500/20"
                        selectedClassName="!bg-sky-600 shadow-[0_0_18px_rgba(14,165,233,0.4)]"
                      >
                        En el lugar
                      </ResponseChoiceButton>
                    </div>

                    <ResponseChoiceButton
                      status="LOCATION_MARKED"
                      selectedStatus={selectedChoice}
                      animatingStatus={animatingStatus}
                      disabled={busy || locating}
                      onSelect={() => void handleMarkLocation()}
                      className="flex items-center gap-2 py-3.5 px-6 rounded-xl border border-red-200 dark:border-red-500/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 active:scale-[0.98] disabled:opacity-50 font-black text-red-600 dark:text-red-200 text-sm shadow-md shadow-red-950/10"
                      selectedClassName="!bg-red-600 !text-white !border-red-400"
                    >
                      {locating || markMut.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Crosshair className="w-4 h-4" />
                      )}
                      <span>Marcar Incendio</span>
                    </ResponseChoiceButton>
                  </div>

                  <div className="px-6 pb-6">
                    <RadioPttPanel
                      incidentId={selected.id}
                      incidentLabel={`${selected.code} · ${selected.type}`}
                      enabled
                      canTalk={
                        selectedChoice === 'GOING' ||
                        selectedChoice === 'ON_SCENE' ||
                        selectedChoice === 'LOCATION_MARKED' ||
                        user?.role === 'OPERADOR_CENTRAL' ||
                        user?.role === 'COMANDANTE' ||
                        user?.role === 'CAPITAN' ||
                        user?.role === 'SUPER_ADMIN'
                      }
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 flex gap-3 text-xs text-slate-500 dark:text-slate-400 shadow-inner">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Al marcar <strong className="text-slate-200">No disponible</strong> se actualiza tu estado en la sala de máquinas.
          Al marcar el incendio, la central y el Mapa 360 reciben las coordenadas al instante.
        </p>
      </div>
    </div>
  );
}
