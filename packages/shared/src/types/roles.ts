export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMANDANTE = 'COMANDANTE',
  CAPITAN = 'CAPITAN',
  OPERADOR_CENTRAL = 'OPERADOR_CENTRAL',
  ENCARGADO_MATERIAL = 'ENCARGADO_MATERIAL',
  SECRETARIO = 'SECRETARIO',
  TESORERO = 'TESORERO',
  BOMBERO = 'BOMBERO',
  BOMBERO_HONORARIO = 'BOMBERO_HONORARIO',
  BOMBERO_INICIAL = 'BOMBERO_INICIAL',
  BOMBERO_PROFESIONAL = 'BOMBERO_PROFESIONAL',
  AUDITOR = 'AUDITOR',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.COMANDANTE]: 'Comandante',
  [Role.CAPITAN]: 'Capitán / Oficial Operativo',
  [Role.OPERADOR_CENTRAL]: 'Operador Central de Despacho',
  [Role.ENCARGADO_MATERIAL]: 'Encargado de Material Mayor',
  [Role.SECRETARIO]: 'Secretario/a',
  [Role.TESORERO]: 'Tesorero/a',
  [Role.BOMBERO]: 'Bombero Operativo',
  [Role.BOMBERO_HONORARIO]: 'Bombero Honorario',
  [Role.BOMBERO_INICIAL]: 'Bombero Inicial',
  [Role.BOMBERO_PROFESIONAL]: 'Bombero Profesional',
  [Role.AUDITOR]: 'Auditor / Inspector',
};

/** Roles con permisos de bombero en terreno (respuesta a emergencias, etc.) */
export const BOMBERO_ROLES: Role[] = [
  Role.BOMBERO,
  Role.BOMBERO_HONORARIO,
  Role.BOMBERO_INICIAL,
  Role.BOMBERO_PROFESIONAL,
];

export function isBomberoRole(role?: string | null): boolean {
  return !!role && (BOMBERO_ROLES as string[]).includes(role);
}
