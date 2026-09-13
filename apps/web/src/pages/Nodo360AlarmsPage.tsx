import { useEffect, useRef, useState } from 'react';
import {
  Bell, Copy, Loader2, MapPin, MessageCircle, Mic, MicOff, Moon, Search, Siren, Square, Sun, Truck, Volume2, VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuickDispatch } from '../hooks/useQuickDispatch';
import { useThemeStore } from '../store/themeStore';
import { EMERGENCY_MAIN_TYPES } from '../lib/emergency-codes';
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

const WA_PHONE_KEY = 'nodo360_location_pin_phone';

export default function Nodo360AlarmsPage() {
  const d = useQuickDispatch({
    autoDispatchOnKey: false,
    requireExplicitAddress: true,
    persistImmediately: true,
    dispatchSource: 'MANUAL',
  });
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const [confirm, setConfirm] = useState<AlarmConfirmInfo | null>(null);
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
    setPreDispatchToken(null);
    d.resetDraft();
  }, [last, d.resetDraft, d.address]);

  const companies = d.companies as { id: string; number: number; name: string }[];
  const vehicles = d.dispatchableVehicles as { id: string; patent: string; type?: string }[];
  const lat = parseFloat(String(d.latitude));
  const lng = parseFloat(String(d.longitude));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

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
          <button type="button" onClick={() => d.setVoiceEnabled(!d.voiceEnabled)} className={iconBtn(isDark, d.voiceEnabled)}>
            {d.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => d.setMuted(!d.muted)} className={iconBtn(isDark)}>
            {d.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button type="button" onClick={toggleTheme} className={iconBtn(isDark)}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
              const childSel = main.subdivisions?.some((s) => s.id === d.selectedType);
              const active = d.selectedType === main.id || childSel;
              return (
                <button
                  key={main.id}
                  type="button"
                  disabled={d.dispatching}
                  onClick={() => d.handleEmergencyTypeClick(main)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-left transition ${
                    active
                      ? 'keep-on-color bg-red-600 border-red-500 text-white'
                      : isDark
                        ? 'border-white/10 hover:border-red-500/40'
                        : 'border-slate-200 bg-white hover:border-red-300'
                  }`}
                >
                  <span className="font-mono text-sm font-black">{main.code}</span>
                  <span className={`block text-[11px] truncate ${active ? 'text-white/85' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {main.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
          {d.activeMainWithSubs?.subdivisions?.length ? (
            <div className={`shrink-0 p-2 border-t flex flex-wrap gap-1.5 ${isDark ? 'border-white/10 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
              {d.activeMainWithSubs.subdivisions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => d.handleSubdivisionClick(sub, d.activeMainWithSubs!)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                    d.selectedType === sub.id
                      ? 'keep-on-color bg-orange-600 border-orange-500 text-white'
                      : isDark
                        ? 'border-amber-500/30 text-amber-200'
                        : 'border-amber-400 text-amber-950 bg-white'
                  }`}
                >
                  {sub.code}
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <section className={`relative min-h-[280px] rounded-2xl border overflow-hidden ${panel(isDark)}`}>
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
            <select value={d.selectedCia} onChange={(e) => d.setSelectedCia(e.target.value)} className={selectCls(isDark)}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {vehicles.map((v) => {
                const on = d.selectedVehicles.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => d.toggleVehicle(v.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${
                      on
                        ? isDark ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-sky-500 bg-sky-50 text-sky-900'
                        : isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <Truck className="w-3 h-3" />
                    {v.patent}
                  </button>
                );
              })}
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {d.emergType ? `${d.emergType.code} · ${d.emergType.label}` : 'Elige una clave'}
            </p>
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
              onClick={d.handleDispatch}
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

function selectCls(isDark: boolean) {
  return `w-full rounded-xl border px-3 py-2 text-sm ${
    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
  }`;
}
