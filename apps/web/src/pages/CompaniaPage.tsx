import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useThemeStore } from '../store/themeStore';
import CompaniaIntranet, {
  CompaniaLifeModal,
  type CompaniaBoard,
  type LifeKind,
  type LifePriority,
  type LifeStatus,
} from '../components/compania/CompaniaIntranet';

type Board = Omit<CompaniaBoard, 'company'> & {
  canPickCompany: boolean;
  company: CompaniaBoard['company'] | null;
  companies: { id: string; name: string; number: number; city: string; logoUrl: string | null }[];
};

export default function CompaniaPage() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [params, setParams] = useSearchParams();
  const companyId = params.get('companyId') || undefined;
  const qc = useQueryClient();
  const [modal, setModal] = useState<LifeKind | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['compania-board', companyId],
    queryFn: async () => (await api.get<Board>('/compania/board', { params: companyId ? { companyId } : {} })).data,
  });

  const createMut = useMutation({
    mutationFn: async (body: {
      kind: LifeKind;
      title: string;
      notes?: string;
      dueAt?: string;
      assigneeId?: string;
      priority?: LifePriority;
      companyId?: string;
    }) => (await api.post('/compania/items', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compania-board'] });
      setModal(null);
    },
  });

  const patchMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LifeStatus }) =>
      (await api.patch(`/compania/items/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compania-board'] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/compania/items/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compania-board'] }),
  });

  const surface = isDark ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900';
  const card = isDark ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto', surface)}>
      {data?.canPickCompany && (data.companies?.length ?? 0) > 1 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
          <select
            value={companyId || data.company?.id || ''}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('companyId', e.target.value);
              else next.delete('companyId');
              setParams(next);
            }}
            className={cn('rounded-lg border px-3 py-2 text-sm', isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white')}
          >
            {data.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}ª · {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && !data?.company && (
        <div className={cn('mx-auto mt-10 max-w-lg rounded-2xl border p-8 text-center', card)}>
          <Lock className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="font-semibold">Tu usuario no tiene compañía asignada</p>
          <p className={cn('mt-1 text-sm', muted)}>Esta vista es privada. Pide a tu capitán o a Kodesk que te asigne a un cuartel.</p>
        </div>
      )}

      {data?.company && (
        <CompaniaIntranet
          data={{ ...data, company: data.company }}
          isDark={isDark}
          onCreate={setModal}
          onToggle={(id, status) => patchMut.mutate({ id, status })}
          onDelete={(id) => delMut.mutate(id)}
          onToggleTheme={toggleTheme}
        />
      )}

      {modal && data?.company && (
        <CompaniaLifeModal
          kind={modal}
          dark={isDark}
          members={data.members}
          companyId={data.company.id}
          busy={createMut.isPending}
          error={createMut.isError ? 'No se pudo guardar. Revisa los datos.' : null}
          onClose={() => setModal(null)}
          onSubmit={(body) => createMut.mutate(body)}
        />
      )}
    </div>
  );
}
