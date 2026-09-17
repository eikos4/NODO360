import { findEmergencyEntry } from './emergency-codes';
import { vehicleTypeAbbrev } from './vehicle-types';

type DispatchVehicle = {
  id: string;
  patent: string;
  type?: string;
  model?: string;
  brand?: string;
};

/** Designación radial del carro para pantalla (ej. B-12, Q-1) */
export function getVehicleRadioDesignation(v: DispatchVehicle): string {
  const abbrev = vehicleTypeAbbrev(v.type);
  const num = v.patent.match(/(\d+)/)?.[1] ?? '';
  return num ? `${abbrev}-${num}` : abbrev;
}

/** Clave hablada: 10-2-1 → "10 2 1" (sin guiones ni puntos) */
export function codeToSpoken(code: string): string {
  return code.replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Carro hablado: BR-12 → "BR 12" */
export function vehicleToSpoken(designation: string): string {
  return designation.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Lugar / sector para voz — primera parte de la dirección (ej. CATILLO) */
export function parseDispatchSector(address: string): string {
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const meaningful = parts.filter((p) => !/provincia|región|region/i.test(p));
  return (meaningful[0] ?? parts[0] ?? address).toUpperCase();
}

/**
 * Mensaje radial para voz y preview:
 * "10 1 SECTOR CATILLO CONCURRE BR 12"
 */
export function buildDispatchRadioMessage(
  typeId: string,
  address: string,
  vehicleIds: string[],
  vehicles: DispatchVehicle[],
): string {
  const entry = findEmergencyEntry(typeId);
  if (!entry || !address.trim() || vehicleIds.length === 0) return '';

  const codeSpoken = codeToSpoken(entry.code);
  const sector = parseDispatchSector(address);

  const callsigns = vehicleIds
    .map((id) => {
      const v = vehicles.find((x) => x.id === id);
      return v ? vehicleToSpoken(getVehicleRadioDesignation(v)) : '';
    })
    .filter(Boolean);

  const concurre =
    callsigns.length <= 1
      ? callsigns[0] ?? ''
      : callsigns.slice(0, -1).join(', ') + ' Y ' + callsigns[callsigns.length - 1];

  if (!concurre) return '';

  return `${codeSpoken} SECTOR ${sector} CONCURRE ${concurre}`;
}
