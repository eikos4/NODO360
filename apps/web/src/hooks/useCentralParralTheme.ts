import { useCallback } from 'react';
import {
  CENTRAL_PARRAL_THEMES,
  type CentralParralThemeId,
} from '../lib/central-parral-theme';
import { useThemeStore } from '../store/themeStore';

/** Tema compartido: Central Parral, Despacho360 y Central operativa (sincronizado con el tema global). */
export function useCentralParralTheme() {
  const themeId = useThemeStore((s) => s.theme) as CentralParralThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const tokens = CENTRAL_PARRAL_THEMES[themeId] ?? CENTRAL_PARRAL_THEMES.dark;

  const setThemeId = useCallback(
    (id: CentralParralThemeId) => setTheme(id),
    [setTheme],
  );

  return { themeId, tokens, setThemeId, toggleTheme, isDark: themeId === 'dark' };
};
