import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem('nodo360-theme');
    if (!raw) return 'dark';
    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
    return parsed.state?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = theme === 'dark';
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = theme;
}

const initialTheme = typeof window !== 'undefined' ? readStoredTheme() : 'dark';
if (typeof document !== 'undefined') applyTheme(initialTheme);

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: initialTheme,
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),
      setTheme: (t) => {
        const next = isTheme(t) ? t : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'nodo360-theme',
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<ThemeStore>;
        const theme = isTheme(incoming.theme) ? incoming.theme : current.theme;
        return { ...current, ...incoming, theme };
      },
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme === 'light' ? 'light' : 'dark');
      },
    },
  ),
);
