import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck, AlertTriangle, Volume2, VolumeX, Siren,
  MapPin, Building2, Square, Settings,
  CheckCircle2, X, Crosshair, ExternalLink, BookOpen,
  Globe, Copy, UserX, Star, Search, ChevronDown, ChevronUp,
  Clock, Keyboard, Loader2, Users, LogOut, Menu, LayoutGrid, Sun, Moon, MessageCircle, GraduationCap,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { botoneraTypeToIncident } from '../lib/dispatch';
import { buildDispatchRadioMessage } from '../lib/dispatch-message';
import {
  EMERGENCY_MAIN_TYPES,
  EMERGENCY_DIGIT_SHORTCUTS,
  EMERGENCY_MAIN_DIGIT_KEY,
  findEmergencyEntry,
  findEmergencyMainType,
  getActiveMainWithSubdivisions,
  isEmergencyTypeReadyForDispatch,
  type EmergencyMainType,
  type EmergencySubdivision,
} from '../lib/emergency-codes';
import DispatchTutorialOverlay from '../components/dispatch/DispatchTutorialOverlay';
import DispatchMapPicker from '../components/map/DispatchMapPicker';
import DispatchVoiceConfigToggle from '../components/dispatch/DispatchVoiceConfigToggle';
import CompanyMaquinistaAlert from '../components/dispatch/CompanyMaquinistaAlert';
import {
  DISPATCH_TTS_VOICES,
  loadDispatchVoiceEnabled,
  saveDispatchVoiceEnabled,
  type DispatchTtsVoiceId,
} from '../lib/dispatch-tts-voices';
import {
  loadDispatchSoundMode,
  saveDispatchSoundMode,
  EMERGENCY_AUDIO_FILES,
  DISPATCH_SIREN_FILE,
  listBotoneraAudioEntries,
  hasEmergencyAudioFile,
  type DispatchSoundMode,
} from '../lib/emergency-sounds';
import { useDispatchAudio } from '../hooks/useDispatchAudio';
import {
  loadDispatchTtsSettings,
  previewDispatchVoice,
  saveDispatchTtsSettings,
  useDispatchTTS,
} from '../hooks/useDispatchTTS';
import {
  companyIdsFromDispatchResponse,
  notifyDispatchLive,
} from '../lib/dispatch-live-sync';
import { useBotoneraTheme } from '../hooks/useBotoneraTheme';
import type { BotoneraThemeTokens } from '../lib/botonera-theme';
import {
  confirmDispatchWithoutMaquinista,
  formatCompanyLabel,
  getMaquinistaAvailableCount,
  hasMaquinistaAvailable,
} from '../lib/company-dispatch-readiness';
import {
  buildLocationPinUrl,
  buildLocationPinWhatsAppMessage,
  buildWhatsAppShareUrl,
} from '../lib/incident-location-pin';

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=cl&accept-language=es`,
    { headers: { 'Accept-Language': 'es' } },
  );
  const data = await res.json();
  if (!data?.[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
    { headers: { 'Accept-Language': 'es' } },
  );
  const data = await res.json();
  return data.display_name ?? null;
}

/* ══════════════════════════════════════════
   COMPONENTE BOTONERA
══════════════════════════════════════════ */
const PRIMARY_EMERGENCY_KEYS = EMERGENCY_MAIN_TYPES.filter((m) => /^10-[0-9]$/.test(m.id));
const EXTENDED_EMERGENCY_KEYS = EMERGENCY_MAIN_TYPES.filter((m) => /^10-1[0-2]$/.test(m.id));

function EmergencyKeyButton({
  main,
  selectedType,
  dispatching,
  onClick,
  bt,
}: {
  main: EmergencyMainType;
  selectedType: string;
  dispatching: boolean;
  onClick: () => void;
  bt: BotoneraThemeTokens;
}) {
  const Icon = main.icon;
  const childSelected = main.subdivisions?.some((s) => s.id === selectedType);
  const isSelected = selectedType === main.id || childSelected;
  const hasAudio = hasEmergencyAudioFile(main.id);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dispatching}
      title={`${main.code} — ${main.label}${hasAudio ? ' · tono MP3' : ''}`}
      className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 font-semibold text-[10px] sm:text-xs transition-all active:scale-95 min-h-[64px] sm:min-h-[72px] touch-manipulation ${
        isSelected
          ? `${main.color} ${main.text} border-transparent ring-2 ${main.ring}/60 shadow-lg`
          : bt.emergencyKeyIdle
      }`}
    >
      <span className={`absolute top-1 left-1 text-[9px] font-mono font-bold px-1 py-0.5 rounded leading-none ${isSelected ? 'bg-black/30 text-white' : bt.emergencyKeyCode}`}>
        {main.code}
      </span>
      {EMERGENCY_MAIN_DIGIT_KEY[main.id] && (
        <span className={`absolute top-1 right-1 text-[8px] font-mono opacity-60 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
          {EMERGENCY_MAIN_DIGIT_KEY[main.id]}
        </span>
      )}
      {hasAudio && (
        <span className={`absolute bottom-1 right-1 ${isSelected ? 'text-white/70' : 'text-amber-500/70'}`}>
          <Volume2 className="w-3 h-3" />
        </span>
      )}
      <Icon className={`w-5 h-5 mt-2 ${isSelected ? main.text : bt.emergencyKeyIcon}`} />
      <span className="text-center leading-tight line-clamp-2 px-0.5">{main.shortLabel}</span>
      {main.subdivisions?.length ? (
        <span className={`text-[8px] font-bold uppercase tracking-wide ${isSelected ? 'text-white/80' : 'text-amber-500/80'}`}>
          + detalle
        </span>
      ) : null}
    </button>
  );
}

function AudioPreviewButton({
  entry,
  muted,
  onPlay,
  bt,
}: {
  entry: ReturnType<typeof listBotoneraAudioEntries>[number];
  muted: boolean;
  onPlay: () => void;
  bt: BotoneraThemeTokens;
}) {
  return (
    <button
      type="button"
      onClick={() => { if (!muted) void onPlay(); }}
      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
        entry.isSubdivision ? bt.audioPreviewBtnSub : bt.audioPreviewBtn
      }`}
    >
      <span className="shrink-0 w-7 h-7 rounded-md bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-mono font-bold text-xs text-amber-400">{entry.code}</span>
        <span className="block text-[10px] text-slate-400 truncate">
          {entry.file ?? 'sin archivo'}
          {entry.isSubdivision && entry.parentCode ? ` ← ${entry.parentCode}` : ''}
        </span>
      </span>
    </button>
  );
}

export default function BotoneraPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { tokens: bt, toggleTheme, isDark } = useBotoneraTheme();
  const [soundMode, setSoundMode] = useState<DispatchSoundMode>(() => loadDispatchSoundMode());
  const { playSiren, playBeep, playEmergencySound, playEmergencyKeyTone } = useDispatchAudio(soundMode);
  const [ttsVoiceId, setTtsVoiceId] = useState<DispatchTtsVoiceId>(() => loadDispatchTtsSettings().voiceId);
  const [ttsRate, setTtsRate] = useState(() => loadDispatchTtsSettings().ratePercent);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const { speak, stop } = useDispatchTTS({ voiceId: ttsVoiceId, ratePercent: ttsRate });

  /* Estado del despacho */
  const [selectedType, setSelectedType]   = useState<string>('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [address, setAddress]             = useState('');
  const [latitude, setLatitude]           = useState('');
  const [longitude, setLongitude]         = useState('');
  const [pickOnMap, setPickOnMap]         = useState(true);
  const [notes, setNotes]                 = useState('');
  const [selectedCia, setSelectedCia]     = useState(user?.companyId ?? '');
  const [tutorialActive, setTutorialActive] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('nodo360_dispatch_tutorial_completed');
    if (!completed) {
      setTutorialActive(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    setTutorialActive(false);
    localStorage.setItem('nodo360_dispatch_tutorial_completed', 'true');
  };
  const [muted, setMuted]                 = useState(false);
  const [dispatching, setDispatching]     = useState(false);
  const [lastDispatch, setLastDispatch]   = useState<any>(null);
  const [locationPinPhone, setLocationPinPhone] = useState(() => localStorage.getItem('nodo360_location_pin_phone') ?? '');
  const [showConfig, setShowConfig]       = useState(false);
  const [repeatCount, setRepeatCount]     = useState(2);
  const [sirenDuration, setSirenDuration] = useState(3);
  const [voiceEnabled, setVoiceEnabledState] = useState(() => loadDispatchVoiceEnabled());
  const setVoiceEnabled = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setVoiceEnabledState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveDispatchVoiceEnabled(next);
      return next;
    });
  }, []);
  const [geocoding, setGeocoding]         = useState(false);
  const [showPublicPanel, setShowPublicPanel] = useState(false);
  const [showPersonal, setShowPersonal]   = useState(false);
  const [now, setNow]                     = useState(() => new Date());
  
  // PRE-DISPATCH GPS LOGIC
  const [preDispatchToken, setPreDispatchToken] = useState<string | null>(null);

  useEffect(() => {
    if (!preDispatchToken) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/location-pin/pre-dispatch/${preDispatchToken}`);
        if (res.data?.found && res.data?.data) {
          const { lat, lng } = res.data.data;
          setLatitude(lat.toFixed(6));
          setLongitude(lng.toFixed(6));
          setPickOnMap(true); // Cambiar vista a mapa
          toast.success('¡Coordenadas recibidas del reportante!', { duration: 6000 });
          setPreDispatchToken(null);
          
          // Opcional: auto geocodificar para rellenar dirección
          try {
            const label = await reverseGeocode(lat, lng);
            if (label) setAddress((prev) => prev.trim() || label.split(',').slice(0, 3).join(', '));
          } catch { /* ignorar */ }
        }
      } catch { /* polling fail */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [preDispatchToken]);

  const handlePreDispatchWa = () => {
    const phone = locationPinPhone.trim();
    if (!phone || phone.length < 8) {
      toast.error('Ingresa el número de WhatsApp (ej. 569...)');
      return;
    }
    const token = 'pre_' + crypto.randomUUID().replace(/-/g, '');
    setPreDispatchToken(token);
    
    const url = buildLocationPinUrl(token);
    const message = buildLocationPinWhatsAppMessage({
      code: selectedType ? findEmergencyEntry(selectedType)?.code || '10-0' : '10-0',
      type: selectedType ? findEmergencyEntry(selectedType)?.label || 'Emergencia' : 'Emergencia en curso',
      address: address.trim() || 'Por confirmar',
      url,
    });
    
    const wa = buildWhatsAppShareUrl(phone, message);
    if (!wa) {
      toast.error('Número inválido');
      return;
    }
    window.open(wa, '_blank', 'noopener,noreferrer');
    toast('Esperando coordenadas del reportante...', { icon: '⏳' });
  };
  const pendingPersistRef = useRef(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const keyboardRef = useRef({
    dispatching: false,
    canDispatch: false,
    ciaVehicles: [] as any[],
    handleEmergencyTypeClick: (_main: EmergencyMainType) => {},
    handleSubdivisionClick: (_sub: EmergencySubdivision, _main: EmergencyMainType) => {},
    handleDispatch: () => {},
    handleStop: () => {},
    toggleVehicle: (_id: string) => {},
  });

  /* Datos */
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });
  const { data: vehicles }  = useQuery({ queryKey: ['vehicles'],  queryFn: () => api.get('/vehicles').then(r => r.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const { data: dispatchConfig, refetch: refetchDispatch } = useQuery({
    queryKey: ['dispatch-central-config', selectedCia],
    queryFn: () => api.get('/dispatch/central/config', { params: { companyId: selectedCia } }).then(r => r.data),
    enabled: !!selectedCia,
    refetchInterval: selectedCia ? 10000 : false,
  });

  const updateDispatchConfig = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch(`/dispatch/central/${selectedCia}`, payload),
    onSuccess: () => {
      refetchDispatch();
      toast.success('Central pública actualizada');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al guardar'),
  });

  const ensureSlug = useMutation({
    mutationFn: () => api.post(`/dispatch/central/${selectedCia}/ensure-slug`),
    onSuccess: () => refetchDispatch(),
  });

  const publicUrl = dispatchConfig?.dispatchSlug
    ? `${window.location.origin}/central/${dispatchConfig.dispatchSlug}`
    : null;

  const copyPublicUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada al portapapeles');
  };

  const copyLocationPinUrl = (token: string) => {
    const url = buildLocationPinUrl(token);
    navigator.clipboard.writeText(url);
    toast.success('Link de localización GPS copiado');
  };

  const sendLocationPinWhatsApp = (incident: { locationPinToken?: string; code: string; type: string; address: string }) => {
    if (!incident.locationPinToken) {
      toast.error('Esta emergencia no tiene link de GPS');
      return;
    }
    const phone = locationPinPhone.trim();
    if (!phone) {
      toast.error('Ingresa el número de WhatsApp (ej. 56912345678)');
      return;
    }
    localStorage.setItem('nodo360_location_pin_phone', phone);
    const url = buildLocationPinUrl(incident.locationPinToken);
    const message = buildLocationPinWhatsAppMessage({
      code: incident.code,
      type: incident.type,
      address: incident.address,
      url,
    });
    const wa = buildWhatsAppShareUrl(phone, message);
    if (!wa) {
      toast.error('Número de WhatsApp inválido');
      return;
    }
    window.open(wa, '_blank', 'noopener,noreferrer');
  };

  const persistDispatch = useMutation({
    mutationFn: (payload: unknown) => api.post('/incidents/dispatch', payload),
    onSuccess: (res) => {
      const d = res.data;
      notifyDispatchLive({
        companyIds: companyIdsFromDispatchResponse(d),
        incidentId: d.id,
      });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents-stats'] });
      qc.invalidateQueries({ queryKey: ['operational-map'] });
      qc.invalidateQueries({ queryKey: ['guard-log-dashboard'] });
      qc.invalidateQueries({ queryKey: ['emergency-response-active'] });
      setLastDispatch((prev: any) => ({ ...prev, incident: d }));
      if (d.locationPinToken && locationPinPhone.trim().length >= 8) {
        setTimeout(() => sendLocationPinWhatsApp(d), 500);
      }
      if (d.guardLogLinked) {
        toast.success(
          (t) => (
            <span className="flex flex-col gap-1">
              <span>Emergencia <strong>{d.code}</strong> — novedad en bitácora</span>
              {d.emergencyPlan?.title && (
                <span className="text-xs opacity-80">Plan: {d.emergencyPlan.title}</span>
              )}
              <Link
                to={`/guard-log?companyId=${d.companyId}`}
                className="text-xs font-semibold underline"
                onClick={() => toast.dismiss(t.id)}
              >
                Abrir bitácora del día →
              </Link>
            </span>
          ),
          { duration: 8000 },
        );
      } else {
        toast.success(`Emergencia ${d.code} registrada`);
      }
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? 'Error al registrar despacho');
    },
  });

  const ciaVehicles = (vehicles ?? []).filter((v: any) =>
    !selectedCia || v.companyId === selectedCia
  ).filter((v: any) => v.status === 'OPERATIVO');

  const ciaUsers = (users ?? []).filter((u: any) =>
    !selectedCia || u.companyId === selectedCia
  );

  const company = (companies ?? []).find((c: any) => c.id === selectedCia);
  const emergType = findEmergencyEntry(selectedType);
  const activeMainWithSubs = getActiveMainWithSubdivisions(selectedType);

  const onMapPick = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    try {
      const label = await reverseGeocode(lat, lng);
      if (label) setAddress((prev) => prev.trim() || label.split(',').slice(0, 3).join(', '));
    } catch { /* sin red */ }
    toast.success('Ubicación marcada en mapa');
  }, []);

  const searchAddressOnMap = useCallback(async () => {
    const q = address.trim();
    if (!q) {
      addressInputRef.current?.focus();
      toast.error('Escribe una dirección para buscar');
      return;
    }
    setGeocoding(true);
    try {
      const hit = await geocodeAddress(q);
      if (!hit) {
        toast.error('No se encontró la dirección en el mapa');
        return;
      }
      setLatitude(hit.lat.toFixed(6));
      setLongitude(hit.lng.toFixed(6));
      setAddress(hit.label.split(',').slice(0, 4).join(', '));
      toast.success('Dirección ubicada en mapa');
    } catch {
      toast.error('Error al buscar dirección');
    } finally {
      setGeocoding(false);
    }
  }, [address]);

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  /* Toggle vehículo */
  const toggleVehicle = (id: string) => {
    setSelectedVehicles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    if (!muted) playBeep(660, 120);
  };

  const getVehicleIdsForDispatch = useCallback((override?: string[]) => {
    if (override?.length) return override;
    if (selectedVehicles.length > 0) return selectedVehicles;
    if (ciaVehicles.length === 1) return [ciaVehicles[0].id];
    return [];
  }, [selectedVehicles, ciaVehicles]);

  const buildMessage = useCallback((typeId?: string, vehicleIds?: string[], addr?: string) => {
    const tid = typeId ?? selectedType;
    const aids = vehicleIds ?? selectedVehicles;
    const a = addr ?? address;
    return buildDispatchRadioMessage(tid, a, aids, (vehicles ?? []) as { id: string; patent: string; type?: string }[]);
  }, [selectedType, selectedVehicles, address, vehicles]);

  const runDispatch = useCallback(async (opts?: { typeId?: string; vehicleIds?: string[]; keyToneAlreadyPlayed?: boolean }) => {
    const typeId = opts?.typeId ?? selectedType;
    const emerg = findEmergencyEntry(typeId);
    const vehicleIds = getVehicleIdsForDispatch(opts?.vehicleIds);

    if (!typeId || !emerg) { toast.error('Selecciona el tipo de emergencia'); return; }
    if (!isEmergencyTypeReadyForDispatch(typeId)) {
      toast.error('Selecciona el detalle de la clave');
      return;
    }
    if (!address.trim()) { toast.error('Ingresa la dirección de la emergencia'); return; }
    if (!selectedCia) { toast.error('Selecciona la compañía despachante'); return; }
    if (vehicleIds.length === 0) { toast.error('Selecciona al menos un carro a despachar'); return; }

    if (!hasMaquinistaAvailable(dispatchConfig?.maquinistas)) {
      if (!confirmDispatchWithoutMaquinista(formatCompanyLabel(company))) return;
    }

    if (opts?.vehicleIds && opts.vehicleIds.length > 0) {
      setSelectedVehicles(opts.vehicleIds);
    }
    if (opts?.typeId) setSelectedType(opts.typeId);

    pendingPersistRef.current = true;
    setDispatching(true);

    const radioMsg = buildDispatchRadioMessage(typeId, address, vehicleIds, (vehicles ?? []) as { id: string; patent: string; type?: string }[]);
    let skipKeyTone = opts?.keyToneAlreadyPlayed ?? false;

    const doDispatch = async (remaining: number) => {
      if (remaining <= 0) {
        setDispatching(false);
        setLastDispatch({
          type: `${emerg.code} — ${emerg.label}`,
          code: emerg.code,
          address,
          vehicles: vehicleIds.map(id => (vehicles ?? []).find((x: any) => x.id === id)).filter(Boolean),
          participants: selectedParticipants.map(id => (users ?? []).find((x: any) => x.id === id)).filter(Boolean),
          company,
          time: new Date(),
          notes,
          latitude,
          longitude,
        });
        toast.success(`Despacho emitido × ${repeatCount}`);
        if (pendingPersistRef.current) {
          pendingPersistRef.current = false;
          try {
            await persistDispatch.mutateAsync({
              type: botoneraTypeToIncident(typeId),
              address: address.trim(),
              description: notes.trim() || radioMsg || `Despacho clave ${emerg.code}: ${emerg.label}`,
              companyId: selectedCia,
              vehicleIds,
              participantIds: selectedParticipants.length ? selectedParticipants : undefined,
              latitude: latitude ? parseFloat(latitude) : undefined,
              longitude: longitude ? parseFloat(longitude) : undefined,
              dispatchNotes: notes.trim() || undefined,
              dispatchSource: 'BOTONERA',
              locationPinToken: preDispatchToken || undefined,
            });
            qc.invalidateQueries({ queryKey: ['incidents'] });
            qc.invalidateQueries({ queryKey: ['guard-log-dashboard'] });
          } catch { /* toast en mutation */ }
        }
        return;
      }

      /* 1 — Tono MP3 de la clave (public/Audio/) */
      if (!muted) {
        if (!skipKeyTone) await playEmergencyKeyTone(typeId);
        skipKeyTone = false;
      }

      await new Promise<void>(res => setTimeout(res, 250));

      /* 2 — Sirena de alerta */
      if (!muted) await playSiren(sirenDuration * 1000);

      await new Promise<void>(res => setTimeout(res, 250));

      /* 3 — Voz: mensaje radial */
      if (voiceEnabled && radioMsg) {
        await new Promise<void>(res => speak(radioMsg, res));
      }

      await new Promise<void>(res => setTimeout(res, 600));
      doDispatch(remaining - 1);
    };

    doDispatch(repeatCount);
  }, [
    selectedType, address, selectedCia, getVehicleIdsForDispatch, repeatCount, muted, playEmergencyKeyTone, playSiren, sirenDuration,
    voiceEnabled, speak, vehicles, selectedParticipants, users, company, notes, latitude,
    longitude, persistDispatch, qc, dispatchConfig,
  ]);

  const tryAutoDispatch = useCallback((typeId: string) => {
    if (!address.trim()) {
      toast('Clave seleccionada — ingresa la dirección', { icon: '📍' });
      return;
    }
    if (!selectedCia) {
      toast.error('Selecciona la compañía');
      return;
    }
    const vIds = getVehicleIdsForDispatch();
    if (vIds.length === 0) {
      toast.error('Selecciona el carro a despachar');
      return;
    }
    runDispatch({ typeId, vehicleIds: vIds, keyToneAlreadyPlayed: true });
  }, [address, selectedCia, getVehicleIdsForDispatch, runDispatch]);

  const handleEmergencyTypeClick = (main: EmergencyMainType) => {
    if (dispatching) return;
    const childSelected = main.subdivisions?.some((s) => s.id === selectedType);
    const isSelected = selectedType === main.id || childSelected;

    if (isSelected && !childSelected) {
      setSelectedType('');
      if (!muted) void playEmergencyKeyTone(main.id);
      return;
    }

    setSelectedType(main.id);
    if (!muted) void playEmergencyKeyTone(main.id);

    if (main.subdivisions?.length) {
      toast(`Clave ${main.code} — elige el detalle abajo`, { icon: '🔖' });
      return;
    }

    tryAutoDispatch(main.id);
  };

  const handleSubdivisionClick = (sub: EmergencySubdivision, main: EmergencyMainType) => {
    if (dispatching) return;

    if (selectedType === sub.id) {
      setSelectedType(main.id);
      if (!muted) void playEmergencyKeyTone(main.id);
      return;
    }

    setSelectedType(sub.id);
    if (!muted) void playEmergencyKeyTone(sub.id);
    tryAutoDispatch(sub.id);
  };

  /* DESPACHO manual */
  const handleDispatch = () => runDispatch();

  /* Detener */
  const handleStop = () => {
    stop();
    setDispatching(false);
    pendingPersistRef.current = false;
    if (!muted) playBeep(440, 300);
  };

  /* Preview de voz */
  const handlePreview = () => {
    const vIds = getVehicleIdsForDispatch();
    const msg = buildMessage(selectedType, vIds, address);
    if (!msg) { toast.error('Completa tipo, dirección y carro'); return; }
    if (!muted && selectedType) void playEmergencyKeyTone(selectedType);
    speak(msg);
  };

  const handlePreviewVoice = async () => {
    setPreviewingVoice(true);
    try {
      await previewDispatchVoice(ttsVoiceId, ttsRate);
    } finally {
      setPreviewingVoice(false);
    }
  };

  const selectTtsVoice = (id: DispatchTtsVoiceId) => {
    setTtsVoiceId(id);
    saveDispatchTtsSettings(id, ttsRate);
  };

  const changeTtsRate = (rate: number) => {
    setTtsRate(rate);
    saveDispatchTtsSettings(ttsVoiceId, rate);
  };

  const canDispatch = !!(
    selectedType
    && isEmergencyTypeReadyForDispatch(selectedType)
    && address.trim()
    && selectedCia
    && getVehicleIdsForDispatch().length > 0
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    keyboardRef.current = {
      dispatching,
      canDispatch,
      ciaVehicles,
      handleEmergencyTypeClick,
      handleSubdivisionClick,
      handleDispatch,
      handleStop,
      toggleVehicle,
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';

      if (typing) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const { canDispatch: ok, dispatching: busy, handleDispatch: go } = keyboardRef.current;
          if (ok && !busy) { e.preventDefault(); go(); }
        }
        return;
      }

      const key = e.key.length === 1 ? e.key : e.key;
      const mainId = EMERGENCY_DIGIT_SHORTCUTS[key];
      if (mainId) {
        const main = findEmergencyMainType(mainId);
        if (main) {
          e.preventDefault();
          keyboardRef.current.handleEmergencyTypeClick(main);
        }
        return;
      }

      const fMatch = key.match(/^F(\d+)$/i);
      if (fMatch) {
        const idx = parseInt(fMatch[1], 10) - 1;
        const v = keyboardRef.current.ciaVehicles[idx];
        if (v) {
          e.preventDefault();
          keyboardRef.current.toggleVehicle(v.id);
        }
        return;
      }

      if (key === 'Enter') {
        const { canDispatch: ok, dispatching: busy, handleDispatch: go } = keyboardRef.current;
        if (ok && !busy) { e.preventDefault(); go(); }
        return;
      }

      if (key === 'Escape' && keyboardRef.current.dispatching) {
        e.preventDefault();
        keyboardRef.current.handleStop();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const maquinistasAvailable = getMaquinistaAvailableCount(dispatchConfig?.maquinistas);

  const readiness = [
    { ok: !!selectedCia, label: 'Compañía' },
    { ok: !!address.trim(), label: 'Ubicación' },
    { ok: isEmergencyTypeReadyForDispatch(selectedType), label: 'Clave' },
    { ok: getVehicleIdsForDispatch().length > 0, label: 'Carro' },
    { ok: hasMaquinistaAvailable(dispatchConfig?.maquinistas), label: 'Maquinista' },
  ];

  return (
    <div className={`relative flex flex-col h-full min-h-0 w-full overflow-hidden supports-[height:100dvh]:max-lg:min-h-[100dvh] transition-colors ${bt.shell}`}>

      {/* ── BARRA SUPERIOR OPERADORA ── */}
      <header className={`shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b z-20 safe-area-top ${bt.header}`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link
            to="/nodo360"
            className={`lg:hidden shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${bt.menuBtn}`}
            title="Menú NODO360"
          >
            <Menu className="w-4 h-4" />
          </Link>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${dispatching ? 'bg-red-600 animate-pulse shadow-red-600/50' : 'bg-red-700 shadow-red-700/30'}`}>
            <Siren className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-base sm:text-lg font-bold flex flex-wrap items-center gap-1.5 sm:gap-2 ${bt.headerTitle}`}>
              <span className="truncate">Despacho<span className="text-red-500">360</span></span>
              {dispatching && <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse shrink-0">● EN VIVO</span>}
            </h1>
            <p className={`text-[10px] sm:text-xs truncate max-w-[52vw] sm:max-w-none ${bt.headerSub}`}>
              <span className="sm:hidden">{user?.firstName}</span>
              <span className="hidden sm:inline">{user?.firstName} {user?.lastName}</span>
              <span className={`hidden md:inline mx-1 ${bt.hint}`}>·</span>
              <span className="hidden md:inline">Claves 10-X · 0–9 · F1–F8 · Enter</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className={`flex sm:hidden items-center gap-1 text-xs font-mono tabular-nums rounded-lg px-2 py-1 border ${bt.clockBox}`}>
            <Clock className={`w-3 h-3 ${bt.hint}`} />
            {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`hidden sm:flex items-center gap-1.5 text-sm font-mono tabular-nums rounded-lg px-3 py-1.5 border ${bt.clockBox}`}>
            <Clock className={`w-3.5 h-3.5 ${bt.hint}`} />
            {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${bt.btnTool}`}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setTutorialActive(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${tutorialActive ? bt.btnToolActive : bt.btnTool}`}
            title="Guía de Despacho"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Guía</span>
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${muted ? bt.btnToolMuted : bt.btnTool}`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{muted ? 'Mudo' : 'Sonido'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((c) => !c)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${showConfig ? bt.btnToolActive : bt.btnTool}`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Audio</span>
          </button>
          <Link
            to="/central-despachos/variantes"
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${bt.btnTool}`}
            title="5 versiones alternativas de botonera"
          >
            <LayoutGrid className="w-4 h-4" />
            Variantes
          </Link>
          
        </div>
      </header>

      {showConfig && (
        <div className={`shrink-0 border-b px-3 sm:px-4 py-3 sm:py-4 space-y-4 max-h-[min(55vh,420px)] sm:max-h-[40vh] overflow-y-auto scrollbar-thin ${bt.configPanel}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold flex items-center gap-2 ${bt.configTitle}`}>
              <Settings className={`w-3.5 h-3.5 ${bt.hint}`} />
              Configuración de audio
            </h3>
            <button type="button" onClick={() => setShowConfig(false)}>
              <X className={`w-4 h-4 ${bt.hint} hover:opacity-80`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[10px] mb-1.5 uppercase tracking-wide ${bt.configLabel}`}>Repeticiones</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => setRepeatCount(n)}
                    className={`w-9 h-9 rounded-lg font-bold text-xs ${repeatCount === n ? bt.configChipActive : bt.configChip}`}>
                    {n}×
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-[10px] mb-1.5 uppercase tracking-wide ${bt.configLabel}`}>Sirena</label>
              <div className="flex gap-2">
                {[2, 3, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setSirenDuration(n)}
                    className={`w-9 h-9 rounded-lg font-bold text-xs ${sirenDuration === n ? bt.configChipActive : bt.configChip}`}>
                    {n}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-[10px] mb-1.5 uppercase tracking-wide ${bt.configLabel}`}>Voz asistente</label>
              <DispatchVoiceConfigToggle enabled={voiceEnabled} onChange={setVoiceEnabled} compact isDark={isDark} />
            </div>
          </div>

          <div className={`border-t pt-4 space-y-3 ${bt.configBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-white">Voz Microsoft Edge TTS</p>
                <p className="text-[10px] text-slate-500">Voces neuronales gratuitas — recomendado para central</p>
              </div>
              <button
                type="button"
                onClick={handlePreviewVoice}
                disabled={previewingVoice || !voiceEnabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-xs font-semibold hover:bg-sky-600/30 disabled:opacity-50"
              >
                {previewingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                Probar voz
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISPATCH_TTS_VOICES.map((v) => {
                const selected = ttsVoiceId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectTtsVoice(v.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-sky-500 bg-sky-600/15 shadow-lg shadow-sky-600/10'
                        : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${selected ? 'text-sky-200' : 'text-white'}`}>{v.label}</p>
                        <p className="text-[10px] text-slate-500">{v.locale} · {v.gender}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                    </div>
                    <p className={`text-[11px] mt-1 ${selected ? 'text-sky-300/90' : 'text-slate-400'}`}>{v.hint}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-2 uppercase tracking-wide">
                Velocidad de voz ({ttsRate > 0 ? '+' : ''}{ttsRate}%)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Normal', value: 0 },
                  { label: 'Rápida', value: 8 },
                  { label: 'Muy rápida', value: 15 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeTtsRate(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      ttsRate === opt.value
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-white">Tonos por clave de emergencia</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Archivos MP3 en <code className="text-amber-500/90">public/Audio/</code> — un tono por botón 10-X. Toca ▶ para probar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'files' as const, label: 'MP3 central (recomendado)' },
                  { id: 'auto' as const, label: 'Auto (MP3 + respaldo sintético)' },
                  { id: 'synthetic' as const, label: 'Sintético' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSoundMode(opt.id);
                    saveDispatchSoundMode(opt.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                    soundMode === opt.id
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sirena de despacho</p>
                <button
                  type="button"
                  onClick={() => { if (!muted) void playSiren(3000); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-red-800/50 bg-red-950/30 hover:border-red-600/50 text-left"
                >
                  <Volume2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-200 font-mono truncate">{DISPATCH_SIREN_FILE}</span>
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Claves 10-0 … 10-9</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {listBotoneraAudioEntries().filter((e) => !e.isSubdivision && /^10-[0-9]$/.test(e.id)).map((entry) => (
                    <AudioPreviewButton key={entry.id} entry={entry} muted={muted} onPlay={() => playEmergencyKeyTone(entry.id)} bt={bt} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Claves 10-10 … 10-12</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {listBotoneraAudioEntries().filter((e) => !e.isSubdivision && /^10-1[0-2]$/.test(e.id)).map((entry) => (
                    <AudioPreviewButton key={entry.id} entry={entry} muted={muted} onPlay={() => playEmergencyKeyTone(entry.id)} bt={bt} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Subdivisiones (tono del padre)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {listBotoneraAudioEntries().filter((e) => e.isSubdivision).map((entry) => (
                    <AudioPreviewButton key={entry.id} entry={entry} muted={muted} onPlay={() => playEmergencyKeyTone(entry.id)} bt={bt} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL (responsive: móvil scroll + orden optimizado) ── */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[auto_minmax(160px,1fr)_minmax(200px,1fr)] min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-thin pb-24 lg:pb-0">

        {/* Compañía + dirección */}
        <div id="step-ubicacion" className={`order-1 lg:order-none lg:col-span-8 lg:row-start-1 shrink-0 p-3 sm:p-4 pb-2 sm:pb-3 space-y-3 border-b ${bt.formBand}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="step-companias">
                <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${bt.formLabel}`}>Compañía despachante</label>
                <div className="relative">
                  <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-red-400'}`} />
                  <select
                    value={selectedCia}
                    onChange={(e) => {
                      setSelectedCia(e.target.value);
                      setSelectedVehicles([]);
                      setSelectedParticipants([]);
                    }}
                    className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:outline-none appearance-none ${bt.input}`}
                  >
                    <option value="">Seleccionar compañía…</option>
                    {(companies ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.number}ª Cía. — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${bt.formLabel}`}>Dirección / ubicación</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                    <input
                      ref={addressInputRef}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddressOnMap(); } }}
                      placeholder="Calle, número, comuna…"
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none ${bt.input}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={searchAddressOnMap}
                    disabled={geocoding}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
              </div>
            </div>

            {selectedCia && dispatchConfig && (
              <CompanyMaquinistaAlert
                company={company}
                availableCount={maquinistasAvailable}
                isDark={isDark}
              />
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={1}
              placeholder="Observaciones (opcional): acceso, piso, víctimas…"
              className={`w-full border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none ${bt.textarea}`}
            />
          </div>

        {/* Mapa */}
        <div className={`order-2 lg:order-none lg:col-span-8 lg:row-start-2 relative w-full shrink-0 h-[min(38vh,340px)] min-h-[200px] sm:min-h-[240px] md:h-[36vh] lg:h-full lg:min-h-0 overflow-hidden lg:border-r ${bt.mapBorder}`}>
            <DispatchMapPicker
              latitude={latitude}
              longitude={longitude}
              pickActive={pickOnMap}
              onPick={onMapPick}
              height="100%"
              theme={bt.mapTheme}
              showGpsPanel
            />
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-[500] pointer-events-none">
              <button
                type="button"
                onClick={() => setPickOnMap((p) => !p)}
                className={`pointer-events-auto flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold shadow-md border transition-colors ${
                  pickOnMap
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                {pickOnMap ? 'Marcando' : 'Marcar'}
              </button>
            </div>
          </div>

        {/* Panel despacho — antes de claves en móvil */}
        <div className={`order-3 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-3 flex flex-col min-h-0 lg:h-full lg:overflow-hidden border-y lg:border-y-0 lg:border-l ${bt.rightPanel}`}>
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto scrollbar-thin min-h-0">

            {/* Checklist */}
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
              {readiness.map((r) => (
                <div
                  key={r.label}
                  className={`rounded-lg px-1 py-2 text-center border ${r.ok ? bt.readinessOk : bt.readinessIdle}`}
                >
                  <p className={`text-[10px] font-bold uppercase ${r.ok ? '' : bt.hint}`}>
                    {r.ok ? '✓' : '○'} {r.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Tipo seleccionado */}
            {emergType && (
              <div className={`rounded-xl px-4 py-3 border-2 ${emergType.color} border-transparent`}>
                <p className={`text-xs font-bold uppercase opacity-80 ${emergType.text}`}>Clave activa</p>
                <p className={`text-lg font-black font-mono text-white`}>{emergType.code}</p>
                <p className={`text-sm font-semibold text-white/90`}>{emergType.label}</p>
              </div>
            )}

            {/* Carros */}
            <div id="step-carros">
              <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${bt.panelSectionTitle}`}>
                <Truck className="w-4 h-4 text-red-400" />
                Carros operativos
                <span className={`ml-auto text-[10px] font-normal ${bt.hint}`}>F1–F8</span>
              </h2>
              {!selectedCia ? (
                <p className={`text-xs text-center py-8 border border-dashed rounded-xl ${bt.dashedEmpty}`}>Selecciona compañía</p>
              ) : ciaVehicles.length === 0 ? (
                <p className={`text-xs text-center py-8 border border-dashed rounded-xl ${bt.dashedEmpty}`}>Sin carros operativos</p>
              ) : (
                <div className="space-y-2">
                  {ciaVehicles.map((v: any, idx: number) => {
                    const sel = selectedVehicles.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVehicle(v.id)}
                        disabled={dispatching}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          sel ? bt.vehicleCardSel : bt.vehicleCard
                        }`}
                      >
                        {idx < 8 && (
                          <kbd className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${bt.vehicleKbd}`}>
                            F{idx + 1}
                          </kbd>
                        )}
                        <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${bt.vehicleThumb}`}>
                          {v.imageUrl
                            ? <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                            : <Truck className={`w-6 h-6 ${bt.hint}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-bold font-mono tracking-wide ${sel ? 'text-red-500' : bt.headerTitle}`}>{v.patent}</p>
                          <p className={`text-[11px] truncate ${bt.hint}`}>{v.type} · {v.brand} {v.model}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-red-500 border-red-500' : isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                          {sel && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Personal colapsable */}
            <div className={`border rounded-xl overflow-hidden ${bt.collapsible}`}>
              <button
                type="button"
                onClick={() => setShowPersonal((p) => !p)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors ${bt.collapsibleBtn}`}
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Personal en despacho
                {selectedParticipants.length > 0 && (
                  <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selectedParticipants.length}</span>
                )}
                <span className="ml-auto">{showPersonal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
              </button>
              {showPersonal && selectedCia && (
                <div className={`max-h-36 overflow-y-auto p-2 space-y-1 border-t ${bt.collapsibleBorder}`}>
                  {ciaUsers.map((u: any) => {
                    const sel = selectedParticipants.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleParticipant(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          sel ? bt.listRowActive : bt.listRow
                        }`}
                      >
                        <span>{u.firstName} {u.lastName}</span>
                        <span className="text-[10px] opacity-60">{u.role}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCia && dispatchConfig && (
              <div className={`border rounded-xl overflow-hidden ${bt.publicPanel}`}>
                <button
                  type="button"
                  onClick={() => setShowPublicPanel((p) => !p)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors ${bt.collapsibleBtn}`}
                >
                  <Globe className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Central pública y cuartel</span>
                  {dispatchConfig.roster && (
                    <span className="text-emerald-400 font-bold tabular-nums">{dispatchConfig.roster.stats.available} disp.</span>
                  )}
                  {dispatchConfig.status && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      dispatchConfig.status === 'DISPONIBLE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      {dispatchConfig.status === 'DISPONIBLE' ? '● Online' : '○ Offline'}
                    </span>
                  )}
                  <span className="ml-auto">{showPublicPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>

                {showPublicPanel && (
                  <div className={`px-4 pb-4 space-y-4 border-t pt-4 ${bt.collapsibleBorder}`}>
                    <div className="flex flex-col gap-2">
                      <input
                        readOnly
                        value={publicUrl ?? 'Genera un slug para activar la URL'}
                        className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${bt.publicInput}`}
                      />
                      {publicUrl && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={copyPublicUrl} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${bt.btnTool}`}>
                            <Copy className="w-4 h-4" /> Copiar
                          </button>
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/20 border border-orange-600/40 text-orange-300 text-sm hover:bg-orange-600/30">
                            <ExternalLink className="w-4 h-4" /> Ver pública
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Slug URL</label>
                        <div className="flex gap-2">
                          <input
                            defaultValue={dispatchConfig.dispatchSlug ?? ''}
                            placeholder={dispatchConfig.suggestedSlug}
                            onBlur={(e) => {
                              const v = e.target.value.trim() || dispatchConfig.suggestedSlug;
                              if (v && v !== dispatchConfig.dispatchSlug) {
                                updateDispatchConfig.mutate({ dispatchSlug: v });
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
                          />
                          {!dispatchConfig.dispatchSlug && (
                            <button type="button" onClick={() => ensureSlug.mutate()} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap">
                              Generar
                            </button>
                          )}
                        </div>
                      </div>
                      <label className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 cursor-pointer">
                        <input type="checkbox" checked={dispatchConfig.dispatchPublicEnabled} onChange={(e) => updateDispatchConfig.mutate({ dispatchPublicEnabled: e.target.checked })} className="rounded border-slate-600" />
                        <span className="text-sm text-slate-300">URL pública activa</span>
                      </label>
                      <label className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 cursor-pointer">
                        <input type="checkbox" checked={dispatchConfig.dispatchAvailable} onChange={(e) => updateDispatchConfig.mutate({ dispatchAvailable: e.target.checked })} className="rounded border-slate-600" />
                        <span className="text-sm text-slate-300">Cuartel disponible</span>
                      </label>
                    </div>

                    {dispatchConfig.roster && (
                      <div className="border-t border-slate-800 pt-4 space-y-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400" />
                          Presencia en cuartel
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-white">{dispatchConfig.roster.stats.total}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Nómina</p>
                          </div>
                          <div className="bg-emerald-950/30 border border-emerald-600/30 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-emerald-300">{dispatchConfig.roster.stats.available}</p>
                            <p className="text-[10px] text-emerald-500/80 uppercase">Disponibles</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-slate-400">{dispatchConfig.roster.stats.unavailable}</p>
                            <p className="text-[10px] text-slate-500 uppercase">No disp.</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {dispatchConfig.roster.members.map((m: {
                            id: string; firstName: string; lastName: string; roleLabel: string; stationAvailable: boolean;
                          }) => (
                            <span key={m.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              m.stationAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                            }`}>
                              {m.stationAvailable ? <CheckCircle2 className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {m.firstName} {m.lastName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {dispatchConfig.maquinistas && (
                      <div className="border-t border-slate-800 pt-4 space-y-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Truck className="w-4 h-4 text-sky-400" />
                          Maquinistas
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            dispatchConfig.maquinistas.stats.available > 0
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          }`}>
                            {dispatchConfig.maquinistas.stats.available} habilitado{dispatchConfig.maquinistas.stats.available === 1 ? '' : 's'}
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                          {dispatchConfig.maquinistas.members.map((m: {
                            id: string; firstName: string; lastName: string; maquinistaAvailable: boolean; maquinistaPrincipal: boolean;
                          }) => (
                            <span key={m.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              m.maquinistaPrincipal ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : m.maquinistaAvailable ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                            }`}>
                              {m.maquinistaPrincipal && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                              {m.firstName} {m.lastName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {canDispatch && (
              <p className={`text-[11px] leading-relaxed border-l-2 pl-3 ${bt.voicePreview} ${bt.voicePreviewLabel}`}>
                <span className={`text-[10px] uppercase tracking-wider block mb-1 ${bt.hint}`}>Mensaje de voz</span>
                "{buildMessage(selectedType, getVehicleIdsForDispatch(), address)}"
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${bt.formLabel}`}>
                Pedir ubicación GPS por WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={locationPinPhone}
                  onChange={(e) => setLocationPinPhone(e.target.value)}
                  placeholder="WhatsApp ej. 569..."
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors ${bt.input}`}
                />
                <button
                  type="button"
                  onClick={handlePreDispatchWa}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-2 rounded-xl flex items-center justify-center shrink-0 shadow-md font-bold text-xs gap-1.5 transition-colors"
                  title="Enviar link AHORA para obtener coordenadas"
                >
                  <MessageCircle className="w-4 h-4" />
                  Localizar 
                </button>
              </div>
              
              {preDispatchToken && (
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="font-semibold">Esperando coordenadas del reportante...</span>
                  </div>
                  <a 
                    href={buildLocationPinUrl(preDispatchToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-500 hover:text-emerald-300 underline underline-offset-2 truncate ml-6"
                    title="Ver enlace que se le envió al reportante"
                  >
                    {buildLocationPinUrl(preDispatchToken)}
                  </a>
                </div>
              )}

              <p className={`text-[10px] mt-2 leading-tight ${bt.hint}`}>
                El botón "Pedir GPS ahora" enviará un enlace temporal a la persona para que te mande su ubicación antes de despachar.
              </p>
            </div>
          </div>

          {/* Acciones despacho — escritorio / tablet horizontal */}
          <div className={`hidden lg:block shrink-0 p-3 sm:p-4 pt-0 space-y-2 border-t ${bt.collapsibleBorder} ${isDark ? 'bg-slate-900/95' : 'bg-white'}`}>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canDispatch || dispatching}
              className={`w-full flex items-center justify-center gap-2 disabled:opacity-40 font-medium py-2.5 rounded-xl text-xs transition-colors min-h-[44px] border ${bt.dispatchPreviewBtn}`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Vista previa voz
            </button>
            {!dispatching ? (
              <button
                id="step-despachar"
                type="button"
                onClick={handleDispatch}
                disabled={!canDispatch}
                className={`w-full flex items-center justify-center gap-3 font-black py-4 sm:py-5 rounded-2xl text-lg sm:text-xl tracking-wide transition-all active:scale-[0.98] min-h-[52px] ${
                  canDispatch
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 ring-4 ring-red-500/20'
                    : bt.dispatchBtnDisabled
                }`}
              >
                <Siren className={`w-6 h-6 sm:w-7 sm:h-7 ${canDispatch ? 'animate-pulse' : ''}`} />
                DESPACHAR
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className={`w-full flex items-center justify-center gap-3 border-2 font-black py-4 sm:py-5 rounded-2xl text-lg sm:text-xl min-h-[52px] ${bt.dispatchStop}`}
              >
                <Square className="w-6 h-6" /> DETENER <span className="text-sm font-normal opacity-70">(Esc)</span>
              </button>
            )}
            <p className={`text-center text-[10px] ${bt.dispatchFooter}`}>Enter despachar · Ctrl+Enter desde dirección</p>
          </div>
        </div>

        {/* Claves de emergencia — al final en móvil */}
        <div id="step-claves" className={`order-4 lg:order-none lg:col-span-8 lg:row-start-3 shrink-0 relative z-10 p-3 sm:p-4 border-t lg:border-r space-y-3 ${bt.emergencyBand}`}>
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${bt.emergencyTitle}`}>Claves de emergencia</h2>
            <span className={`ml-auto flex items-center gap-1 text-[10px] ${bt.hint}`}>
              <Keyboard className="w-3 h-3" /> 0–9 = 10-0…10-9
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${bt.emergencyLabel}`}>Claves 10-0 a 10-9</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2">
                {PRIMARY_EMERGENCY_KEYS.map((main) => (
                  <EmergencyKeyButton
                    key={main.id}
                    main={main}
                    selectedType={selectedType}
                    dispatching={dispatching}
                    onClick={() => handleEmergencyTypeClick(main)}
                    bt={bt}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Claves 10-10 a 10-12</p>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {EXTENDED_EMERGENCY_KEYS.map((main) => (
                  <EmergencyKeyButton
                    key={main.id}
                    main={main}
                    selectedType={selectedType}
                    dispatching={dispatching}
                    onClick={() => handleEmergencyTypeClick(main)}
                    bt={bt}
                  />
                ))}
              </div>
            </div>
          </div>
          {activeMainWithSubs?.subdivisions && (
            <div className={`rounded-xl border p-3 space-y-2 ${bt.subPanel}`}>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex flex-wrap items-center gap-2">
                Detalle — clave {activeMainWithSubs.code}
                <span className="font-normal text-slate-500 normal-case">{activeMainWithSubs.label}</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2">
                {activeMainWithSubs.subdivisions.map((sub) => {
                  const SubIcon = findEmergencyEntry(sub.id)?.icon ?? activeMainWithSubs.icon;
                  const isSubSelected = selectedType === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubdivisionClick(sub, activeMainWithSubs)}
                      disabled={dispatching}
                      title={`${sub.code} — ${sub.label}`}
                      className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 text-[10px] font-semibold transition-all active:scale-95 min-h-[60px] sm:min-h-0 ${
                        isSubSelected
                          ? `${activeMainWithSubs.color} ${activeMainWithSubs.text} border-transparent ring-2 ${activeMainWithSubs.ring}/50`
                          : bt.subKeyIdle
                      }`}
                    >
                      <span className={`font-mono font-bold text-[9px] ${isSubSelected ? 'text-white' : 'text-amber-400'}`}>
                        {sub.code}
                      </span>
                      <SubIcon className={`w-4 h-4 ${isSubSelected ? activeMainWithSubs.text : bt.emergencyKeyIcon}`} />
                      <span className="text-center leading-tight line-clamp-2">{sub.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra fija DESPACHAR — móvil / tablet */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] ${bt.mobileBar}`}>
        <div className="flex items-center gap-2 mb-2">
          {readiness.map((r) => (
            <span
              key={r.label}
              className={`flex-1 text-center text-[9px] font-bold uppercase py-1 rounded-md border ${
                r.ok ? bt.mobileReadyOk : bt.mobileReadyIdle
              }`}
            >
              {r.ok ? '✓' : '○'} {r.label}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!canDispatch || dispatching}
            className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border disabled:opacity-40 ${bt.dispatchPreviewBtn}`}
            title="Vista previa voz"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          {!dispatching ? (
            <button
              type="button"
              onClick={handleDispatch}
              disabled={!canDispatch}
              className={`flex-1 flex items-center justify-center gap-2 font-black py-3 rounded-xl text-base min-h-[44px] ${
                canDispatch
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : bt.dispatchBtnDisabled
              }`}
            >
              <Siren className={`w-5 h-5 ${canDispatch ? 'animate-pulse' : ''}`} />
              DESPACHAR
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className={`flex-1 flex items-center justify-center gap-2 border-2 font-black py-3 rounded-xl min-h-[44px] ${bt.dispatchStop}`}
            >
              <Square className="w-5 h-5" /> DETENER
            </button>
          )}
        </div>
      </div>

      {/* ── ÚLTIMO DESPACHO (panel flotante, no rompe el alto full) ── */}
      {lastDispatch && (
        <div className="fixed lg:absolute bottom-0 left-0 right-0 lg:left-[66.666%] z-30 border-t border-emerald-600/40 bg-slate-900/98 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,.45)] max-h-[38vh] lg:max-h-[42vh] overflow-y-auto scrollbar-thin p-3 sm:p-4 mb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:mb-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Último Despacho Emitido
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{lastDispatch.time.toLocaleTimeString('es-CL')}</span>
              <button type="button" onClick={() => setLastDispatch(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Tipo</p>
              <p className="text-sm font-bold text-red-400">{lastDispatch.type}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Dirección</p>
              <p className="text-sm font-semibold text-slate-200">{lastDispatch.address}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Compañía</p>
              <p className="text-sm font-semibold text-slate-200">{lastDispatch.company ? `${lastDispatch.company.number}ª — ${lastDispatch.company.name}` : 'N/A'}</p>
            </div>
          </div>
          {lastDispatch.vehicles?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1"><Truck className="w-3 h-3" />Carros despachados</p>
              <div className="flex flex-wrap gap-2">
                {lastDispatch.vehicles.map((v: any) => (
                  <span key={v.id} className="text-xs font-mono font-bold bg-red-600/15 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg">
                    {v.patent} — {v.brand} {v.model}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lastDispatch.participants?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1"><Users className="w-3 h-3" />Personal</p>
              <div className="flex flex-wrap gap-2">
                {lastDispatch.participants.map((u: any) => (
                  <span key={u.id} className="text-xs bg-sky-600/15 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg">
                    {u.firstName} {u.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lastDispatch.notes && (
            <p className="mt-3 text-xs text-slate-400 bg-slate-800/40 rounded-xl p-3">{lastDispatch.notes}</p>
          )}
          {lastDispatch.incident?.locationPinToken && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" />
                Localizar incendio por GPS (WhatsApp)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Si la persona en terreno no sabe dónde está el fuego, envíale este enlace para que marque la ubicación exacta en el mapa.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={locationPinPhone}
                  onChange={(e) => setLocationPinPhone(e.target.value)}
                  placeholder="WhatsApp ej. 56912345678"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => sendLocationPinWhatsApp(lastDispatch.incident)}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-xl shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar WhatsApp
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyLocationPinUrl(lastDispatch.incident.locationPinToken)}
                  className="inline-flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-2 rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar link GPS
                </button>
                <a
                  href={buildLocationPinUrl(lastDispatch.incident.locationPinToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 px-3 py-2 rounded-xl"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir enlace
                </a>
              </div>
              {lastDispatch.incident.locationPinAt && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  GPS confirmado en terreno
                </p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {lastDispatch.incident && (
              <Link
                to="/incidents"
                className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver {lastDispatch.incident.code} en Emergencias
              </Link>
            )}
            {selectedCia && (
              <Link
                to={`/guard-log?companyId=${selectedCia}`}
                className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Bitácora de guardia
              </Link>
            )}
            {lastDispatch.incident && (
              <Link
                to="/operational-map"
                className="inline-flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-2 rounded-xl"
              >
                <MapPin className="w-3.5 h-3.5" />
                Mapa 360
              </Link>
            )}
          </div>
        </div>
      )}
      
      <DispatchTutorialOverlay
        isOpen={tutorialActive}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}

