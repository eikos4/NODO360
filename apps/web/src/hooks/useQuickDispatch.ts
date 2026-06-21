import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { botoneraTypeToIncident } from '../lib/dispatch';
import { buildDispatchRadioMessage } from '../lib/dispatch-message';
import {
  EMERGENCY_DIGIT_SHORTCUTS,
  findEmergencyEntry,
  findEmergencyMainType,
  getActiveMainWithSubdivisions,
  isEmergencyTypeReadyForDispatch,
  type EmergencyMainType,
  type EmergencySubdivision,
} from '../lib/emergency-codes';
import { loadDispatchSoundMode, type DispatchSoundMode } from '../lib/emergency-sounds';
import { useDispatchAudio } from './useDispatchAudio';
import { loadDispatchTtsSettings, useDispatchTTS } from './useDispatchTTS';
import { loadDispatchVoiceEnabled, saveDispatchVoiceEnabled } from '../lib/dispatch-tts-voices';
import {
  companyIdsFromDispatchResponse,
  notifyDispatchLive,
} from '../lib/dispatch-live-sync';
import {
  confirmDispatchWithoutMaquinista,
  formatCompanyLabel,
  getMaquinistaAvailableCount,
  hasMaquinistaAvailable,
} from '../lib/company-dispatch-readiness';
import {
  MAX_DISPATCH_COMPANIES,
  MAX_DISPATCH_VEHICLES,
  canToggleDispatchVehicle,
  companyIdsFromVehicleSelection,
  operativoVehiclesForCompanies,
  pruneVehicleSelection,
  type DispatchVehicleRow,
} from '../lib/dispatch-selection';

async function geocodeAddress(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=cl&accept-language=es`,
    { headers: { 'Accept-Language': 'es' } },
  );
  const data = await res.json();
  if (!data?.[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name as string,
  };
}

async function reverseGeocode(lat: number, lng: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
    { headers: { 'Accept-Language': 'es' } },
  );
  const data = await res.json();
  return (data.display_name as string) ?? null;
}

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export function useQuickDispatch() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [soundMode] = useState<DispatchSoundMode>(() => loadDispatchSoundMode());
  const { playSiren, playBeep, playEmergencySound, playEmergencyKeyTone } = useDispatchAudio(soundMode);
  const ttsSettings = loadDispatchTtsSettings();
  const { speak, stop } = useDispatchTTS({ voiceId: ttsSettings.voiceId, ratePercent: ttsSettings.ratePercent });

  const [selectedType, setSelectedType] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCia, setSelectedCiaState] = useState(user?.companyId ?? '');
  const [secondaryCia, setSecondaryCiaState] = useState('');
  const [muted, setMuted] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [voiceEnabled, setVoiceEnabledState] = useState(() => loadDispatchVoiceEnabled());
  const setVoiceEnabled = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setVoiceEnabledState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveDispatchVoiceEnabled(next);
      return next;
    });
  }, []);
  const pendingPersistRef = useRef(false);
  const keyboardRef = useRef({
    dispatching: false,
    canDispatch: false,
    ciaVehicles: [] as { id: string }[],
    handleEmergencyTypeClick: (_m: EmergencyMainType) => {},
    handleSubdivisionClick: (_s: EmergencySubdivision, _m: EmergencyMainType) => {},
    handleDispatch: () => {},
    handleStop: () => {},
    toggleVehicle: (_id: string) => {},
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const company = (companies as { id: string; name: string; number: number; address?: string; city?: string }[])
    .find((c) => c.id === selectedCia);

  const secondaryCompany = (companies as { id: string; name: string; number: number }[])
    .find((c) => c.id === secondaryCia);

  const dispatchCompanyIds = useMemo(
    () => [selectedCia, secondaryCia].filter(Boolean).slice(0, MAX_DISPATCH_COMPANIES),
    [selectedCia, secondaryCia],
  );

  const allVehicles = vehicles as DispatchVehicleRow[];

  const dispatchableVehicles = useMemo(
    () => operativoVehiclesForCompanies(allVehicles, dispatchCompanyIds),
    [allVehicles, dispatchCompanyIds],
  );

  /** @deprecated use dispatchableVehicles */
  const ciaVehicles = dispatchableVehicles;

  const setSelectedCia = useCallback((id: string) => {
    setSecondaryCiaState((prev) => (prev === id ? '' : prev));
    setSelectedCiaState(id);
  }, []);

  const setSecondaryCia = useCallback((id: string) => {
    setSecondaryCiaState(id === selectedCia ? '' : id);
  }, [selectedCia]);

  const { data: dispatchConfig, refetch: refetchDispatch } = useQuery({
    queryKey: ['dispatch-central-config', selectedCia],
    queryFn: () => api.get('/dispatch/central/config', { params: { companyId: selectedCia } }).then((r) => r.data),
    enabled: !!selectedCia,
    refetchInterval: 8000,
  });

  const { data: secondaryDispatchConfig } = useQuery({
    queryKey: ['dispatch-central-config', secondaryCia],
    queryFn: () => api.get('/dispatch/central/config', { params: { companyId: secondaryCia } }).then((r) => r.data),
    enabled: !!secondaryCia,
    refetchInterval: 12000,
  });

  const slug = dispatchConfig?.dispatchSlug as string | undefined;

  const { data: live, refetch: refetchLive } = useQuery({
    queryKey: ['dispatch-live', slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await fetch(`${apiBase}/dispatch/public/${slug}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!slug,
    refetchInterval: 8000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', selectedCia],
    queryFn: () => api.get('/incidents', { params: { companyId: selectedCia } }).then((r) => r.data),
    enabled: !!selectedCia,
    refetchInterval: 8000,
  });

  const persistDispatch = useMutation({
    mutationFn: (payload: unknown) => api.post('/incidents/dispatch', payload),
    onSuccess: (res) => {
      const d = res.data;
      notifyDispatchLive({
        companyIds: companyIdsFromDispatchResponse(d),
        incidentId: d.id,
      });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['operational-map'] });
      qc.invalidateQueries({ queryKey: ['dispatch-live'] });
      refetchLive();
      toast.success(`Emergencia ${d.code} despachada`, { duration: 4000 });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message ?? 'Error al registrar despacho');
    },
  });

  useEffect(() => {
    setSelectedVehicles((prev) => {
      const pruned = pruneVehicleSelection(allVehicles, prev, dispatchCompanyIds);
      if (pruned.length > 0) return pruned.slice(0, MAX_DISPATCH_VEHICLES);
      const first = dispatchableVehicles[0];
      return first ? [first.id] : [];
    });
  }, [selectedCia, secondaryCia, dispatchableVehicles, allVehicles, dispatchCompanyIds]);

  const getVehicleIdsForDispatch = useCallback(
    (override?: string[]) => {
      if (override?.length) return override.slice(0, MAX_DISPATCH_VEHICLES);
      if (selectedVehicles.length > 0) return selectedVehicles.slice(0, MAX_DISPATCH_VEHICLES);
      if (dispatchableVehicles.length) return [dispatchableVehicles[0].id];
      return [];
    },
    [selectedVehicles, dispatchableVehicles],
  );

  const toggleVehicle = (id: string) => {
    setSelectedVehicles((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const check = canToggleDispatchVehicle(allVehicles, prev, id);
      if (!check.ok) {
        toast.error(check.reason);
        return prev;
      }
      return [...prev, id];
    });
    if (!muted) playBeep(660, 80);
  };

  const selectAllVehicles = useCallback(() => {
    setSelectedVehicles(dispatchableVehicles.slice(0, MAX_DISPATCH_VEHICLES).map((v) => v.id));
  }, [dispatchableVehicles]);

  const autoAllVehicles =
    dispatchableVehicles.length > 0 &&
    selectedVehicles.length === Math.min(dispatchableVehicles.length, MAX_DISPATCH_VEHICLES) &&
    dispatchableVehicles.slice(0, MAX_DISPATCH_VEHICLES).every((v) => selectedVehicles.includes(v.id));

  const selectedCompanyIds = useMemo(
    () => companyIdsFromVehicleSelection(allVehicles, selectedVehicles),
    [allVehicles, selectedVehicles],
  );

  const onMapPick = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    try {
      const label = await reverseGeocode(lat, lng);
      if (label) setAddress((prev) => prev.trim() || label.split(',').slice(0, 3).join(', '));
    } catch { /* offline */ }
  }, []);

  const searchAddress = useCallback(async () => {
    const q = address.trim();
    if (!q) {
      toast.error('Escribe una dirección');
      return;
    }
    setGeocoding(true);
    try {
      const hit = await geocodeAddress(q);
      if (!hit) {
        toast.error('Dirección no encontrada');
        return;
      }
      setLatitude(hit.lat.toFixed(6));
      setLongitude(hit.lng.toFixed(6));
      setAddress(hit.label.split(',').slice(0, 4).join(', '));
    } finally {
      setGeocoding(false);
    }
  }, [address]);

  const runDispatch = useCallback(
    async (opts?: { typeId?: string; vehicleIds?: string[]; keyToneAlreadyPlayed?: boolean }) => {
      const typeId = opts?.typeId ?? selectedType;
      const emerg = findEmergencyEntry(typeId);
      const vehicleIds = getVehicleIdsForDispatch(opts?.vehicleIds);
      const addr = address.trim() || company?.address || 'Sin dirección — cuartel';

      if (!typeId || !emerg) {
        toast.error('Selecciona una clave de emergencia');
        return;
      }
      if (!isEmergencyTypeReadyForDispatch(typeId)) {
        toast.error('Elige el detalle de la clave');
        return;
      }
      if (!selectedCia) {
        toast.error('Sin compañía asignada');
        return;
      }
      if (vehicleIds.length === 0) {
        toast.error('Sin carros operativos');
        return;
      }

      if (!hasMaquinistaAvailable(dispatchConfig?.maquinistas)) {
        if (!confirmDispatchWithoutMaquinista(formatCompanyLabel(company))) return;
      }
      if (
        secondaryCia &&
        secondaryDispatchConfig &&
        !hasMaquinistaAvailable(secondaryDispatchConfig?.maquinistas)
      ) {
        if (!confirmDispatchWithoutMaquinista(formatCompanyLabel(secondaryCompany))) return;
      }

      const involvedCompanies = companyIdsFromVehicleSelection(allVehicles, vehicleIds);
      const apoyoNote =
        involvedCompanies.length > 1
          ? `Apoyo mutuo: ${involvedCompanies.map((cid) => {
              const c = (companies as { id: string; number: number; name: string }[]).find((x) => x.id === cid);
              return c ? `${c.number}ª` : cid;
            }).join(' + ')}`
          : '';

      if (opts?.typeId) setSelectedType(opts.typeId);
      if (!address.trim() && company?.address) setAddress(company.address);

      pendingPersistRef.current = true;
      setDispatching(true);

      const radioMsg = buildDispatchRadioMessage(
        typeId,
        addr,
        vehicleIds,
        vehicles as { id: string; patent: string; type?: string }[],
      );

      if (!muted && !opts?.keyToneAlreadyPlayed) await playEmergencyKeyTone(typeId);
      await new Promise((r) => setTimeout(r, 120));
      if (!muted) await playSiren(1800);
      if (voiceEnabled && radioMsg) {
        await new Promise<void>((res) => speak(radioMsg, res));
      }

      setDispatching(false);

      if (pendingPersistRef.current) {
        pendingPersistRef.current = false;
        await persistDispatch.mutateAsync({
          type: botoneraTypeToIncident(typeId),
          address: addr,
          description: notes.trim() || radioMsg || `Despacho ${emerg.code}`,
          companyId: selectedCia,
          vehicleIds,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          dispatchNotes: [notes.trim(), apoyoNote].filter(Boolean).join(' · ') || undefined,
          dispatchSource: 'BOTONERA',
        });
      }
    },
    [
      selectedType,
      address,
      company,
      selectedCia,
      getVehicleIdsForDispatch,
      muted,
      playEmergencyKeyTone,
      playEmergencySound,
      playSiren,
      voiceEnabled,
      speak,
      vehicles,
      notes,
      latitude,
      longitude,
      persistDispatch,
      dispatchConfig,
      secondaryCia,
      secondaryDispatchConfig,
      secondaryCompany,
      allVehicles,
      companies,
    ],
  );

  const tryAutoDispatch = useCallback(
    (typeId: string) => {
      const vIds = getVehicleIdsForDispatch();
      if (!selectedCia || vIds.length === 0) {
        toast('Clave lista — confirma dirección y despacha', { icon: '⚡' });
        return;
      }
      if (!address.trim() && !company?.address) {
        setSelectedType(typeId);
        toast('Ingresa dirección o usa ubicación del cuartel', { icon: '📍' });
        return;
      }
      void runDispatch({ typeId, vehicleIds: vIds, keyToneAlreadyPlayed: true });
    },
    [getVehicleIdsForDispatch, selectedCia, address, company, runDispatch],
  );

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

    if (main.subdivisions?.length) return;
    tryAutoDispatch(main.id);
  };

  const handleSubdivisionClick = (sub: EmergencySubdivision, main: EmergencyMainType) => {
    if (dispatching) return;
    if (selectedType === sub.id) {
      setSelectedType(main.id);
      return;
    }
    setSelectedType(sub.id);
    if (!muted) void playEmergencyKeyTone(sub.id);
    tryAutoDispatch(sub.id);
  };

  const handleStop = () => {
    stop();
    setDispatching(false);
    pendingPersistRef.current = false;
    if (!muted) playBeep(440, 200);
  };

  const maquinistasAvailable = getMaquinistaAvailableCount(dispatchConfig?.maquinistas);
  const maquinistaReady = hasMaquinistaAvailable(dispatchConfig?.maquinistas);
  const secondaryMaquinistasAvailable = getMaquinistaAvailableCount(secondaryDispatchConfig?.maquinistas);

  const canDispatch = !!(
    selectedType &&
    isEmergencyTypeReadyForDispatch(selectedType) &&
    selectedCia &&
    getVehicleIdsForDispatch().length > 0 &&
    (address.trim() || company?.address)
  );

  const activeIncidents = (incidents as { closedAt?: string | null }[]).filter((i) => !i.closedAt);
  const activeMainWithSubs = getActiveMainWithSubdivisions(selectedType);
  const emergType = findEmergencyEntry(selectedType);

  const mapCenter: [number, number] = latitude && longitude
    ? [parseFloat(latitude), parseFloat(longitude)]
    : [-36.1428, -71.8258];

  useEffect(() => {
    keyboardRef.current = {
      dispatching,
      canDispatch,
      ciaVehicles,
      handleEmergencyTypeClick,
      handleSubdivisionClick,
      handleDispatch: () => runDispatch(),
      handleStop,
      toggleVehicle,
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (typing) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const { canDispatch: ok, dispatching: busy, handleDispatch: go } = keyboardRef.current;
          if (ok && !busy) {
            e.preventDefault();
            go();
          }
        }
        return;
      }
      const mainId = EMERGENCY_DIGIT_SHORTCUTS[e.key];
      if (mainId) {
        const main = findEmergencyMainType(mainId);
        if (main) {
          e.preventDefault();
          keyboardRef.current.handleEmergencyTypeClick(main);
        }
        return;
      }
      if (e.key === 'Enter') {
        const { canDispatch: ok, dispatching: busy, handleDispatch: go } = keyboardRef.current;
        if (ok && !busy) {
          e.preventDefault();
          go();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        keyboardRef.current.handleStop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: cuarteles = [], refetch: refetchCuarteles } = useQuery({
    queryKey: ['dispatch-cuarteles-overview'],
    queryFn: () => api.get('/dispatch/central/overview').then((r) => r.data),
    refetchInterval: 12000,
  });

  const updateDispatchConfig = useMutation({
    mutationFn: (payload: { companyId: string; data: Record<string, unknown> }) =>
      api.patch(`/dispatch/central/${payload.companyId}`, payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-cuarteles-overview'] });
      qc.invalidateQueries({ queryKey: ['dispatch-central-config'] });
      qc.invalidateQueries({ queryKey: ['dispatch-live'] });
      refetchCuarteles();
      refetchDispatch();
      toast.success('Cuartel actualizado');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message ?? 'Error al actualizar cuartel');
    },
  });

  const ensureSlug = useMutation({
    mutationFn: (companyId: string) => api.post(`/dispatch/central/${companyId}/ensure-slug`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatch-cuarteles-overview'] });
      refetchCuarteles();
      toast.success('URL pública generada');
    },
  });

  return {
    user,
    company,
    secondaryCompany,
    companies,
    ciaVehicles,
    dispatchableVehicles,
    dispatchCompanyIds,
    selectedCompanyIds,
    selectedType,
    setSelectedType,
    selectedVehicles,
    autoAllVehicles,
    selectAllVehicles,
    toggleVehicle,
    address,
    setAddress,
    latitude,
    longitude,
    notes,
    setNotes,
    selectedCia,
    setSelectedCia,
    secondaryCia,
    setSecondaryCia,
    muted,
    setMuted,
    dispatching,
    geocoding,
    voiceEnabled,
    setVoiceEnabled,
    canDispatch,
    maquinistasAvailable,
    maquinistaReady,
    secondaryMaquinistasAvailable,
    emergType,
    activeMainWithSubs,
    activeIncidents,
    incidents,
    live,
    dispatchConfig,
    publicUrl: slug ? `${window.location.origin}/central/${slug}` : null,
    mapCenter,
    onMapPick,
    searchAddress,
    handleEmergencyTypeClick,
    handleSubdivisionClick,
    handleDispatch: () => runDispatch(),
    handleStop,
    refetchLive,
    cuarteles,
    refetchCuarteles,
    updateDispatchConfig,
    ensureSlug,
  };
}

export const useSimpleDispatch = useQuickDispatch;
