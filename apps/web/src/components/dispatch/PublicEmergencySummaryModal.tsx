import { Clock, MapPin, Radio, Siren, Truck, Users, X, CheckCircle2 } from 'lucide-react';
import type { PublicEmergency } from './DispatchEmergenciesPanel';

export type EmergencyOpen = PublicEmergency | 'all' | null;

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHour(iso: string) {
  const t = new Date(iso);
  return t.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(start: string, end?: string | null) {
  if (!end) return null;
  const min = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

type Props = {
  open: EmergencyOpen;
  emergencies: PublicEmergency[];
  onClose: () => void;
  onSelect: (item: PublicEmergency | 'all') => void;
  dark?: boolean;
};

export default function PublicEmergencySummaryModal({ open, emergencies, onClose, onSelect, dark }: Props) {
  if (!open) return null;

  const card = dark
    ? 'bg-[#0d1924] border border-[#1d3041] text-[#e7edf4]'
    : 'bg-white border border-slate-200 text-slate-800';
  const muted = dark ? 'text-white/70' : 'text-slate-500';
  const title = dark ? 'text-white' : 'text-slate-900';
  const row = dark ? 'hover:bg-white/10 border-white/15' : 'hover:bg-slate-50 border-slate-100';
  const closeBtn = dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-900 text-white hover:bg-slate-800';

  return (
    <div
      className={`sala-dark-modal fixed inset-0 z-[80] flex items-center justify-center p-4 ${dark ? 'bg-black/65' : 'bg-slate-900/50'} backdrop-blur-[2px]`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-white/15' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 text-red-500" />
            <h3 className={`text-sm font-semibold uppercase ${title}`}>
              {open === 'all' ? 'Últimas emergencias' : 'Resumen de emergencia'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className={`p-1.5 rounded-lg ${muted} ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {open === 'all' ? (
          <div className="p-3 max-h-[70vh] overflow-y-auto space-y-2">
            {emergencies.length === 0 && (
              <p className={`text-sm text-center py-8 ${muted}`}>Sin emergencias recientes</p>
            )}
            {emergencies.map((item) => {
              const active = item.status === 'ACTIVA';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full flex gap-3 items-start text-left rounded-xl p-3 border ${row}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-red-500/20 text-red-400' : dark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-500'}`}>
                    <Siren className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <p className={`text-sm font-semibold ${title}`}>{item.type}</p>
                      <span className={`text-[10px] shrink-0 ${muted}`}>{formatHour(item.dispatchedAt)}</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${muted}`}>{item.address || 'Sin dirección'}</p>
                    <span className={`inline-block mt-2 text-[9px] font-semibold uppercase border px-2 py-0.5 rounded-full ${
                      active ? 'bg-red-500/15 text-red-400 border-red-400/30' : dark ? 'bg-white/10 text-white/80 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {active ? 'Activa' : item.status === 'CANCELADA' ? 'Cancelada' : 'Cerrada'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmergencyDetail emergency={open} dark={dark} muted={muted} title={title} onBack={() => onSelect('all')} onClose={onClose} closeBtn={closeBtn} />
        )}
      </div>
    </div>
  );
}

function EmergencyDetail({
  emergency: e,
  dark,
  muted,
  title,
  onBack,
  onClose,
  closeBtn,
}: {
  emergency: PublicEmergency;
  dark?: boolean;
  muted: string;
  title: string;
  onBack: () => void;
  onClose: () => void;
  closeBtn: string;
}) {
  const active = e.status === 'ACTIVA';
  const lasted = durationLabel(e.dispatchedAt, e.closedAt);
  const names = (e.participants ?? [])
    .map((p: any) => (typeof p === 'string' ? p : p.name || `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()))
    .filter(Boolean);

  return (
    <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
      <span className={`inline-flex text-[10px] font-semibold uppercase border px-2.5 py-1 rounded-full ${
        active ? 'bg-red-500/15 text-red-400 border-red-400/30' : dark ? 'bg-white/10 text-white border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}>
        {active ? 'En curso' : e.status === 'CANCELADA' ? 'Cancelada' : 'Cerrada'}
      </span>
      <h4 className={`text-lg font-semibold leading-snug ${title}`}>{e.type}</h4>
      {e.code && <p className={`text-xs font-mono ${muted}`}>Clave {e.code}</p>}

      <div className={`flex flex-wrap gap-3 text-xs ${muted}`}>
        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Despacho {formatWhen(e.dispatchedAt)}</span>
        {e.closedAt && (
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Cierre {formatWhen(e.closedAt)}{lasted ? ` · ${lasted}` : ''}</span>
        )}
        {e.address && (
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{e.address}</span>
        )}
      </div>

      {(e.radioMessage || e.description) && (
        <p className={`text-sm leading-relaxed ${dark ? 'text-white/90' : 'text-slate-700'}`}>
          {e.radioMessage || e.description}
        </p>
      )}

      <div className={`rounded-xl p-3 space-y-2 text-xs ${dark ? 'bg-white/10 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>
        <p className={`flex items-center gap-1.5 ${muted}`}>
          <Radio className="w-3.5 h-3.5" /> Alarma: <strong className={title}>{e.alarmBy || 'Central'}</strong>
        </p>
        {e.vehicles && e.vehicles.length > 0 && (
          <p className={`flex items-center gap-1.5 ${muted}`}>
            <Truck className="w-3.5 h-3.5" /> {e.vehicles.map((v) => `${v.patent}${v.type ? ` · ${v.type}` : ''}`).join(', ')}
          </p>
        )}
        <p className={`flex items-center gap-1.5 ${muted}`}>
          <Users className="w-3.5 h-3.5" />
          {names.length > 0 ? names.join(', ') : `${e.participants?.length || 0} voluntarios en despacho`}
        </p>
        {e.involvedAsSupport && e.dispatchCompanyName && (
          <p className={muted}>Apoyo a {e.dispatchCompanyNumber ? `${e.dispatchCompanyNumber}ª ` : ''}{e.dispatchCompanyName}</p>
        )}
        {e.hasBitacora && (
          <p className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bitácora registrada
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onBack} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          Ver todas
        </button>
        <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${closeBtn}`}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
