import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Siren, MapPin, Navigation, CheckCircle2, XCircle, UserX, Loader2,
  RefreshCw, Users, Truck, AlertTriangle, Crosshair, Radio, Building2, Volume2, VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { notifyDispatchLive, subscribeDispatchLive, subscribeAnyDispatchLive, PUBLIC_POLL_MS_IDLE, PUBLIC_POLL_MS_URGENT } from '../lib/dispatch-live-sync';
import { openGoogleMapsDirections } from '../lib/incident-location-pin';
import { usePublicDispatchAlarm } from '../hooks/usePublicDispatchAlarm';
import { COMPANIAS360 } from '../lib/companias360';
import { useThemeStore } from '../store/themeStore';

const AUDIO_KEY = 'nodo360_public_audio_enabled';
const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

function resolveDispatchSlug(company: CompanyInfo | null): string | null {
  if (!company) return null;
  if (company.dispatchSlug) return company.dispatchSlug;
  return COMPANIAS360.find((c) => c.number === company.number)?.slug ?? null;
}

type ResponseStatus = 'GOING' | 'NOT_GOING' | 'NOT_AVAILABLE' | 'ON_SCENE' | 'LOCATION_MARKED';

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
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 17 });
  }, [map, points]);
  return null;
}

const dispatchIcon = L.divIcon({
  className: '',
  html: '<div style="background:#f97316;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const fieldIcon = L.divIcon({
  className: '',
  html: '<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #22c55e"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const youIcon = L.divIcon({
  className: '',
  html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const [urgentPoll, setUrgentPoll] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => sessionStorage.getItem(AUDIO_KEY) === '1');
  const [audioMuted, setAudioMuted] = useState(false);
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
    const extras = fromPublic.filter((p) => !ids.has(p.id));
    return extras.length > 0 ? [...incidents, ...extras] : incidents;
  }, [incidents, publicLive, company]);

  const selected = displayIncidents.find((i) => i.id === selectedId) ?? displayIncidents[0] ?? null;

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
    onError: () => toast.error('No se pudo registrar la respuesta'),
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
    onError: () => toast.error('No se pudo marcar la ubicación'),
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

  const handleRespond = async (status: string, withGps = false) => {
    if (!selected) return;
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (withGps) {
      try {
        const p = pos ?? await capture();
        latitude = p.lat;
        longitude = p.lng;
      } catch {
        toast.error('Activa el GPS para confirmar tu posición');
        return;
      }
    }
    respondMut.mutate({ incidentId: selected.id, status, latitude, longitude });
  };

  const handleMarkLocation = async () => {
    if (!selected) return;
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
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-4 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4 min-w-0">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover border-2 border-red-500/30 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-600/15 border-2 border-red-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
                {company.number}ª Compañía · {company.city}
              </p>
              <p className="font-black text-slate-900 dark:text-white text-base truncate leading-snug">{company.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {profile.fullName}
                {profile.operativeNumber != null && (
                  <span className="text-slate-500 dark:text-slate-400"> · N° {profile.operativeNumber}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {audioEnabled && (
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                  audioMuted
                    ? 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
                    : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
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
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:bg-slate-100 dark:bg-slate-800"
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
                
                {/* ─── MOBILE VIEW (Phone-First Pager Interface) ─── */}
                <div className="block lg:hidden space-y-4">
                  {/* 1. Urgent Alert Banner */}
                  <div className="bg-gradient-to-br from-red-50 dark:from-red-950/90 to-slate-50 dark:to-slate-900/90 border border-red-200 dark:border-red-500/50 rounded-2xl p-4 shadow-xl shadow-red-950/20 relative overflow-hidden">
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute" />
                      <span className="w-2 h-2 rounded-full bg-red-500 relative" />
                      <span className="text-[9px] font-black tracking-wider text-red-600 dark:text-red-400 uppercase">PAGER ALARMA</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                          {selected.code}
                        </span>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2 leading-tight">{selected.type}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 flex items-start gap-1">
                          <MapPin className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <span className="font-semibold">{selected.address}</span>
                        </p>
                      </div>

                      {selected.radioMessage && (
                        <div className="bg-amber-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed shadow-inner">
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 font-sans font-bold">
                            <Radio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 animate-pulse" /> Despacho Central
                          </div>
                          {selected.radioMessage}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-2">
                        <span>Despachado: {new Date(selected.dispatchedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                          Hace {getTimeElapsed(selected.dispatchedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Quick Thumb Response Buttons */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Tu Respuesta</p>
                      <StatusBadge status={selected.myResponse?.status ?? null} />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {/* VOY (Emerald, Pulsing style) */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRespond('GOING')}
                        className="col-span-2 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 font-black text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/20 transition-all"
                      >
                        <CheckCircle2 className="w-6 h-6 text-white" />
                        <span className="text-base uppercase tracking-wider">Voy</span>
                      </button>
                      
                      {/* NO VOY */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => respondMut.mutate({ incidentId: selected.id, status: 'NOT_GOING' })}
                        className="col-span-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 active:scale-[0.98] disabled:opacity-50 font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all text-xs"
                      >
                        <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <span>No voy</span>
                      </button>

                      {/* NO DISPONIBLE */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => respondMut.mutate({ incidentId: selected.id, status: 'NOT_AVAILABLE' })}
                        className="col-span-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.98] disabled:opacity-50 font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40 transition-all text-xs"
                      >
                        <UserX className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                        <span>No disp.</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {/* EN EL LUGAR */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRespond('ON_SCENE')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] disabled:opacity-50 font-bold text-white border border-sky-500/30 text-xs transition-all"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>En el lugar</span>
                      </button>

                      {/* MARCAR INCENDIO */}
                      <button
                        type="button"
                        disabled={busy || locating}
                        onClick={() => void handleMarkLocation()}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:bg-red-950/30 active:scale-[0.98] disabled:opacity-50 font-bold text-red-600 dark:text-red-200 text-xs transition-all"
                      >
                        {locating || markMut.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" />
                        ) : (
                          <Crosshair className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span>Marcar Incendio</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Mobile Navigation/Tabs for secondary info */}
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
                        DOTACIÓN Y CARROS ({selected.teamSummary.total})
                      </button>
                    </div>

                    <div className="p-4">
                      {mobileTab === 'map' && (
                        <div className="space-y-3">
                          <div className="h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                            <MapContainer center={mapCenter} zoom={15} className="h-full w-full" scrollWheelZoom>
                              <TileLayer url={tileUrl} />
                              <FitPoints points={mapPoints.length ? mapPoints : [mapCenter]} />
                              {selected.dispatchGps && (
                                <Marker position={[selected.dispatchGps.latitude, selected.dispatchGps.longitude]} icon={dispatchIcon} />
                              )}
                              {selected.fieldGps && (
                                <Marker position={[selected.fieldGps.latitude, selected.fieldGps.longitude]} icon={fieldIcon} />
                              )}
                              {pos && (
                                <>
                                  <Marker position={[pos.lat, pos.lng]} icon={youIcon} />
                                  {pos.accuracy != null && pos.accuracy < 150 && (
                                    <Circle center={[pos.lat, pos.lng]} radius={pos.accuracy} pathOptions={{ color: '#3b82f6', fillOpacity: 0.06 }} />
                                  )}
                                </>
                              )}
                            </MapContainer>
                          </div>
                          
                          {/* Map Legend */}
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
                          {/* Dispatched vehicles */}
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

                          {/* Dotation responses list */}
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
                      <StatusBadge status={selected.myResponse?.status ?? null} />
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
                      <MapContainer center={mapCenter} zoom={15} className="h-full w-full" scrollWheelZoom>
                        <TileLayer url={tileUrl} />
                        <FitPoints points={mapPoints.length ? mapPoints : [mapCenter]} />
                        {selected.dispatchGps && (
                          <Marker position={[selected.dispatchGps.latitude, selected.dispatchGps.longitude]} icon={dispatchIcon} />
                        )}
                        {selected.fieldGps && (
                          <Marker position={[selected.fieldGps.latitude, selected.fieldGps.longitude]} icon={fieldIcon} />
                        )}
                        {pos && (
                          <>
                            <Marker position={[pos.lat, pos.lng]} icon={youIcon} />
                            {pos.accuracy != null && pos.accuracy < 150 && (
                              <Circle center={[pos.lat, pos.lng]} radius={pos.accuracy} pathOptions={{ color: '#3b82f6', fillOpacity: 0.06 }} />
                            )}
                          </>
                        )}
                      </MapContainer>
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
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRespond('GOING')}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 font-black text-white text-sm shadow-md transition-all border border-emerald-500/20"
                      >
                        <CheckCircle2 className="w-5 h-5 animate-pulse" />
                        <span>Confirmar asistencia (Voy)</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => respondMut.mutate({ incidentId: selected.id, status: 'NOT_GOING' })}
                        className="px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 active:scale-[0.98] disabled:opacity-50 font-bold text-slate-600 dark:text-slate-300 text-sm border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        No voy
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => respondMut.mutate({ incidentId: selected.id, status: 'NOT_AVAILABLE' })}
                        className="px-5 py-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/45 hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.98] disabled:opacity-50 font-bold text-amber-800 dark:text-amber-300 text-sm border border-amber-300 dark:border-amber-800/40 transition-all"
                      >
                        No disp.
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRespond('ON_SCENE')}
                        className="px-5 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] disabled:opacity-50 font-bold text-slate-900 dark:text-white text-sm transition-all border border-sky-500/20"
                      >
                        En el lugar
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      disabled={busy || locating}
                      onClick={() => void handleMarkLocation()}
                      className="flex items-center gap-2 py-3.5 px-6 rounded-xl border border-red-200 dark:border-red-500/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:bg-red-950/40 active:scale-[0.98] disabled:opacity-50 font-black text-red-600 dark:text-red-200 text-sm transition-all shadow-md shadow-red-950/10"
                    >
                      {locating || markMut.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" />
                      ) : (
                        <Crosshair className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span>Marcar Incendio</span>
                    </button>
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
