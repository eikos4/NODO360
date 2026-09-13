import { useCallback, useState } from 'react';
import type { SalaLook } from '../lib/dispatch-public-theme';

const LOOK_KEY = 'nodo360_sala_look';
const LEGACY_KEY = 'nodo360_sala_night';

const LOOKS: SalaLook[] = ['light', 'nodo', 'verde', 'azul', 'night'];

export type SalaNightPref = 'auto' | 'day' | 'night';

export function isGuardiaHours(d = new Date()) {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

function readLook(): SalaLook {
  try {
    const look = localStorage.getItem(LOOK_KEY);
    if (look && LOOKS.includes(look as SalaLook)) return look as SalaLook;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'night') return 'night';
    if (legacy === 'day') return 'light';
    if (legacy === 'auto') return isGuardiaHours() ? 'night' : 'light';
  } catch { /* ignore */ }
  return 'light';
}

export function useSalaNightMode() {
  const [look, setLook] = useState<SalaLook>(readLook);

  const cycle = useCallback(() => {
    setLook((prev) => {
      const next = LOOKS[(LOOKS.indexOf(prev) + 1) % LOOKS.length];
      try { localStorage.setItem(LOOK_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const night = look === 'night';
  const isNodo = look === 'nodo';
  const isVerde = look === 'verde';
  const isAzul = look === 'azul';
  const pref: SalaNightPref = look === 'night' ? 'night' : 'day';
  const label =
    look === 'light' ? 'Tema claro'
      : look === 'nodo' ? 'Tema Nodo'
        : look === 'verde' ? 'Tema verde'
          : look === 'azul' ? 'Tema azul'
            : 'Guardia nocturna';

  return { look, night, isNodo, isVerde, isAzul, pref, cycle, label };
}
