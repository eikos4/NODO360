import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Droplets, Flame, Truck } from 'lucide-react';

const PARRAL_CENTER: [number, number] = [-36.1428, -71.8258];

const TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
} as const;

export type ExpressMapCompany = {
  id: string;
  number: number;
  name: string;
  lat: number;
  lng: number;
  rosterAvailable: number;
  maquinistasAvailable: number;
  fleetOperativo: number;
};

export type ExpressMapIncident = {
  id: string;
  code: string;
  type: string;
  address?: string | null;
  lat: number;
  lng: number;
  isOpen?: boolean;
};

export type ExpressMapHydrant = {
  id: string;
  code: string;
  lat: number;
  lng: number;
  status?: string;
};

type Props = {
  theme: 'light' | 'dark';
  companies: ExpressMapCompany[];
  hydrants?: ExpressMapHydrant[];
  incidents?: ExpressMapIncident[];
  emergencyLat?: number;
  emergencyLng?: number;
  selectedCompanyId?: string;
  supportCompanyId?: string;
  pickActive?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onSelectCompany?: (id: string) => void;
  height?: string;
};

function companyIcon(number: number, role: 'primary' | 'support' | 'none') {
  const bg = role === 'primary' ? '#dc2626' : role === 'support' ? '#2563eb' : '#059669';
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:white;width:28px;height:28px;border-radius:8px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function emergencyIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:36px;height:36px">
      <div style="position:absolute;inset:0;background:#ef4444;border-radius:50%;opacity:.35;animation:pulse 1.5s infinite"></div>
      <div style="position:absolute;inset:6px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(220,38,38,.6);display:flex;align-items:center;justify-content:center;font-size:16px">🔥</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function hydrantIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#0ea5e9;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapClickHandler({ active, onPick }: { active: boolean; onPick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!active || !onPick) return;
    const handler = (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [active, map, onPick]);
  return null;
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function CentralExpressMap({
  theme,
  companies,
  hydrants = [],
  incidents = [],
  emergencyLat,
  emergencyLng,
  selectedCompanyId,
  supportCompanyId,
  pickActive = true,
  onPick,
  onSelectCompany,
  height = '100%',
}: Props) {
  const tiles = TILES[theme];

  const center = useMemo<[number, number]>(() => {
    if (emergencyLat != null && emergencyLng != null && !Number.isNaN(emergencyLat)) {
      return [emergencyLat, emergencyLng];
    }
    if (companies.length) {
      const sel = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
      return [sel.lat, sel.lng];
    }
    return PARRAL_CENTER;
  }, [companies, emergencyLat, emergencyLng, selectedCompanyId]);

  const hasEmergency = emergencyLat != null && emergencyLng != null && !Number.isNaN(emergencyLat);

  return (
    <div className="relative w-full h-full min-h-[220px]" style={{ height }}>
      <MapContainer
        center={center}
        zoom={hasEmergency ? 15 : 13}
        style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#0f172a' : '#e2e8f0' }}
        className="z-0 rounded-xl overflow-hidden"
      >
        <TileLayer attribution={tiles.attribution} url={tiles.url} />
        <MapRecenter center={center} zoom={hasEmergency ? 15 : 13} />
        <MapClickHandler active={pickActive} onPick={onPick} />

        {companies.map((c) => (
          <Marker
            key={c.id}
            position={[c.lat, c.lng]}
            icon={companyIcon(
              c.number,
              c.id === selectedCompanyId ? 'primary' : c.id === supportCompanyId ? 'support' : 'none',
            )}
            eventHandlers={{
              click: () => onSelectCompany?.(c.id),
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[140px]">
                <p className="font-bold">{c.number}ª Compañía</p>
                <p className="text-slate-600">{c.name}</p>
                <p>Voluntarios: {c.rosterAvailable}</p>
                <p>Maquinistas: {c.maquinistasAvailable}</p>
                <p>Carros op.: {c.fleetOperativo}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {hydrants.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={hydrantIcon()}>
            <Popup>
              <span className="text-xs font-mono">Hidrante {h.code}</span>
            </Popup>
          </Marker>
        ))}

        {incidents.filter((i) => i.isOpen !== false).map((i) => (
          <Marker key={i.id} position={[i.lat, i.lng]} icon={emergencyIcon()}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{i.code}</p>
                <p>{i.type}</p>
                {i.address ? <p className="text-slate-600">{i.address}</p> : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {hasEmergency && (
          <Marker position={[emergencyLat!, emergencyLng!]} icon={emergencyIcon()}>
            <Popup><span className="text-xs font-semibold">Emergencia en curso</span></Popup>
          </Marker>
        )}
      </MapContainer>

      <div className={`absolute bottom-2 left-2 right-2 z-[400] flex flex-wrap gap-2 justify-center text-[9px] font-semibold px-2 py-1.5 rounded-lg border backdrop-blur-sm ${
        theme === 'dark' ? 'bg-slate-900/85 border-slate-700 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-600'
      }`}>
        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-red-500" /> Emergencia</span>
        <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-emerald-500" /> Cuartel</span>
        <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-emerald-400" /> Carro</span>
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-sky-500" /> Hidrante</span>
      </div>
    </div>
  );
}
