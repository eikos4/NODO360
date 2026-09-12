import { useEffect, useRef } from 'react';
import L from 'leaflet';

/** Centro de Parral — fallback si no hay GPS. */
export const PARRAL_CENTER: [number, number] = [-36.1415, -71.8228];

export type OsmMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  active?: boolean;
};

type Props = {
  center?: [number, number] | null;
  markers?: OsmMarker[];
  zoom?: number;
  theme?: 'light' | 'dark';
  className?: string;
};

function markerIcon(active: boolean) {
  const color = active ? '#ef4444' : '#64748b';
  return L.divIcon({
    className: 'public-osm-pin',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export default function PublicOsmMap({
  center,
  markers = [],
  zoom = 14,
  theme = 'light',
  className = 'h-full w-full',
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tile = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attr = theme === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    L.tileLayer(tile, { attribution: attr, maxZoom: 19 }).addTo(map);

    const ready = () => map.invalidateSize();
    requestAnimationFrame(ready);
    const t = window.setTimeout(ready, 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [theme]);

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
      L.marker([m.lat, m.lng], { icon: markerIcon(m.active !== false) })
        .bindPopup(m.label ?? '')
        .addTo(layer);
    });
    layer.addTo(map);
    layerRef.current = layer;

    const start = center ?? (pts[0] ? ([pts[0].lat, pts[0].lng] as [number, number]) : PARRAL_CENTER);
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [28, 28], maxZoom: 15 });
    } else {
      map.setView(start, zoom);
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, center, zoom]);

  return <div ref={elRef} className={className} />;
}
