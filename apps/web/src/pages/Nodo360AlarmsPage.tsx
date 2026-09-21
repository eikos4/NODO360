import { useEffect, useRef, useState } from 'react';
import {
  Bell, Building2, CheckCircle2, Circle, Clock, Copy, Loader2, MapPin, MessageCircle, Mic, MicOff, Search, Siren, Square, Truck, Volume2, VolumeX, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuickDispatch } from '../hooks/useQuickDispatch';
import { useThemeStore } from '../store/themeStore';
import { EMERGENCY_MAIN_TYPES, familyHasPanel, isEmergencyTypeReadyForDispatch, viaDisplayCode } from '../lib/emergency-codes';
import { api } from '../lib/api';
import {
  buildLocationPinUrl,
  buildLocationPinWhatsAppMessage,
  buildWhatsAppShareUrl,
} from '../lib/incident-location-pin';
import CompanyMaquinistaAlert from '../components/dispatch/CompanyMaquinistaAlert';
import DoubleDispatchConfirmModal from '../components/dispatch/DoubleDispatchConfirmModal';
import AlarmConfirmOverlay, { type AlarmConfirmInfo } from '../components/dispatch/AlarmConfirmOverlay';
import PublicOsmMap, { PARRAL_CENTER } from '../components/map/PublicOsmMap';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

const HAS_GOOGLE_MAPS = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const WA_PHONE_KEY = 'nodo360_location_pin_phone';

const COLOR_HEX: Record<string, string> = {
  'bg-red-600': '#ef4444', 'bg-orange-600': '#f97316', 'bg-amber-600': '#f59e0b',
  'bg-cyan-600': '#06b6d4', 'bg-blue-600': '#3b82f6', 'bg-yellow-500': '#eab308',
  'bg-indigo-600': '#6366f1', 'bg-violet-600': '#8b5cf6', 'bg-slate-600': '#64748b',
  'bg-slate-700': '#475569', 'bg-purple-600': '#9333ea', 'bg-stone-600': '#78716c',
  'bg-teal-700': '#0f766e',
};

function LiveClock({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border tabular-nums ${
        isDark ? 'border-white/10 text-slate-200' : 'border-slate-200 text-slate-800'
      }`}
      title={now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      <Clock className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
      <span className="font-mono text-sm font-bold tracking-tight">
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

function AlarmsMapRecenter({ center, zoom = 14 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: center[0], lng: center[1] });
    map.setZoom(zoom);
  }, [center[0], center[1], map, zoom]);
  return null;
}

function AlarmsGoogleMap({
  center,
  hasPoint,
  onPick,
}: {
  center: [number, number];
  hasPoint: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <Map
      defaultCenter={{ lat: center[0], lng: center[1] }}
      defaultZoom={13}
      mapId="nodo360-alarms-map"
      style={{ height: '100%', width: '100%' }}
      className="absolute inset-0 z-0 cursor-crosshair"
      disableDefaultUI
      gestureHandling="greedy"
      onClick={(e) => {
        const p = e.detail.latLng;
        if (p) onPick(p.lat, p.lng);
      }}
    >
      <AlarmsMapRecenter center={center} zoom={hasPoint ? 15 : 13} />
      {hasPoint && (
        <AdvancedMarker position={{ lat: center[0], lng: center[1] }} zIndex={20}>
          <div className="relative flex h-10 w-10 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-lg shadow-red-900/40">
              <MapPin className="h-4 w-4 text-white" />
            </span>
          </div>
        </AdvancedMarker>
      )}
    </Map>
  );
}

export default function Nodo360AlarmsPage() {
  const d = useQuickDispatch({
    autoDispatchOnKey: false,
    requireExplicitAddress: true,
    persistImmediately: true,
    dispatchSource: 'MANUAL',
  });
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [confirm, setConfirm] = useState<AlarmConfirmInfo | null>(null);
  const [preConfirm, setPreConfirm] = useState(false);
  const [waPhone, setWaPhone] = useState(() => localStorage.getItem(WA_PHONE_KEY) ?? '');
  const [preDispatchToken, setPreDispatchToken] = useState<string | null>(null);
  const seenId = useRef<string | null>(null);
  const last = d.lastDispatchedIncident as {
    id?: string;
    code?: string;
    type?: string;
    address?: string;
    locationPinToken?: string;
  } | null;

  const setPhone = (value: string) => {
    setWaPhone(value);
    localStorage.setItem(WA_PHONE_KEY, value);
  };

  const sendWhatsApp = (inc?: typeof last) => {
    const phone = waPhone.trim();
    if (phone.replace(/\D/g, '').length < 8) {
      toast.error('Ingresa un WhatsApp válido (ej. 56912345678)');
      return;
    }

    const existing = inc?.locationPinToken;
    const token = existing
      || d.locationPinToken
      || preDispatchToken
      || `pre_${crypto.randomUUID().replace(/-/g, '')}`;

    if (!existing) {
      setPreDispatchToken(token);
      d.setLocationPinToken(token);
    }

    const message = buildLocationPinWhatsAppMessage({
      code: inc?.code ?? d.emergType?.code ?? '10-0',
      type: inc?.type ?? d.emergType?.label ?? 'Emergencia en curso',
      address: inc?.address ?? d.address.trim() ?? 'Por confirmar',
      url: buildLocationPinUrl(token),
      company: d.company ? `${d.company.number}ª ${d.company.name}` : undefined,
    });
    const url = buildWhatsAppShareUrl(phone, message);
    if (!url) {
      toast.error('Número de WhatsApp inválido');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!existing) toast('Esperando coordenadas del reportante…', { icon: '⏳' });
  };

  const copyPinLink = (token?: string | null) => {
    const value = token || d.locationPinToken || preDispatchToken;
    if (!value) {
      toast.error('Primero envía o genera el enlace');
      return;
    }
    void navigator.clipboard.writeText(buildLocationPinUrl(value));
    toast.success('Enlace GPS copiado');
  };

  useEffect(() => {
    if (!preDispatchToken) return;
    const interval = window.setInterval(async () => {
      try {
        const res = await api.get(`/location-pin/pre-dispatch/${preDispatchToken}`);
        if (res.data?.found && res.data?.data) {
          const { lat, lng } = res.data.data as { lat: number; lng: number };
          await d.onMapPick(lat, lng);
          toast.success('Coordenadas recibidas del reportante', { duration: 6000 });
          setPreDispatchToken(null);
        }
      } catch { /* polling */ }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [preDispatchToken, d.onMapPick]);

  useEffect(() => {
    if (!last?.id || last.id === seenId.current) return;
    seenId.current = last.id;
    setConfirm({
      code: last.code ?? 'OK',
      type: last.type ?? 'Emergencia',
      address: last.address ?? d.address,
      locationPinToken: last.locationPinToken,
    });
    setPreConfirm(false);
    setPreDispatchToken(null);
    d.resetDraft();
  }, [last, d.resetDraft, d.address]);

  const companies = d.companies as { id: string; number: number; name: string }[];
  const vehicles = d.dispatchableVehicles as {
    id: string;
    patent: string;
    type?: string;
    brand?: string;
    model?: string;
    imageUrl?: string | null;
  }[];
  const selectedVehicles = vehicles.filter((v) => d.selectedVehicles.includes(v.id));
  const lat = parseFloat(String(d.latitude));
  const lng = parseFloat(String(d.longitude));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const readiness = [
    { ok: Boolean(d.selectedCia), label: 'Compañía' },
    { ok: Boolean(d.address.trim()), label: 'Ubicación' },
    { ok: isEmergencyTypeReadyForDispatch(d.selectedType), label: 'Clave' },
    { ok: selectedVehicles.length > 0, label: 'Carro' },
    { ok: Boolean(d.maquinistaReady), label: 'Maquinista' },
  ];

  return (
    <div className={`nodo360-alarms-page h-full min-h-0 flex flex-col overflow-hidden ${
      isDark ? 'bg-[#07090d] text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      <header className={`shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3 ${
        isDark ? 'border-white/10 bg-[#0c1018]' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="keep-on-color w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-base font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              NODO360 <span className="text-red-600">ALARMS</span>
            </h1>
            <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {d.company ? `${d.company.number}ª · ${d.company.name}` : 'Compañía'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveClock isDark={isDark} />
          <button type="button" onClick={() => d.setVoiceEnabled(!d.voiceEnabled)} className={iconBtn(isDark, d.voiceEnabled)}>
            {d.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => d.setMuted(!d.muted)} className={iconBtn(isDark)}>
            {d.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_300px] gap-3 p-3 overflow-hidden">
        <aside className={`min-h-0 flex flex-col rounded-2xl border overflow-hidden ${panel(isDark)}`}>
          <p className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
            Clave
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {EMERGENCY_MAIN_TYPES.map((main) => {
              const childSel =
                main.subdivisions?.some((s) => s.id === d.selectedType)
                || main.vias?.some((v) => v.id === d.selectedType);
              const active = d.selectedType === main.id || childSel;
              const hex = COLOR_HEX[main.color] ?? '#ef4444';
              const onColor = main.text === 'text-black' ? '#111827' : '#ffffff';
              return (
                <button
                  key={main.id}
                  type="button"
                  disabled={d.dispatching}
                  onClick={() => d.handleEmergencyTypeClick(main)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-left transition ${
                    active
                      ? `keep-on-color ${main.color} ${main.text} border-transparent`
                      : ''
                  }`}
                  style={!active ? {
                    backgroundColor: isDark ? `${hex}22` : `${hex}2e`,
                    borderColor: hex,
                  } : undefined}
                >
                  <span
                    className={`inline-block font-mono text-[11px] font-black px-1.5 py-0.5 rounded ${active ? 'bg-black/25 text-white' : ''}`}
                    style={!active ? { backgroundColor: hex, color: onColor } : undefined}
                  >
                    {main.code}
                  </span>
                  <span className={`block mt-1 text-[11px] truncate ${
                    active ? (main.text === 'text-black' ? 'text-black/80' : 'text-white/90') : isDark ? 'text-slate-200' : 'text-slate-900'
                  }`}>
                    {main.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
          {d.activeMainWithSubs && familyHasPanel(d.activeMainWithSubs) ? (
            <div className={`shrink-0 p-2 border-t space-y-1.5 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/70'}`}>
              {d.activeMainWithSubs.subdivisions?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {d.activeMainWithSubs.subdivisions.map((sub) => {
                    const hex = COLOR_HEX[d.activeMainWithSubs!.color] ?? '#f97316';
                    const selected = d.selectedType === sub.id;
                    return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => d.handleSubdivisionClick(sub, d.activeMainWithSubs!)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                        selected
                          ? `keep-on-color ${d.activeMainWithSubs!.color} ${d.activeMainWithSubs!.text} border-transparent`
                          : ''
                      }`}
                      style={!selected ? {
                        backgroundColor: isDark ? `${hex}22` : `${hex}24`,
                        borderColor: hex,
                        color: isDark ? '#e2e8f0' : '#0f172a',
                      } : undefined}
                    >
                      {sub.code}
                    </button>
                    );
                  })}
                </div>
              ) : null}
              {d.activeMainWithSubs.vias?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {d.activeMainWithSubs.vias.map((via) => {
                    const hex = COLOR_HEX[d.activeMainWithSubs!.color] ?? '#f97316';
                    const selected = d.selectedType === via.id;
                    return (
                    <button
                      key={via.id}
                      type="button"
                      onClick={() => d.handleViaClick(via, d.activeMainWithSubs!)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                        selected
                          ? `keep-on-color ${d.activeMainWithSubs!.color} ${d.activeMainWithSubs!.text} border-transparent`
                          : ''
                      }`}
                      style={!selected ? {
                        backgroundColor: isDark ? `${hex}22` : `${hex}24`,
                        borderColor: hex,
                        color: isDark ? '#e2e8f0' : '#0f172a',
                      } : undefined}
                    >
                      {viaDisplayCode(via)}
                    </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>

        <section className={`relative min-h-[280px] rounded-2xl border overflow-hidden ${panel(isDark)}`}>
          {HAS_GOOGLE_MAPS ? (
            <AlarmsGoogleMap
              center={hasPoint ? [lat, lng] : PARRAL_CENTER}
              hasPoint={hasPoint}
              onPick={d.onMapPick}
            />
          ) : (
            <PublicOsmMap
              theme={isDark ? 'dark' : 'light'}
              baseStyle="osm"
              center={hasPoint ? [lat, lng] : PARRAL_CENTER}
              focus={hasPoint ? [lat, lng] : null}
              zoom={13}
              pickActive
              onPick={d.onMapPick}
              className="absolute inset-0 h-full w-full"
              markers={hasPoint ? [{ id: 'pin', lat, lng, active: true, label: d.address || 'Punto' }] : []}
            />
          )}
          <div className={`absolute top-3 left-3 right-3 z-[500] flex gap-2 rounded-xl border p-2 shadow-lg backdrop-blur-md ${
            isDark ? 'bg-[#0c1018]/90 border-white/10' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600" />
              <input
                value={d.address}
                onChange={(e) => d.setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && d.searchAddress()}
                placeholder="Dirección de la emergencia"
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={d.searchAddress}
              disabled={d.geocoding}
              className="keep-on-color shrink-0 px-3 rounded-lg bg-sky-600 text-white"
            >
              {d.geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </section>

        <aside className="min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className={`shrink-0 rounded-2xl border p-3 space-y-2 ${panel(isDark)}`}>
            <CompanyMaquinistaAlert company={d.company} availableCount={d.maquinistasAvailable} isDark={isDark} />
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Building2 className="w-3.5 h-3.5" />
                Compañía despachante
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-1.5">
                {companies.map((c) => {
                  const on = c.id === d.selectedCia;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => d.setSelectedCia(c.id)}
                      className={`min-w-0 rounded-xl border px-2 py-2 text-left transition ${
                        on
                          ? 'keep-on-color bg-red-600 border-red-500 text-white shadow-sm'
                          : isDark
                            ? 'border-white/10 bg-white/5 text-slate-200 hover:border-red-500/40'
                            : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-red-300 hover:bg-white'
                      }`}
                    >
                      <span className={`block text-sm font-black leading-none ${on ? 'text-white' : ''}`}>
                        {c.number}ª
                      </span>
                      <span className={`mt-1 block text-[10px] font-semibold truncate leading-tight ${
                        on ? 'text-white/85' : isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {d.company && (
                <p className={`mt-1.5 text-[11px] font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Despacha: {d.company.number}ª {d.company.name}
                </p>
              )}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Truck className="w-3.5 h-3.5" />
                Carro / vehículo de emergencia
              </p>
              {vehicles.length === 0 ? (
                <p className={`text-xs rounded-xl border border-dashed px-3 py-4 text-center ${
                  isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-600'
                }`}>
                  Sin carros operativos en esta compañía
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {vehicles.map((v) => {
                    const on = d.selectedVehicles.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => d.toggleVehicle(v.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition ${
                          on
                            ? isDark
                              ? 'border-sky-400 bg-sky-500/15 shadow-sm'
                              : 'border-sky-500 bg-sky-50 shadow-sm'
                            : isDark
                              ? 'border-white/10 bg-white/5 hover:border-sky-500/40'
                              : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-white'
                        }`}
                      >
                        <div className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}>
                          {v.imageUrl ? (
                            <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                          ) : (
                            <Truck className={`w-6 h-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black font-mono leading-none ${
                            on
                              ? isDark ? 'text-sky-200' : 'text-sky-900'
                              : isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {v.patent}
                          </p>
                          <p className={`mt-1 text-[11px] truncate ${
                            on
                              ? isDark ? 'text-sky-300/80' : 'text-sky-700'
                              : isDark ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {v.type ?? 'Carro bomba'}
                            {v.brand ? ` · ${v.brand}` : ''}
                            {v.model ? ` ${v.model}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                          on
                            ? 'keep-on-color bg-sky-600 text-white'
                            : isDark
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                        }`}>
                          {on ? 'Listo' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedVehicles.length > 0 && (
                <p className={`mt-1.5 text-[11px] font-semibold ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                  Confirmado: {selectedVehicles.map((v) => v.patent).join(' · ')}
                </p>
              )}
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {d.emergType ? `${d.emergType.code} · ${d.emergType.label}` : 'Elige una clave'}
            </p>
            <div className={`rounded-xl border p-2.5 space-y-1.5 ${
              isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Antes de despachar
              </p>
              {readiness.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-sm font-semibold">
                  {r.ok
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    : <Circle className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
                  <span className={r.ok ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-500')}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
            {!d.canDispatch && !d.dispatching && (
              <p className={`text-[11px] font-semibold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                {!d.emergType || d.activeMainWithSubs
                  ? 'Elige una clave 10-X (y el detalle si aparece abajo)'
                  : !d.address.trim()
                    ? 'Escribe la dirección o marca el mapa'
                    : d.selectedVehicles.length === 0
                      ? 'Selecciona un carro operativo'
                      : 'Completa la alarma para despachar'}
              </p>
            )}
            <div className={`rounded-xl border p-2.5 space-y-2 ${
              isDark ? 'border-[#25D366]/25 bg-[#25D366]/10' : 'border-[#25D366]/40 bg-[#25D366]/10'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                Pedir GPS por WhatsApp
              </p>
              <input
                type="tel"
                value={waPhone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp 569..."
                className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => sendWhatsApp()}
                className="alarms-wa-btn keep-on-color w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
              {preDispatchToken ? (
                <div className={`flex items-start gap-2 text-[11px] ${isDark ? 'text-emerald-200' : 'text-emerald-900'}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold">Esperando coordenadas del reportante…</p>
                    <button
                      type="button"
                      onClick={() => copyPinLink(preDispatchToken)}
                      className="mt-0.5 underline underline-offset-2 truncate max-w-full text-left"
                    >
                      Copiar enlace
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const token = d.locationPinToken || `pre_${crypto.randomUUID().replace(/-/g, '')}`;
                    setPreDispatchToken(token);
                    d.setLocationPinToken(token);
                    copyPinLink(token);
                  }}
                  className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Copy className="w-3 h-3" />
                  Copiar enlace ahora
                </button>
              )}
              {last?.locationPinToken && (
                <button
                  type="button"
                  onClick={() => sendWhatsApp(last)}
                  className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Reenviar última · {last.code}
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={d.dispatching}
              onClick={() => setPreConfirm(true)}
              className="alarms-dispatch-btn keep-on-color w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-wide"
            >
              {d.dispatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Siren className="w-5 h-5" />}
              {d.dispatching ? 'Enviando…' : 'Despachar'}
            </button>
            {d.dispatching && (
              <button type="button" onClick={d.handleStop} className={`w-full py-2 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${isDark ? 'border-amber-500/40 text-amber-300' : 'border-amber-500 text-amber-800'}`}>
                <Square className="w-4 h-4" /> Detener
              </button>
            )}
          </div>

          <div className={`min-h-0 flex-1 rounded-2xl border overflow-hidden ${panel(isDark)}`}>
            <p className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              En curso
            </p>
            <div className="h-full overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
              {d.activeIncidents.length === 0 ? (
                <p className={`text-xs text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Sin alarmas</p>
              ) : (
                (d.activeIncidents as { id: string; code?: string; type?: string; address?: string }[]).slice(0, 8).map((inc) => (
                  <div key={inc.id} className={`px-2.5 py-2 rounded-xl border ${isDark ? 'border-red-500/25 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                    <p className="font-mono text-xs font-black text-red-600">{inc.code}</p>
                    <p className={`text-[11px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{inc.type}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {preConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setPreConfirm(false)} />
          <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-5 ${
            isDark ? 'border-white/10 bg-[#0c1018] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <button
              type="button"
              onClick={() => setPreConfirm(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600 mb-1">Confirmar despacho</p>
            <h2 className="text-lg font-black mb-4">Revisa la alarma antes de enviar</h2>
            <div className="space-y-2 mb-4">
              {readiness.map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 text-sm font-semibold">
                  {r.ok
                    ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                    : <Circle className={`w-5 h-5 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
                  <span className={r.ok ? '' : isDark ? 'text-slate-500' : 'text-slate-500'}>{r.label}</span>
                </div>
              ))}
            </div>
            <div className={`rounded-2xl border p-3 text-sm space-y-1.5 mb-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <p><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Compañía · </span>{d.company ? `${d.company.number}ª ${d.company.name}` : '—'}</p>
              <p><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Ubicación · </span>{d.address.trim() || '—'}</p>
              <p><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Clave · </span>{d.emergType ? `${d.emergType.code} · ${d.emergType.label}` : '—'}</p>
              <p><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Maquinista · </span>{d.maquinistaReady ? `${d.maquinistasAvailable} disponible${d.maquinistasAvailable === 1 ? '' : 's'}` : 'Sin maquinista habilitado'}</p>
            </div>
            <div className={`rounded-2xl border p-3 mb-4 ${
              selectedVehicles.length > 0
                ? isDark ? 'border-sky-400/40 bg-sky-500/10' : 'border-sky-400 bg-sky-50'
                : isDark ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-400 bg-amber-50'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${
                selectedVehicles.length > 0
                  ? isDark ? 'text-sky-300' : 'text-sky-800'
                  : isDark ? 'text-amber-300' : 'text-amber-900'
              }`}>
                <Truck className="w-3.5 h-3.5" />
                Confirmar carro / vehículo
              </p>
              {selectedVehicles.length === 0 ? (
                <p className={`text-sm font-semibold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                  No hay carro seleccionado. Vuelve y elige el vehículo de emergencia.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedVehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-3">
                      <div className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                        isDark ? 'bg-slate-800' : 'bg-white border border-sky-200'
                      }`}>
                        {v.imageUrl ? (
                          <img src={v.imageUrl} alt={v.patent} className="w-full h-full object-cover" />
                        ) : (
                          <Truck className={`w-6 h-6 ${isDark ? 'text-sky-300' : 'text-sky-600'}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-base font-black font-mono leading-none ${
                          isDark ? 'text-sky-100' : 'text-sky-950'
                        }`}>
                          {v.patent}
                        </p>
                        <p className={`mt-1 text-xs truncate ${isDark ? 'text-sky-200/80' : 'text-sky-800'}`}>
                          {v.type ?? 'Carro bomba'}
                          {v.brand ? ` · ${v.brand}` : ''}
                          {v.model ? ` ${v.model}` : ''}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!d.maquinistaReady && (
              <p className={`text-[12px] font-semibold mb-3 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                La compañía no tiene maquinista disponible. Puedes despachar igual si lo confirmas.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreConfirm(false)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold ${isDark ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'}`}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={!d.canDispatch || d.dispatching}
                onClick={() => {
                  setPreConfirm(false);
                  d.handleDispatch({ skipMaquinistaConfirm: true });
                }}
                className="keep-on-color flex-[1.4] py-3 rounded-xl bg-red-600 text-white text-sm font-black uppercase tracking-wide disabled:opacity-40"
              >
                {d.dispatching ? 'Enviando…' : 'Confirmar despacho'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlarmConfirmOverlay
        info={confirm}
        onClose={() => setConfirm(null)}
        isDark={isDark}
        waPhone={waPhone}
        onWaPhone={setPhone}
        onSendWhatsApp={() => sendWhatsApp(confirm ? { ...last, ...confirm } : last)}
      />

      {d.pendingDoubleDispatch && (
        <DoubleDispatchConfirmModal
          companyName={d.pendingDoubleDispatch.companyName}
          onConfirm={d.pendingDoubleDispatch.onConfirm}
          onCancel={d.cancelDoubleDispatch}
          isDark={isDark}
        />
      )}
    </div>
  );
}

function panel(isDark: boolean) {
  return isDark ? 'border-white/10 bg-[#0c1018]' : 'border-slate-200 bg-white shadow-sm';
}

function iconBtn(isDark: boolean, on = false) {
  if (on) return 'p-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-600';
  return `p-2 rounded-xl border ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`;
}
