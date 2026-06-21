export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMANDANTE = 'COMANDANTE',
  CAPITAN = 'CAPITAN',
  OPERADOR_CENTRAL = 'OPERADOR_CENTRAL',
  ENCARGADO_MATERIAL = 'ENCARGADO_MATERIAL',
  SECRETARIO = 'SECRETARIO',
  TESORERO = 'TESORERO',
  BOMBERO = 'BOMBERO',
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
  [Role.AUDITOR]: 'Auditor / Inspector',
};
