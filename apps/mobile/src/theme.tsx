import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppTheme = 'light' | 'nodo' | 'smoke';

const STORAGE_KEY = 'nodo360_mobile_theme';

function readTheme(): AppTheme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'nodo' || value === 'smoke' ? value : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : theme === 'smoke' ? '#04070b' : '#071019');
}

const ThemeContext = createContext<{ theme: AppTheme; toggleTheme: () => void; setTheme: (theme: AppTheme) => void }>({
  theme: 'light',
  toggleTheme: () => undefined,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: AppTheme) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    applyTheme(next);
    setThemeState(next);
  };

  const toggleTheme = () => {
    setThemeState((current) => {
      const next = current === 'light' ? 'nodo' : current === 'nodo' ? 'smoke' : 'light';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      applyTheme(next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

applyTheme(readTheme());
