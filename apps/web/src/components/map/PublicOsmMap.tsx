import { useEffect, useRef } from 'react';
import L from 'leaflet';

/** Centro de Parral — fallback si no hay GPS. */
export const PARRAL_CENTER: [number, number] = [-36.1415, -71.8228];

export type OsmBaseStyle = 'osm' | 'voyager' | 'dark';

export type OsmMarkerTone = 'active' | 'idle' | 'dispatch' | 'field' | 'you' | 'hydrant' | 'truck' | 'poi' | 'company' | 'meeting';

export type OsmMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  active?: boolean;
  tone?: OsmMarkerTone;
};

export type OsmPolyline = {
  id: string;
  path: [number, number][];
  color?: string;
};

type Props = {
  center?: [number, number] | null;
  /** Si hay varios pines, prioriza este punto en vez de fitBounds. */
  focus?: [number, number] | null;
  markers?: OsmMarker[];
  polylines?: OsmPolyline[];
  zoom?: number;
  /** Incrementar para volver a centrar aunque el foco no haya cambiado. */
  flyToken?: number;
  theme?: 'light' | 'dark';
  baseStyle?: OsmBaseStyle;
  className?: string;
  pickActive?: boolean;
  /** Recentrar cuando cambian los pines. En mapas en vivo déjalo apagado. */
  autoFit?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
};

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};
const FALLBACK_TILE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attr: 'Tiles &copy; Esri',
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
  polylines = [],
  zoom = 14,
  flyToken = 0,
  theme = 'light',
  baseStyle,
  className = 'h-full w-full',
  pickActive = false,
  autoFit = true,
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
      center: PARRAL_CENTER,
      zoom: 14,
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
    const layer = L.tileLayer(spec.url, { attribution: spec.attr, maxZoom: 19 });
    layer.on('tileerror', () => {
      if (!mapRef.current || tileRef.current !== layer) return;
      map.removeLayer(layer);
      tileRef.current = L.tileLayer(FALLBACK_TILE.url, {
        attribution: FALLBACK_TILE.attr,
        maxZoom: 19,
      }).addTo(map);
    });
    tileRef.current = layer.addTo(map);
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
    polylines.forEach((line) => {
      const path = line.path.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (path.length < 2) return;
      L.polyline(path, { color: line.color || '#3b82f6', weight: 4, opacity: 0.75 }).addTo(layer);
    });
    layer.addTo(map);
    layerRef.current = layer;
    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, polylines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focus && Number.isFinite(focus[0]) && Number.isFinite(focus[1])) {
      map.setView(focus, Math.max(zoom, 15));
      return;
    }
    if (!autoFit) return;
    const pts = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && (m.lat !== 0 || m.lng !== 0));
    const start = center ?? (pts[0] ? ([pts[0].lat, pts[0].lng] as [number, number]) : PARRAL_CENTER);
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView(start, zoom);
    }
  }, [autoFit, center, focus, flyToken, markers, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const kick = () => map.invalidateSize();
    kick();
    const t1 = window.setTimeout(kick, 200);
    const t2 = window.setTimeout(kick, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [flyToken, pickActive]);

  return (
    <div
      ref={elRef}
      className={`${className}${pickActive ? ' cursor-crosshair' : ''}${resolved === 'dark' || theme === 'dark' ? ' osm-tiles-dark' : ''}`}
    />
  );
}
