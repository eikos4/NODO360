import { describe, expect, it } from 'vitest';
import { parseRoles, pickPrimaryRole, assignedRoles, hasAnyRole, normalizePhone } from './user-roles';

describe('user-roles', () => {
  it('parses several cargos from a CSV cell', () => {
    expect(parseRoles('CAPITAN|ENCARGADO_MATERIAL|BOMBERO')).toEqual([
      'CAPITAN',
      'ENCARGADO_MATERIAL',
      'BOMBERO',
    ]);
    expect(parseRoles('Capitán / Encargado Material Mayor')).toEqual([
      'CAPITAN',
      'ENCARGADO_MATERIAL',
    ]);
  });

  it('picks the highest cargo as primary role', () => {
    expect(pickPrimaryRole(['BOMBERO', 'ENCARGADO_MATERIAL', 'CAPITAN'])).toBe('CAPITAN');
  });

  it('unions primary + extra roles', () => {
    expect(assignedRoles('CAPITAN', ['BOMBERO'])).toEqual(['CAPITAN', 'BOMBERO']);
  });

  it('grants access if any assigned role matches', () => {
    const user = { role: 'CAPITAN', roles: ['CAPITAN', 'ENCARGADO_MATERIAL', 'BOMBERO'] };
    expect(hasAnyRole(user, 'ENCARGADO_MATERIAL')).toBe(true);
    expect(hasAnyRole(user, 'TESORERO')).toBe(false);
    expect(hasAnyRole({ role: 'KODESK', roles: ['KODESK'] }, 'TESORERO')).toBe(true);
  });

  it('normalizes empty phone to null', () => {
    expect(normalizePhone('  ')).toBeNull();
    expect(normalizePhone('+56 9 1111 2222')).toBe('+56 9 1111 2222');
  });
});
