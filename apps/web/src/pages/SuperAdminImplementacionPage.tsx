import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, Copy, Download, Rocket, Upload, Users, AlertTriangle, Crown, ScrollText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { PARRAL_COMPANIES, PARRAL_CSV_TEMPLATE, PARRAL_CUERPO } from '../lib/parral-cuerpo';

const REGIONS = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes',
];

type CompanyRow = { number: string; name: string; address: string };

function parseRoster(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const start = /rut/i.test(lines[0]) ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [rut, firstName, lastName, email, role, companyNumber, operativeNumber] = line
      .split(/[;,\t]/)
      .map((s) => s.trim());
    return {
      rut,
      firstName,
      lastName,
      email,
      role: role || 'BOMBERO',
      companyNumber: companyNumber ? Number(companyNumber) : undefined,
      operativeNumber: operativeNumber ? Number(operativeNumber) : undefined,
    };
  }).filter((r) => r.rut && r.firstName && r.lastName && r.email);
}

export default function SuperAdminImplementacionPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
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
  const [createStaff, setCreateStaff] = useState(true);
  const [enablePublic, setEnablePublic] = useState(true);
  const [password, setPassword] = useState('Demo1234!');
  const [rosterCuerpoId, setRosterCuerpoId] = useState('');
  const [rosterText, setRosterText] = useState(PARRAL_CSV_TEMPLATE);
  const [lastCredentials, setLastCredentials] = useState<Array<{ role: string; email: string; password: string; company?: string }>>([]);

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
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['platform-logs'] });
      setLastCredentials(data.credentials ?? []);
      toast.success(`${data.cuerpo?.name ?? data.bodyName}: ${data.created.length} cuartel(es)`);
      if (data.skipped?.length) toast(`${data.skipped.length} omitidos`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo crear el Cuerpo'),
  });

  const provisionParral = useMutation({
    mutationFn: () => api.post('/onboarding/parral').then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['platform-logs'] });
      setLastCredentials(data.credentials ?? []);
      toast.success(`Parral listo: ${data.created.length} cuartel(es) nuevos`);
      if (data.skipped?.length) toast(`${data.skipped.length} ya existían`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No se pudo implementar Parral'),
  });

  const importUsers = useMutation({
    mutationFn: () => {
      const users = parseRoster(rosterText);
      if (!users.length) throw new Error('La nómina está vacía o mal formateada');
      return api.post('/onboarding/users/import', {
        defaultPassword: password,
        cuerpoId: rosterCuerpoId || undefined,
        users,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['platform-logs'] });
      toast.success(`${data.created.length} bomberos cargados`);
      if (data.skipped?.length) toast.error(`${data.skipped.length} filas omitidas`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'Error al importar'),
  });

  const bodies = status?.bodies ?? [];

  const ready = useMemo(() => {
    return bodies.reduce((sum: number, b: any) => sum + (b.ready ?? 0), 0);
  }, [bodies]);

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

  const loadParralTemplate = () => {
    setCity(PARRAL_CUERPO.city);
    setRegion(PARRAL_CUERPO.region);
    setBodyName(PARRAL_CUERPO.bodyName);
    setCount(PARRAL_COMPANIES.length);
    setRows(PARRAL_COMPANIES.map((c) => ({ number: c.number, name: c.name, address: c.address })));
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
            Dueño de NODO360. Acá se crean Cuerpos (hasta 8 en paralelo, 6 compañías c/u),
            se cargan nóminas y se revisan errores. El Super Admin de cada Cuerpo no ve esta consola.
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

      {!!bodies.length && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {bodies.map((b: any) => (
            <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">{b.city} · {b.region}</p>
              <h3 className="font-black text-slate-900 dark:text-white mt-1">{b.name}</h3>
              <p className="text-xs text-slate-500 mt-2">{b.companies} compañías · {b.users} personas · {b.ready} con capitán</p>
              <button
                type="button"
                onClick={() => setRosterCuerpoId(b.id)}
                className="mt-3 text-xs font-bold text-red-600"
              >
                Cargar nómina aquí
              </button>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-black flex items-center gap-2"><Building2 className="w-4 h-4 text-red-500" /> 1. Crear Cuerpo y cuarteles</h2>
          <p className="text-xs text-slate-500 mt-1">Cada Cuerpo tiene su propia 1ª–6ª. Parral no pisa a Linares ni a Talca.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={provisionParral.isPending}
            onClick={() => provisionParral.mutate()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-sm font-black"
          >
            {provisionParral.isPending ? 'Implementando Parral…' : 'Implementar Cuerpo de Parral (6)'}
          </button>
          <button
            type="button"
            onClick={loadParralTemplate}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
          >
            Usar plantilla Parral
          </button>
        </div>
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
            Nombre del Cuerpo
            <input value={bodyName} onChange={(e) => setBodyName(e.target.value)} placeholder="Cuerpo de Bomberos de Linares" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold space-y-1">
            Cantidad de compañías
            <input type="number" min={1} max={20} value={count} onChange={(e) => setCountAndRows(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left w-16">N°</th>
                <th className="px-3 py-2 text-left">Nombre / cuartel</th>
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
                    <input value={row.address} onChange={(e) => setRows((r) => r.map((x, idx) => idx === i ? { ...x, address: e.target.value } : x))} placeholder="Dieciocho 685" className="w-full bg-transparent" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={createStaff} onChange={(e) => setCreateStaff(e.target.checked)} />
            Crear mandos (Comandante, Central, 1 Capitán por compañía)
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={enablePublic} onChange={(e) => setEnablePublic(e.target.checked)} />
            Activar sala pública
          </label>
          <label className="flex items-center gap-2 font-semibold">
            Clave inicial
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 font-mono text-xs" />
          </label>
        </div>

        <button
          type="button"
          disabled={!city.trim() || provision.isPending}
          onClick={() => provision.mutate()}
          className={cn(
            'px-4 py-2.5 rounded-xl text-sm font-black text-white',
            city.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-400 cursor-not-allowed',
          )}
        >
          {provision.isPending ? 'Creando…' : `Crear Cuerpo con ${count} cuarteles`}
        </button>
      </section>

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

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black flex items-center gap-2"><Upload className="w-4 h-4 text-red-500" /> 2. Cargar perfiles / nómina</h2>
            <p className="text-xs text-slate-500 mt-1">CSV: rut, nombres, apellidos, email, rol, n° compañía, n° operativo. El N° de compañía es de ese Cuerpo.</p>
          </div>
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
            <Download className="w-3.5 h-3.5" /> Plantilla CSV
          </button>
        </div>
        <label className="text-xs font-bold space-y-1 block max-w-md">
          Cuerpo destino
          <select
            value={rosterCuerpoId}
            onChange={(e) => setRosterCuerpoId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="">{bodies.length <= 1 ? 'Cuerpo único / Parral' : 'Seleccionar Cuerpo'}</option>
            {bodies.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <textarea
          value={rosterText}
          onChange={(e) => setRosterText(e.target.value)}
          rows={8}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3 text-xs font-mono"
        />
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            Subir archivo
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setRosterText(await file.text());
              }}
            />
          </label>
          <button
            type="button"
            disabled={importUsers.isPending || (bodies.length > 1 && !rosterCuerpoId)}
            onClick={() => importUsers.mutate()}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black disabled:bg-slate-400"
          >
            {importUsers.isPending ? 'Cargando…' : 'Importar nómina'}
          </button>
          <p className="text-[11px] text-slate-500">Clave inicial de todos: {password}</p>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-black flex items-center gap-2"><ScrollText className="w-4 h-4 text-red-500" /> 3. Log de plataforma</h2>
        <p className="text-xs text-slate-500">Altas de Cuerpos, nóminas y errores 500 de la API.</p>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-2 py-2">Cuando</th>
                <th className="text-left px-2 py-2">Nivel</th>
                <th className="text-left px-2 py-2">Origen</th>
                <th className="text-left px-2 py-2">Cuerpo</th>
                <th className="text-left px-2 py-2">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-2 py-6 text-slate-400">Sin eventos todavía</td></tr>
              )}
              {(logs ?? []).map((log: any) => (
                <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5 font-mono text-[10px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className={cn('px-2 py-1.5 font-black', log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-amber-500' : 'text-slate-500')}>
                    {log.level}
                  </td>
                  <td className="px-2 py-1.5">{log.source}</td>
                  <td className="px-2 py-1.5">{log.cuerpo?.name ?? '—'}</td>
                  <td className="px-2 py-1.5">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                  <th className="text-left px-4 py-2">Sala pública</th>
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
                    <td className="px-4 py-2 text-xs">
                      {c.dispatchSlug ? `/central/${c.dispatchSlug}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
