import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Siren, MapPin, Clock, Radio, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

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
  status: 'ACTIVA' | 'CERRADA';
  alarmBy: string;
  radioMessage?: string;
  emergencyCodeId?: string | null;
  hasBitacora?: boolean;
  vehicles?: { patent: string; type: string; brand?: string }[];
  involvedAsSupport?: boolean;
  dispatchCompanyName?: string | null;
  dispatchCompanyNumber?: number | null;
};

function FitEmergencies({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const incidentIcon = (active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${active ? '#ef4444' : '#64748b'};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

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
  const points: [number, number][] = emergencies
    .filter((e) => e.hasCoordinates !== false && e.latitude && e.longitude)
    .map((e) => [e.latitude, e.longitude]);
  const center: [number, number] = companyCenter ?? points[0] ?? [-33.0472, -71.6127];

  const pendingCount = emergencies.filter(
    (e) => !e.hasBitacora && (e.status === 'CERRADA' || pendingBitacoraIds.includes(e.id)),
  ).length;

  const needsBitacora = (e: PublicEmergency) =>
    !e.hasBitacora && (e.status === 'CERRADA' || pendingBitacoraIds.includes(e.id));

  return (
    <div className={`border rounded-2xl overflow-hidden h-full flex flex-col ${s.wrap}`}>
      <div className={`px-4 py-3 border-b ${s.header}`}>
        <div className="flex items-center gap-2">
          <Siren className="w-4 h-4 text-red-500" />
          <h3 className={`text-sm font-bold ${s.title}`}>Últimas emergencias</h3>
          <span className={`ml-auto text-[10px] ${s.meta}`}>{emergencies.length} en mapa</span>
        </div>
        {pendingCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{pendingCount} bitácora{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} — complétalas abajo</span>
          </div>
        )}
      </div>

      <div className={`h-48 sm:h-56 border-b relative z-0 ${s.mapBorder}`}>
        {emergencies.length === 0 ? (
          <div className={`h-full flex items-center justify-center text-xs px-4 text-center ${s.empty}`}>
            Sin emergencias georreferenciadas recientes
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer url={s.tile} />
            <FitEmergencies points={points} />
            {emergencies.map((e) => (
              e.hasCoordinates === false || !e.latitude || !e.longitude ? null : (
              <Marker
                key={e.id}
                position={[e.latitude, e.longitude]}
                icon={incidentIcon(e.status === 'ACTIVA')}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[160px]">
                    <p className="font-bold">{e.type}</p>
                    <p>{e.address}</p>
                    <p className="text-slate-600">Alarma: {e.alarmBy}</p>
                    {needsBitacora(e) && <p className="text-amber-600 font-semibold">Bitácora pendiente</p>}
                  </div>
                </Popup>
              </Marker>
              )
            ))}
          </MapContainer>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto max-h-64 sm:max-h-80 divide-y ${s.divide}`}>
        {emergencies.length === 0 ? null : emergencies.map((e) => {
          const pending = needsBitacora(e);
          const highlighted = highlightEmergencyId === e.id;

          return (
            <div
              key={e.id}
              id={`emergency-row-${e.id}`}
              className={`px-4 py-3 transition-colors ${
                highlighted
                  ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/40'
                  : pending
                    ? 'bg-amber-950/20 hover:bg-amber-950/30'
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
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
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
                  onClick={() => onCompleteBitacora(e)}
                  className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
