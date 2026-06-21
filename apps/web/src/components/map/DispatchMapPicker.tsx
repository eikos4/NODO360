import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Copy, Crosshair, LocateFixed, MapPin } from 'lucide-react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

/** Centro por defecto — Parral, Región del Maule (demo Cuerpo de Bomberos) */
const DEFAULT_CENTER: [number, number] = [-36.1428, -71.8258];

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
} as const;

function ClickHandler({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#dc2626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(0,0,0,.35)"><div style="width:10px;height:10px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg)"></div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  center?: [number, number];
  latitude?: string | number;
  longitude?: string | number;
  pickActive?: boolean;
  onPick: (lat: number, lng: number) => void;
  height?: string;
  theme?: 'light' | 'dark';
  showGpsPanel?: boolean;
};

function formatCoord(n: number, decimals = 6): string {
  return n.toFixed(decimals);
}

export default function DispatchMapPicker({
  center,
  latitude,
  longitude,
  pickActive = true,
  onPick,
  height = 'min(220px, 40vh)',
  theme = 'light',
  showGpsPanel = true,
}: Props) {
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const mapCenter: [number, number] = hasPoint ? [lat!, lng!] : center ?? DEFAULT_CENTER;
  const tiles = TILE_LAYERS[theme];

  const [locating, setLocating] = useState(false);

  const copyGps = useCallback(() => {
    if (!hasPoint) return;
    const text = `${formatCoord(lat!)}, ${formatCoord(lng!)}`;
    navigator.clipboard.writeText(text);
    toast.success('Coordenadas GPS copiadas');
  }, [hasPoint, lat, lng]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast.success('Ubicación GPS del dispositivo marcada');
      },
      () => {
        setLocating(false);
        toast.error('No se pudo obtener el GPS. Revisa permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [onPick]);

  return (
    <div className="flex flex-col w-full h-full min-h-0" style={{ height }}>
      <div
        className={`relative flex-1 min-h-0 rounded-t-xl overflow-hidden border ${
          theme === 'light' ? 'border-slate-300' : 'border-slate-700'
        } ${pickActive ? 'cursor-crosshair' : ''}`}
      >
        <MapContainer
          center={mapCenter}
          zoom={hasPoint ? 17 : 13}
          style={{ height: '100%', width: '100%', background: theme === 'light' ? '#f1f5f9' : '#0f172a' }}
          className="z-0 dispatch-map"
        >
          <TileLayer attribution={tiles.attribution} url={tiles.url} />
          <Recenter center={mapCenter} zoom={hasPoint ? 17 : undefined} />
          <ClickHandler active={pickActive} onPick={onPick} />
          {hasPoint && <Marker position={[lat!, lng!]} icon={pinIcon} />}
        </MapContainer>

        {pickActive && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <span className="bg-sky-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
              Clic en el mapa para marcar la emergencia
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 z-[500]">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            title="Usar GPS de este dispositivo"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-md border bg-white text-sky-700 border-sky-200 hover:bg-sky-50 disabled:opacity-60"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-pulse' : ''}`} />
            Mi GPS
          </button>
        </div>
      </div>

      {showGpsPanel && (
        <div
          className={`shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-b-xl border border-t-0 text-xs ${
            theme === 'light'
              ? 'bg-white border-slate-300 text-slate-700'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">GPS</span>
          </div>

          {hasPoint ? (
            <>
              <span className="font-mono font-medium text-slate-800">
                <span className="text-slate-500 mr-1">Lat</span>{formatCoord(lat!)}
              </span>
              <span className="font-mono font-medium text-slate-800">
                <span className="text-slate-500 mr-1">Lng</span>{formatCoord(lng!)}
              </span>
              <button
                type="button"
                onClick={copyGps}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold border border-slate-200"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </>
          ) : (
            <span className="text-slate-400 italic text-[11px]">
              Sin coordenadas — busca dirección, &quot;Mi GPS&quot; o marca en el mapa
            </span>
          )}

          {pickActive && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-sky-600">
              <Crosshair className="w-3 h-3" />
              Marcando
            </span>
          )}
        </div>
      )}
    </div>
  );
}
