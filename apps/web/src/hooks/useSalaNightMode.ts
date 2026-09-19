import { useCallback, useState } from 'react';
import type { SalaLook } from '../lib/dispatch-public-theme';

const LOOK_KEY = 'nodo360_sala_look';
const LEGACY_KEY = 'nodo360_sala_night';

const LOOKS: SalaLook[] = ['light', 'nodo', 'verde', 'night', 'salida', 'comando'];

export type SalaNightPref = 'auto' | 'day' | 'night';

export function isGuardiaHours(d = new Date()) {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

function readLook(): SalaLook {
  try {
    const look = localStorage.getItem(LOOK_KEY);
    if (look === 'azul') return 'nodo';
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
  const isSalida = look === 'salida';
  const isComando = look === 'comando';
  const pref: SalaNightPref = look === 'night' ? 'night' : 'day';
  const label =
    look === 'light' ? 'Tema claro'
      : look === 'nodo' ? 'Tema Nodo'
        : look === 'verde' ? 'Tema verde'
          : look === 'salida' ? 'Tema salida'
            : look === 'comando' ? 'Tema comando'
              : 'Guardia nocturna';

  return { look, night, isNodo, isVerde, isSalida, isComando, pref, cycle, label };
}
