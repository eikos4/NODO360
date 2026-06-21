import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { CuartelItem } from '../components/botonera/CuartelOverviewPanel';

const OVERVIEW_ROLES = new Set([
  'SUPER_ADMIN',
  'COMANDANTE',
  'CAPITAN',
  'OPERADOR_CENTRAL',
]);

export function canViewCuartelesOverview(role?: string | null) {
  return !!role && OVERVIEW_ROLES.has(role);
}

export function useCuartelesOverview() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = canViewCuartelesOverview(role);

  return useQuery<CuartelItem[]>({
    queryKey: ['dispatch-cuarteles-overview'],
    queryFn: () => api.get('/dispatch/central/overview').then((r) => r.data),
    refetchInterval: 12_000,
    enabled,
  });
}
