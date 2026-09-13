export function buildLocationPinUrl(token: string, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin}/localizar/${token}`;
}

export function buildLocationPinWhatsAppMessage(opts: {
  code: string;
  type: string;
  address: string;
  url: string;
  company?: string;
}) {
  const lines = [`🚨 Bomberos — ${opts.code}`, opts.type];
  if (opts.address.trim() && opts.address.trim() !== 'Por confirmar') {
    lines.push(`📍 ${opts.address.trim()}`);
  }
  if (opts.company?.trim()) {
    lines.push(opts.company.trim());
  }
  lines.push(
    '',
    'Abre el enlace, toca «Obtener mi ubicación» y confirma el punto exacto para que lleguen los carros:',
    opts.url,
  );
  return lines.join('\n');
}

export function buildWhatsAppShareUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openGoogleMapsDirections(lat: number, lng: number) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
}
