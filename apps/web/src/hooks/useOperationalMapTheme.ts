import { useThemeStore } from '../store/themeStore';
import {
  OPERATIONAL_MAP_THEMES,
  type OperationalMapThemeId,
} from '../lib/operational-map-theme';

export function useOperationalMapTheme() {
  const themeId = useThemeStore((s) => s.theme) as OperationalMapThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tokens = OPERATIONAL_MAP_THEMES[themeId] ?? OPERATIONAL_MAP_THEMES.dark;
  return { themeId, tokens, toggleTheme, isDark: themeId === 'dark' };
}
