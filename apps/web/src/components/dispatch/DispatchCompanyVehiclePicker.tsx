import { Truck } from 'lucide-react';
import { MAX_DISPATCH_VEHICLES } from '../../lib/dispatch-selection';
import type { CentralParralThemeTokens } from '../../lib/central-parral-theme';

type Company = { id: string; number: number; name: string };
type Vehicle = {
  id: string;
  companyId: string;
  patent: string;
  type?: string;
  brand?: string;
  model?: string;
  imageUrl?: string | null;
};

type Props = {
  th: CentralParralThemeTokens;
  isDark: boolean;
  companies: Company[];
  vehicles: Vehicle[];
  selectedCia: string;
  secondaryCia: string;
  selectedVehicles: string[];
  onPrimaryCompany: (id: string) => void;
  onSecondaryCompany: (id: string) => void;
  onToggleVehicle: (id: string) => void;
};

export default function DispatchCompanyVehiclePicker({
  th,
  isDark,
  companies,
  vehicles,
  selectedCia,
  secondaryCia,
  selectedVehicles,
  onPrimaryCompany,
  onSecondaryCompany,
  onToggleVehicle,
}: Props) {
  const groups = [selectedCia, secondaryCia].filter(Boolean).map((cid) => {
    const c = companies.find((x) => x.id === cid);
    return {
      companyId: cid,
      label: c ? `${c.number}ª — ${c.name}` : cid,
      vehicles: vehicles.filter((v) => v.companyId === cid),
    };
  });

  const selectedRows = selectedVehicles
    .map((id) => vehicles.find((v) => v.id === id))
    .filter(Boolean) as Vehicle[];

  return (
    <div className="space-y-3">
      <div>
        <label className={`text-[10px] uppercase tracking-wide mb-1 block ${th.label}`}>
          Compañía principal
        </label>
        <select
          value={selectedCia}
          onChange={(e) => onPrimaryCompany(e.target.value)}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${th.select}`}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.number}ª Cía. — {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`text-[10px] uppercase tracking-wide mb-1 block ${th.label}`}>
          Compañía de apoyo (opcional)
        </label>
        <select
          value={secondaryCia}
          onChange={(e) => onSecondaryCompany(e.target.value)}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${th.select}`}
        >
          <option value="">— Sin apoyo —</option>
          {companies
            .filter((c) => c.id !== selectedCia)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}ª Cía. — {c.name}
              </option>
            ))}
        </select>
      </div>

      <p className={`text-[10px] ${th.hint}`}>
        Hasta {MAX_DISPATCH_VEHICLES} carros de hasta 2 compañías · {selectedVehicles.length}/{MAX_DISPATCH_VEHICLES} seleccionados
      </p>

      {selectedRows.length > 0 && (
        <div className="space-y-2">
          {selectedRows.map((v) => {
            const c = companies.find((x) => x.id === v.companyId);
            return (
              <div key={v.id} className="flex items-start gap-3">
                <div className={`w-16 h-12 rounded-xl border overflow-hidden shrink-0 ${th.vehicleThumb}`}>
                  {v.imageUrl ? (
                    <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Truck className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase ${th.label}`}>{c ? `${c.number}ª Cía.` : 'Carro'}</p>
                  <p className={`text-base font-black font-mono ${th.vehiclePatent}`}>{v.patent}</p>
                  <p className={`text-xs ${th.vehicleMeta}`}>{v.type}{v.brand ? ` · ${v.brand}` : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.companyId}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${th.label}`}>{g.label}</p>
          {g.vehicles.length === 0 ? (
            <p className={`text-xs ${th.personnelEmpty}`}>Sin carros operativos</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {g.vehicles.map((v) => {
                const on = selectedVehicles.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onToggleVehicle(v.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition ${
                      on ? 'border-red-500 bg-red-500/15 text-red-500' : th.keySubIdle
                    }`}
                  >
                    {v.patent}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
