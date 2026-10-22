import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  CHILE_BOMBEROS_SOURCE,
  CHILE_REGIONS,
  chileCatalogTotals,
  chileCompanyLabel,
  chileInstitution,
  chileResourceKey,
  chileUnitsForCompany,
} from '../../lib/chile-bomberos';

type Props = {
  canWrite: boolean;
  busy: boolean;
  requestedKeys: Set<string>;
  onRequest: (body: {
    institution: string;
    companyName: string;
    label: string;
    type: string;
    staffing: number;
    status: 'SOLICITADO';
  }) => void;
};

export default function NodoCommandGlobalResources({ canWrite, busy, requestedKeys, onRequest }: Props) {
  const totals = chileCatalogTotals();
  const [query, setQuery] = useState('');
  const [regionId, setRegionId] = useState('VII');
  const [openCuerpo, setOpenCuerpo] = useState<string | null>('Parral');

  const region = CHILE_REGIONS.find((item) => item.id === regionId) ?? CHILE_REGIONS[0];
  const q = query.trim().toLowerCase();

  const cuerpos = useMemo(() => {
    const list = q
      ? CHILE_REGIONS.flatMap((item) =>
          item.cuerpos
            .filter((cuerpo) => cuerpo.name.toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
            .map((cuerpo) => ({ ...cuerpo, regionName: item.name, regionId: item.id })),
        )
      : region.cuerpos.map((cuerpo) => ({ ...cuerpo, regionName: region.name, regionId: region.id }));
    return list;
  }, [q, region]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 leading-snug">
        Catálogo nacional · {totals.cuerpos} cuerpos · {totals.companies} compañías · {CHILE_BOMBEROS_SOURCE}
      </p>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cuerpo o región"
          className="w-full bg-slate-900 border border-white/10 rounded-md text-[11px] pl-7 pr-2 py-1.5"
        />
      </div>
      {!q && (
        <select
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            setOpenCuerpo(null);
          }}
          className="w-full bg-slate-900 border border-white/10 rounded-md text-[11px] px-2 py-1.5"
        >
          {CHILE_REGIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.cuerpos.length} cuerpos
            </option>
          ))}
        </select>
      )}
      <div className="space-y-1.5">
        {cuerpos.map((cuerpo) => {
          const open = openCuerpo === cuerpo.name;
          const institution = chileInstitution(cuerpo.name);
          return (
            <div key={`${cuerpo.regionId}-${cuerpo.name}`} className="rounded-xl border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => setOpenCuerpo(open ? null : cuerpo.name)}
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-2"
              >
                <span>
                  <span className="font-black text-sm">{cuerpo.name}</span>
                  <span className="block text-[10px] text-slate-500">
                    {cuerpo.regionName} · {cuerpo.companies} {cuerpo.companies === 1 ? 'compañía' : 'compañías'}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-3 pb-3 space-y-2">
                  {Array.from({ length: cuerpo.companies }, (_, i) => i + 1).map((n) => (
                    <div key={n} className="rounded-lg bg-slate-900/70 px-2 py-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        {chileCompanyLabel(n)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {chileUnitsForCompany(cuerpo.regionName, n).map((unit) => {
                          const key = chileResourceKey(institution, unit.label);
                          const already = requestedKeys.has(key);
                          return (
                            <button
                              key={unit.label}
                              type="button"
                              disabled={!canWrite || busy || already}
                              onClick={() =>
                                onRequest({
                                  institution,
                                  companyName: chileCompanyLabel(n),
                                  label: unit.label,
                                  type: unit.type,
                                  staffing: unit.staffing,
                                  status: 'SOLICITADO',
                                })
                              }
                              className={`text-[10px] font-black rounded-md px-2 py-1 ${
                                already ? 'bg-emerald-600/20 text-slate-900 dark:text-emerald-300' : 'bg-red-600 text-white'
                              } disabled:opacity-50`}
                            >
                              {already ? `${unit.label} en tablero` : `Solicitar ${unit.label}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {cuerpos.length === 0 && (
          <p className="text-xs text-slate-500 py-6 text-center">No hay cuerpos con ese nombre.</p>
        )}
      </div>
    </div>
  );
}
