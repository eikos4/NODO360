import { useEffect, useMemo } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useState } from 'react';
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

function CompanyIcon({ number, role }: { number: number; role: 'primary' | 'support' | 'none' }) {
  const bg = role === 'primary' ? '#dc2626' : role === 'support' ? '#2563eb' : '#059669';
  return (
    <div style={{ background: bg, color: 'white', width: 28, height: 28, borderRadius: 8, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
      {number}
    </div>
  );
}

function EmergencyIcon() {
  return (
    <div style={{ position: 'relative', width: 36, height: 36 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#ef4444', borderRadius: '50%', opacity: .35, animation: 'pulse 1.5s infinite' }}></div>
      <div style={{ position: 'absolute', inset: 6, background: '#dc2626', borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 10px rgba(220,38,38,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔥</div>
    </div>
  );
}

function HydrantIcon() {
  return (
    <div style={{ background: '#0ea5e9', width: 14, height: 14, borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}></div>
  );
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
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

  const [selectedPopup, setSelectedPopup] = useState<{ type: 'company' | 'hydrant' | 'incident' | 'emergency', id: string, lat: number, lng: number, data: any } | null>(null);

  return (
    <div className="relative w-full h-full min-h-[220px]" style={{ height }}>
      <Map
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={hasEmergency ? 15 : 13}
        style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#0f172a' : '#e2e8f0' }}
        className={`z-0 rounded-xl overflow-hidden ${pickActive ? 'cursor-crosshair' : ''}`}
        disableDefaultUI
        mapId="central-express-map"
        onClick={pickActive ? (e) => onPick?.(e.detail.latLng!.lat, e.detail.latLng!.lng) : undefined}
      >
        <MapRecenter center={center} zoom={hasEmergency ? 15 : 13} />

        {companies.map((c) => (
          <AdvancedMarker
            key={c.id}
            position={{ lat: c.lat, lng: c.lng }}
            onClick={() => {
              onSelectCompany?.(c.id);
              setSelectedPopup({ type: 'company', id: c.id, lat: c.lat, lng: c.lng, data: c });
            }}
          >
            <CompanyIcon number={c.number} role={c.id === selectedCompanyId ? 'primary' : c.id === supportCompanyId ? 'support' : 'none'} />
          </AdvancedMarker>
        ))}

        {hydrants.map((h) => (
          <AdvancedMarker key={h.id} position={{ lat: h.lat, lng: h.lng }} onClick={() => setSelectedPopup({ type: 'hydrant', id: h.id, lat: h.lat, lng: h.lng, data: h })}>
            <HydrantIcon />
          </AdvancedMarker>
        ))}

        {incidents.filter((i) => i.isOpen !== false).map((i) => (
          <AdvancedMarker key={i.id} position={{ lat: i.lat, lng: i.lng }} onClick={() => setSelectedPopup({ type: 'incident', id: i.id, lat: i.lat, lng: i.lng, data: i })}>
            <EmergencyIcon />
          </AdvancedMarker>
        ))}

        {hasEmergency && (
          <AdvancedMarker position={{ lat: emergencyLat!, lng: emergencyLng! }} onClick={() => setSelectedPopup({ type: 'emergency', id: 'curr', lat: emergencyLat!, lng: emergencyLng!, data: null })}>
            <EmergencyIcon />
          </AdvancedMarker>
        )}

        {selectedPopup && (
          <InfoWindow position={{ lat: selectedPopup.lat, lng: selectedPopup.lng }} onCloseClick={() => setSelectedPopup(null)} pixelOffset={[0, -20]}>
            <div className="text-slate-900 min-w-[140px]">
              {selectedPopup.type === 'company' && (
                <div className="text-xs space-y-1">
                  <p className="font-bold">{selectedPopup.data.number}ª Compañía</p>
                  <p className="text-slate-600">{selectedPopup.data.name}</p>
                  <p>Voluntarios: {selectedPopup.data.rosterAvailable}</p>
                  <p>Maquinistas: {selectedPopup.data.maquinistasAvailable}</p>
                  <p>Carros op.: {selectedPopup.data.fleetOperativo}</p>
                </div>
              )}
              {selectedPopup.type === 'hydrant' && (
                <span className="text-xs font-mono">Hidrante {selectedPopup.data.code}</span>
              )}
              {selectedPopup.type === 'incident' && (
                <div className="text-xs">
                  <p className="font-bold">{selectedPopup.data.code}</p>
                  <p>{selectedPopup.data.type}</p>
                  {selectedPopup.data.address && <p className="text-slate-600">{selectedPopup.data.address}</p>}
                </div>
              )}
              {selectedPopup.type === 'emergency' && (
                <span className="text-xs font-semibold">Emergencia en curso</span>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>

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
