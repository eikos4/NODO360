import { useThemeStore } from '../store/themeStore';
import { BOTONERA_THEMES, type BotoneraThemeId } from '../lib/botonera-theme';

export function useBotoneraTheme() {
  const themeId = useThemeStore((s) => s.theme) as BotoneraThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tokens = BOTONERA_THEMES[themeId] ?? BOTONERA_THEMES.dark;
  return { themeId, tokens, toggleTheme, isDark: themeId === 'dark' };
}
