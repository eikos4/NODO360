import { useCallback } from 'react';
import {
  CENTRAL_EXPRESS_THEMES,
  type CentralExpressThemeId,
} from '../lib/central-express-theme';
import { useThemeStore } from '../store/themeStore';

/** Central Express — sincronizado con nodo360-theme (barra superior). */
export function useCentralExpressTheme() {
  const themeId = useThemeStore((s) => s.theme) as CentralExpressThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const tokens = CENTRAL_EXPRESS_THEMES[themeId] ?? CENTRAL_EXPRESS_THEMES.dark;

  const setThemeId = useCallback(
    (id: CentralExpressThemeId) => setTheme(id),
    [setTheme],
  );

  return { themeId, tokens, setThemeId, toggleTheme, isDark: themeId === 'dark' };
}
