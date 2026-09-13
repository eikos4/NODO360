import { useMemo } from 'react';
import { Building2, Droplets, Flame, Truck } from 'lucide-react';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../map/PublicOsmMap';

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
  const hasEmergency = emergencyLat != null && emergencyLng != null && !Number.isNaN(emergencyLat);

  const center = useMemo<[number, number]>(() => {
    if (hasEmergency) return [emergencyLat!, emergencyLng!];
    if (companies.length) {
      const sel = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
      return [sel.lat, sel.lng];
    }
    return PARRAL_CENTER;
  }, [companies, emergencyLat, emergencyLng, hasEmergency, selectedCompanyId]);

  const markers = useMemo((): OsmMarker[] => {
    const list: OsmMarker[] = companies.map((c) => ({
      id: `company:${c.id}`,
      lat: c.lat,
      lng: c.lng,
      tone: c.id === selectedCompanyId ? 'active' : c.id === supportCompanyId ? 'you' : 'field',
      label: `<strong>${c.number}ª ${c.name}</strong><br/>Voluntarios: ${c.rosterAvailable}<br/>Maquinistas: ${c.maquinistasAvailable}<br/>Carros op.: ${c.fleetOperativo}`,
    }));
    hydrants.forEach((h) => {
      list.push({
        id: `hydrant:${h.id}`,
        lat: h.lat,
        lng: h.lng,
        tone: 'idle',
        label: `Hidrante ${h.code}`,
      });
    });
    incidents.filter((i) => i.isOpen !== false).forEach((i) => {
      list.push({
        id: `incident:${i.id}`,
        lat: i.lat,
        lng: i.lng,
        tone: 'dispatch',
        label: `<strong>${i.code}</strong><br/>${i.type}${i.address ? `<br/>${i.address}` : ''}`,
      });
    });
    if (hasEmergency) {
      list.push({
        id: 'emergency',
        lat: emergencyLat!,
        lng: emergencyLng!,
        tone: 'active',
        label: 'Emergencia en curso',
      });
    }
    return list;
  }, [companies, hydrants, incidents, hasEmergency, emergencyLat, emergencyLng, selectedCompanyId, supportCompanyId]);

  return (
    <div className="relative w-full h-full min-h-[220px]" style={{ height }}>
      <PublicOsmMap
        theme={theme}
        baseStyle="osm"
        center={center}
        focus={hasEmergency ? [emergencyLat!, emergencyLng!] : null}
        zoom={hasEmergency ? 15 : 13}
        markers={markers}
        pickActive={pickActive}
        onPick={onPick}
        onMarkerClick={(id) => {
          if (id.startsWith('company:')) onSelectCompany?.(id.slice('company:'.length));
        }}
        className="h-full w-full rounded-xl overflow-hidden"
      />

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
