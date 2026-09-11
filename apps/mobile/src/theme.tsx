import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppTheme = 'light' | 'nodo';

const STORAGE_KEY = 'nodo360_mobile_theme';

function readTheme(): AppTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'nodo' ? 'nodo' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#071019');
}

const ThemeContext = createContext<{ theme: AppTheme; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'light' ? 'nodo' : 'light';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      applyTheme(next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

applyTheme(readTheme());
