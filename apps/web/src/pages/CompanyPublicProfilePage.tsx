import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Siren, MapPin, Phone, Mail, Users, Truck, Clock, Flame, ChevronLeft,
  CheckCircle2, AlertCircle, Wrench, BarChart3, Calendar, Shield, Star, Zap,
} from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

const DEFAULT_HQ = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1600&h=900&fit=crop&q=80';

type IncidentTypeStat = { type: string; count: number };
type FleetItem = {
  id: string;
  patent: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  status: 'OPERATIVO' | 'EN_REPARACION' | 'FUERA_DE_SERVICIO';
  imageUrl: string | null;
  principalMaquinista: { name: string; photoUrl: string | null } | null;
};
type RecentIncident = {
  id: string;
  code: string;
  type: string;
  address: string;
  dispatchedAt: string;
  closedAt: string | null;
  responseMinutes: number | null;
};
type PublicProfile = {
  id: string;
  slug: string;
  name: string;
  number: number;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  headquartersImageUrl: string | null;
  stats: {
    totalVolunteers: number;
    incidentsThisYear: number;
    activeIncidents: number;
    avgResponseMinutes: number | null;
  };
  fleet: FleetItem[];
  recentIncidents: RecentIncident[];
  specialtyStats: IncidentTypeStat[];
};

const VEHICLE_STATUS = {
  OPERATIVO: { label: 'Operativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  EN_REPARACION: { label: 'En Reparación', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  FUERA_DE_SERVICIO: { label: 'Fuera de Servicio', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
};

const INCIDENT_COLORS: Record<string, string> = {
  'Incendio Estructural': 'text-red-400',
  'Incendio Forestal': 'text-orange-400',
  'Rescate Vehicular': 'text-sky-400',
  'Emergencia Médica': 'text-pink-400',
};

function StatCard({ icon: Icon, value, label, suffix = '', color }: {
  icon: any; value: number | string | null; label: string; suffix?: string; color: string;
}) {
  return (
    <div className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${color} to-transparent`} />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} mb-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <p className="text-4xl font-black text-white tabular-nums">
          {value ?? '—'}
          {value !== null && <span className="text-lg font-semibold text-white/60 ml-1">{suffix}</span>}
        </p>
        <p className="text-sm font-medium text-white/50 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: FleetItem }) {
  const [imgErr, setImgErr] = useState(false);
  const status = VEHICLE_STATUS[vehicle.status];

  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40">
      <div className="relative h-48 overflow-hidden bg-slate-900">
        {vehicle.imageUrl && !imgErr ? (
          <img
            src={vehicle.imageUrl}
            alt={vehicle.model}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Truck className="w-16 h-16 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="font-black text-white text-lg">{vehicle.patent}</p>
            <p className="text-sm text-white/50">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
            {vehicle.type}
          </span>
        </div>
        {vehicle.principalMaquinista && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            {vehicle.principalMaquinista.photoUrl ? (
              <img src={vehicle.principalMaquinista.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-3 h-3 text-amber-400" />
              </div>
            )}
            <p className="text-xs text-white/50">
              Maquinista: <span className="text-amber-400 font-semibold">{vehicle.principalMaquinista.name}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentRow({ inc }: { inc: RecentIncident }) {
  const date = new Date(inc.dispatchedAt);
  const typeColor = INCIDENT_COLORS[inc.type] ?? 'text-slate-400';
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}>
        <Flame className={`w-5 h-5 ${typeColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{inc.type}</p>
        <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {inc.address}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-white/50">{date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</p>
        {inc.responseMinutes !== null && (
          <p className="text-xs text-emerald-400 font-bold mt-0.5">{inc.responseMinutes} min</p>
        )}
      </div>
    </div>
  );
}

export default function CompanyPublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${apiBase}/companies/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Compañía no encontrada');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando perfil del cuartel…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <AlertCircle className="w-16 h-16 text-slate-600" />
        <h1 className="text-xl font-bold text-white">Perfil no disponible</h1>
        <p className="text-slate-500 max-w-sm">{error ?? 'Esta compañía no tiene un perfil público activo.'}</p>
        <Link to="/" className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 mt-2">
          <ChevronLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    );
  }

  const hqImage = data.headquartersImageUrl || DEFAULT_HQ;
  const operativo = data.fleet.filter((v) => v.status === 'OPERATIVO').length;

  const maxCount = Math.max(...data.specialtyStats.map((s) => s.count), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Hero ─── */}
      <div className="relative h-[70vh] min-h-[480px] max-h-[700px] overflow-hidden">
        <img src={hqImage} alt={data.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Inicio</span>
          </Link>
          <Link
            to={`/central/${data.slug}`}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
          >
            <Siren className="w-4 h-4" />
            Central en Vivo
          </Link>
        </nav>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 max-w-5xl">
          <div className="flex items-end gap-5">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="w-20 h-20 rounded-2xl border-2 border-white/20 shadow-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-2 border-red-500/40 bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <Siren className="w-9 h-9 text-red-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                  {data.number}ª Compañía · {data.city}
                </span>
                {data.stats.activeIncidents > 0 && (
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
                    ● Emergencia Activa
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black leading-tight text-white">
                {data.name}
              </h1>
              <p className="text-white/50 flex items-center gap-1.5 mt-2 text-sm">
                <MapPin className="w-4 h-4 text-red-400" />
                {data.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 pb-24 space-y-12">

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            value={data.stats.totalVolunteers}
            label="Voluntarios Activos"
            color="from-blue-600/30"
          />
          <StatCard
            icon={Flame}
            value={data.stats.incidentsThisYear}
            label={`Emergencias ${new Date().getFullYear()}`}
            color="from-red-600/30"
          />
          <StatCard
            icon={Clock}
            value={data.stats.avgResponseMinutes}
            label="Tiempo de Respuesta"
            suffix="min prom."
            color="from-emerald-600/30"
          />
          <StatCard
            icon={Truck}
            value={`${operativo}/${data.fleet.length}`}
            label="Flota Operativa"
            color="from-amber-600/30"
          />
        </div>

        {/* ─── Contacto + Tipo de emergencias ─── */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contacto */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Información del Cuartel
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <span>{data.address}, {data.city}</span>
              </div>
              {data.phone && (
                <div className="flex items-center gap-3 text-white/70">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <a href={`tel:${data.phone}`} className="hover:text-white transition-colors">{data.phone}</a>
                </div>
              )}
              {data.email && (
                <div className="flex items-center gap-3 text-white/70">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <a href={`mailto:${data.email}`} className="hover:text-white transition-colors">{data.email}</a>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-white/10">
              <Link
                to={`/central/${data.slug}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                Ver Central Operativa en Vivo
              </Link>
            </div>
          </div>

          {/* Tipos de emergencia */}
          {data.specialtyStats.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-black text-white flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-red-400" />
                Tipos de Emergencia
              </h2>
              <div className="space-y-3">
                {data.specialtyStats.map((stat) => {
                  const pct = Math.round((stat.count / maxCount) * 100);
                  const color = INCIDENT_COLORS[stat.type] ?? 'text-slate-400';
                  return (
                    <div key={stat.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${color}`}>{stat.type}</span>
                        <span className="text-xs text-white/40 font-mono">{stat.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── Flota ─── */}
        {data.fleet.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-amber-400" />
                Material Mayor
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-bold">{operativo} operativos</span>
                <span className="text-white/30">·</span>
                <span className="text-white/50">{data.fleet.length} total</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.fleet.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          </section>
        )}

        {/* ─── Últimas Emergencias ─── */}
        {data.recentIncidents.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-red-400" />
              Últimas Emergencias Atendidas
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              {data.recentIncidents.map((inc) => <IncidentRow key={inc.id} inc={inc} />)}
            </div>
          </section>
        )}

        {/* ─── Pie ─── */}
        <footer className="text-center pt-8 border-t border-white/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-bold text-white/70">Bomberos de Chile — Servicio Voluntario</p>
          </div>
          <p className="text-xs text-white/30">Perfil operado con NODO360 · Sistema de Gestión de Cuerpos de Bomberos</p>
        </footer>

      </div>
    </div>
  );
}
