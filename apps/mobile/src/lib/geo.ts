import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function estimateEtaMinutes(km: number) {
  if (km <= 0) return 1;
  return Math.max(1, Math.round((km / 40) * 60));
}

export async function getCurrentCoords(timeout = 8_000) {
  try {
    if (Capacitor.isNativePlatform()) {
      const current = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout });
      return { latitude: current.coords.latitude, longitude: current.coords.longitude };
    }
    return await new Promise<{ latitude: number; longitude: number } | undefined>((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout },
      );
    });
  } catch {
    return undefined;
  }
}
