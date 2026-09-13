import { useEffect, useRef } from 'react';
import L from 'leaflet';

/** Centro de Parral — fallback si no hay GPS. */
export const PARRAL_CENTER: [number, number] = [-36.1415, -71.8228];

export type OsmBaseStyle = 'osm' | 'voyager' | 'dark';

export type OsmMarkerTone = 'active' | 'idle' | 'dispatch' | 'field' | 'you';

export type OsmMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  active?: boolean;
  tone?: OsmMarkerTone;
};

type Props = {
  center?: [number, number] | null;
  /** Si hay varios pines, prioriza este punto en vez de fitBounds. */
  focus?: [number, number] | null;
  markers?: OsmMarker[];
  zoom?: number;
  theme?: 'light' | 'dark';
  baseStyle?: OsmBaseStyle;
  className?: string;
  pickActive?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
};

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

/** Carto exige API key; usamos OSM en todos los estilos. */
const TILES: Record<OsmBaseStyle, { url: string; attr: string }> = {
  osm: OSM_TILE,
  voyager: OSM_TILE,
  dark: OSM_TILE,
};

function markerIcon(tone: OsmMarkerTone) {
  return L.divIcon({
    className: 'public-osm-pin',
    html: `<div class="osm-pin-wrap"><span class="osm-pin-pulse osm-pin-pulse-${tone}"></span><span class="osm-pin-dot osm-pin-dot-${tone}"></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export default function PublicOsmMap({
  center,
  focus = null,
  markers = [],
  zoom = 14,
  theme = 'light',
  baseStyle,
  className = 'h-full w-full',
  pickActive = false,
  onPick,
  onMarkerClick,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof L.map> | null>(null);
  const layerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const tileRef = useRef<ReturnType<typeof L.tileLayer> | null>(null);
  const pickRef = useRef({ active: pickActive, onPick });
  pickRef.current = { active: pickActive, onPick };
  const markerClickRef = useRef(onMarkerClick);
  markerClickRef.current = onMarkerClick;
  const resolved = baseStyle ?? 'osm';

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      if (pickRef.current.active) pickRef.current.onPick?.(e.latlng.lat, e.latlng.lng);
    });

    const ready = () => map.invalidateSize();
    requestAnimationFrame(ready);
    const t = window.setTimeout(ready, 200);
    const ro = new ResizeObserver(ready);
    ro.observe(elRef.current);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const spec = TILES[resolved];
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(spec.url, { attribution: spec.attr, maxZoom: 19 }).addTo(map);
  }, [resolved]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const pts = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && (m.lat !== 0 || m.lng !== 0));
    const layer = L.layerGroup();
    pts.forEach((m) => {
      L.marker([m.lat, m.lng], { icon: markerIcon(m.tone ?? (m.active !== false ? 'active' : 'idle')) })
        .bindPopup(m.label ?? '')
        .on('click', () => markerClickRef.current?.(m.id))
        .addTo(layer);
    });
    layer.addTo(map);
    layerRef.current = layer;

    if (focus && Number.isFinite(focus[0]) && Number.isFinite(focus[1])) {
      map.setView(focus, Math.max(zoom, 15));
    } else {
      const start = center ?? (pts[0] ? ([pts[0].lat, pts[0].lng] as [number, number]) : PARRAL_CENTER);
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 15 });
      } else {
        map.setView(start, zoom);
      }
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, center, focus, zoom]);

  return (
    <div
      ref={elRef}
      className={`${className}${pickActive ? ' cursor-crosshair' : ''}${resolved === 'dark' || theme === 'dark' ? ' osm-tiles-dark' : ''}`}
    />
  );
}
