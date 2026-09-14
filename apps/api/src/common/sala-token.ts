import { JwtService } from '@nestjs/jwt';

export const SALA_TOKEN_TYP = 'sala' as const;
export const SALA_TOKEN_HEADER = 'x-sala-token';
export const SALA_TOKEN_EXPIRES_IN = '12h';
export const SALA_TOKEN_EXPIRES_SEC = 12 * 60 * 60;

export type SalaTokenPayload = {
  typ: typeof SALA_TOKEN_TYP;
  slug: string;
  companyId: string;
  sub: string;
};

export type HeaderRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

export function headerValue(req: HeaderRequest, name: string): string {
  const headers = req.headers ?? {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  const raw = key ? headers[key] : undefined;
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return typeof raw === 'string' ? raw.trim() : '';
}

export function bearerFromRequest(req: HeaderRequest): string {
  return headerValue(req, 'authorization').replace(/^Bearer\s+/i, '');
}

export function salaTokenFromRequest(req: HeaderRequest): string {
  return headerValue(req, SALA_TOKEN_HEADER) || bearerFromRequest(req);
}

export function signSalaToken(jwt: JwtService, companyId: string, slug: string): string {
  const payload: SalaTokenPayload = {
    typ: SALA_TOKEN_TYP,
    slug,
    companyId,
    sub: `sala:${companyId}`,
  };
  return jwt.sign(payload, { expiresIn: SALA_TOKEN_EXPIRES_IN });
}

export function readSalaToken(jwt: JwtService, token?: string | null): SalaTokenPayload | null {
  if (!token?.trim()) return null;
  try {
    const payload = jwt.verify<Partial<SalaTokenPayload>>(token.trim());
    if (payload.typ !== SALA_TOKEN_TYP || !payload.slug || !payload.companyId) return null;
    return payload as SalaTokenPayload;
  } catch {
    return null;
  }
}
