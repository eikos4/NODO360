/** Only allow http(s) or same-origin relative paths. Blocks javascript:/data: XSS. */
export function safeHref(url?: string | null): string | undefined {
  const raw = String(url || '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    /* ignore */
  }
  return undefined;
}
