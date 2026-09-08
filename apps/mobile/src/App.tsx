import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  AlertTriangle, BatteryCharging, BellRing, Check, ChevronRight, Clock3, History, LogOut, MapPin,
  Navigation, Radio, RefreshCw, Settings, ShieldCheck, Siren, UserRound, Users, Volume2, Wifi, WifiOff, X,
} from 'lucide-react';
import type { EmergencyResponseStatus } from '@nodo360/shared';
import { api, errorMessage } from './lib/api';
import { localStore } from './lib/localStore';
import { clearSessionToken, getSessionToken, setSessionToken } from './platform/session';
import { configureNativeAlarms, NativeAlarm, type AlarmDiagnostics } from './platform/nativeAlarm';
import { useEmergencySync } from './hooks/useEmergencySync';
import type { ActiveIncident, AuthUser } from './types';

type Screen = 'alarms' | 'history' | 'settings';

function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark"><Siren size={34} /></div>
        <p className="eyebrow">RESPUESTA OPERATIVA</p>
        <h1>Nodo360</h1>
        <p className="muted">Acceso exclusivo para personal autorizado.</p>
        <form onSubmit={submit}>
          <label>Correo institucional<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
        <p className="secure-note"><ShieldCheck size={15} /> Sesión cifrada en el dispositivo</p>
      </section>
    </main>
  );
}

function Activation({ onReady }: { onReady: () => void }) {
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
    <main className="auth-shell">
      <section className="auth-card activation">
        <div className="brand-mark"><ShieldCheck size={34} /></div>
        <p className="eyebrow">ACTIVAR DISPOSITIVO</p>
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

function IncidentView({
  incident,
  responding,
  onRespond,
}: {
  incident: ActiveIncident;
  responding: boolean;
  onRespond: (status: EmergencyResponseStatus) => Promise<void>;
}) {
  const destination = incident.fieldGps ?? incident.dispatchGps ??
    (incident.mapLat != null && incident.mapLng != null
      ? { latitude: incident.mapLat, longitude: incident.mapLng }
      : null);
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(incident.dispatchedAt).getTime()) / 60_000));
  const routeUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.address)}`;
  const mapUrl = destination
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${destination.longitude - 0.008},${destination.latitude - 0.006},${destination.longitude + 0.008},${destination.latitude + 0.006}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`
    : null;

  return (
    <article className="incident">
      <section className="alarm-card">
        <div className="alarm-top"><span className="code">{incident.emergencyCodeId || incident.code}</span><span className="live"><i /> ALARMA ACTIVA</span></div>
        <h2>{incident.type}</h2>
        <p className="address"><MapPin /> {incident.address}</p>
        {incident.radioMessage && <p className="radio"><Radio /> {incident.radioMessage}</p>}
        <div className="alarm-time"><Clock3 /> {new Date(incident.dispatchedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}<span>hace {elapsed} min</span></div>
      </section>

      <section className="response-panel">
        <p className="eyebrow">CONFIRMA TU RESPUESTA</p>
        <div className="big-actions">
          <button className={`go ${incident.myResponse?.status === 'GOING' ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('GOING')}><Check />VOY</button>
          <button className={`no-go ${incident.myResponse?.status === 'NOT_GOING' ? 'selected' : ''}`} disabled={responding} onClick={() => onRespond('NOT_GOING')}><X />NO VOY</button>
        </div>
        <button className="scene" disabled={responding} onClick={() => onRespond('ON_SCENE')}><MapPin /> Ya estoy en el lugar</button>
        {incident.myResponse && <p className="sent"><Check /> Respuesta registrada: {incident.myResponse.statusLabel}</p>}
      </section>

      <section className="stats">
        <div><b>{incident.teamSummary.going}</b><span>Van</span></div>
        <div><b>{incident.teamSummary.onScene}</b><span>En lugar</span></div>
        <div><b>{incident.teamSummary.notGoing}</b><span>No van</span></div>
        <div><b>{incident.teamSummary.total}</b><span>Total</span></div>
      </section>

      <section className="map-card">
        <div className="section-title"><span><Navigation /> MAPA Y RUTA</span><a href={routeUrl} target="_blank" rel="noreferrer">Abrir ruta</a></div>
        {mapUrl ? <iframe title="Mapa de emergencia" src={mapUrl} loading="lazy" /> : <div className="map-empty"><MapPin /> Coordenadas aún no confirmadas</div>}
      </section>

      <section className="team-card">
        <div className="section-title"><span><Users /> COMPAÑEROS</span><small>{incident.teamSummary.total} respuestas</small></div>
        {incident.teamSummary.responses.length ? incident.teamSummary.responses.map((response) => (
          <div className="teammate" key={response.user.id}>
            <span className="avatar"><UserRound /></span>
            <span>{response.user.firstName} {response.user.lastName}</span>
            <strong>{response.statusLabel || 'Sin estado'}</strong>
          </div>
        )) : <p className="empty">Aún no hay respuestas de la dotación.</p>}
      </section>
    </article>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [activated, setActivated] = useState(false);
  const [screen, setScreen] = useState<Screen>('alarms');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [notice, setNotice] = useState('');
  const sync = useEmergencySync(Boolean(user && activated));
  const markNotification = sync.markNotification;

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

  const respond = async (status: EmergencyResponseStatus) => {
    if (!selected) return;
    setResponding(true);
    let position: { latitude: number; longitude: number } | undefined;
    if (status === 'GOING' || status === 'ON_SCENE') {
      try {
        const current = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8_000 });
        position = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      } catch { /* La API acepta la respuesta sin GPS. */ }
    }
    await sync.respond(selected.id, status, position);
    const notification = sync.history.find((item) => item.incidentId === selected.id);
    if (notification) await sync.markNotification(notification.id, 'acknowledged');
    setNotice(navigator.onLine ? 'Respuesta enviada' : 'Respuesta guardada; se enviará al recuperar conexión');
    setResponding(false);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const logout = async () => {
    await clearSessionToken();
    await localStore.clearUserData();
    setUser(null);
    setActivated(false);
  };

  if (booting) return <main className="splash"><Siren /><span>Nodo360</span></main>;
  if (!user) return <Login onLogin={setUser} />;
  if (!activated) return <Activation onReady={() => setActivated(true)} />;

  return (
    <div className="app">
      <header>
        <div><Siren /><span><b>Nodo360</b><small>{user.company?.number ? `${user.company.number}ª Compañía` : 'Operaciones'}</small></span></div>
        <ConnectionPill state={sync.connection} pending={sync.pendingCount} />
        <button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut /></button>
      </header>
      {notice && <div className="toast"><Check /> {notice}</div>}
      {sync.lastError && <div className="warning"><AlertTriangle /> {sync.lastError}</div>}
      <main className="content">
        {screen === 'settings' ? (
          <AlarmSettings />
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
            {selected && <IncidentView incident={selected} responding={responding} onRespond={respond} />}
          </>
        ) : (
          <section className="standby"><span><Radio /></span><h2>Sin alarmas activas</h2><p>El dispositivo está conectado y atento a nuevos despachos.</p><button onClick={() => void sync.refresh()}><RefreshCw /> Actualizar</button></section>
        )}
      </main>
      <nav>
        <button className={screen === 'alarms' ? 'active' : ''} onClick={() => setScreen('alarms')}><Siren />Alarmas{incidents.length > 0 && <i>{incidents.length}</i>}</button>
        <button className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')}><History />Historial</button>
        <button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}><Settings />Alertas</button>
      </nav>
    </div>
  );
}
