import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Copy, ExternalLink, Flame, Loader2, LogOut, Mic, MicOff, Moon, Play,
  Search, Settings, Siren, Square, Sun, Volume2, VolumeX, X, Crosshair, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useSimpleDispatch } from '../hooks/useQuickDispatch';
import { useCentralParralTheme } from '../hooks/useCentralParralTheme';
import type { CentralParralThemeTokens } from '../lib/central-parral-theme';
import { buildDispatchRadioMessage } from '../lib/dispatch-message';
import {
  EMERGENCY_MAIN_TYPES,
  EMERGENCY_MAIN_DIGIT_KEY,
  findEmergencyEntry,
} from '../lib/emergency-codes';
import { loadDispatchTtsSettings, useDispatchTTS } from '../hooks/useDispatchTTS';
import DispatchMapPicker from '../components/map/DispatchMapPicker';
import DispatchVoiceConfigToggle from '../components/dispatch/DispatchVoiceConfigToggle';
import CompanyMaquinistaAlert from '../components/dispatch/CompanyMaquinistaAlert';
import DispatchCompanyVehiclePicker from '../components/dispatch/DispatchCompanyVehiclePicker';
import { api } from '../lib/api';
import { buildLocationPinWhatsAppMessage, buildWhatsAppShareUrl } from '../lib/incident-location-pin';

const PRIMARY_KEYS = EMERGENCY_MAIN_TYPES.filter((m) => /^10-[0-9]$/.test(m.id));

function LiveClock({ th }: { th: CentralParralThemeTokens }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-center">
      <p className={`text-2xl font-mono font-bold tabular-nums ${th.clock}`}>
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className={`text-xs capitalize flex items-center justify-center gap-1 mt-0.5 ${th.clockDate}`}>
        <Calendar className="w-3.5 h-3.5" />
        {now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
  className = '',
  th,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  th: CentralParralThemeTokens;
}) {
  return (
    <div className={`rounded-2xl border ${th.card} ${className}`}>
      <div className={`px-4 py-2.5 border-b ${th.cardHeader}`}>
        <h3 className={`text-[11px] font-bold uppercase tracking-widest ${th.cardTitle}`}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function CentralDespachosParralPage() {
  const d = useSimpleDispatch();
  const { tokens: th, toggleTheme, isDark } = useCentralParralTheme();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const tts = loadDispatchTtsSettings();
  const { speak, stop } = useDispatchTTS({ voiceId: tts.voiceId, ratePercent: tts.ratePercent });
  const [playingPreview, setPlayingPreview] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  const handleSendWa = (inc: any) => {
    const phone = waPhone.trim();
    if (!phone || phone.length < 8) {
      toast.error('Ingresa un número de WhatsApp válido');
      return;
    }
    const message = buildLocationPinWhatsAppMessage({
      code: inc.code,
      type: inc.type,
      address: inc.address || 'Sin dirección',
      token: inc.locationPinToken,
    });
    const url = buildWhatsAppShareUrl(phone, message);
    window.open(url, '_blank');
  };

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const companies = d.companies as { id: string; number: number; name: string }[];
  const vehicles = allVehicles as {
    id: string;
    patent: string;
    type?: string;
    brand?: string;
    model?: string;
    imageUrl?: string | null;
    companyId: string;
    status?: string;
  }[];

  const vehicleIds = d.selectedVehicles.length
    ? d.selectedVehicles
    : d.dispatchableVehicles.slice(0, 1).map((v) => v.id);

  const radioMessage = useMemo(() => {
    if (!d.selectedType || !d.address.trim()) return '';
    return buildDispatchRadioMessage(
      d.selectedType,
      d.address,
      vehicleIds,
      vehicles,
    );
  }, [d.selectedType, d.address, vehicleIds, vehicles]);

  const emerg = d.emergType ?? (d.selectedType ? findEmergencyEntry(d.selectedType) : null);
  const EmergIcon = emerg?.icon ?? Flame;

  const roster = (d.dispatchConfig?.roster?.members ?? d.live?.roster?.members ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
    stationAvailable?: boolean;
  }[];

  const centralStatus = (d.dispatchConfig?.status ?? 'OCULTA') as string;
  const statusLabel =
    centralStatus === 'DISPONIBLE' ? 'Disponible' : centralStatus === 'NO_DISPONIBLE' ? 'No disponible' : 'Sin publicar';

  const copyCoords = () => {
    if (!d.latitude || !d.longitude) {
      toast.error('Sin coordenadas');
      return;
    }
    void navigator.clipboard.writeText(`${d.latitude}, ${d.longitude}`);
    toast.success('Coordenadas copiadas');
  };

  const openMaps = () => {
    if (!d.latitude || !d.longitude) {
      toast.error('Sin coordenadas');
      return;
    }
    window.open(`https://www.google.com/maps?q=${d.latitude},${d.longitude}`, '_blank');
  };

  const playPreview = () => {
    if (!d.voiceEnabled) {
      toast.error('Voz asistente desactivada');
      return;
    }
    if (!radioMessage) {
      toast.error('Completa clave, dirección y carro');
      return;
    }
    stop();
    setPlayingPreview(true);
    speak(radioMessage, () => setPlayingPreview(false));
  };

  return (
    <div className={`h-full min-h-0 flex flex-col overflow-hidden transition-colors duration-300 ${th.page}`}>
      {/* Header */}
      <header className={`shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b ${th.header}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1 basis-[200px]">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${d.dispatching ? 'bg-red-600 animate-pulse' : 'bg-red-600'}`}>
            <Siren className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-sm sm:text-base font-black uppercase tracking-wide leading-tight truncate ${th.title}`}>
              Central de Despachos
            </h1>
            <p className={`text-[11px] sm:text-xs truncate ${th.subtitle}`}>Nodo 360 · Bomberos Parral</p>
          </div>
        </div>

        <div className="hidden lg:block shrink-0">
          <LiveClock th={th} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              isDark
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-slate-300 bg-slate-900/5 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
          <button
            type="button"
            onClick={() => d.setMuted(!d.muted)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs ${th.btnGhost}`}
          >
            {d.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            Sonido
          </button>
          <button
            type="button"
            onClick={() => d.setVoiceEnabled(!d.voiceEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs ${
              d.voiceEnabled ? th.btnGhostActive : th.btnGhost
            }`}
            title={d.voiceEnabled ? 'Voz asistente activada' : 'Voz asistente desactivada — habla la centralista'}
          >
            {d.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            Voz
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((c) => !c)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs ${
              showConfig ? th.btnGhostActive : th.btnGhost
            }`}
          >
            <Settings className="w-4 h-4" />
            Ajustes
          </button>
         
        </div>
      </header>

      {showConfig && (
        <div className={`shrink-0 border-b px-5 py-4 space-y-3 ${th.header}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={`text-[11px] font-bold uppercase tracking-widest ${th.cardTitle}`}>
              Configuración de despacho
            </h2>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className={`p-1.5 rounded-lg ${th.btnGhost}`}
              title="Cerrar configuración"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <DispatchVoiceConfigToggle
            enabled={d.voiceEnabled}
            onChange={d.setVoiceEnabled}
            isDark={isDark}
          />
        </div>
      )}

      {/* Grid principal */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin">
        <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 min-h-0">
        {/* Columna izquierda */}
        <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4 min-w-0">
          <Card title="Despacho" th={th}>
            <div className="space-y-3">
              <CompanyMaquinistaAlert
                company={d.company}
                availableCount={d.maquinistasAvailable}
              />
              {d.secondaryCia && d.secondaryCompany && (
                <CompanyMaquinistaAlert
                  company={d.secondaryCompany}
                  availableCount={d.secondaryMaquinistasAvailable}
                />
              )}
              <div>
                <label className={`text-[10px] uppercase tracking-wide mb-1 block ${th.label}`}>Dirección / Ubicación</label>
                <div className="flex gap-2">
                  <input
                    value={d.address}
                    onChange={(e) => d.setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && d.searchAddress()}
                    placeholder="Calle, sector, comuna..."
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${th.input}`}
                  />
                  <button
                    type="button"
                    onClick={d.searchAddress}
                    disabled={d.geocoding}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center gap-1.5"
                  >
                    {d.geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                  </button>
                </div>
              </div>
              <div>
                <label className={`text-[10px] uppercase tracking-wide mb-1 block ${th.label}`}>Observaciones (opcional)</label>
                <textarea
                  value={d.notes}
                  onChange={(e) => d.setNotes(e.target.value)}
                  rows={2}
                  placeholder="Piso, acceso, víctimas..."
                  className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none ${th.textarea}`}
                />
              </div>
            </div>
          </Card>

          <div className={`rounded-2xl border-2 p-5 transition-all ${
            emerg
              ? isDark
                ? 'border-orange-500 bg-gradient-to-br from-orange-600/30 to-orange-900/20 shadow-lg shadow-orange-900/30'
                : 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100/80 shadow-md shadow-orange-100'
              : th.activeKeyEmpty
          }`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-2">Clave activa</p>
            {emerg ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center shrink-0">
                  <EmergIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-orange-950'}`}>{emerg.code}</p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white/90' : 'text-orange-900'}`}>{emerg.label}</p>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${th.activeKeyEmptyText}`}>Selecciona una clave de emergencia</p>
            )}
          </div>
        </div>

        {/* Centro — mapa */}
        <div className="lg:col-span-5 flex flex-col min-h-[260px] lg:min-h-[320px]">
          <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col min-h-[260px] lg:min-h-[320px] ${th.mapWrap}`}>
            <DispatchMapPicker
              center={d.mapCenter}
              latitude={d.latitude}
              longitude={d.longitude}
              pickActive
              onPick={d.onMapPick}
              height="100%"
              theme={th.mapTheme}
              showGpsPanel
            />
            <div className={`shrink-0 flex gap-2 p-3 border-t ${th.mapFooter}`}>
              <button
                type="button"
                onClick={copyCoords}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs ${th.mapBtn}`}
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <button
                type="button"
                onClick={openMaps}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs ${th.mapBtn}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir en Maps
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-4 min-w-0">
          <Card title="Carros y compañías" th={th}>
            <DispatchCompanyVehiclePicker
              th={th}
              isDark={isDark}
              companies={companies}
              vehicles={vehicles}
              selectedCia={d.selectedCia}
              secondaryCia={d.secondaryCia}
              selectedVehicles={d.selectedVehicles}
              onPrimaryCompany={d.setSelectedCia}
              onSecondaryCompany={d.setSecondaryCia}
              onToggleVehicle={d.toggleVehicle}
            />
          </Card>

          <Card title="Personal en despacho" th={th}>
            <select
              value={selectedPersonnel}
              onChange={(e) => setSelectedPersonnel(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm ${th.select}`}
            >
              <option value="">— Seleccionar bombero —</option>
              {roster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                  {m.stationAvailable === false ? ' (no disp.)' : ''}
                </option>
              ))}
            </select>
          </Card>

          <Card title="Estado de central" th={th}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${th.title}`}>Central pública</p>
                <p className={`text-xs mt-0.5 ${th.subtitle}`}>
                  Cuartel: <span className={
                    centralStatus === 'DISPONIBLE' ? 'text-emerald-400' :
                    centralStatus === 'NO_DISPONIBLE' ? 'text-red-500' : th.subtitle
                  }>{statusLabel}</span>
                </p>
              </div>
              {d.publicUrl && (
                <a
                  href={d.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver pública
                </a>
              )}
            </div>
            {d.live?.roster?.stats && (
              <p className={`text-[10px] mt-2 ${th.subtitle}`}>
                {d.live.roster.stats.available} bomberos disponibles en cuartel
              </p>
            )}
          </Card>

          {radioMessage && (
            <Card title="Mensaje de voz" th={th}>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={playPreview}
                  disabled={playingPreview}
                  className="shrink-0 w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center"
                >
                  {playingPreview ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <p className={`text-sm italic leading-snug ${th.voiceText}`}>&ldquo;{radioMessage}&rdquo;</p>
              </div>
            </Card>
          )}

          <div className={`rounded-2xl border p-4 space-y-3 mt-auto ${th.dispatchPanel}`}>
            {radioMessage && (
              <div className={`rounded-xl border px-3 py-2 ${th.voicePreview}`}>
                <p className={`text-[10px] uppercase tracking-wide mb-1 ${th.voicePreviewLabel}`}>Vista previa de voz</p>
                <p className={`text-xs font-mono ${th.voiceText}`}>{radioMessage}</p>
              </div>
            )}
            <button
              type="button"
              disabled={!d.canDispatch || d.dispatching}
              onClick={d.handleDispatch}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed font-black text-lg uppercase tracking-wide shadow-xl shadow-red-900/40 transition active:scale-[0.98]"
            >
              {d.dispatching ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Despachando...
                </>
              ) : (
                <>
                  <Siren className="w-6 h-6" />
                  Despachar
                </>
              )}
            </button>
            {d.dispatching && (
              <button
                type="button"
                onClick={d.handleStop}
                className="w-full py-2 rounded-xl border border-amber-500/50 text-amber-500 text-sm flex items-center justify-center gap-2 font-bold"
              >
                <Square className="w-4 h-4" />
                Detener
              </button>
            )}
            
            {d.lastDispatchedIncident?.locationPinToken && (
              <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'} flex items-center gap-1`}>
                  <Crosshair className="w-3.5 h-3.5" />
                  Pedir GPS (WhatsApp)
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="WhatsApp ej: 569..."
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none ${th.input}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendWa(d.lastDispatchedIncident)}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-xl flex items-center justify-center shrink-0 shadow-md font-bold text-xs gap-1.5"
                    title="Enviar enlace al reportante"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar
                  </button>
                </div>
              </div>
            )}

            <p className={`text-center text-[10px] mt-2 ${th.hint}`}>
              Enter para despachar · Ctrl+Enter desde dirección
            </p>
          </div>
        </div>
        </div>

      {/* Claves de emergencia */}
      <section className="shrink-0 px-3 sm:px-4 pb-3">
        <Card title="Claves de emergencia" th={th}>
          <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2">
            {PRIMARY_KEYS.map((main) => {
              const childSel = main.subdivisions?.some((s) => s.id === d.selectedType);
              const active = d.selectedType === main.id || childSel;
              const Icon = main.icon;
              const digit = EMERGENCY_MAIN_DIGIT_KEY[main.id];
              return (
                <button
                  key={main.id}
                  type="button"
                  disabled={d.dispatching}
                  onClick={() => d.handleEmergencyTypeClick(main)}
                  className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 min-h-[80px] transition-all active:scale-95 ${
                    active
                      ? `${main.color} ${main.text} border-transparent shadow-lg`
                      : th.keyIdle
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold opacity-70">{digit ?? main.code}</span>
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] text-center leading-tight font-semibold">{main.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {d.activeMainWithSubs?.subdivisions?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {d.activeMainWithSubs.subdivisions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => d.handleSubdivisionClick(sub, d.activeMainWithSubs!)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    d.selectedType === sub.id
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : th.keySubIdle
                  }`}
                >
                  {sub.code} — {sub.label}
                </button>
              ))}
            </div>
          ) : null}

          <p className={`text-[10px] mt-3 ${th.hint}`}>
            Claves rápidas: teclas <span className={`font-mono ${th.subtitle}`}>0–9</span> en el teclado
          </p>
        </Card>
      </section>

      {/* Leyenda */}
      <footer className={`shrink-0 px-3 sm:px-4 pb-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] ${th.footer}`}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Disponibles</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" /> En ruta</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Fuera de servicio</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> No disponible</span>
      </footer>
      </div>
    </div>
  );
}
