import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  AlertTriangle, BatteryCharging, BellRing, Building2, Check, ChevronRight, Clock3, Crosshair, Eye, EyeOff, Flame,
  History, Loader2, LogOut, MapPin, Megaphone, Moon, Navigation, Radio, RefreshCw, ShieldCheck, Siren,
  Sun, Truck, UserRound, Users, Volume2, Wifi, WifiOff, X,
} from 'lucide-react';
import type { EmergencyResponseStatus } from '@nodo360/shared';
import { api } from './lib/api';
import { localStore } from './lib/localStore';
import { clearSessionToken, getSessionToken, setSessionToken } from './platform/session';
import { configureNativeAlarms, NativeAlarm, type AlarmDiagnostics } from './platform/nativeAlarm';
import { useEmergencySync } from './hooks/useEmergencySync';
import { estimateEtaMinutes, getCurrentCoords, haversineKm } from './lib/geo';
import { disconnectRadioSocket } from './lib/radio';
import { RadioScreen } from './RadioScreen';
import { AnnouncementsScreen } from './AnnouncementsScreen';
import { ProfileScreen } from './ProfileScreen';
import { useAppTheme } from './theme';
import type { ActiveIncident, AuthUser } from './types';

type Screen = 'alarms' | 'radio' | 'history' | 'settings' | 'announcements';

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useAppTheme();
  return (
    <button type="button" className={compact ? 'icon-button' : 'theme-toggle'} onClick={toggleTheme} aria-label="Cambiar tema">
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      {!compact && <span>{theme === 'light' ? 'Tema Nodo' : 'Tema claro'}</span>}
    </button>
  );
}

function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
        email: email.trim(),
        password,
      });
      await setSessionToken(data.accessToken);
      onLogin(data.user);
    } catch {
      setError('Acceso denegado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`auth-shell ${theme}`}>
      <ThemeToggle />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><Flame size={28} /></div>
          <div>
            <p className="brand-name">NODO360</p>
            <p className="brand-sub">Bomberos de Chile</p>
          </div>
        </div>

        <div className="auth-live">
          <i />
          <span>Sistema operativo</span>
        </div>

        <h1>Acceso operativo</h1>
        <p className="muted">Ingresá con tu RUT o correo institucional.</p>

        <form onSubmit={submit}>
          <label>
            RUT o correo
            <input
              type="text"
              autoComplete="username"
              inputMode="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="12.345.678-9"
              required
            />
          </label>
          <label>
            Contraseña
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="eye-button" onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar contraseña">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? <><Loader2 className="spin" size={18} /> Ingresando…</> : <><Flame size={18} /> Ingresar</>}
          </button>
        </form>

        <p className="secure-note"><ShieldCheck size={15} /> Acceso restringido · sesión cifrada</p>
      </section>
    </main>
  );
}

function Activation({ onReady }: { onReady: () => void }) {
  const { theme } = useAppTheme();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState({ location: false, push: false });

  const activate = async () => {
    setWorking(true);
    let location = false;
    let push = !Capacitor.isNativePlatform();
    try {
      const permission = await Geolocation.requestPermissions();
      location = permission.location === 'granted' || permission.coarseLocation === 'granted';
    } catch { /* El usuario puede continuar y habilitar después. */ }
    if (Capacitor.isNativePlatform()) {
      try {
        await configureNativeAlarms();
        const permission = await FirebaseMessaging.requestPermissions();
        push = permission.receive === 'granted';
      } catch { /* Configuración Firebase pendiente: no bloquea la app. */ }
    }
    setResult({ location, push });
    await localStore.setActivated();
    setWorking(false);
  };

  return (
    <main className={`auth-shell ${theme}`}>
      <ThemeToggle />
      <section className="auth-card activation">
        <div className="auth-brand">
          <div className="brand-mark"><ShieldCheck size={28} /></div>
          <div>
            <p className="brand-name">NODO360</p>
            <p className="brand-sub">Activar dispositivo</p>
          </div>
        </div>
        <h1>Listo para responder</h1>
        <p className="muted">Nodo360 necesita estos permisos para entregar la alarma y calcular tu ruta.</p>
        <div className="permission"><MapPin /><div><strong>Ubicación</strong><span>GPS al responder y abrir ruta</span></div>{result.location && <Check />}</div>
        <div className="permission"><Siren /><div><strong>Notificaciones</strong><span>Alertas de nuevas emergencias</span></div>{result.push && <Check />}</div>
        {result.location || result.push ? (
          <button className="primary" onClick={onReady}>Continuar <ChevronRight size={20} /></button>
        ) : (
          <button className="primary" onClick={activate} disabled={working}>{working ? 'Solicitando…' : 'Activar permisos'}</button>
        )}
        <button className="text-button" onClick={async () => { await localStore.setActivated(); onReady(); }}>Configurar después</button>
      </section>
    </main>
  );
}

function RadioAvailability({
  available,
  busy,
  onToggle,
}: {
  available: boolean;
  busy: boolean;
  onToggle: (next: boolean) => Promise<void>;
}) {
  return (
    <section className={`radio-avail ${available ? 'on' : 'off'}`}>
      <div>
        <Radio />
        <span>
          <b>{available ? 'Disponible en sala' : 'Fuera de sala'}</b>
          <small>{available ? 'La central te ve en el cuartel' : 'Marcate para aparecer en la sala de radio'}</small>
        </span>
      </div>
      <button type="button" disabled={busy} onClick={() => void onToggle(!available)}>
        {busy ? <Loader2 className="spin" /> : available ? 'Salir' : 'Estoy disponible'}
      </button>
    </section>
  );
}

function ConnectionPill({ state, pending }: { state: 'online' | 'offline' | 'syncing'; pending: number }) {
  return (
    <span className={`connection ${state}`}>
      {state === 'offline' ? <WifiOff /> : state === 'syncing' ? <RefreshCw className="spin" /> : <Wifi />}
      {state === 'offline' ? 'Offline' : state === 'syncing' ? 'Sincronizando' : 'Online'}
      {pending > 0 && ` · ${pending} pendiente${pending > 1 ? 's' : ''}`}
    </span>
  );
}

function AlarmSettings() {
  const [diagnostics, setDiagnostics] = useState<AlarmDiagnostics | null>(null);
  const [code, setCode] = useState('10-0');
  const [message, setMessage] = useState('');
  const native = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      setDiagnostics(await NativeAlarm.getDiagnostics());
      setMessage('');
    } catch {
      setMessage('Diagnóstico nativo no disponible en este build.');
    }
  }, [native]);

  useEffect(() => { void configureNativeAlarms().then((value) => setDiagnostics(value)); }, []);

  const requestNotifications = async () => {
    try {
      const permission = await FirebaseMessaging.requestPermissions();
      if (permission.receive === 'granted') await FirebaseMessaging.getToken();
      await refresh();
    } catch {
      setMessage('Firebase nativo no está configurado; agrega el archivo oficial de la consola.');
    }
  };

  const test = async () => {
    try {
      const result = await NativeAlarm.testAlarm({ code });
      setMessage(
        result.fullScreenRequested === false
          ? 'Prueba enviada sin pantalla completa: Android no la autorizó.'
          : 'Prueba local programada.',
      );
    } catch {
      setMessage('No se pudo emitir la prueba. Revisa el permiso de notificaciones.');
    }
  };

  if (!native) {
    return <section className="settings-card"><h2>Alertas del dispositivo</h2><p>El diagnóstico nativo está disponible en Android/iOS.</p></section>;
  }

  const channelsReady = diagnostics?.channels?.filter((item) =>
    item.exists && item.importance === 4 && item.sound && item.vibration,
  ).length ?? 0;

  return (
    <section className="alarm-settings">
      <div className="settings-card">
        <h2>Alertas críticas</h2>
        <p>Diagnóstico del sistema. Los ajustes finales dependen del usuario y del fabricante.</p>
        <div className="theme-row">
          <span>Apariencia</span>
          <ThemeToggle />
        </div>
        <div className="diagnostic"><BellRing /><span>Notificaciones</span><b>{diagnostics?.notificationsGranted ? 'Permitidas' : 'Pendientes'}</b></div>
        {platform === 'android' && <>
          <div className="diagnostic"><ShieldCheck /><span>No molestar</span><b>{diagnostics?.notificationPolicyAccess ? 'Acceso concedido' : 'Sin acceso'}</b></div>
          <div className="diagnostic"><Siren /><span>Pantalla completa</span><b>{diagnostics?.fullScreenIntentAllowed ? 'Permitida' : 'Restringida'}</b></div>
          <div className="diagnostic"><BatteryCharging /><span>Optimización batería</span><b>{diagnostics?.batteryOptimized ? 'Activa' : 'Sin restricción'}</b></div>
          <div className="diagnostic"><Volume2 /><span>Canales verificados</span><b>{channelsReady}/13</b></div>
        </>}
        {platform === 'ios' && <div className="diagnostic"><Siren /><span>Critical Alerts</span><b>{diagnostics?.criticalAlertsAuthorized ? 'Autorizadas' : 'No autorizadas'}</b></div>}
        <div className="settings-actions">
          {!diagnostics?.notificationsGranted && <button onClick={() => void requestNotifications()}>Solicitar notificaciones</button>}
          <button onClick={() => void NativeAlarm.openNotificationSettings()}>Revisar notificaciones</button>
          {platform === 'android' && !diagnostics?.notificationPolicyAccess && <button onClick={() => void NativeAlarm.openDndSettings()}>Autorizar No molestar</button>}
          {platform === 'android' && diagnostics?.fullScreenIntentAllowed === false && <button onClick={() => void NativeAlarm.openFullScreenSettings()}>Revisar pantalla completa</button>}
          {platform === 'android' && diagnostics?.batteryOptimized && <button onClick={() => void NativeAlarm.openBatterySettings()}>Revisar optimización de batería</button>}
          {platform === 'ios' && diagnostics?.criticalAlertsEnabled && !diagnostics.criticalAlertsAuthorized && <button onClick={() => void NativeAlarm.requestCriticalAlerts().then(refresh)}>Solicitar Critical Alerts</button>}
          <button onClick={() => void refresh()}><RefreshCw /> Actualizar diagnóstico</button>
        </div>
      </div>
      <div className="settings-card">
        <h3>Prueba local</h3>
        <p>Comprueba el canal y tono sin crear una emergencia real.</p>
        <div className="test-row">
          <select value={code} onChange={(event) => setCode(event.target.value)}>
            {Array.from({ length: 13 }, (_, index) => <option key={index} value={`10-${index}`}>10-{index}</option>)}
          </select>
          <button className="primary" onClick={() => void test()}><Siren /> Probar alarma</button>
        </div>
        {message && <p className="settings-message">{message}</p>}
      </div>
      <p className="settings-limit">
        Android puede bloquear pantalla completa, audio o ejecución en segundo plano según versión, política de Play y fabricante.
        iOS solo omite silencio con el entitlement Critical Alerts aprobado por Apple.
      </p>
    </section>
  );
}

function useLivePosition(enabled: boolean) {
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getCurrentCoords().then((coords) => {
      if (!cancelled && coords) setPos(coords);
    });
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setPos({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 8_000 },
    );
    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return pos;
}

function IncidentView({
  incident,
  status,
  responding,
  onRespond,
  onMarkLocation,
  onOpenRadio,
}: {
  incident: ActiveIncident;
  status: EmergencyResponseStatus | null;
  responding: boolean;
  onRespond: (status: EmergencyResponseStatus) => Promise<void>;
  onMarkLocation: () => Promise<void>;
  onOpenRadio?: () => void;
}) {
  const destination = incident.fieldGps ?? incident.dispatchGps ??
    (incident.mapLat != null && incident.mapLng != null
      ? { latitude: incident.mapLat, longitude: incident.mapLng }
      : null);
  const going = status === 'GOING';
  const onScene = status === 'ON_SCENE';
  const pos = useLivePosition(going || onScene);
  const originRef = useRef<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    if (going && pos && !originRef.current) originRef.current = pos;
    if (!going && !onScene) originRef.current = null;
  }, [going, onScene, pos]);
  const remainingKm = pos && destination ? haversineKm(pos, destination) : null;
  const totalKm = originRef.current && destination
    ? Math.max(haversineKm(originRef.current, destination), remainingKm ?? 0.1)
    : remainingKm;
  const etaMin = remainingKm != null ? estimateEtaMinutes(remainingKm) : null;
  const progress = onScene
    ? 1
    : going && remainingKm != null && totalKm
      ? Math.min(0.92, Math.max(0.1, 1 - remainingKm / Math.max(totalKm, remainingKm + 0.3)))
      : going ? 0.28 : 0;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(incident.dispatchedAt).getTime()) / 60_000));
  const routeUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.address)}`;
  const mapUrl = destination
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${destination.longitude - 0.008},${destination.latitude - 0.006},${destination.longitude + 0.008},${destination.latitude + 0.006}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`
    : null;
  const vehicles = incident.vehicles ?? [];
  const detail = incident.description?.trim();
  const radio = incident.radioMessage?.trim();
  const showDetail = detail && detail !== radio;
  const statusLabel = incident.myResponse?.statusLabel
    ?? (status === 'GOING' ? 'En camino' : status === 'ON_SCENE' ? 'En el lugar' : status);

  return (
    <article className="incident">
      <section className={`alarm-card ${going ? 'going' : onScene ? 'onscene' : ''}`}>
        {(going || onScene) && (
          <div className={`status-banner ${going ? 'go' : 'scene'}`}>
            <span className="status-banner-icon">{going ? <Truck /> : <MapPin />}</span>
            <span>
              <b>{going ? 'En camino al incendio' : 'En el lugar'}</b>
              <small>
                {going
                  ? (etaMin != null ? `Llegada estimada ${etaMin} min` : 'La central ya te ve en ruta')
                  : 'Confirmado en el siniestro'}
              </small>
            </span>
            <em className={going && etaMin != null ? 'has-eta' : ''}>{going ? (etaMin != null ? etaMin : '···') : 'OK'}</em>
          </div>
        )}
        <div className="alarm-body">
        <div className="alarm-top">
          <span className="code">{incident.emergencyCodeId || incident.code}</span>
          {going || onScene ? (
            <span className="live-sub">{going ? 'Respuesta enviada' : 'En el siniestro'}</span>
          ) : (
            <span className="live"><i /> ALARMA ACTIVA</span>
          )}
        </div>
        <h2>{incident.type}</h2>
        <p className="address"><MapPin /> {incident.address}</p>
        {showDetail && <p className="brief">{detail}</p>}
        {radio && <p className="radio"><Radio /> {radio}</p>}
        {vehicles.length > 0 && (
          <div className="vehicles">
            <Truck />
            {vehicles.map((vehicle) => (
              <span key={vehicle.patent}>{vehicle.patent}{vehicle.type ? ` · ${vehicle.type}` : ''}</span>
            ))}
          </div>
        )}
        <div className="alarm-time"><Clock3 /> {new Date(incident.dispatchedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}<span>hace {elapsed} min</span></div>
        </div>
      </section>

      {(going || onScene) && (
        <section className={`going-card ${onScene ? 'arrived' : remainingKm == null ? 'searching' : ''}`}>
          <div className="going-head">
            <span className="going-icon">{onScene ? <MapPin /> : <Truck />}</span>
            <span>
              <b>{onScene ? 'Llegaste al lugar' : 'Vas en camino'}</b>
              <small>{onScene ? 'La central te ve en el incendio' : 'La central ya te ve en ruta'}</small>
            </span>
            <strong>{onScene ? '0' : etaMin != null ? String(etaMin) : '—'}</strong>
          </div>
          <div className={`going-track ${going && remainingKm == null ? 'indeterminate' : ''}`}>
            <div className="going-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            <i className="going-truck" style={remainingKm == null && going ? undefined : { left: `${Math.round(progress * 100)}%` }}><Truck /></i>
          </div>
          <div className="going-ends">
            <span><Building2 /> Cuartel</span>
            <span>{remainingKm != null ? (remainingKm < 1 ? `${Math.round(remainingKm * 1000)} m` : `${remainingKm.toFixed(1)} km`) : 'Calculando ruta'}</span>
            <span><MapPin /> Lugar</span>
          </div>
        </section>
      )}

      <section className="response-panel">
        <p className="eyebrow">{status ? 'TU RESPUESTA' : 'CONFIRMA TU RESPUESTA'}</p>
        <div className="big-actions">
          <button className={`go ${going ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('GOING')}>
            <Check />{going ? 'EN CAMINO' : 'VOY'}
          </button>
          <button className={`no-go ${status === 'NOT_GOING' ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('NOT_GOING')}><X />NO VOY</button>
        </div>
        <div className="secondary-actions">
          <button className={`hold ${status === 'NOT_AVAILABLE' ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('NOT_AVAILABLE')}>No disponible</button>
          <button className={`scene ${status === 'ON_SCENE' ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('ON_SCENE')}><MapPin /> En el lugar</button>
        </div>
        <button className="pin-fire" disabled={responding} onClick={() => void onMarkLocation()}>
          <Crosshair /> {incident.fieldGps ? 'Actualizar punto del incendio' : 'Marcar incendio'}
        </button>
        {onOpenRadio && (
          <button type="button" className="open-radio" onClick={onOpenRadio}>
            <Radio /> Canal de radio
          </button>
        )}
        {status && <p className="sent"><Check /> {statusLabel}</p>}
        {incident.fieldGps && <p className="sent pin-ok"><Crosshair /> Punto de incendio confirmado</p>}
      </section>

      <section className="stats">
        <div><b>{incident.teamSummary.going}</b><span>Van</span></div>
        <div><b>{incident.teamSummary.onScene}</b><span>En lugar</span></div>
        <div><b>{incident.teamSummary.notGoing}</b><span>No van</span></div>
        <div><b>{incident.teamSummary.notAvailable}</b><span>No disp.</span></div>
      </section>

      <section className="map-card">
        <div className="section-title"><span><Navigation /> MAPA Y RUTA</span><a href={routeUrl} target="_blank" rel="noreferrer">Abrir ruta</a></div>
        {mapUrl ? <iframe title="Mapa de emergencia" src={mapUrl} loading="lazy" /> : <div className="map-empty"><MapPin /> Coordenadas aún no confirmadas</div>}
      </section>

      <section className="team-card">
        <div className="section-title"><span><Users /> COMPAÑEROS</span><small>{incident.teamSummary.total} respuestas</small></div>
        {incident.teamSummary.responses.length ? incident.teamSummary.responses.map((response) => (
          <div className="teammate" key={response.user.id}>
            <span className="avatar">{response.user.operativeNumber ?? <UserRound />}</span>
            <span>
              {response.user.firstName} {response.user.lastName}
              {response.user.operativeNumber != null && <small>N° {response.user.operativeNumber}</small>}
            </span>
            <strong className={`st-${response.status ?? 'none'}`}>{response.statusLabel || 'Sin estado'}</strong>
          </div>
        )) : <p className="empty">Aún no hay respuestas de la dotación.</p>}
      </section>
    </article>
  );
}

export default function App() {
  const { theme } = useAppTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [activated, setActivated] = useState(false);
  const [screen, setScreen] = useState<Screen>('alarms');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [myStatus, setMyStatus] = useState<EmergencyResponseStatus | null>(null);
  const [stationBusy, setStationBusy] = useState(false);
  const [stationAvailable, setStationAvailable] = useState(false);
  const [notice, setNotice] = useState('');
  const [announceCount, setAnnounceCount] = useState(0);
  const sync = useEmergencySync(Boolean(user && activated));
  const markNotification = sync.markNotification;

  useEffect(() => {
    if (sync.snapshot?.user.stationAvailable != null) {
      setStationAvailable(sync.snapshot.user.stationAvailable);
    } else if (user?.stationAvailable != null) {
      setStationAvailable(user.stationAvailable);
    }
  }, [sync.snapshot?.user.stationAvailable, user?.stationAvailable]);

  useEffect(() => {
    if (!user || !activated) return;
    void api.get<{ id: string }[]>('/announcements')
      .then(({ data }) => setAnnounceCount(data.length))
      .catch(() => setAnnounceCount(0));
  }, [user, activated, screen]);

  useEffect(() => {
    void Promise.all([getSessionToken(), localStore.isActivated()]).then(async ([token, ready]) => {
      setActivated(ready);
      if (token) {
        try {
          const { data } = await api.get<AuthUser>('/auth/me');
          setUser(data);
        } catch {
          await clearSessionToken();
        }
      }
      setBooting(false);
    });
  }, []);

  const openAlarmLink = useCallback((url: string, notificationId?: string) => {
    const parsed = new URL(url, 'https://mobile.nodo360.cl');
    const incidentId = parsed.searchParams.get('incidentId') || parsed.pathname.split('/').filter(Boolean).pop();
    const alarmId = notificationId || parsed.searchParams.get('notificationId') || undefined;
    if (incidentId) setSelectedId(incidentId);
    setScreen('alarms');
    if (alarmId) void markNotification(alarmId, 'opened');
  }, [markNotification]);

  useEffect(() => {
    if (!user || !activated) return;
    let disposed = false;
    const listeners: Array<{ remove: () => Promise<void> }> = [];
    void (async () => {
      await configureNativeAlarms();
      listeners.push(await NativeApp.addListener('appUrlOpen', ({ url }) => openAlarmLink(url)));
      listeners.push(await FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        void api.post('/notifications/register', { token, platform: Capacitor.getPlatform() });
      }));
      listeners.push(await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const data = (notification.data ?? {}) as Record<string, string>;
        openAlarmLink(data.url || `nodo360://emergency/${data.incidentId || ''}`, data.notificationId);
      }));
      listeners.push(await FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        if (Capacitor.getPlatform() !== 'android') return;
        const data = (notification.data ?? {}) as Record<string, string>;
        void NativeAlarm.testAlarm({
          code: data.emergencyCodeId || data.type || data.code || notification.title || '10-0',
          title: notification.title,
          body: notification.body,
        });
      }));
      if (!disposed && Capacitor.isNativePlatform()) {
        const { token } = await FirebaseMessaging.getToken();
        await api.post('/notifications/register', { token, platform: Capacitor.getPlatform() });
      }
      if (disposed) await Promise.all(listeners.map((handle) => handle.remove()));
    })().catch(() => setNotice('Push FCM no disponible: revisa la configuración Firebase nativa.'));
    return () => {
      disposed = true;
      void Promise.all(listeners.map((handle) => handle.remove()));
    };
  }, [activated, openAlarmLink, user]);

  const incidents = sync.snapshot?.incidents ?? [];
  const selected = useMemo(
    () => incidents.find((incident) => incident.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  useEffect(() => {
    setMyStatus(selected?.myResponse?.status ?? null);
  }, [selected?.id]);

  useEffect(() => {
    if (selected?.myResponse?.status) setMyStatus(selected.myResponse.status);
  }, [selected?.myResponse?.status]);

  const respond = async (status: EmergencyResponseStatus) => {
    if (!selected) return;
    setMyStatus(status);
    setResponding(true);
    const wantsGps = status === 'GOING' || status === 'ON_SCENE';
    const position = wantsGps ? await getCurrentCoords(3_500) : undefined;
    await sync.respond(selected.id, status, position);
    if (status === 'NOT_AVAILABLE') setStationAvailable(false);
    if (status === 'GOING' || status === 'ON_SCENE') setStationAvailable(true);
    const notification = sync.history.find((item) => item.incidentId === selected.id);
    if (notification) await sync.markNotification(notification.id, 'acknowledged');
    setNotice(navigator.onLine ? 'Respuesta enviada' : 'Respuesta guardada; se enviará al recuperar conexión');
    setResponding(false);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const markLocation = async () => {
    if (!selected) return;
    setResponding(true);
    const position = await getCurrentCoords();
    if (!position) {
      setNotice('No se pudo leer el GPS. Activa la ubicación e intenta de nuevo.');
      setResponding(false);
      window.setTimeout(() => setNotice(''), 4000);
      return;
    }
    await sync.markLocation(selected.id, position);
    setNotice(navigator.onLine ? 'Punto del incendio enviado' : 'Punto guardado; se enviará al recuperar conexión');
    setResponding(false);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const toggleStation = async (next: boolean) => {
    if (!navigator.onLine) {
      setNotice('Se necesita conexión para avisar a la sala de radio');
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    setStationBusy(true);
    try {
      const { data } = await api.patch<{ stationAvailable: boolean }>('/dispatch/me/availability', {
        available: next,
      });
      setStationAvailable(data.stationAvailable);
      setUser((current) => current ? { ...current, stationAvailable: data.stationAvailable } : current);
      setNotice(data.stationAvailable ? 'Ya figurás disponible en la sala de radio' : 'Saliste de la sala de radio');
    } catch {
      setNotice('No se pudo actualizar tu estado en la sala');
    } finally {
      setStationBusy(false);
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  const logout = async () => {
    disconnectRadioSocket();
    await clearSessionToken();
    await localStore.clearUserData();
    setUser(null);
    setActivated(false);
  };

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, []);

  if (booting) {
    return (
      <main className={`splash ${theme}`}>
        <span className="splash-mark"><Flame /></span>
        <b>NODO360</b>
      </main>
    );
  }
  if (!user) return <Login onLogin={setUser} />;
  if (!activated) return <Activation onReady={() => setActivated(true)} />;

  return (
    <div className={`app ${theme}`}>
      <header>
        <div>
          <Flame />
          <span>
            <b>Nodo360</b>
            <small>
              {sync.snapshot?.user.operativeNumber != null ? `N° ${sync.snapshot.user.operativeNumber}` : sync.snapshot?.user.fullName || user.firstName}
              {user.company?.number ? ` · ${user.company.number}ª` : ''}
              {stationAvailable ? ' · En sala' : ''}
            </small>
          </span>
        </div>
        <ConnectionPill state={sync.connection} pending={sync.pendingCount} />
        <ThemeToggle compact />
        <button
          className="icon-button announce-nav"
          onClick={() => setScreen('announcements')}
          aria-label="Comunicados"
        >
          <Megaphone />
          {announceCount > 0 && <i />}
        </button>
        <button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut /></button>
      </header>
      {notice && <div className="toast"><Check /> {notice}</div>}
      {sync.lastError && <div className="warning"><AlertTriangle /> {sync.lastError}</div>}
      <main className="content">
        {screen !== 'history' && screen !== 'radio' && screen !== 'announcements' && screen !== 'settings' && (
          <RadioAvailability available={stationAvailable} busy={stationBusy} onToggle={toggleStation} />
        )}
        {screen === 'settings' ? (
          <ProfileScreen>
            <AlarmSettings />
          </ProfileScreen>
        ) : screen === 'radio' ? (
          <RadioScreen
            user={user}
            incident={selected}
            status={myStatus ?? selected?.myResponse?.status ?? null}
            onNotice={flash}
          />
        ) : screen === 'announcements' ? (
          <AnnouncementsScreen onCount={setAnnounceCount} />
        ) : screen === 'history' ? (
          <section className="history">
            <h2>Historial reciente</h2>
            {sync.history.length ? sync.history.map((item) => (
              <button key={item.id} onClick={() => { setSelectedId(item.incidentId); setScreen('alarms'); }}>
                <span className="history-icon"><Siren /></span><span><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.createdAt).toLocaleString('es-CL')}</time></span><ChevronRight />
              </button>
            )) : <p className="empty">No hay alarmas recientes.</p>}
          </section>
        ) : incidents.length ? (
          <>
            {incidents.length > 1 && <div className="incident-tabs">{incidents.map((incident) => <button className={selected?.id === incident.id ? 'active' : ''} key={incident.id} onClick={() => setSelectedId(incident.id)}>{incident.code}</button>)}</div>}
            {selected && (
              <IncidentView
                incident={selected}
                status={myStatus ?? selected.myResponse?.status ?? null}
                responding={responding}
                onRespond={respond}
                onMarkLocation={markLocation}
                onOpenRadio={() => setScreen('radio')}
              />
            )}
          </>
        ) : (
          <section className="standby"><span><Radio /></span><h2>Sin alarmas activas</h2><p>El dispositivo está conectado y atento a nuevos despachos.</p><button onClick={() => void sync.refresh()}><RefreshCw /> Actualizar</button></section>
        )}
      </main>
      <nav className="nav-4">
        <button className={screen === 'alarms' ? 'active' : ''} onClick={() => setScreen('alarms')}><Siren />Alarmas{incidents.length > 0 && <i>{incidents.length}</i>}</button>
        <button className={screen === 'radio' ? 'active' : ''} onClick={() => setScreen('radio')}><Radio />Radio{incidents.length > 0 && <i className="radio-live-dot" />}</button>
        <button className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')}><History />Historial</button>
        <button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}><UserRound />Perfil</button>
      </nav>
    </div>
  );
}
