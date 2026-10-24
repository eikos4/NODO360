import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, Phone, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

type TalkerPerson = {
  userId: string;
  firstName: string;
  lastName: string;
  operativeNumber: number | null;
  phone: string | null;
  companyNumber: number | null;
  response: string | null;
};

type TalkersPayload = {
  incidentId: string;
  maxTalkers: number;
  allowedUserIds: string[];
  allowed: TalkerPerson[];
  candidates: TalkerPerson[];
};

const RESPONSE_LABEL: Record<string, string> = {
  GOING: 'Va',
  ON_SCENE: 'En el lugar',
  LOCATION_MARKED: 'En el lugar',
  NOT_GOING: 'No va',
  NOT_AVAILABLE: 'No disponible',
};

function personLabel(person: TalkerPerson) {
  const number = person.operativeNumber != null ? `N° ${person.operativeNumber} · ` : '';
  const cia = person.companyNumber != null ? ` · ${person.companyNumber}ª` : '';
  return `${number}${person.firstName} ${person.lastName}${cia}`.trim();
}

export default function RadioTalkersPicker({
  incidentId,
  disabled,
}: {
  incidentId: string;
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['radio-talkers', incidentId],
    queryFn: () => api.get<TalkersPayload>(`/radio/incidents/${incidentId}/talkers`).then((r) => r.data),
    enabled: Boolean(incidentId),
    refetchInterval: 12_000,
  });

  const save = useMutation({
    mutationFn: (userIds: string[]) =>
      api.patch<TalkersPayload>(`/radio/incidents/${incidentId}/talkers`, { userIds }).then((r) => r.data),
    onSuccess: (next) => {
      qc.setQueryData(['radio-talkers', incidentId], next);
      toast.success(next.allowedUserIds.length ? `Hablarán ${next.allowedUserIds.length} teléfono(s)` : 'Nadie de la app puede hablar');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'No se pudo guardar');
    },
  });

  const selected = data?.allowedUserIds ?? [];
  const people = data?.candidates ?? [];

  const toggle = (userId: string) => {
    if (disabled || save.isPending) return;
    const on = selected.includes(userId);
    const next = on ? selected.filter((id) => id !== userId) : [...selected, userId];
    if (next.length > 2) {
      toast.error('Máximo 2 teléfonos. Sacá uno para habilitar otro.');
      return;
    }
    save.mutate(next);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-600">
            <Mic className="h-3.5 w-3.5" />
            Quién puede hablar
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Solo 1 o 2 teléfonos de la app. El resto escucha. La central y la sala del cuartel siempre pueden hablar.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {selected.length}/2 habilitados
        </span>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Cargando teléfonos…</p>
      ) : people.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Todavía no hay bomberos notificados en esta emergencia.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {people.map((person) => {
            const on = selected.includes(person.userId);
            return (
              <li key={person.userId}>
                <button
                  type="button"
                  disabled={disabled || save.isPending}
                  onClick={() => toggle(person.userId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition disabled:opacity-50',
                    on
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white',
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    on ? 'keep-on-color bg-red-600 text-white' : 'bg-white text-slate-500 border border-slate-200',
                  )}>
                    {on ? <Mic className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{personLabel(person)}</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="h-3 w-3" />
                      {person.phone || 'Sin número'}
                      {person.response ? ` · ${RESPONSE_LABEL[person.response] ?? person.response}` : ''}
                    </span>
                  </span>
                  <span className={cn('text-[10px] font-black uppercase', on ? 'text-red-600' : 'text-slate-400')}>
                    {on ? 'Habla' : 'Escucha'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
