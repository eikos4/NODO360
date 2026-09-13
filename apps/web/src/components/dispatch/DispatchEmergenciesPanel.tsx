import { useState } from 'react';
import { Siren, MapPin, Clock, Radio, BookOpen, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react';
import EmergencyLocationUpdater from './EmergencyLocationUpdater';
import PublicOsmMap, { PARRAL_CENTER } from '../map/PublicOsmMap';
import PublicEmergencySummaryModal, { type EmergencyOpen } from './PublicEmergencySummaryModal';

export type PublicEmergency = {
  id: string;
  code: string;
  type: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  hasCoordinates?: boolean;
  hasFieldGps?: boolean;
  confirmedLatitude?: number | null;
  confirmedLongitude?: number | null;
  locationPinAt?: string | null;
  dispatchLatitude?: number | null;
  dispatchLongitude?: number | null;
  dispatchedAt: string;
  closedAt?: string | null;
  status: 'ACTIVA' | 'CERRADA' | 'CANCELADA';
  alarmBy: string;
  radioMessage?: string;
  emergencyCodeId?: string | null;
  hasBitacora?: boolean;
  vehicles?: { patent: string; type: string; brand?: string }[];
  involvedAsSupport?: boolean;
  dispatchCompanyName?: string | null;
  dispatchCompanyNumber?: number | null;
  participants?: { name?: string; role?: string; firstName?: string; lastName?: string }[];
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  emergencies: PublicEmergency[];
  companyCenter?: [number, number];
  pendingBitacoraIds?: string[];
  highlightEmergencyId?: string | null;
  onCompleteBitacora?: (emergency: PublicEmergency) => void;
  theme?: 'light' | 'dark';
};

const PANEL_STYLES = {
  dark: {
    wrap: 'bg-[#111d33]/90 border-slate-700/60',
    header: 'border-slate-700/60',
    title: 'text-white',
    meta: 'text-slate-500',
    mapBorder: 'border-slate-700/60',
    empty: 'text-slate-500',
    tile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    rowTitle: 'text-white',
    rowAddress: 'text-slate-400',
    rowMeta: 'text-slate-500',
    rowHover: 'hover:bg-slate-800/30',
    divide: 'divide-slate-800/80',
    badgeClosed: 'bg-slate-700 text-slate-400',
  },
  light: {
    wrap: 'bg-white border-slate-200 shadow-sm',
    header: 'border-slate-200 bg-slate-50/80',
    title: 'text-slate-900',
    meta: 'text-slate-500',
    mapBorder: 'border-slate-200',
    empty: 'text-slate-500',
    tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    rowTitle: 'text-slate-900',
    rowAddress: 'text-slate-600',
    rowMeta: 'text-slate-500',
    rowHover: 'hover:bg-slate-50',
    divide: 'divide-slate-100',
    badgeClosed: 'bg-slate-200 text-slate-600',
  },
} as const;

export default function DispatchEmergenciesPanel({
  emergencies,
  companyCenter,
  pendingBitacoraIds = [],
  highlightEmergencyId,
  onCompleteBitacora,
  theme = 'dark',
}: Props) {
  const s = PANEL_STYLES[theme];
  const mapMarkers = emergencies
    .filter((e) => e.hasCoordinates !== false && e.latitude && e.longitude)
    .map((e) => ({
      id: e.id,
      lat: e.latitude,
      lng: e.longitude,
      active: e.status === 'ACTIVA',
      label: `<strong>${e.type}</strong><br/>${e.address ?? ''}`,
    }));
  const center: [number, number] = companyCenter ?? (mapMarkers[0] ? [mapMarkers[0].lat, mapMarkers[0].lng] : PARRAL_CENTER);

  const pendingCount = emergencies.filter(
    (e) => !e.hasBitacora && (e.status === 'CERRADA' || pendingBitacoraIds.includes(e.id)),
  ).length;

  const needsBitacora = (e: PublicEmergency) =>
    !e.hasBitacora && (e.status === 'CERRADA' || pendingBitacoraIds.includes(e.id));

  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState<EmergencyOpen>(null);

  return (
    <div className={`border rounded-2xl overflow-hidden h-full flex flex-col ${s.wrap}`}>
      <div className={`px-4 py-3 border-b ${s.header}`}>
        <div className="flex items-center gap-2">
          <Siren className="w-4 h-4 text-red-500" />
          <button type="button" onClick={() => setSummaryOpen('all')} className={`text-sm font-bold text-left ${s.title}`}>
            Últimas emergencias
          </button>
          <span className={`ml-auto text-[10px] ${s.meta}`}>{emergencies.length} en mapa</span>
        </div>
        {pendingCount > 0 && (
          <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-semibold rounded-lg px-2.5 py-1.5 border ${
            theme === 'dark'
              ? 'text-amber-200 bg-amber-500/10 border-amber-500/25'
              : 'text-amber-950 bg-amber-100 border-amber-400'
          }`}>
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{pendingCount} bitácora{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} — complétalas abajo</span>
          </div>
        )}
      </div>

      <div className={`h-48 sm:h-56 border-b relative z-0 ${s.mapBorder}`}>
        <PublicOsmMap
          theme={theme}
          center={center}
          zoom={14}
          markers={mapMarkers}
          className="h-full w-full"
        />
      </div>

      <div className={`flex-1 overflow-y-auto max-h-64 sm:max-h-80 divide-y ${s.divide}`}>
        {emergencies.length === 0 ? null : emergencies.map((e) => {
          const pending = needsBitacora(e);
          const highlighted = highlightEmergencyId === e.id;

          return (
            <div
              key={e.id}
              id={`emergency-row-${e.id}`}
              role="button"
              tabIndex={0}
              onClick={() => setSummaryOpen(e)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSummaryOpen(e); } }}
              className={`px-4 py-3 transition-colors cursor-pointer ${
                highlighted
                  ? theme === 'dark'
                    ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/40'
                    : 'bg-amber-100 ring-1 ring-inset ring-amber-400'
                  : pending
                    ? theme === 'dark'
                      ? 'bg-amber-950/20 hover:bg-amber-950/30'
                      : 'bg-amber-50 hover:bg-amber-100'
                    : `${s.rowHover}`
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`text-xs font-bold leading-tight ${s.rowTitle}`}>{e.type}</p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    e.status === 'ACTIVA'
                      ? 'bg-red-500/20 text-red-600'
                      : s.badgeClosed
                  }`}>
                    {e.status === 'ACTIVA' ? 'Activa' : 'Cerrada'}
                  </span>
                  {e.hasBitacora ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Bitácora
                    </span>
                  ) : pending ? (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      Sin bitácora
                    </span>
                  ) : null}
                </div>
              </div>
              <p className={`text-[11px] flex items-start gap-1 mb-1.5 ${s.rowAddress}`}>
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                {e.address}
              </p>
              <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[10px] mb-2 ${s.rowMeta}`}>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatWhen(e.dispatchedAt)}
                </span>
                <span className="flex items-center gap-1 text-sky-600">
                  <Radio className="w-3 h-3" />
                  Alarma: <strong className="text-sky-700">{e.alarmBy}</strong>
                </span>
              </div>

              {pending && onCompleteBitacora && (
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); onCompleteBitacora(e); }}
                  className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 !text-white text-[11px] font-bold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Completar bitácora
                </button>
              )}
              {e.hasBitacora && (
                <p className="text-[10px] text-emerald-500/80 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Registro guardado en perfil de compañía
                </p>
              )}

              <p className={`text-[10px] font-semibold mt-2 ${theme === 'dark' ? 'text-sky-300' : 'text-blue-600'}`}>
                Ver resumen
              </p>

              {e.status === 'ACTIVA' && (
                <div className="mt-3" onClick={(ev) => ev.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); setEditingLocationId(editingLocationId === e.id ? null : e.id); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold transition-colors text-slate-700 dark:text-slate-300"
                  >
                    <Navigation className="w-3 h-3 text-blue-500" />
                    {editingLocationId === e.id ? 'Ocultar Opciones de Ubicación' : 'Gestionar Ubicación / Enviar WhatsApp'}
                  </button>

                  {editingLocationId === e.id && (
                    <EmergencyLocationUpdater 
                      emergencyId={e.id}
                      currentAddress={e.address}
                      onClose={() => setEditingLocationId(null)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PublicEmergencySummaryModal
        open={summaryOpen}
        emergencies={emergencies}
        onClose={() => setSummaryOpen(null)}
        onSelect={setSummaryOpen}
        dark={theme === 'dark'}
      />
    </div>
  );
}
