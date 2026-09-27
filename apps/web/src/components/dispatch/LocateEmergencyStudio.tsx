import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Loader2, LocateFixed, MapPin, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import {
  buildLocationPinUrl,
  buildLocationPinWhatsAppMessage,
  buildWhatsAppShareUrl,
} from '../../lib/incident-location-pin';

type Phase = 'phone' | 'waiting' | 'located' | 'handoff';

export type LocatedPin = {
  token: string;
  lat: number;
  lng: number;
  note?: string;
  address?: string;
};

const WAIT_LINES = [
  'Enlace listo en el teléfono',
  'Esperando que abran el link',
  'Pidiendo permiso de GPS',
  'Aún no confirman el punto',
];

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  return digits;
}

async function reverseGeocode(lat: number, lng: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
    { headers: { 'Accept-Language': 'es' } },
  );
  const data = await res.json();
  const label = data?.display_name as string | undefined;
  return label ? label.split(',').slice(0, 3).join(', ') : '';
}

export default function LocateEmergencyStudio({
  open,
  isDark,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onConfirmed: (pin: LocatedPin) => void;
}) {
  const [phase, setPhase] = useState<Phase>('phone');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [line, setLine] = useState(0);
  const [pin, setPin] = useState<LocatedPin | null>(null);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (!open) return;
    setPhase('phone');
    setToken('');
    setPin(null);
    setLine(0);
  }, [open]);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const t = window.setInterval(() => setLine((n) => (n + 1) % WAIT_LINES.length), 2200);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'waiting' || !token) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api.get(`/location-pin/pre-dispatch/${token}`);
        if (cancelled || !res.data?.found || !res.data?.data) return;
        const lat = Number(res.data.data.lat);
        const lng = Number(res.data.data.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const address = await reverseGeocode(lat, lng).catch(() => '');
        if (cancelled) return;
        const next: LocatedPin = {
          token,
          lat,
          lng,
          note: res.data.data.note,
          address,
        };
        setPin(next);
        setPhase('located');
      } catch {
        /* sigue esperando */
      }
    };
    void tick();
    const t = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [phase, token]);

  useEffect(() => {
    if (phase !== 'located' || !pin) return;
    const t = window.setTimeout(() => setPhase('handoff'), 2400);
    return () => window.clearTimeout(t);
  }, [phase, pin]);

  useEffect(() => {
    if (phase !== 'handoff' || !pin) return;
    const t = window.setTimeout(() => onConfirmedRef.current(pin), 900);
    return () => window.clearTimeout(t);
  }, [phase, pin]);

  const link = useMemo(() => (token ? buildLocationPinUrl(token) : ''), [token]);

  if (!open) return null;

  const share = () => {
    const digits = normalizePhone(phone);
    if (digits.length < 8) {
      toast.error('Ingresá el WhatsApp, por ejemplo 569...');
      return;
    }
    const next = token || `pre_${crypto.randomUUID().replace(/-/g, '')}`;
    setToken(next);
    const url = buildLocationPinUrl(next);
    const message = buildLocationPinWhatsAppMessage({
      code: 'UBICACIÓN',
      type: 'Confirmar punto de la emergencia',
      address: 'Por confirmar',
      url,
    });
    const wa = buildWhatsAppShareUrl(digits, message);
    if (!wa) {
      toast.error('Número inválido');
      return;
    }
    window.open(wa, '_blank', 'noopener,noreferrer');
    setPhase('waiting');
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const ink = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#041018]/80 p-4 backdrop-blur-md">
      <style>{`
        @keyframes locate-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes locate-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes locate-rise { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes locate-blip {
          0%, 100% { transform: scale(0.6); opacity: 0.25; }
          45% { transform: scale(1.35); opacity: 1; }
        }
        .locate-radar {
          position: relative;
          width: 240px;
          height: 240px;
          margin: 0 auto;
          border-radius: 999px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 50%, rgba(56,189,248,0.22) 0 2px, transparent 3px),
            repeating-radial-gradient(circle, transparent 0 34px, rgba(56,189,248,0.45) 35px 36px),
            radial-gradient(circle, rgba(8,47,73,0.15) 0%, rgba(2,6,23,0.55) 72%);
          box-shadow: inset 0 0 48px rgba(14,165,233,0.35), 0 0 36px rgba(14,165,233,0.28);
          border: 1px solid rgba(125,211,252,0.45);
        }
        .locate-radar::before,
        .locate-radar::after {
          content: '';
          position: absolute;
          background: rgba(125,211,252,0.35);
        }
        .locate-radar::before { left: 8%; right: 8%; top: 50%; height: 1px; }
        .locate-radar::after { top: 8%; bottom: 8%; left: 50%; width: 1px; }
        .locate-radar-sweep {
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          background: conic-gradient(from 0deg, transparent 0deg, transparent 250deg, rgba(56,189,248,0.08) 300deg, rgba(186,230,253,0.75) 360deg);
          animation: locate-sweep 2.1s linear infinite;
        }
        .locate-blip {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #e0f2fe;
          box-shadow: 0 0 0 4px rgba(56,189,248,0.25), 0 0 14px #38bdf8;
          animation: locate-blip 1.8s ease-in-out infinite;
        }
      `}</style>
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl ${
          isDark ? 'border-sky-400/20 bg-[#07141f] text-white' : 'border-slate-200 bg-white text-slate-900'
        }`}
        role="dialog"
        aria-modal
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex items-center justify-between px-5 pt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-500">Localizar emergencia</p>
          {phase !== 'located' && phase !== 'handoff' && (
            <button type="button" onClick={onClose} className={`rounded-lg p-1.5 ${muted}`} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative px-5 pb-6 pt-2">
          {phase === 'phone' && (
            <div className="space-y-4" style={{ animation: 'locate-rise 0.45s ease both' }}>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sky-500/10">
                <LocateFixed className="h-10 w-10 text-sky-500" />
              </div>
              <div className="text-center">
                <h2 className={`text-2xl font-black ${ink}`}>Pedir el punto exacto</h2>
                <p className={`mt-1 text-sm ${muted}`}>
                  Se genera un enlace. La persona lo abre, confirma el GPS y esta pantalla espera hasta que llegue.
                </p>
              </div>
              <label className="block">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${muted}`}>WhatsApp</span>
                <input
                  autoFocus
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="56912345678"
                  className={`mt-1 w-full rounded-2xl border px-4 py-3 text-lg font-semibold outline-none ${
                    isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                  }`}
                />
              </label>
              <button
                type="button"
                onClick={share}
                className="keep-on-color flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-black text-emerald-950"
              >
                <MessageCircle className="h-5 w-5" />
                Generar enlace y WhatsApp
              </button>
            </div>
          )}

          {phase === 'waiting' && (
            <div className="space-y-5 text-center" style={{ animation: 'locate-rise 0.4s ease both' }}>
              <div className="locate-radar" aria-hidden>
                <div className="locate-radar-sweep" />
                <span className="locate-blip" style={{ left: '62%', top: '34%', animationDelay: '0.1s' }} />
                <span className="locate-blip" style={{ left: '28%', top: '58%', animationDelay: '0.7s' }} />
                <span className="locate-blip" style={{ left: '70%', top: '68%', animationDelay: '1.2s' }} />
                <LocateFixed className="absolute left-1/2 top-1/2 z-[1] h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-sky-200 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${ink}`}>Esperando ubicación</h2>
                <p className={`mt-1 text-sm font-semibold text-sky-500`}>{WAIT_LINES[line]}</p>
                <p className={`mt-2 text-xs ${muted}`}>La consola no cambia hasta que confirmen el punto.</p>
              </div>
              <div className={`rounded-2xl border px-3 py-2 text-left text-[11px] ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <p className={`truncate font-mono ${muted}`}>{link}</p>
                <button type="button" onClick={() => void copyLink()} className="mt-1 inline-flex items-center gap-1 font-bold text-sky-500">
                  <Copy className="h-3.5 w-3.5" /> Copiar enlace
                </button>
              </div>
              <button
                type="button"
                onClick={share}
                className="text-xs font-bold text-[#128C7E]"
              >
                Reenviar WhatsApp
              </button>
            </div>
          )}

          {(phase === 'located' || phase === 'handoff') && pin && (
            <div className="space-y-4 text-center">
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                style={{ animation: 'locate-pop 0.55s ease both' }}
              >
                {phase === 'handoff' ? <Loader2 className="h-10 w-10 animate-spin" /> : <Check className="h-12 w-12" />}
              </div>
              <div style={{ animation: 'locate-rise 0.5s ease 0.15s both' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">
                  {phase === 'handoff' ? 'Pasando a despacho' : 'Localizada'}
                </p>
                <h2 className={`mt-1 text-2xl font-black ${ink}`}>
                  {phase === 'handoff' ? 'Abriendo Despacho360 con este punto' : 'Ubicación confirmada'}
                </h2>
                <p className={`mt-2 flex items-start justify-center gap-1 text-sm ${muted}`}>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{pin.address || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
