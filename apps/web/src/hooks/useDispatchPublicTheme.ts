import { useCallback } from 'react';
import {
  DISPATCH_PUBLIC_THEMES,
  type DispatchPublicThemeId,
} from '../lib/dispatch-public-theme';
import { useThemeStore } from '../store/themeStore';

/** Tema sala pública de compañía — sincronizado con nodo360-theme global. */
export function useDispatchPublicTheme() {
  const themeId = useThemeStore((s) => s.theme) as DispatchPublicThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const tokens = DISPATCH_PUBLIC_THEMES[themeId] ?? DISPATCH_PUBLIC_THEMES.dark;

  const setThemeId = useCallback(
    (id: DispatchPublicThemeId) => setTheme(id),
    [setTheme],
  );

  return { themeId, tokens, setThemeId, toggleTheme, isDark: themeId === 'dark' };
}
