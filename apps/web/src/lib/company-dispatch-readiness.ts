export type MaquinistaStatsSource = {
  stats?: { available: number; total?: number; unavailable?: number };
} | null | undefined;

export function getMaquinistaAvailableCount(maquinistas?: MaquinistaStatsSource): number {
  return maquinistas?.stats?.available ?? 0;
}

export function hasMaquinistaAvailable(maquinistas?: MaquinistaStatsSource): boolean {
  return getMaquinistaAvailableCount(maquinistas) > 0;
}

export function formatCompanyLabel(company?: { number?: number; name?: string } | null): string {
  if (!company) return 'La compañía seleccionada';
  return `${company.number}ª ${company.name}`;
}

export function companyOperationalForDispatch(input: {
  maquinistasAvailable: number;
  fleetOperativo?: number;
}): boolean {
  return input.maquinistasAvailable > 0 && (input.fleetOperativo ?? 0) > 0;
}

export function confirmDispatchWithoutMaquinista(companyLabel: string): boolean {
  return window.confirm(
    `${companyLabel} no tiene maquinista disponible.\n\n` +
      'Sin maquinista habilitado la compañía no está operativa para emergencias.\n\n' +
      '¿Deseas despachar de todas formas?',
  );
}
