export const KODESK_ROLE = 'KODESK';

export function isKodesk(role?: string | null) {
  return role === KODESK_ROLE;
}
