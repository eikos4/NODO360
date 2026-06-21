import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

/** Evita pantalla en blanco / redirects incorrectos antes de rehidratar zustand persist */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
