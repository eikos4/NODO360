export function carroVehicleStorageKey(slug: string) {
  return `nodo360_carro_vehicle:${slug}`;
}

/** Persistente entre reinicios de tablet (localStorage + migración desde sessionStorage). */
export function readCarroVehicle(slug: string): string {
  try {
    const key = carroVehicleStorageKey(slug);
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) {
      localStorage.setItem(key, fromSession);
      sessionStorage.removeItem(key);
      return fromSession;
    }
    return '';
  } catch {
    return '';
  }
}

export function writeCarroVehicle(slug: string, vehicleId: string) {
  const key = carroVehicleStorageKey(slug);
  try {
    localStorage.setItem(key, vehicleId);
  } catch {
    /* */
  }
  try {
    sessionStorage.setItem(key, vehicleId);
  } catch {
    /* */
  }
}

export function clearCarroVehicle(slug: string) {
  const key = carroVehicleStorageKey(slug);
  try {
    localStorage.removeItem(key);
  } catch {
    /* */
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* */
  }
}
