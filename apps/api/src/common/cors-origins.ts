function parseFrontendOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function wwwTwin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (!url.hostname.includes('.') || url.hostname === 'localhost') return null;
    url.hostname = url.hostname.startsWith('www.')
      ? url.hostname.slice(4)
      : `www.${url.hostname}`;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAllowedCorsOrigins(): string[] {
  const origins = new Set<string>([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://nodo360.net',
    'https://www.nodo360.net',
    'https://nodo360-web.onrender.com',
    ...parseFrontendOrigins(),
  ]);

  for (const origin of [...origins]) {
    const twin = wwwTwin(origin);
    if (twin) origins.add(twin);
  }

  return [...origins];
}

export function isAllowedCorsOrigin(origin?: string | null): boolean {
  if (!origin) return true;
  return getAllowedCorsOrigins().includes(origin);
}
