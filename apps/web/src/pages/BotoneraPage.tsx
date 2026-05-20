import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Flame, Truck, AlertTriangle, Heart, Droplets,
  Wind, Users, Radio, Volume2, VolumeX, Siren,
  MapPin, Building2, Square, Settings,
  CheckCircle2, X, Zap, Crosshair, ExternalLink, BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { botoneraTypeToIncident } from '../lib/dispatch';
import DispatchMapPicker from '../components/map/DispatchMapPicker';

/* ══════════════════════════════════════════
   TIPOS DE EMERGENCIA
══════════════════════════════════════════ */
const EMERGENCY_TYPES = [
  { id: 'incendio_estructural', label: 'Incendio Estructural', icon: Flame,         color: 'bg-red-600',     hover: 'hover:bg-red-500',     ring: 'ring-red-500',     text: 'text-white', tone: 880 },
  { id: 'incendio_vehicular',   label: 'Incendio Vehicular',   icon: Truck,         color: 'bg-orange-600',  hover: 'hover:bg-orange-500',  ring: 'ring-orange-500',  text: 'text-white', tone: 760 },
  { id: 'incendio_forestal',    label: 'Incendio Forestal',    icon: Flame,         color: 'bg-amber-600',   hover: 'hover:bg-amber-500',   ring: 'ring-amber-500',   text: 'text-white', tone: 820 },
  { id: 'rescate_vehicular',    label: 'Rescate Vehicular',    icon: Truck,         color: 'bg-blue-600',    hover: 'hover:bg-blue-500',    ring: 'ring-blue-500',    text: 'text-white', tone: 660 },
  { id: 'rescate_persona',      label: 'Rescate Persona',      icon: Users,         color: 'bg-cyan-600',    hover: 'hover:bg-cyan-500',    ring: 'ring-cyan-500',    text: 'text-white', tone: 640 },
  { id: 'emergencia_medica',    label: 'Emergencia Médica',    icon: Heart,         color: 'bg-pink-600',    hover: 'hover:bg-pink-500',    ring: 'ring-pink-500',    text: 'text-white', tone: 580 },
  { id: 'hazmat',               label: 'HazMat',               icon: AlertTriangle, color: 'bg-yellow-500',  hover: 'hover:bg-yellow-400',  ring: 'ring-yellow-400',  text: 'text-black', tone: 720 },
  { id: 'inundacion',           label: 'Inundación',           icon: Droplets,      color: 'bg-sky-600',     hover: 'hover:bg-sky-500',     ring: 'ring-sky-500',     text: 'text-white', tone: 520 },
  { id: 'derrumbe',             label: 'Derrumbe',             icon: Wind,          color: 'bg-stone-600',   hover: 'hover:bg-stone-500',   ring: 'ring-stone-500',   text: 'text-white', tone: 480 },
  { id: 'falsa_alarma',         label: 'Falsa Alarma',         icon: Radio,         color: 'bg-slate-600',   hover: 'hover:bg-slate-500',   ring: 'ring-slate-400',   text: 'text-white', tone: 400 },
  { id: 'apoyo',                label: 'Apoyo',                icon: Zap,           color: 'bg-purple-600',  hover: 'hover:bg-purple-500',  ring: 'ring-purple-500',  text: 'text-white', tone: 560 },
];

/* ══════════════════════════════════════════
   AUDIO — Web Audio API (sin dependencias)
══════════════════════════════════════════ */
function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  /* Sirena de emergencia: sweep ascendente/descendente */
  const playSiren = useCallback((durationMs = 3000) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    const cycles = Math.floor(durationMs / 600);
    for (let i = 0; i < cycles; i++) {
      const t = now + i * 0.6;
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.3);
      osc.frequency.linearRampToValueAtTime(600, t + 0.6);
    }
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  }, [getCtx]);

  /* Beep de confirmación */
  const playBeep = useCallback((freq = 880, durationMs = 180) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  }, [getCtx]);

  /* Tres pitidos rápidos (alerta) */
  const playTriple = useCallback((freq = 880) => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.start(now + offset); osc.stop(now + offset + 0.18);
    });
  }, [getCtx]);

  return { playSiren, playBeep, playTriple };
}

/* ══════════════════════════════════════════
   TTS — Web Speech API
══════════════════════════════════════════ */
function useTTS() {
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      toast.error('Este navegador no soporta síntesis de voz');
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-CL';
    utt.rate = 0.88;
    utt.pitch = 0.95;
    utt.volume = 1;

    /* Intentar voz española si existe */
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) ?? voices[0];
    if (esVoice) utt.voice = esVoice;

    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}

/* ══════════════════════════════════════════
   COMPONENTE BOTONERA
══════════════════════════════════════════ */
export default function BotoneraPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const { playSiren, playBeep, playTriple } = useAudioEngine();
  const { speak, stop } = useTTS();

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
  const [muted, setMuted]                 = useState(false);
  const [dispatching, setDispatching]     = useState(false);
  const [lastDispatch, setLastDispatch]   = useState<any>(null);
  const [showConfig, setShowConfig]       = useState(false);
  const [repeatCount, setRepeatCount]     = useState(2);
  const [sirenDuration, setSirenDuration] = useState(3);
  const [voiceEnabled, setVoiceEnabled]   = useState(true);
  const pendingPersistRef = useRef(false);

  /* Datos */
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });
  const { data: vehicles }  = useQuery({ queryKey: ['vehicles'],  queryFn: () => api.get('/vehicles').then(r => r.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const persistDispatch = useMutation({
    mutationFn: (payload: unknown) => api.post('/incidents/dispatch', payload),
    onSuccess: (res) => {
      const d = res.data;
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents-stats'] });
      qc.invalidateQueries({ queryKey: ['operational-map'] });
      qc.invalidateQueries({ queryKey: ['guard-log-dashboard'] });
      setLastDispatch((prev: any) => ({ ...prev, incident: d }));
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
  const emergType = EMERGENCY_TYPES.find(e => e.id === selectedType);

  const onMapPick = useCallback((lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    toast.success('Ubicación marcada en mapa');
  }, []);

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  const saveToBitacora = useCallback(async () => {
    if (!selectedCia) return;
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;
    await persistDispatch.mutateAsync({
      type: botoneraTypeToIncident(selectedType),
      address: address.trim(),
      description: notes.trim() || `Despacho botonera: ${emergType?.label}`,
      companyId: selectedCia,
      vehicleIds: selectedVehicles,
      participantIds: selectedParticipants.length ? selectedParticipants : undefined,
      latitude: lat != null && !Number.isNaN(lat) ? lat : undefined,
      longitude: lng != null && !Number.isNaN(lng) ? lng : undefined,
      dispatchNotes: notes.trim() || undefined,
      dispatchSource: 'BOTONERA',
    });
  }, [selectedCia, latitude, longitude, selectedType, address, notes, emergType, selectedVehicles, selectedParticipants, persistDispatch]);

  /* Toggle vehículo */
  const toggleVehicle = (id: string) => {
    setSelectedVehicles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    if (!muted) playBeep(660, 120);
  };

  /* Construir mensaje TTS */
  const buildMessage = useCallback(() => {
    if (!emergType || !address) return '';
    const vNames = selectedVehicles.map(id => {
      const v = (vehicles ?? []).find((x: any) => x.id === id);
      return v ? `${v.brand} ${v.model}, patente ${v.patent.split('').join(' ')}` : '';
    }).filter(Boolean);

    const ciaName = company ? `Compañía ${company.number}, ${company.name}` : '';
    const carrosStr = vNames.length > 0
      ? `Se despacha${vNames.length > 1 ? 'n' : ''}: ${vNames.join('. ')}.`
      : '';

    return [
      '¡Atención, atención!',
      `Emergencia tipo ${emergType.label}.`,
      `Dirección: ${address}.`,
      carrosStr,
      ciaName ? `${ciaName}, proceder de inmediato.` : '',
      notes ? `Observaciones: ${notes}.` : '',
    ].filter(Boolean).join(' ');
  }, [emergType, address, selectedVehicles, vehicles, company, notes]);

  /* DESPACHO */
  const handleDispatch = async () => {
    if (!selectedType)  { toast.error('Selecciona el tipo de emergencia');  return; }
    if (!address.trim()){ toast.error('Ingresa la dirección de la emergencia'); return; }
    if (!selectedCia) { toast.error('Selecciona la compañía despachante para registrar en bitácora'); return; }

    pendingPersistRef.current = true;
    setDispatching(true);
    const msg = buildMessage();

    const doDispatch = async (remaining: number) => {
      if (remaining <= 0) {
        setDispatching(false);
        const snapshot = {
          type: emergType?.label,
          address,
          vehicles: selectedVehicles.map(id => (vehicles ?? []).find((x: any) => x.id === id)).filter(Boolean),
          participants: selectedParticipants.map(id => (users ?? []).find((x: any) => x.id === id)).filter(Boolean),
          company,
          time: new Date(),
          notes,
          latitude,
          longitude,
        };
        setLastDispatch(snapshot);
        toast.success(`Despacho emitido × ${repeatCount}`);
        if (pendingPersistRef.current) {
          pendingPersistRef.current = false;
          try {
            await saveToBitacora();
          } catch {
            /* toast en mutation */
          }
        }
        return;
      }

      if (!muted) playSiren(sirenDuration * 1000);

      await new Promise<void>(res => setTimeout(res, sirenDuration * 1000 + 500));

      if (voiceEnabled) {
        await new Promise<void>(res => speak(msg, res));
      }

      await new Promise<void>(res => setTimeout(res, 800));
      doDispatch(remaining - 1);
    };

    doDispatch(repeatCount);
  };

  /* Detener */
  const handleStop = () => {
    stop();
    setDispatching(false);
    pendingPersistRef.current = false;
    if (!muted) playBeep(440, 300);
  };

  /* Preview de voz */
  const handlePreview = () => {
    const msg = buildMessage();
    if (!msg) { toast.error('Completa el tipo y dirección primero'); return; }
    if (!muted) playTriple(660);
    speak(msg);
  };

  const canDispatch = selectedType && address.trim();

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${dispatching ? 'bg-red-600 animate-pulse shadow-red-600/50' : 'bg-red-700 shadow-red-700/30'}`}>
            <Siren className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Botonera de Despacho
              {dispatching && <span className="text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">● EN VIVO</span>}
            </h1>
            <p className="text-sm text-slate-400">Alerta por voz + registro en bitácora de emergencias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(m => !m)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${muted ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'}`}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {muted ? 'Silenciado' : 'Sonido'}
          </button>
          <button onClick={() => setShowConfig(c => !c)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-medium hover:border-slate-600 transition-colors">
            <Settings className="w-4 h-4" />Configurar
          </button>
        </div>
      </div>

      {/* ── CONFIG PANEL ── */}
      {showConfig && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400" />Configuración de audio</h3>
            <button onClick={() => setShowConfig(false)}><X className="w-4 h-4 text-slate-500 hover:text-slate-300" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">Repeticiones del despacho</label>
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setRepeatCount(n)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${repeatCount === n ? 'bg-red-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'}`}>
                    {n}×
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Duración sirena (seg)</label>
              <div className="flex items-center gap-3">
                {[2, 3, 5].map(n => (
                  <button key={n} onClick={() => setSirenDuration(n)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${sirenDuration === n ? 'bg-red-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'}`}>
                    {n}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Voz sintética</label>
              <button onClick={() => setVoiceEnabled(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-colors ${voiceEnabled ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <Volume2 className="w-3.5 h-3.5" />{voiceEnabled ? 'Activada' : 'Desactivada'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ══ COLUMNA IZQUIERDA: tipo + dirección ══ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tipo de emergencia */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Tipo de Emergencia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {EMERGENCY_TYPES.map(et => {
                const Icon = et.icon;
                const isSelected = selectedType === et.id;
                return (
                  <button
                    key={et.id}
                    onClick={() => { setSelectedType(isSelected ? '' : et.id); if (!muted) playBeep(et.tone, 140); }}
                    className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 font-semibold text-xs transition-all active:scale-95 ${
                      isSelected
                        ? `${et.color} ${et.text} border-transparent ring-4 ${et.ring}/50 shadow-xl scale-105`
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? et.text : 'text-slate-400'}`} />
                    <span className="text-center leading-tight">{et.label}</span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-white/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dirección y datos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" />
              Datos de la Emergencia
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Dirección / Ubicación *</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ej: Av. Providencia 1234, Santiago"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej: Persona atrapada en 3er piso, acceso por pasaje lateral..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Compañía despachante *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedCia}
                  onChange={e => {
                    setSelectedCia(e.target.value);
                    setSelectedVehicles([]);
                    setSelectedParticipants([]);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition-colors appearance-none"
                >
                  <option value="">Seleccionar compañía...</option>
                  {(companies ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.number}ª Cía. — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Ubicación en mapa
                </label>
                <button
                  type="button"
                  onClick={() => setPickOnMap(!pickOnMap)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${
                    pickOnMap ? 'bg-sky-600 text-white border-sky-500' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <Crosshair className="w-3 h-3 inline mr-0.5" />
                  {pickOnMap ? 'Seleccionando…' : 'Marcar'}
                </button>
              </div>
              <DispatchMapPicker
                latitude={latitude}
                longitude={longitude}
                pickActive={pickOnMap}
                onPick={onMapPick}
                height="200px"
              />
              {latitude && longitude && (
                <p className="text-[10px] text-emerald-400 mt-1">GPS: {latitude}, {longitude}</p>
              )}
            </div>
          </div>
        </div>

        {/* ══ COLUMNA DERECHA: vehículos + botonera ══ */}
        <div className="space-y-4">


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400" />
              Personal
              {selectedParticipants.length > 0 && (
                <span className="ml-auto bg-sky-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedParticipants.length}
                </span>
              )}
            </h2>
            {!selectedCia ? (
              <p className="text-xs text-slate-500 text-center py-4">Selecciona compañía para listar personal</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {ciaUsers.map((u: any) => {
                  const sel = selectedParticipants.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleParticipant(u.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors ${
                        sel ? 'bg-sky-600/20 border-sky-500 text-sky-200' : 'border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span>{u.firstName} {u.lastName}</span>
                      <span className="text-[10px] opacity-70">{u.role}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vehículos operativos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-red-400" />
              Carros a Despachar
              {selectedVehicles.length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedVehicles.length}
                </span>
              )}
            </h2>

            {ciaVehicles.length === 0 ? (
              <div className="text-center py-6">
                <Truck className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {selectedCia ? 'Sin vehículos operativos en esta compañía' : 'Selecciona una compañía para ver sus carros'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ciaVehicles.map((v: any) => {
                  const sel = selectedVehicles.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleVehicle(v.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        sel
                          ? 'bg-red-600/15 border-red-500/60 shadow-lg shadow-red-600/10'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {/* Miniatura */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center">
                        {v.imageUrl
                          ? <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                          : <Truck className="w-5 h-5 text-slate-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold font-mono ${sel ? 'text-red-400' : 'text-white'}`}>{v.patent}</p>
                        <p className="text-xs text-slate-500 truncate">{v.brand} {v.model} · {v.type}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-red-500 border-red-500' : 'border-slate-600'}`}>
                        {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── BOTONES DE ACCIÓN ── */}
          <div className="space-y-2.5">

            {/* Preview */}
            <button
              onClick={handlePreview}
              disabled={!canDispatch || dispatching}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              <Volume2 className="w-4 h-4" />
              Vista previa de voz
            </button>

            {/* DESPACHO */}
            {!dispatching ? (
              <button
                onClick={handleDispatch}
                disabled={!canDispatch}
                className={`w-full flex items-center justify-center gap-3 font-bold py-5 rounded-2xl text-lg transition-all active:scale-95 shadow-2xl ${
                  canDispatch
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 ring-4 ring-red-500/20 hover:ring-red-500/40'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700 shadow-none'
                }`}
              >
                <Siren className={`w-6 h-6 ${canDispatch ? 'animate-bounce' : ''}`} />
                DESPACHAR
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border-2 border-red-600/50 text-red-400 font-bold py-5 rounded-2xl text-lg transition-all active:scale-95"
              >
                <Square className="w-6 h-6" />
                DETENER
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ÚLTIMO DESPACHO ── */}
      {lastDispatch && (
        <div className="bg-slate-900 border border-emerald-600/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Último Despacho Emitido
            </h3>
            <span className="text-xs text-slate-500">{lastDispatch.time.toLocaleTimeString('es-CL')}</span>
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

      {/* ── MENSAJE PREVIEW ── */}
      {canDispatch && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />Mensaje que se leerá por voz
          </p>
          <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
            "{buildMessage()}"
          </p>
        </div>
      )}
    </div>
  );
}

