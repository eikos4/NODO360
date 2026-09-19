export function carroVehicleStorageKey(slug: string) {
  return `nodo360_carro_vehicle:${slug}`;
}

export function readCarroVehicle(slug: string): string {
  try {
    return sessionStorage.getItem(carroVehicleStorageKey(slug)) ?? '';
  } catch {
    return '';
  }
}

export function writeCarroVehicle(slug: string, vehicleId: string) {
  sessionStorage.setItem(carroVehicleStorageKey(slug), vehicleId);
}

export function clearCarroVehicle(slug: string) {
  sessionStorage.removeItem(carroVehicleStorageKey(slug));
}
