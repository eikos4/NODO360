import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [-35.6632, -71.4392];

function ClickHandler({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.4);transform:translate(-50%,-50%)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type Props = {
  center?: [number, number];
  latitude?: string | number;
  longitude?: string | number;
  pickActive?: boolean;
  onPick: (lat: number, lng: number) => void;
  height?: string;
};

export default function DispatchMapPicker({
  center,
  latitude,
  longitude,
  pickActive = true,
  onPick,
  height = 'min(220px, 40vh)',
}: Props) {
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const mapCenter: [number, number] = hasPoint ? [lat!, lng!] : center ?? DEFAULT_CENTER;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-700 ${pickActive ? 'cursor-crosshair' : ''}`} style={{ height }}>
      <MapContainer center={mapCenter} zoom={hasPoint ? 16 : 14} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer
          attribution="&copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter center={mapCenter} />
        <ClickHandler active={pickActive} onPick={onPick} />
        {hasPoint && <Marker position={[lat!, lng!]} icon={pinIcon} />}
      </MapContainer>
      {pickActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <span className="bg-sky-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
            Clic para ubicar emergencia
          </span>
        </div>
      )}
    </div>
  );
}
