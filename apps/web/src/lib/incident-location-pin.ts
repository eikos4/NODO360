export function buildLocationPinUrl(token: string, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  if (/^https?:\/\//i.test(api)) {
    return `${api}/location-pin/${encodeURIComponent(token)}/open`;
  }
  return `${origin}/localizar/${token}`;
}

export function buildLocationPinWhatsAppMessage(opts: {
  code: string;
  type: string;
  address: string;
  url: string;
  company?: string;
}) {
  const address = opts.address.trim();
  const lines = [`🚨 ${opts.code} · ${opts.type}`];
  if (address && address !== 'Por confirmar' && address !== 'Sin dirección') {
    lines.push(`📍 ${address}`);
  }
  if (opts.company?.trim()) {
    lines.push(opts.company.trim());
  }
  lines.push('', 'Ver punto y cómo llegar:', opts.url);
  return lines.join('\n');
}

/** Chile: 9XXXXXXX o 9 XXXX XXXX → 569... */
export function normalizeWhatsAppPhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) digits = `56${digits}`;
  if (digits.length === 11 && digits.startsWith('9')) digits = `56${digits.slice(0, 9)}`;
  return digits;
}

export function buildWhatsAppShareUrl(phone: string, message: string) {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type MapsOrigin = { latitude: number; longitude: number } | { lat: number; lng: number };

function originLatLng(origin?: MapsOrigin) {
  if (!origin) return null;
  if ('lat' in origin) {
    return Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? { lat: origin.lat, lng: origin.lng }
      : null;
  }
  return Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)
    ? { lat: origin.latitude, lng: origin.longitude }
    : null;
}

/** Destino de navegación: GPS confirmado en terreno, si no el del despacho. */
export function incidentNavigatePoint(incident: {
  confirmedLatitude?: number | null;
  confirmedLongitude?: number | null;
  dispatchLatitude?: number | null;
  dispatchLongitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const lat = incident.confirmedLatitude ?? incident.dispatchLatitude ?? incident.latitude;
  const lng = incident.confirmedLongitude ?? incident.dispatchLongitude ?? incident.longitude;
  if (lat == null || lng == null) return null;
  const destLat = Number(lat);
  const destLng = Number(lng);
  if (!Number.isFinite(destLat) || !Number.isFinite(destLng) || (destLat === 0 && destLng === 0)) {
    return null;
  }
  return { lat: destLat, lng: destLng };
}

export function wazeNavigateUrl(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function googleMapsNavigateUrl(lat: number, lng: number, origin?: MapsOrigin) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${lat},${lng}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });
  const from = originLatLng(origin);
  if (from) params.set('origin', `${from.lat},${from.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function inAndroidWebView() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) && /; wv\)/.test(navigator.userAgent);
}

export function openGoogleMapsDirections(lat: number, lng: number, origin?: MapsOrigin) {
  const httpsUrl = googleMapsNavigateUrl(lat, lng, origin);
  if (inAndroidWebView()) {
    // Native turn-by-turn. Capacitor leaves this scheme out of allowNavigation so Android opens Maps.
    window.location.assign(`google.navigation:q=${lat},${lng}&mode=d`);
    return;
  }
  window.open(httpsUrl, '_blank', 'noopener,noreferrer');
}
