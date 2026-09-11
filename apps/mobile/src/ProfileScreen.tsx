import { useEffect, useState, type ReactNode } from 'react';
import {
  Building2, Calendar, Flame, Mail, MapPin, ShieldCheck, Truck, UserRound,
} from 'lucide-react';
import { api } from './lib/api';

type ProfileEmergency = {
  id: string;
  code: string;
  type: string;
  address: string;
  dispatchedAt: string;
  closedAt?: string | null;
  status: string | null;
  statusLabel: string;
};

type ProfilePayload = {
  user: {
    fullName: string;
    firstName: string;
    email: string;
    rut: string;
    roleLabel: string;
    photoUrl?: string | null;
    operativeNumber?: number | null;
    stationAvailable?: boolean;
    isMaquinista?: boolean;
    company?: { name: string; number: number; city: string; logoUrl?: string | null } | null;
    cuerpoName?: string | null;
    memberNumber?: string | null;
    memberStatus?: string | null;
    joinedAt?: string | null;
  };
  stats: {
    total: number;
    attended: number;
    going: number;
    onScene: number;
    notGoing: number;
    notAvailable: number;
  };
  emergencies: ProfileEmergency[];
};

const STATUS_CLASS: Record<string, string> = {
  GOING: 'go',
  ON_SCENE: 'scene',
  NOT_GOING: 'no',
  NOT_AVAILABLE: 'hold',
};

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function ProfileScreen({ children }: { children?: ReactNode }) {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api.get<ProfilePayload>('/emergency-response/me/profile')
      .then(({ data: next }) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar tu ficha');
      });
    return () => { cancelled = true; };
  }, []);

  const person = data?.user;
  const stats = data?.stats;

  return (
    <section className="profile-screen">
      <article className="profile-hero">
        {person?.photoUrl ? (
          <img src={person.photoUrl} alt="" />
        ) : (
          <span>{initials(person?.fullName || person?.firstName || 'B')}</span>
        )}
        <div>
          <small>{person?.cuerpoName || 'Cuerpo de Bomberos'}</small>
          <b>{person?.fullName || 'Cargando…'}</b>
          <em>
            {person?.operativeNumber != null ? `N° ${person.operativeNumber} · ` : ''}
            {person?.roleLabel || 'Bombero'}
            {person?.isMaquinista ? ' · Maquinista' : ''}
          </em>
        </div>
      </article>

      {person && (
        <div className="profile-facts">
          <p><Building2 /><span>{person.company?.number ? `${person.company.number}ª · ` : ''}{person.company?.name || person.company?.city || 'Sin compañía'}</span></p>
          <p><ShieldCheck /><span>{person.memberStatus === 'ACTIVO' || !person.memberStatus ? 'Voluntario activo' : person.memberStatus}</span></p>
          <p><Calendar /><span>En el cuerpo desde {fmt(person.joinedAt)}</span></p>
          {person.memberNumber && <p><UserRound /><span>N° socio {person.memberNumber}</span></p>}
          <p><Mail /><span>{person.email}</span></p>
          {person.rut && <p><UserRound /><span>RUT {person.rut}</span></p>}
          <p className={person.stationAvailable ? 'on' : ''}>
            <Truck />
            <span>{person.stationAvailable ? 'Disponible en sala de radio' : 'Fuera de sala de radio'}</span>
          </p>
        </div>
      )}

      {stats && (
        <div className="profile-stats">
          <div><b>{stats.attended}</b><span>Asistió</span></div>
          <div><b>{stats.onScene}</b><span>En el lugar</span></div>
          <div><b>{stats.going}</b><span>En camino</span></div>
          <div><b>{stats.total}</b><span>Respuestas</span></div>
        </div>
      )}

      {error && <p className="empty">{error}</p>}

      <div className="profile-ops">
        <p>Emergencias en las que respondiste</p>
        {data?.emergencies.length ? data.emergencies.map((item) => (
          <article key={item.id} className="profile-op">
            <span className="profile-op-code"><Flame />{item.code}</span>
            <b>{item.type}</b>
            <small><MapPin /> {item.address}</small>
            <footer>
              <time>{fmt(item.dispatchedAt)}</time>
              <em className={STATUS_CLASS[item.status ?? ''] || ''}>{item.statusLabel}</em>
            </footer>
          </article>
        )) : (
          <p className="empty">{data ? 'Aún no registrás respuestas a emergencias.' : 'Cargando historial…'}</p>
        )}
      </div>

      {children}
    </section>
  );
}
