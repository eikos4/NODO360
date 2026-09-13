import { Role } from '@prisma/client';

export const ROLE_RANK: Record<string, number> = {
  KODESK: 100,
  SUPER_ADMIN: 90,
  COMANDANTE: 80,
  CAPITAN: 70,
  OPERADOR_CENTRAL: 60,
  ENCARGADO_MATERIAL: 50,
  SECRETARIO: 45,
  TESORERO: 45,
  AUDITOR: 40,
  BOMBERO_PROFESIONAL: 30,
  BOMBERO: 25,
  BOMBERO_HONORARIO: 20,
  BOMBERO_INICIAL: 10,
};

const ROLE_ALIASES: Record<string, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPER_ADMINISTRADOR: 'SUPER_ADMIN',
  ADMIN: 'SUPER_ADMIN',
  COMANDANTE: 'COMANDANTE',
  CDTE: 'COMANDANTE',
  CAPITAN: 'CAPITAN',
  OFICIAL_OPERATIVO: 'CAPITAN',
  OFICIAL: 'CAPITAN',
  OPERADOR_CENTRAL: 'OPERADOR_CENTRAL',
  OPERADOR_CENTRAL_DE_DESPACHO: 'OPERADOR_CENTRAL',
  CENTRAL: 'OPERADOR_CENTRAL',
  CENTRALISTA: 'OPERADOR_CENTRAL',
  CENTRALISTAS: 'OPERADOR_CENTRAL',
  SALA_DE_RADIO: 'OPERADOR_CENTRAL',
  ENCARGADO_MATERIAL: 'ENCARGADO_MATERIAL',
  ENCARGADO_MATERIAL_MAYOR: 'ENCARGADO_MATERIAL',
  MATERIAL: 'ENCARGADO_MATERIAL',
  SECRETARIO: 'SECRETARIO',
  TESORERO: 'TESORERO',
  BOMBERO: 'BOMBERO',
  BOMBERO_OPERATIVO: 'BOMBERO',
  BOMBERO_HONORARIO: 'BOMBERO_HONORARIO',
  HONORARIO: 'BOMBERO_HONORARIO',
  HONORARIO_BOMBERO_OPERATIVO: 'BOMBERO_HONORARIO',
  HONORARIO_BOMBERO: 'BOMBERO_HONORARIO',
  BOMBERO_INICIAL: 'BOMBERO_INICIAL',
  INICIAL: 'BOMBERO_INICIAL',
  BOMBERO_PROFESIONAL: 'BOMBERO_PROFESIONAL',
  PROFESIONAL: 'BOMBERO_PROFESIONAL',
  AUDITOR: 'AUDITOR',
  I: 'BOMBERO_INICIAL',
};

export type RoleActor = {
  role?: string | null;
  roles?: string[] | null;
};

export function normalizePhone(raw?: string | null): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;
  return value.slice(0, 40);
}

export function assignedRoles(role?: string | null, extra?: string[] | null): string[] {
  const set = new Set<string>();
  if (role) set.add(role);
  for (const item of extra ?? []) {
    if (item) set.add(item);
  }
  return [...set];
}

export function userRoles(actor?: RoleActor | null): string[] {
  return assignedRoles(actor?.role, actor?.roles);
}

export function pickPrimaryRole(roles: string[], fallback = 'BOMBERO'): string {
  if (!roles.length) return fallback;
  return [...roles].sort((a, b) => (ROLE_RANK[b] ?? 0) - (ROLE_RANK[a] ?? 0))[0] ?? fallback;
}

export function hasAnyRole(actor: RoleActor | null | undefined, ...required: string[]): boolean {
  const assigned = userRoles(actor);
  if (assigned.includes('KODESK')) return true;
  return required.some((role) => assigned.includes(role));
}

export function parseRoleToken(raw?: string): string {
  if (!raw) return 'BOMBERO';
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\/|-]+/g, ' ')
    .replace(/\s+/g, '_');
  if (key === 'KODESK') return 'BOMBERO';
  if (key.includes('HONORARIO')) return 'BOMBERO_HONORARIO';
  if (key === 'I' || key.includes('INICIAL')) return 'BOMBERO_INICIAL';
  if (key.includes('PROFESIONAL')) return 'BOMBERO_PROFESIONAL';
  if (key.includes('CENTRALISTA') || key.includes('SALA_DE_RADIO')) return 'OPERADOR_CENTRAL';
  if (key.includes('ENCARGADO') && key.includes('MATERIAL')) return 'ENCARGADO_MATERIAL';
  if (key.includes('OFICIAL')) return 'CAPITAN';
  return ROLE_ALIASES[key] ?? 'BOMBERO';
}

/** CSV: "CAPITAN|ENCARGADO_MATERIAL|BOMBERO" o "Capitán, Encargado Material Mayor" */
export function parseRoles(raw?: string): string[] {
  if (!raw?.trim()) return ['BOMBERO'];
  const parts = raw
    .split(/[|,;]+|\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseRoleToken);
  return assignedRoles(undefined, parts);
}

export function prismaHasRole(role: Role) {
  return {
    OR: [{ role }, { roles: { has: role } }],
  };
}
