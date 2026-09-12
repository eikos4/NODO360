import { useCallback, useEffect, useState } from 'react';

const KEY = 'nodo360_sala_night';

export type SalaNightPref = 'auto' | 'day' | 'night';

export function isGuardiaHours(d = new Date()) {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

function readPref(): SalaNightPref {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'day' || raw === 'night' || raw === 'auto') return raw;
  } catch { /* ignore */ }
  return 'auto';
}

export function useSalaNightMode() {
  const [pref, setPref] = useState<SalaNightPref>(readPref);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const night = pref === 'night' || (pref === 'auto' && isGuardiaHours());

  const cycle = useCallback(() => {
    setPref((prev) => {
      const next: SalaNightPref = prev === 'auto' ? 'night' : prev === 'night' ? 'day' : 'auto';
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const label = pref === 'auto'
    ? (night ? 'Guardia nocturna · auto' : 'Día · auto')
    : pref === 'night'
      ? 'Noche fija'
      : 'Día fijo';

  return { night, pref, cycle, label };
}
