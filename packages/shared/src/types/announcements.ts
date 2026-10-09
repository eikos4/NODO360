export const ANNOUNCEMENT_KINDS = [
  { value: 'ANNOUNCEMENT', icon: '📢', label: 'Aviso general', hint: 'Compañía o cuerpo' },
  { value: 'OFFICIAL', icon: '⭐', label: 'Llamado de Comandancia', hint: 'Orden o llamado oficial' },
  { value: 'URGENT_NOTICE', icon: '🚨', label: 'Comunicado urgente', hint: 'No es alarma; requiere atención ahora' },
  { value: 'NEWS', icon: '📰', label: 'Noticia importante', hint: 'Información del cuerpo' },
  { value: 'EVENT', icon: '📅', label: 'Evento / Actividad', hint: 'Fecha opcional' },
  { value: 'TRAINING', icon: '🎓', label: 'Capacitación / Academia', hint: 'Instrucción o clase' },
  { value: 'CITATION', icon: '👨‍🚒', label: 'Citación', hint: 'Asistencia requerida' },
  { value: 'SAFETY', icon: '🛡️', label: 'Seguridad operacional', hint: 'EPP y procedimientos' },
  { value: 'FLEET', icon: '🚒', label: 'Material mayor / equipo', hint: 'Carros y equipamiento' },
  { value: 'GUARD', icon: '🕐', label: 'Guardia / Turno', hint: 'Cuadros de guardia' },
  { value: 'ADMIN', icon: '📄', label: 'Documento / Administrativo', hint: 'Papelería y trámites' },
  { value: 'WELFARE', icon: '🤝', label: 'Beneficio / Bienestar', hint: 'Apoyo a la dotación' },
] as const;

export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number]['value'];

export const ANNOUNCEMENT_PRIORITIES = [
  { value: 'MEDIUM', label: 'Informativo' },
  { value: 'HIGH', label: 'Importante' },
  { value: 'URGENT', label: 'Urgente' },
] as const;

export const ANNOUNCEMENT_TARGET_ROLES = [
  'BOMBERO',
  'BOMBERO_INICIAL',
  'BOMBERO_PROFESIONAL',
  'BOMBERO_HONORARIO',
  'CAPITAN',
  'COMANDANTE',
  'ENCARGADO_MATERIAL',
  'SECRETARIO',
  'TESORERO',
  'OPERADOR_CENTRAL',
] as const;

export function announcementKind(type?: string) {
  return ANNOUNCEMENT_KINDS.find((item) => item.value === type) ?? ANNOUNCEMENT_KINDS[0];
}

export function announcementPriorityLabel(priority?: string) {
  if (priority === 'HIGH') return 'Importante';
  if (priority === 'URGENT') return 'Urgente';
  return 'Informativo';
}
