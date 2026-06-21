export const MAX_DISPATCH_VEHICLES = 2;
export const MAX_DISPATCH_COMPANIES = 2;

export type DispatchVehicleRow = {
  id: string;
  companyId: string;
  patent: string;
  status?: string;
  type?: string;
  brand?: string;
  model?: string;
};

export function operativoVehiclesForCompanies(
  vehicles: DispatchVehicleRow[],
  companyIds: string[],
): DispatchVehicleRow[] {
  const ids = new Set(companyIds.filter(Boolean));
  if (ids.size === 0) return [];
  return vehicles.filter(
    (v) => ids.has(v.companyId) && (v.status === 'OPERATIVO' || !v.status),
  );
}

export function companyIdsFromVehicleSelection(
  vehicles: DispatchVehicleRow[],
  selectedVehicleIds: string[],
): string[] {
  const ids = new Set<string>();
  for (const vid of selectedVehicleIds) {
    const v = vehicles.find((x) => x.id === vid);
    if (v) ids.add(v.companyId);
  }
  return [...ids];
}

export function canToggleDispatchVehicle(
  vehicles: DispatchVehicleRow[],
  selectedIds: string[],
  vehicleId: string,
): { ok: true } | { ok: false; reason: string } {
  if (selectedIds.includes(vehicleId)) return { ok: true };

  if (selectedIds.length >= MAX_DISPATCH_VEHICLES) {
    return { ok: false, reason: `Máximo ${MAX_DISPATCH_VEHICLES} carros por despacho` };
  }

  const next = [...selectedIds, vehicleId];
  const companies = companyIdsFromVehicleSelection(vehicles, next);
  if (companies.length > MAX_DISPATCH_COMPANIES) {
    return { ok: false, reason: `Máximo ${MAX_DISPATCH_COMPANIES} compañías por despacho` };
  }

  return { ok: true };
}

export function pruneVehicleSelection(
  vehicles: DispatchVehicleRow[],
  selectedIds: string[],
  allowedCompanyIds: string[],
): string[] {
  const allowed = new Set(allowedCompanyIds.filter(Boolean));
  return selectedIds.filter((id) => {
    const v = vehicles.find((x) => x.id === id);
    return v && allowed.has(v.companyId);
  });
}
