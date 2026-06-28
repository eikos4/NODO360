export function buildLocationPinUrl(token: string, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin}/localizar/${token}`;
}

export function buildLocationPinWhatsAppMessage(opts: {
  code: string;
  type: string;
  address: string;
  url: string;
}) {
  return [
    `🚨 *Emergencia ${opts.code}*`,
    opts.type,
    `📍 ${opts.address}`,
    '',
    'Por favor abre este enlace para marcar la ubicación exacta del incendio en el mapa:',
    opts.url,
  ].join('\n');
}

export function buildWhatsAppShareUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openGoogleMapsDirections(lat: number, lng: number) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
}
