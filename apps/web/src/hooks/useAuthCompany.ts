import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore, type AuthCompany } from '../store/authStore';

/** Compañía del usuario autenticado (login o hidratación si sesión antigua). */
export function useAuthCompany(): AuthCompany | null {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);

  const { data } = useQuery({
    queryKey: ['auth-company', user?.companyId],
    queryFn: () =>
      api.get(`/companies/${user!.companyId}`).then((r) => ({
        id: r.data.id as string,
        name: r.data.name as string,
        number: r.data.number as number,
        city: r.data.city as string,
        logoUrl: (r.data.logoUrl as string | null) ?? null,
        dispatchSlug: (r.data.dispatchSlug as string | null) ?? null,
      })),
    enabled: !!user?.companyId && !user?.company,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data && user && !user.company) {
      patchUser({ company: data });
    }
  }, [data, user, patchUser]);

  return user?.company ?? data ?? null;
}
