import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';

/** Centro de Parral — fallback si no hay GPS. */
export const PARRAL_CENTER: [number, number] = [-36.1415, -71.8228];

export type OsmBaseStyle = 'osm' | 'voyager' | 'dark' | 'satellite' | 'terrain';

export type OsmMarkerTone = 'active' | 'idle' | 'dispatch' | 'field' | 'you' | 'hydrant' | 'truck' | 'poi' | 'company' | 'meeting' | 'ops';

export type OsmMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  badge?: string;
  active?: boolean;
  tone?: OsmMarkerTone;
  draggable?: boolean;
  /** Ícono de la tarea sobre el carro (💧 🪓 ⛏️). */
  job?: string | null;
  jobTitle?: string | null;
};

export type OsmPolyline = {
  id: string;
  path: [number, number][];
  color?: string;
};

export type OsmPolygon = {
  id: string;
  path: [number, number][];
  color?: string;
  label?: string;
};

type Props = {
  center?: [number, number] | null;
  /** Si hay varios pines, prioriza este punto en vez de fitBounds. */
  focus?: [number, number] | null;
  markers?: OsmMarker[];
  polylines?: OsmPolyline[];
  polygons?: OsmPolygon[];
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
  onMarkerMove?: (id: string, lat: number, lng: number) => void;
};

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};
const FALLBACK_TILE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attr: 'Tiles &copy; Esri',
};

const SATELLITE_TILE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attr: 'Tiles &copy; Esri',
};

const TERRAIN_TILE = {
  url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  attr: 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
};

/** Carto exige API key; usamos OSM en todos los estilos de calle. */
const TILES: Record<OsmBaseStyle, { url: string; attr: string }> = {
  osm: OSM_TILE,
  voyager: OSM_TILE,
  dark: OSM_TILE,
  satellite: SATELLITE_TILE,
  terrain: TERRAIN_TILE,
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch
  ));
}

function markerIcon(tone: OsmMarkerTone, badge?: string, draggable?: boolean, job?: string | null, jobTitle?: string | null) {
  const unit = tone === 'truck' || tone === 'company';
  if (unit) {
    const text = escapeHtml(badge || 'Unidad');
    const jobMark = job
      ? `<span class="osm-unit-task" title="${escapeHtml(jobTitle || job)}">${escapeHtml(job)}</span>`
      : '';
    return L.divIcon({
      className: 'public-osm-pin public-osm-pin-unit',
      html: `<div class="osm-unit-pin${draggable ? ' osm-unit-pin-drag' : ''}" title="${draggable ? 'Arrastre para ubicar' : text}"><span class="osm-unit-emoji-wrap"><span class="osm-unit-emoji">🚒</span>${jobMark}</span><span class="osm-unit-label">${text}</span></div>`,
      iconSize: [118, job ? 46 : 34],
      iconAnchor: [17, job ? 29 : 17],
      popupAnchor: [0, -14],
    });
  }
  if (tone === 'ops') {
    const text = escapeHtml(badge || 'Punto');
    const icon = escapeHtml(job || '📌');
    return L.divIcon({
      className: 'public-osm-pin public-osm-pin-ops',
      html: `<div class="osm-ops-pin" title="${escapeHtml(jobTitle || text)}"><span class="osm-ops-icon">${icon}</span><span class="osm-ops-label">${text}</span></div>`,
      iconSize: [128, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14],
    });
  }
  const poi = tone === 'poi';
  const label = badge
    ? `<span class="osm-pin-badge${poi ? ' osm-pin-badge-poi' : ''}">${escapeHtml(badge)}</span>`
    : '';
  return L.divIcon({
    className: `public-osm-pin${poi ? ' public-osm-pin-poi' : ''}`,
    html: `<div class="osm-pin-wrap osm-pin-wrap-${tone}"><span class="osm-pin-pulse osm-pin-pulse-${tone}"></span><span class="osm-pin-dot osm-pin-dot-${tone}"></span>${label}</div>`,
    iconSize: badge ? [96, poi ? 36 : 28] : [poi ? 36 : 28, poi ? 36 : 28],
    iconAnchor: [poi ? 18 : 14, poi ? 18 : 14],
    popupAnchor: [0, -12],
  });
}

function validPoint(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

export default function PublicOsmMap({
  center,
  focus = null,
  markers = [],
  polylines = [],
  polygons = [],
  zoom = 14,
  flyToken = 0,
  theme = 'light',
  baseStyle,
  className = 'h-full w-full',
  pickActive = false,
  autoFit = true,
  onPick,
  onMarkerClick,
  onMarkerMove,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof L.map> | null>(null);
  const layerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const polyLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const tileRef = useRef<ReturnType<typeof L.tileLayer> | null>(null);
  const markersByIdRef = useRef(new Map<string, L.Marker>());
  const draggingIdRef = useRef<string | null>(null);
  const pickRef = useRef({ active: pickActive, onPick });
  pickRef.current = { active: pickActive, onPick };
  const markerClickRef = useRef(onMarkerClick);
  markerClickRef.current = onMarkerClick;
  const markerMoveRef = useRef(onMarkerMove);
  markerMoveRef.current = onMarkerMove;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const polylinesRef = useRef(polylines);
  polylinesRef.current = polylines;
  const polygonsRef = useRef(polygons);
  polygonsRef.current = polygons;

  const resolved = baseStyle ?? 'osm';
  const invertTiles =
    resolved !== 'satellite' &&
    resolved !== 'terrain' &&
    (resolved === 'dark' || theme === 'dark');

  const centerLat = center?.[0] ?? null;
  const centerLng = center?.[1] ?? null;
  const focusLat = focus?.[0] ?? null;
  const focusLng = focus?.[1] ?? null;
  const markerSig = useMemo(
    () => markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.badge ?? ''}:${m.tone ?? ''}:${m.draggable ? '1' : '0'}:${m.job ?? ''}:${m.jobTitle ?? ''}`).join('|'),
    [markers],
  );
  const polySig = useMemo(
    () =>
      [
        ...polylines.map((p) => `L:${p.id}:${p.color ?? ''}:${p.path.map((pt) => pt.join(',')).join(';')}`),
        ...polygons.map((p) => `G:${p.id}:${p.color ?? ''}:${p.label ?? ''}:${p.path.map((pt) => pt.join(',')).join(';')}`),
      ].join('|'),
    [polylines, polygons],
  );
  const fitSig = autoFit ? markerSig : '';

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

    const ready = () => map.invalidateSize({ animate: false });
    requestAnimationFrame(ready);
    const t = window.setTimeout(ready, 200);
    const ro = new ResizeObserver(() => ready());
    ro.observe(elRef.current);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      polyLayerRef.current = null;
      tileRef.current = null;
      markersByIdRef.current.clear();
      draggingIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = pickActive ? 'crosshair' : '';
  }, [pickActive]);

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
    requestAnimationFrame(() => map.invalidateSize({ animate: false }));
  }, [resolved]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }
    if (!polyLayerRef.current) {
      polyLayerRef.current = L.layerGroup().addTo(map);
    }
    const layer = layerRef.current;
    const byId = markersByIdRef.current;
    const pts = markersRef.current.filter((m) => validPoint(m.lat, m.lng));
    const nextIds = new Set(pts.map((m) => m.id));

    for (const [id, marker] of byId) {
      if (!nextIds.has(id) && draggingIdRef.current !== id) {
        layer.removeLayer(marker);
        byId.delete(id);
      }
    }

    pts.forEach((m) => {
      const tone = m.tone ?? (m.active !== false ? 'active' : 'idle');
      const existing = byId.get(m.id);
      if (existing) {
        if (draggingIdRef.current === m.id) return;
        existing.setLatLng([m.lat, m.lng]);
        existing.setIcon(markerIcon(tone, m.badge, m.draggable, m.job, m.jobTitle));
        if (m.draggable) existing.dragging?.enable();
        else existing.dragging?.disable();
        return;
      }
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(tone, m.badge, m.draggable, m.job, m.jobTitle),
        draggable: Boolean(m.draggable),
        autoPan: Boolean(m.draggable),
        riseOnHover: true,
      });
      if (m.label) marker.bindPopup(m.label);
      marker.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        if (pickRef.current.active) {
          pickRef.current.onPick?.(event.latlng.lat, event.latlng.lng);
          return;
        }
        markerClickRef.current?.(m.id);
      });
      marker.on('dragstart', () => {
        draggingIdRef.current = m.id;
        marker.closePopup();
        map.dragging.disable();
      });
      marker.on('dragend', () => {
        map.dragging.enable();
        const pos = marker.getLatLng();
        draggingIdRef.current = null;
        markerMoveRef.current?.(m.id, pos.lat, pos.lng);
      });
      marker.addTo(layer);
      byId.set(m.id, marker);
    });

    polyLayerRef.current.clearLayers();
    polygonsRef.current.forEach((zone) => {
      const path = zone.path.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (path.length < 3) return;
      const color = zone.color || '#dc2626';
      const shape = L.polygon(path, {
        color,
        weight: 3,
        fillColor: color,
        fillOpacity: 0.32,
        opacity: 0.95,
        interactive: !pickRef.current.active,
      });
      if (zone.label) shape.bindPopup(zone.label);
      shape.addTo(polyLayerRef.current!);
    });
    polylinesRef.current.forEach((line) => {
      const path = line.path.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (path.length < 2) return;
      L.polyline(path, { color: line.color || '#dc2626', weight: 3, opacity: 0.95 }).addTo(polyLayerRef.current!);
    });
  }, [markerSig, polySig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusLat != null && focusLng != null && validPoint(focusLat, focusLng)) {
      map.setView([focusLat, focusLng], Math.max(zoom, 15), { animate: false });
      return;
    }
    if (!autoFit) {
      if (centerLat != null && centerLng != null && validPoint(centerLat, centerLng)) {
        map.setView([centerLat, centerLng], zoom, { animate: false });
      }
      return;
    }
    const pts = markersRef.current.filter((m) => validPoint(m.lat, m.lng));
    const start = (
      centerLat != null && centerLng != null && validPoint(centerLat, centerLng)
        ? [centerLat, centerLng]
        : pts[0]
          ? [pts[0].lat, pts[0].lng]
          : PARRAL_CENTER
    ) as [number, number];
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 15, animate: false });
    } else {
      map.setView(start, zoom, { animate: false });
    }
  }, [autoFit, centerLat, centerLng, focusLat, focusLng, flyToken, zoom, fitSig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const kick = () => map.invalidateSize({ animate: false });
    kick();
    const t1 = window.setTimeout(kick, 200);
    const t2 = window.setTimeout(kick, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [flyToken, pickActive, invertTiles, resolved]);

  return (
    <div
      ref={elRef}
      className={`${className}${pickActive ? ' cursor-crosshair' : ''}${invertTiles ? ' osm-tiles-dark' : ''}`}
    />
  );
}
