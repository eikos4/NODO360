export const SALA_TOKEN_HEADER = 'x-sala-token';

export function salaTokenStorageKey(slug: string) {
  return `nodo360_sala_token:${slug}`;
}

export function readSalaToken(slug: string): string {
  try {
    return sessionStorage.getItem(salaTokenStorageKey(slug)) ?? '';
  } catch {
    return '';
  }
}

export function writeSalaToken(slug: string, token: string) {
  sessionStorage.setItem(salaTokenStorageKey(slug), token);
}

export function clearSalaToken(slug: string) {
  sessionStorage.removeItem(salaTokenStorageKey(slug));
}

export function salaAuthHeaders(slug: string, extra?: Record<string, string>): Record<string, string> {
  const token = readSalaToken(slug);
  return {
    'Content-Type': 'application/json',
    ...(token ? { [SALA_TOKEN_HEADER]: token } : {}),
    ...extra,
  };
}
