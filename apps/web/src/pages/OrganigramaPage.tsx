import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Building2, ChevronDown, Search, X,
  Shield, Star, Flame, Wrench, BookOpen,
  DollarSign, Eye, UserCheck, Phone, Mail,
} from 'lucide-react';
import { api } from '../lib/api';

/* ── Jerarquía de roles ── */
const ROLE_HIERARCHY = [
  {
    level: 1,
    roles: ['COMANDANTE'],
    label: 'Comandante',
    color: 'text-red-400',
    bg: 'bg-red-600/15',
    border: 'border-red-500/40',
    ring: 'ring-red-500/30',
    dot: 'bg-red-500',
    icon: Flame,
    description: 'Mando superior del cuerpo',
  },
  {
    level: 2,
    roles: ['CAPITAN'],
    label: 'Capitán / Oficial Operativo',
    color: 'text-orange-400',
    bg: 'bg-orange-600/15',
    border: 'border-orange-500/40',
    ring: 'ring-orange-500/30',
    dot: 'bg-orange-500',
    icon: Star,
    description: 'Mando operativo de compañía',
  },
  {
    level: 3,
    roles: ['SECRETARIO', 'TESORERO', 'ENCARGADO_MATERIAL', 'AUDITOR'],
    label: 'Oficiales Administrativos',
    color: 'text-blue-400',
    bg: 'bg-blue-600/15',
    border: 'border-blue-500/40',
    ring: 'ring-blue-500/30',
    dot: 'bg-blue-500',
    icon: Shield,
    description: 'Gestión administrativa y de recursos',
    subRoles: [
      { role: 'SECRETARIO',        label: 'Secretario/a',          icon: BookOpen,   color: 'text-cyan-400',   bg: 'bg-cyan-600/10',   border: 'border-cyan-500/30' },
      { role: 'TESORERO',          label: 'Tesorero/a',            icon: DollarSign, color: 'text-emerald-400',bg: 'bg-emerald-600/10',border: 'border-emerald-500/30' },
      { role: 'ENCARGADO_MATERIAL',label: 'Enc. Material Mayor',   icon: Wrench,     color: 'text-yellow-400', bg: 'bg-yellow-600/10', border: 'border-yellow-500/30' },
      { role: 'AUDITOR',           label: 'Auditor / Inspector',   icon: Eye,        color: 'text-purple-400', bg: 'bg-purple-600/10', border: 'border-purple-500/30' },
    ],
  },
  {
    level: 4,
    roles: ['BOMBERO'],
    label: 'Bomberos Operativos',
    color: 'text-slate-300',
    bg: 'bg-slate-700/30',
    border: 'border-slate-600/40',
    ring: 'ring-slate-500/20',
    dot: 'bg-slate-400',
    icon: UserCheck,
    description: 'Personal operativo de línea',
  },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', COMANDANTE: 'Comandante', CAPITAN: 'Capitán',
  ENCARGADO_MATERIAL: 'Enc. Material', SECRETARIO: 'Secretario/a',
  TESORERO: 'Tesorero/a', BOMBERO: 'Bombero', AUDITOR: 'Auditor',
};

/* ── Tarjeta de persona ── */
function PersonCard({ user, meta, compact = false }: { user: any; meta: any; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  if (compact) {
    return (
      <div
        className={`relative group flex flex-col items-center gap-1.5 cursor-pointer`}
        onClick={() => setOpen(o => !o)}
      >
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full ${meta.bg} border-2 ${meta.border} flex items-center justify-center font-bold text-sm ${meta.color} transition-all group-hover:scale-110 group-hover:shadow-lg`}>
          {initials}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-200 leading-tight max-w-[80px] truncate">
            {user.firstName}
          </p>
          <p className="text-[10px] text-slate-500 max-w-[80px] truncate">{user.lastName}</p>
        </div>

        {/* Popover */}
        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-3" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-slate-500 hover:text-slate-300" onClick={() => setOpen(false)}><X className="w-3 h-3" /></button>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-full ${meta.bg} border ${meta.border} flex items-center justify-center font-bold text-sm ${meta.color}`}>{initials}</div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className={`text-[10px] ${meta.color}`}>{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            {user.rut && <p className="text-[10px] text-slate-500 mb-1">RUT: {user.rut}</p>}
            {user.email && <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate"><Mail className="w-2.5 h-2.5" />{user.email}</p>}
            {user.phone && <p className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{user.phone}</p>}
            <span className={`mt-2 inline-block text-[9px] px-2 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.color} border ${meta.border}`}>
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${meta.bg} border ${meta.border} rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-all shadow-md group`}
      onClick={() => setOpen(o => !o)}>
      <div className={`w-14 h-14 rounded-full ${meta.bg} border-2 ${meta.border} flex items-center justify-center font-bold text-xl ${meta.color} ring-4 ${meta.ring}`}>
        {initials}
      </div>
      <div className="text-center">
        <p className="font-bold text-white text-sm">{user.firstName} {user.lastName}</p>
        <p className={`text-xs ${meta.color} font-medium`}>{ROLE_LABEL[user.role]}</p>
        {user.rut && <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{user.rut}</p>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${user.isActive ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-500 border-slate-600'}`}>
        {user.isActive ? 'Activo' : 'Inactivo'}
      </span>

      {open && (
        <div className="w-full mt-1 pt-2 border-t border-slate-700 space-y-1 text-left" onClick={e => e.stopPropagation()}>
          {user.email && <p className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" />{user.email}</p>}
          {user.phone && <p className="text-[10px] text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{user.phone}</p>}
        </div>
      )}
    </div>
  );
}

/* ── Conector vertical ── */
function Connector({ double = false }: { double?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px bg-slate-700 h-5" />
      {double && <div className="w-px bg-slate-700 h-3" />}
    </div>
  );
}

/* ── Línea horizontal con branching ── */
function HBranch({ count }: { count: number }) {
  if (count <= 1) return <Connector />;
  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-px bg-slate-700 h-4" />
      <div className="w-full border-t border-slate-700" />
      <div className="w-full flex justify-around">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-px bg-slate-700 h-4" />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function OrganigramaPage() {
  const [selectedCia, setSelectedCia] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: companies, isLoading: loadingC } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });
  const { data: users, isLoading: loadingU } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const company = (companies ?? []).find((c: any) => c.id === selectedCia);

  /* Usuarios de la compañía seleccionada filtrados por búsqueda */
  const cUsers = (users ?? []).filter((u: any) => {
    const matchCia = u.companyId === selectedCia;
    const q = search.toLowerCase();
    const matchQ = !q || `${u.firstName} ${u.lastName} ${u.rut ?? ''} ${u.role}`.toLowerCase().includes(q);
    return matchCia && matchQ;
  });

  /* Agrupar por rol */
  const byRole = (roles: string[]) => cUsers.filter((u: any) => roles.includes(u.role));

  /* Stats */
  const total  = cUsers.length;
  const active = cUsers.filter((u: any) => u.isActive).length;

  const loadingAll = loadingC || loadingU;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Organigrama</h1>
            <p className="text-sm text-slate-400">Estructura jerárquica por compañía</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCia && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar persona..."
                className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors w-44"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
            </div>
          )}
          <select
            value={selectedCia} onChange={e => setSelectedCia(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">— Seleccionar compañía —</option>
            {(companies ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.number}ª Cía. — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PLACEHOLDER ── */}
      {!selectedCia && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-500/40" />
          </div>
          <p className="text-slate-400 font-medium">Selecciona una compañía</p>
          <p className="text-slate-600 text-sm">para ver su organigrama completo</p>
        </div>
      )}

      {/* ── LOADING ── */}
      {selectedCia && loadingAll && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando organigrama...</p>
        </div>
      )}

      {/* ── ORGANIGRAMA ── */}
      {selectedCia && !loadingAll && (
        <div className="space-y-5">

          {/* Banner compañía */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600/15 border-2 border-blue-500/40 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-blue-400">{company?.number}ª</span>
                    <h2 className="text-lg font-bold text-white">{company?.name}</h2>
                  </div>
                  <p className="text-sm text-slate-400">{company?.city} · {company?.region}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{total}</p>
                  <p className="text-xs text-slate-500">Personal total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{active}</p>
                  <p className="text-xs text-slate-500">Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">{total - active}</p>
                  <p className="text-xs text-slate-500">Inactivos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sin personal */}
          {cUsers.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <Users className="w-10 h-10 text-slate-700" />
              <p className="text-slate-500">{search ? 'Sin resultados para la búsqueda' : 'Esta compañía no tiene personal asignado'}</p>
            </div>
          )}

          {/* ══ ÁRBOL JERÁRQUICO ══ */}
          {cUsers.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto p-6">
              <div className="min-w-[600px]">

                {ROLE_HIERARCHY.map((level, levelIdx) => {
                  const levelUsers = byRole(level.roles);
                  if (levelUsers.length === 0) return null;

                  const Icon = level.icon;
                  const isLast = levelIdx === ROLE_HIERARCHY.length - 1;

                  return (
                    <div key={level.level}>
                      {/* Conector desde nivel anterior */}
                      {levelIdx > 0 && (
                        <div className="flex justify-center">
                          <HBranch count={levelUsers.length} />
                        </div>
                      )}

                      {/* Nivel */}
                      <div className="relative">
                        {/* Etiqueta del nivel */}
                        <div className="flex items-center justify-center mb-4">
                          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold ${level.bg} ${level.color} ${level.border}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {level.label}
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/60`}>
                              {levelUsers.length}
                            </span>
                          </div>
                        </div>

                        {/* ── Nivel 3: sub-roles diferenciados ── */}
                        {level.subRoles ? (
                          <div className="space-y-4">
                            {level.subRoles.map(sr => {
                              const srUsers = cUsers.filter((u: any) => u.role === sr.role);
                              if (srUsers.length === 0) return null;
                              const SrIcon = sr.icon;
                              return (
                                <div key={sr.role}>
                                  {/* Sub-etiqueta */}
                                  <div className="flex items-center gap-2 mb-3 px-4">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${sr.bg} border ${sr.border}`}>
                                      <SrIcon className={`w-3.5 h-3.5 ${sr.color}`} />
                                    </div>
                                    <span className={`text-xs font-semibold ${sr.color}`}>{sr.label}</span>
                                    <span className="text-xs text-slate-600">({srUsers.length})</span>
                                    <div className="flex-1 h-px bg-slate-800" />
                                  </div>
                                  {/* Cards en fila */}
                                  <div className="flex flex-wrap gap-3 px-4">
                                    {srUsers.map((u: any) => (
                                      <PersonCard
                                        key={u.id}
                                        user={u}
                                        meta={sr}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : level.level === 4 ? (
                          /* ── Nivel 4: grid compacto de bomberos ── */
                          <div>
                            <div className="flex flex-wrap justify-center gap-4 px-2">
                              {levelUsers.map((u: any) => (
                                <PersonCard key={u.id} user={u} meta={level} compact />
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* ── Niveles 1 y 2: cards grandes centradas ── */
                          <div className="flex justify-center flex-wrap gap-4">
                            {levelUsers.map((u: any) => (
                              <div key={u.id} className="w-44">
                                <PersonCard user={u} meta={level} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Separador entre niveles */}
                      {!isLast && <div className="my-6 border-t border-slate-800/60 border-dashed" />}
                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {/* ── Leyenda de roles ── */}
          {cUsers.length > 0 && (() => {
            const badges: React.ReactNode[] = [];
            ROLE_HIERARCHY.forEach(level => {
              if (level.subRoles) {
                level.subRoles.forEach(sr => {
                  const count = cUsers.filter((u: any) => u.role === sr.role).length;
                  if (count === 0) return;
                  const SrIcon = sr.icon;
                  badges.push(
                    <div key={sr.role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${sr.bg} ${sr.color} ${sr.border}`}>
                      <SrIcon className="w-3 h-3" />
                      {sr.label}
                      <span className="font-bold ml-0.5">{count}</span>
                    </div>
                  );
                });
              } else {
                const count = byRole(level.roles).length;
                if (count === 0) return;
                const LIcon = level.icon;
                badges.push(
                  <div key={level.level} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${level.bg} ${level.color} ${level.border}`}>
                    <LIcon className="w-3 h-3" />
                    {level.label}
                    <span className="font-bold ml-0.5">{count}</span>
                  </div>
                );
              }
            });
            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Roles presentes en esta compañía</p>
                <div className="flex flex-wrap gap-2">{badges}</div>
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
