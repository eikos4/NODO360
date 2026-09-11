import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, Copy, Download, Rocket, Upload, Users, AlertTriangle, Crown, ScrollText, Trash2, Radio, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { PARRAL_CSV_TEMPLATE } from '../lib/parral-cuerpo';

const REGIONS = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes',
];

type CompanyRow = { number: string; name: string; address: string };
type CentralistaDraft = { rut: string; firstName: string; lastName: string; email: string; password: string };

const EMPTY_CENTRALISTA = (): CentralistaDraft => ({
  rut: '', firstName: '', lastName: '', email: '', password: '',
});

function parseCompanyNumber(raw?: string) {
  const value = (raw ?? '').trim();
  if (!value || /sin\s*compa/i.test(value)) return undefined;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ordinals: Record<string, number> = {
    primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6,
    septima: 7, octava: 8, novena: 9, decima: 10,
  };
  for (const [name, num] of Object.entries(ordinals)) {
    if (key.includes(name)) return num;
  }
  const match = key.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function slugEmailPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
}

function parseRoster(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const start = /rut/i.test(lines[0]) ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [rut, firstName, lastName, email, password, role, companyNumber, operativeNumber] = line
      .split(/[;,\t]/)
      .map((s) => s.trim());
    const op = operativeNumber ? Number(operativeNumber) : undefined;
    const generatedEmail = email
      || `${slugEmailPart(firstName)}.${slugEmailPart(lastName)}${op ? `.${op}` : ''}@bomberosparral.cl`;
    return {
      rut,
      firstName,
      lastName,
      email: generatedEmail,
      password: password || undefined,
      role: role || 'BOMBERO',
      companyNumber: parseCompanyNumber(companyNumber),
      operativeNumber: Number.isFinite(op as number) ? op : undefined,
    };
  }).filter((r) => r.rut && r.firstName && r.lastName && r.email);
}

export default function SuperAdminImplementacionPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState('');
  const [showNewCuerpo, setShowNewCuerpo] = useState(false);
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('Maule');
  const [bodyName, setBodyName] = useState('');
  const [count, setCount] = useState(6);
  const [rows, setRows] = useState<CompanyRow[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      number: String(i + 1),
      name: i === 0 ? 'Primera Compañía' : `${i + 1}ª Compañía`,
      address: '',
    })),
  );
  const [createStaff, setCreateStaff] = useState(false);
  const [enablePublic, setEnablePublic] = useState(true);
  const [password, setPassword] = useState('Demo1234!');
  const [rosterText, setRosterText] = useState('');
  const [lastCredentials, setLastCredentials] = useState<Array<{ role: string; email: string; password: string; company?: string }>>([]);
  const [resetConfirm, setResetConfirm] = useState('');
  const [centralistaRows, setCentralistaRows] = useState<CentralistaDraft[]>([EMPTY_CENTRALISTA()]);
  const [newCia, setNewCia] = useState({ number: '', name: '', address: '' });

  const { data: status } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/onboarding/status').then((r) => r.data),
    enabled: user?.role === 'KODESK',
  });

  const { data: logs } = useQuery({
    queryKey: ['platform-logs'],
    queryFn: () => api.get('/onboarding/logs').then((r) => r.data),
    enabled: user?.role === 'KODESK',
    refetchInterval: 30_000,
  });

  const bodies = status?.bodies ?? [];
  const workspace = bodies.find((b: any) => b.id === workspaceId) ?? bodies[0];

  useEffect(() => {
    if (!workspaceId && bodies.length) setWorkspaceId(bodies[0].id);
    if (workspaceId && bodies.length && !bodies.some((b: any) => b.id === workspaceId)) {
      setWorkspaceId(bodies[0].id);
    }
  }, [bodies, workspaceId]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['onboarding-status'] });
    qc.invalidateQueries({ queryKey: ['companies'] });
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['platform-logs'] });
  };

  const provision = useMutation({
    mutationFn: () => api.post('/onboarding/cuerpo', {
      city,
      region,
      bodyName: bodyName || undefined,
      enablePublicDispatch: enablePublic,
      createCommandStaff: createStaff,
      defaultPassword: password,
      companies: rows.map((r) => ({
        number: Number(r.number),
        name: r.name,
        address: r.address || undefined,
      })),
    }).then((r) => r.data),
    onSuccess: (data) => {
      refresh();
      setLastCredentials(data.credentials ?? []);
      setWorkspaceId(data.cuerpo?.id ?? '');
      setShowNewCuerpo(false);
      toast.success(`${data.cuerpo?.name ?? data.bodyName}: listo`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo crear el Cuerpo'),
  });

  const provisionParral = useMutation({
    mutationFn: () => api.post('/onboarding/parral').then((r) => r.data),
    onSuccess: (data) => {
      refresh();
      setLastCredentials(data.credentials ?? []);
      setWorkspaceId(data.cuerpo?.id ?? workspaceId);
      toast.success(data.created?.length
        ? `Parral: ${data.created.length} cuartel(es) nuevos`
        : 'Parral ya estaba completo. No se creó otro Cuerpo.');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo implementar Parral'),
  });

  const importUsers = useMutation({
    mutationFn: () => {
      const users = parseRoster(rosterText);
      if (!users.length) throw new Error('Subí el CSV o pegá la nómina');
      if (!workspace?.id) throw new Error('Elegí un Cuerpo');
      return api.post('/onboarding/users/import', {
        defaultPassword: password,
        cuerpoId: workspace.id,
        users,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      refresh();
      setRosterText('');
      toast.success(`${data.created.length} perfiles cargados`);
      if (data.skipped?.length) toast.error(`${data.skipped.length} filas omitidas`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'Error al importar'),
  });

  const createCentralistas = useMutation({
    mutationFn: () => {
      const operators = centralistaRows
        .map((r) => ({
          rut: r.rut.trim(),
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          email: r.email.trim(),
          password: r.password.trim() || undefined,
        }))
        .filter((r) => r.rut && r.firstName && r.lastName && r.email);
      if (!workspace?.id) throw new Error('Elegí un Cuerpo');
      if (!operators.length) throw new Error('Completá al menos una centralista');
      return api.post('/onboarding/centralistas', {
        cuerpoId: workspace.id,
        defaultPassword: password,
        operators,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      refresh();
      setLastCredentials((prev) => [
        ...data.created.map((c: { name?: string; role: string; email: string; password: string }) => ({
          role: c.name ? `Centralista · ${c.name}` : 'Centralista',
          email: c.email,
          password: c.password,
        })),
        ...prev,
      ]);
      setCentralistaRows([EMPTY_CENTRALISTA()]);
      toast.success(`${data.created.length} centralista(s) listas`);
      if (data.skipped?.length) toast.error(`${data.skipped.length} omitidas`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'No se pudieron crear las centralistas'),
  });

  const resetCentralistaPassword = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/onboarding/users/${userId}/password`, { password }).then((r) => r.data),
    onSuccess: (data) => {
      setLastCredentials((prev) => [
        { role: 'Centralista', email: data.email, password: data.password },
        ...prev,
      ]);
      toast.success(`Clave restablecida: ${data.email}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo restablecer la clave'),
  });

  const addCompany = useMutation({
    mutationFn: () => {
      if (!workspace?.id) throw new Error('Elegí un Cuerpo');
      const number = Number(newCia.number);
      if (!number || !newCia.name.trim()) throw new Error('Indicá N° y nombre de la compañía');
      return api.post(`/onboarding/cuerpo/${workspace.id}/companies`, {
        number,
        name: newCia.name.trim(),
        address: newCia.address.trim() || undefined,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      refresh();
      setNewCia({ number: '', name: '', address: '' });
      toast.success('Compañía agregada');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'No se pudo agregar'),
  });

  const removeCompany = useMutation({
    mutationFn: (id: string) => api.delete(`/onboarding/companies/${id}`).then((r) => r.data),
    onSuccess: () => { refresh(); toast.success('Compañía quitada'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo quitar'),
  });

  const removeCuerpo = useMutation({
    mutationFn: (id: string) => api.delete(`/onboarding/cuerpo/${id}`).then((r) => r.data),
    onSuccess: () => { refresh(); toast.success('Cuerpo quitado'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo quitar'),
  });

  const resetPlatform = useMutation({
    mutationFn: () => api.post('/onboarding/reset', { confirm: 'RESET' }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries();
      setLastCredentials([]);
      setWorkspaceId('');
      setResetConfirm('');
      toast.success(
        `Plataforma limpia. Borrados ${data.deleted?.cuerpos ?? 0} cuerpos, ${data.deleted?.companies ?? 0} compañías, ${data.deleted?.users ?? 0} usuarios`,
      );
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo resetear'),
  });

  const ready = useMemo(() => {
    return bodies.reduce((sum: number, b: any) => sum + (b.ready ?? 0), 0);
  }, [bodies]);

  const hasParral = bodies.some((b: any) => /parral/i.test(b.city) || /parral/i.test(b.name));
  const rosterPreview = parseRoster(rosterText).length;

  if (user?.role !== 'KODESK') {
    return <Navigate to="/dashboard" replace />;
  }

  const setCountAndRows = (n: number) => {
    const next = Math.min(20, Math.max(1, n));
    setCount(next);
    setRows((prev) => {
      const copy = [...prev];
      while (copy.length < next) {
        const i = copy.length;
        copy.push({ number: String(i + 1), name: `${i + 1}ª Compañía`, address: '' });
      }
      return copy.slice(0, next);
    });
  };

  const copyCreds = () => {
    const text = lastCredentials.map((c) => `${c.role}\t${c.email}\t${c.password}`).join('\n');
    void navigator.clipboard.writeText(text);
    toast.success('Credenciales copiadas');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Kodesk · Super Super Admin</p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
            <Crown className="w-6 h-6 text-amber-400" /> Consola de plataforma
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Elegí un Cuerpo y trabajá ahí: compañías, CSV y centralistas. No se crea otro Parral si ya existe.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/companies" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold">Compañías</Link>
          <Link to="/users" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold">Personal</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Cuerpos', value: status?.cuerpos ?? '—', icon: Crown },
          { label: 'Cuarteles', value: status?.companies ?? '—', icon: Building2 },
          { label: 'Personal', value: status?.users ?? '—', icon: Users },
          { label: 'Listos p/ piloto', value: ready, icon: Rocket },
          { label: 'Errores 7d', value: status?.recentErrors ?? 0, icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <s.icon className="w-4 h-4 text-red-400 mb-2" />
            <p className="text-lg font-black text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black">Trabajar en este Cuerpo</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={provisionParral.isPending}
              onClick={() => provisionParral.mutate()}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black disabled:opacity-60"
            >
              {provisionParral.isPending
                ? 'Completando Parral…'
                : hasParral
                  ? 'Completar compañías de Parral'
                  : 'Crear Cuerpo de Parral (6)'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewCuerpo((v) => !v)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              {showNewCuerpo ? 'Cerrar' : 'Otro Cuerpo (otra ciudad)'}
            </button>
          </div>
        </div>

        {!!bodies.length && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {bodies.map((b: any) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setWorkspaceId(b.id)}
                className={cn(
                  'text-left rounded-2xl border p-4 transition-colors',
                  workspace?.id === b.id
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">{b.city} · {b.region}</p>
                <h3 className="font-black text-slate-900 dark:text-white mt-1">{b.name}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  {b.companies} compañías · {b.users} personas · {(b.centralistas ?? []).length}/6 centralistas
                </p>
              </button>
            ))}
          </div>
        )}

        {showNewCuerpo && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <p className="text-xs text-slate-500">Solo para una ciudad nueva. Si es Parral, usá el botón ámbar de arriba.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-xs font-bold space-y-1">
                Ciudad
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Linares" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-bold space-y-1">
                Región
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold space-y-1">
                Nombre
                <input value={bodyName} onChange={(e) => setBodyName(e.target.value)} placeholder="Cuerpo de Bomberos de Linares" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-bold space-y-1">
                Compañías
                <input type="number" min={1} max={20} value={count} onChange={(e) => setCountAndRows(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left w-16">N°</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-1.5">
                        <input value={row.number} onChange={(e) => setRows((r) => r.map((x, idx) => idx === i ? { ...x, number: e.target.value } : x))} className="w-14 bg-transparent font-mono" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={row.name} onChange={(e) => setRows((r) => r.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} className="w-full bg-transparent" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={row.address} onChange={(e) => setRows((r) => r.map((x, idx) => idx === i ? { ...x, address: e.target.value } : x))} className="w-full bg-transparent" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={createStaff} onChange={(e) => setCreateStaff(e.target.checked)} />
                Crear mandos de prueba
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={enablePublic} onChange={(e) => setEnablePublic(e.target.checked)} />
                Sala pública
              </label>
              <button
                type="button"
                disabled={!city.trim() || provision.isPending}
                onClick={() => provision.mutate()}
                className={cn('px-4 py-2.5 rounded-xl text-sm font-black text-white', city.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-400')}
              >
                {provision.isPending ? 'Creando…' : `Crear ${count} compañías`}
              </button>
            </div>
          </div>
        )}
      </section>

      {workspace && (
        <section className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-5 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Cuerpo activo</p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{workspace.name}</h2>
              <p className="text-xs text-slate-500">{workspace.city} · {workspace.region}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold">
                Clave inicial
                <input value={password} onChange={(e) => setPassword(e.target.value)} className="ml-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 font-mono text-xs" />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`¿Quitar ${workspace.name}? Las compañías se ocultan. Los usuarios quedan.`)) return;
                  removeCuerpo.mutate(workspace.id);
                }}
                className="px-3 py-2 rounded-xl border border-red-300 text-red-700 text-xs font-bold"
              >
                Quitar este Cuerpo
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-red-500" /> Compañías
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">N°</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Personal</th>
                    <th className="px-3 py-2 text-right">Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspace.quartels ?? []).length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-xs text-slate-400">Sin compañías. Agregá una abajo o completá Parral.</td></tr>
                  )}
                  {(workspace.quartels ?? []).map((c: any) => (
                    <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-mono font-bold">{c.number}ª</td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">{c.users}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`¿Quitar la ${c.number}ª ${c.name}?`)) return;
                            removeCompany.mutate(c.id);
                          }}
                          className="text-xs font-bold text-red-600"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={newCia.number}
                onChange={(e) => setNewCia((x) => ({ ...x, number: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                placeholder="N° (7)"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
              <input
                value={newCia.name}
                onChange={(e) => setNewCia((x) => ({ ...x, name: e.target.value }))}
                placeholder="Séptima Compañía"
                className="md:col-span-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
              <input
                value={newCia.address}
                onChange={(e) => setNewCia((x) => ({ ...x, address: e.target.value }))}
                placeholder="Dirección (opcional)"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={addCompany.isPending}
                onClick={() => addCompany.mutate()}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-sm font-black"
              >
                {addCompany.isPending ? 'Agregando…' : 'Agregar compañía'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Upload className="w-4 h-4 text-red-500" /> Cargar CSV de personal
              </h3>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([PARRAL_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'nodo360-nomina.csv';
                  a.click();
                }}
                className="text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> Plantilla
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Se carga en <strong>{workspace.name}</strong>. Columnas: RUT, Nombres, Apellidos, Correo, Contraseña, Rol, Compañía, N° operativo.
            </p>
            <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 cursor-pointer hover:border-red-400 mb-3">
              <Upload className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold">Elegir archivo CSV</span>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRosterText(await file.text());
                  e.target.value = '';
                }}
              />
            </label>
            {!!rosterText && (
              <p className="text-xs text-emerald-600 font-bold mb-2">{rosterPreview} filas listas para importar</p>
            )}
            <button
              type="button"
              disabled={importUsers.isPending || !rosterText}
              onClick={() => importUsers.mutate()}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-sm font-black"
            >
              {importUsers.isPending ? 'Cargando…' : `Importar a ${workspace.name}`}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-black flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-red-500" /> Centralistas · Sala de radio
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Hasta 6 en {workspace.name}. Entran a Despacho360 y la sala de radio.
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-3">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Ya vinculadas · {(workspace.centralistas ?? []).length}/6
              </div>
              {(workspace.centralistas ?? []).length === 0 ? (
                <p className="px-3 py-3 text-xs text-slate-400">Ninguna todavía.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workspace.centralistas.map((c: any) => (
                    <li key={c.id} className="px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">{c.firstName} {c.lastName}</span>
                      <span className="font-mono text-xs text-slate-500">{c.email}</span>
                      <button
                        type="button"
                        disabled={resetCentralistaPassword.isPending}
                        onClick={() => resetCentralistaPassword.mutate(c.id)}
                        className="text-[10px] font-black uppercase tracking-wider text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        Resetear clave
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">RUT</th>
                    <th className="px-3 py-2 text-left">Nombres</th>
                    <th className="px-3 py-2 text-left">Apellidos</th>
                    <th className="px-3 py-2 text-left">Correo</th>
                    <th className="px-3 py-2 text-left">Contraseña</th>
                  </tr>
                </thead>
                <tbody>
                  {centralistaRows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-1.5">
                        <input value={row.rut} onChange={(e) => setCentralistaRows((r) => r.map((x, idx) => idx === i ? { ...x, rut: e.target.value } : x))} placeholder="12.345.678-9" className="w-full bg-transparent px-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.firstName} onChange={(e) => setCentralistaRows((r) => r.map((x, idx) => idx === i ? { ...x, firstName: e.target.value } : x))} placeholder="Karen" className="w-full bg-transparent px-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.lastName} onChange={(e) => setCentralistaRows((r) => r.map((x, idx) => idx === i ? { ...x, lastName: e.target.value } : x))} placeholder="Bravo" className="w-full bg-transparent px-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.email} onChange={(e) => setCentralistaRows((r) => r.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))} placeholder="central1@bomberosparral.cl" className="w-full bg-transparent px-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.password} onChange={(e) => setCentralistaRows((r) => r.map((x, idx) => idx === i ? { ...x, password: e.target.value } : x))} placeholder={password} className="w-full bg-transparent px-1 font-mono text-xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button
                type="button"
                disabled={(workspace.centralistas ?? []).length + centralistaRows.length >= 6}
                onClick={() => setCentralistaRows((r) => r.length < 6 ? [...r, EMPTY_CENTRALISTA()] : r)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Otro puesto
              </button>
              <button
                type="button"
                disabled={createCentralistas.isPending}
                onClick={() => createCentralistas.mutate()}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-sm font-black"
              >
                {createCentralistas.isPending ? 'Creando…' : 'Vincular a sala de radio'}
              </button>
            </div>
          </div>
        </section>
      )}

      {!!lastCredentials.length && (
        <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-black flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Entregar estas claves</h3>
            <button type="button" onClick={copyCreds} className="text-xs font-bold flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copiar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <tbody>
                {lastCredentials.map((c) => (
                  <tr key={c.email}>
                    <td className="py-1 pr-3 font-sans font-bold">{c.role}</td>
                    <td className="py-1 pr-3">{c.email}</td>
                    <td className="py-1">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!!status?.companiesReady?.length && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-black flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Estado por cuartel</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Cuerpo</th>
                  <th className="text-left px-4 py-2">N°</th>
                  <th className="text-left px-4 py-2">Compañía</th>
                  <th className="text-left px-4 py-2">Personal</th>
                  <th className="text-left px-4 py-2">Capitán</th>
                </tr>
              </thead>
              <tbody>
                {status.companiesReady.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 text-xs text-amber-600 dark:text-amber-400 font-bold">{c.cuerpoName}</td>
                    <td className="px-4 py-2 font-mono font-bold">{c.number}ª</td>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.users}</td>
                    <td className="px-4 py-2">{c.hasCapitan ? 'Sí' : <span className="text-amber-500">Falta</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2"><ScrollText className="w-4 h-4 text-red-500" /> Log</h2>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-2 py-2">Cuando</th>
                <th className="text-left px-2 py-2">Nivel</th>
                <th className="text-left px-2 py-2">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-2 py-6 text-slate-400">Sin eventos</td></tr>
              )}
              {(logs ?? []).map((log: any) => (
                <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5 font-mono text-[10px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className={cn('px-2 py-1.5 font-black', log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-amber-500' : 'text-slate-500')}>
                    {log.level}
                  </td>
                  <td className="px-2 py-1.5">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2 text-red-700 dark:text-red-400">
          <Trash2 className="w-4 h-4" /> Reset completo
        </h2>
        <p className="text-xs text-red-800/80 dark:text-red-300/80 max-w-2xl">
          Borra todo. Queda solo Kodesk. Para un error chico usá Quitar compañía / Quitar Cuerpo.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            placeholder="Escribí RESET"
            className="rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-transparent px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            disabled={resetConfirm !== 'RESET' || resetPlatform.isPending}
            onClick={() => {
              if (!window.confirm('¿Borrar TODOS los Cuerpos, compañías y usuarios?')) return;
              resetPlatform.mutate();
            }}
            className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-slate-400 text-white text-sm font-black"
          >
            {resetPlatform.isPending ? 'Borrando…' : 'Resetear plataforma'}
          </button>
        </div>
      </section>
    </div>
  );
}
