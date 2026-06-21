import { emergencyCodeToLabel } from './emergency-codes';

/** Mapeo clave botonera → etiqueta en bitácora de emergencias */
export function botoneraTypeToIncident(typeId: string): string {
  return emergencyCodeToLabel(typeId);
}
