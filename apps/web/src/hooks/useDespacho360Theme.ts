import { useMemo } from 'react';
import { useCentralParralTheme } from './useCentralParralTheme';
import { DESPACHO360_LIGHT_OVERRIDES } from '../lib/despacho360-theme';

/** Tema Despacho360 — oscuro compartido; claro con paleta propia (menos plomo). */
export function useDespacho360Theme() {
  const base = useCentralParralTheme();

  const tokens = useMemo(() => {
    if (base.isDark) return base.tokens;
    return { ...base.tokens, ...DESPACHO360_LIGHT_OVERRIDES };
  }, [base.isDark, base.tokens]);

  return { ...base, tokens };
}
