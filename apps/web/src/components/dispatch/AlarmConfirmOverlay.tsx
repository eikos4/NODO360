import { CheckCircle2, Copy, MapPin, MessageCircle, Siren, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildLocationPinUrl } from '../../lib/incident-location-pin';

export type AlarmConfirmInfo = {
  code: string;
  type: string;
  address: string;
  locationPinToken?: string;
};

type Props = {
  info: AlarmConfirmInfo | null;
  onClose: () => void;
  isDark: boolean;
  waPhone: string;
  onWaPhone: (value: string) => void;
  onSendWhatsApp: () => void;
};

export default function AlarmConfirmOverlay({
  info,
  onClose,
  isDark,
  waPhone,
  onWaPhone,
  onSendWhatsApp,
}: Props) {
  if (!info) return null;

  const pinUrl = info.locationPinToken ? buildLocationPinUrl(info.locationPinToken) : null;

  const copyLink = () => {
    if (!pinUrl) return;
    void navigator.clipboard.writeText(pinUrl);
    toast.success('Enlace GPS copiado');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 alarm-confirm-backdrop" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl alarm-confirm-pop ${
        isDark ? 'border-white/10 bg-[#0c1018]' : 'border-slate-200 bg-white'
      }`}>
        <div className="absolute inset-x-0 top-0 h-1.5 bg-red-600 alarm-confirm-bar" />
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 right-3 p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-10 pb-6 text-center">
          <div className="relative mx-auto w-24 h-24 mb-5">
            <span className="alarm-confirm-ring" />
            <span className="alarm-confirm-ring alarm-confirm-ring-delay" />
            <div className="relative z-10 w-24 h-24 rounded-full bg-red-600 keep-on-color flex items-center justify-center shadow-xl shadow-red-600/40 alarm-confirm-siren">
              <Siren className="w-11 h-11 text-white" />
            </div>
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600 mb-2">
            Emergencia confirmada
          </p>
          <p className={`font-mono text-4xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {info.code}
          </p>
          <p className={`mt-1 text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {info.type}
          </p>
          <p className={`mt-3 text-sm flex items-start justify-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{info.address}</span>
          </p>

          <div className={`mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
            isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 alarm-confirm-check" />
            Alarma enviada a la dotación
          </div>
        </div>

        {info.locationPinToken && (
          <div className={`mx-5 mb-6 rounded-2xl border p-3 text-left ${
            isDark ? 'border-[#25D366]/30 bg-[#25D366]/10' : 'border-[#25D366]/40 bg-[#25D366]/10'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              Pedir GPS por WhatsApp
            </p>
            <input
              type="tel"
              value={waPhone}
              onChange={(e) => onWaPhone(e.target.value)}
              placeholder="Ej: 56912345678"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="keep-on-color w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={copyLink}
              className={`mt-2 text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
            >
              <Copy className="w-3 h-3" />
              Copiar enlace de ubicación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
