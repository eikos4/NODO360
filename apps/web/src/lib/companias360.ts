/** Salas públicas — marcar disponibilidad por compañía (Parral demo) */
export const COMPANIAS360 = [
  { number: 1, name: 'Primera Compañía', slug: 'bomberos-parral', short: '1ª Parral' },
  { number: 2, name: 'Segunda Compañía', slug: 'parral-segunda', short: '2ª Parral' },
  { number: 3, name: 'Tercera Compañía', slug: 'parral-tercera', short: '3ª Parral' },
  { number: 4, name: 'Cuarta Compañía', slug: 'parral-cuarta', short: '4ª Parral' },
  { number: 5, name: 'Quinta Catillo', slug: 'parral-quinta-catillo', short: '5ª Catillo' },
  { number: 6, name: 'Sexta Remulcao', slug: 'parral-sexta-remulcao', short: '6ª Remulcao' },
] as const;

export const COMPANIA_BOARD_PATH = '/compania';

export function companias360Path(slug: string) {
  return `/central/${slug}`;
}

export function isCompanias360Path(pathname: string) {
  return pathname.startsWith('/central/') && pathname !== '/central-operativa';
}

export function isCompaniaBoardPath(pathname: string, search = '') {
  if (pathname === COMPANIA_BOARD_PATH || pathname.startsWith(`${COMPANIA_BOARD_PATH}/`)) return true;
  const vista = new URLSearchParams(search).get('vista');
  return isCompanias360Path(pathname) && (vista === 'compania' || vista === 'compañia');
}

import { isBomberoRole } from './roles';

/** Bomberos solo ven la sala de su compañía; el resto ve las 6 de Parral. */
export function filterCompanias360ForRole(role: string, companyNumber?: number | null) {
  if (isBomberoRole(role) && companyNumber != null) {
    return COMPANIAS360.filter((c) => c.number === companyNumber);
  }
  return [...COMPANIAS360];
}
