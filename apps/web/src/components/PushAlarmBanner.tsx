import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { enablePushNotifications, storedPushToken, type PushStatus } from '../lib/push-notifications';

const DISMISS_KEY = 'nodo360_push_banner_dismissed';

export default function PushAlarmBanner() {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    const already = Boolean(storedPushToken());
    if (already) {
      setStatus('ready');
      setHidden(true);
      void enablePushNotifications();
      return;
    }
    setHidden(dismissed);
  }, []);

  if (hidden && status !== 'denied') return null;

  const activate = async () => {
    setBusy(true);
    const next = await enablePushNotifications();
    setStatus(next);
    setBusy(false);
    if (next === 'ready') setHidden(true);
  };

  return (
    <div className="mx-3 sm:mx-5 mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2.5 flex items-start gap-3 text-amber-100">
      <Bell className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Alarmas en este teléfono</p>
        <p className="text-xs text-amber-200/80 mt-0.5">
          {status === 'denied'
            ? 'Bloqueaste las notificaciones. Actívalas en Ajustes del teléfono para recibir alarmas con la app cerrada.'
            : 'Actívalas para que te llegue la alarma aunque NODO360 esté cerrado.'}
        </p>
        {status !== 'denied' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void activate()}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide bg-amber-500 hover:bg-amber-400 text-amber-950 px-3 py-1.5 rounded-lg disabled:opacity-60"
          >
            <BellOff className="w-3.5 h-3.5" />
            {busy ? 'Activando…' : 'Activar notificaciones'}
          </button>
        )}
      </div>
      <button
        type="button"
        className="text-amber-300/70 hover:text-white"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setHidden(true);
        }}
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
