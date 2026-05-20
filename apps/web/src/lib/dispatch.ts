/** Mapeo tipos botonera → etiqueta en bitácora de emergencias */
export const BOTONERA_TO_INCIDENT_TYPE: Record<string, string> = {
  incendio_estructural: 'Incendio Estructural',
  incendio_vehicular: 'Incendio Vehicular',
  incendio_forestal: 'Incendio Forestal',
  rescate_vehicular: 'Rescate Vehicular',
  rescate_persona: 'Rescate Persona',
  emergencia_medica: 'Emergencia Médica',
  hazmat: 'HazMat',
  inundacion: 'Inundación',
  derrumbe: 'Derrumbe',
  falsa_alarma: 'Falsa Alarma',
  apoyo: 'Apoyo',
};

export function botoneraTypeToIncident(typeId: string): string {
  return BOTONERA_TO_INCIDENT_TYPE[typeId] ?? 'Otro';
}
