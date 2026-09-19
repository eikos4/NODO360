import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { CuartelItem } from '../lib/cuartel';
import { hasAnyRole } from '../lib/roles';

const OVERVIEW_ROLES = new Set([
  'SUPER_ADMIN',
  'COMANDANTE',
  'CAPITAN',
  'OPERADOR_CENTRAL',
]);

export function canViewCuartelesOverview(user?: { role?: string | null; roles?: string[] | null } | string | null) {
  if (!user) return false;
  if (typeof user === 'string') return OVERVIEW_ROLES.has(user);
  return hasAnyRole(user, ...[...OVERVIEW_ROLES]);
}

export function useCuartelesOverview() {
  const user = useAuthStore((s) => s.user);
  const enabled = canViewCuartelesOverview(user);

  return useQuery<CuartelItem[]>({
    queryKey: ['dispatch-cuarteles-overview'],
    queryFn: () => api.get('/dispatch/central/overview').then((r) => r.data),
    refetchInterval: 12_000,
    enabled,
  });
}
