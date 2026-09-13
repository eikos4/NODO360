import { hasAnyRole, pickPrimaryRole, userRoles, type RoleActor } from './roles';

/** Rutas y redirección del perfil Operador Central de Despacho */
export const OPERADOR_CENTRAL_ROLE = 'OPERADOR_CENTRAL';

export const CENTRAL_OPERATOR_ROUTES = [
  '/despacho360',
  '/nodo360-alarms',
  '/central-despachos-parral',
  '/central-express',
  '/central-operativa',
  '/central-bitacora',
  '/central-despachos',
  '/central-despachos/variantes',
  '/operational-map',
  '/incidents',
  '/hydrants',
  '/dispatch/global',
  '/vision360-cuarteles',
] as const;

export function isCentralOperator(role?: string | null) {
  return role === OPERADOR_CENTRAL_ROLE;
}

export function isKodesk(role?: string | null) {
  return role === 'KODESK';
}

export function isRestrictedCentralista(user?: RoleActor) {
  const roles = userRoles(user);
  return roles.length === 1 && roles[0] === OPERADOR_CENTRAL_ROLE;
}

export function getDefaultRouteForRole(role?: string | null) {
  if (isKodesk(role)) return '/implementacion';
  if (isCentralOperator(role)) return '/despacho360';
  if (role === 'BOMBERO' || role === 'BOMBERO_HONORARIO' || role === 'BOMBERO_INICIAL' || role === 'BOMBERO_PROFESIONAL') {
    return '/emergencia-respuesta';
  }
  return '/dashboard';
}

export function getDefaultRouteForUser(user?: RoleActor) {
  return getDefaultRouteForRole(pickPrimaryRole(userRoles(user), user?.role ?? 'BOMBERO'));
}

export function canAccessNavRoles(user: RoleActor, allowed: string[]) {
  if (allowed.includes('ALL')) return true;
  return hasAnyRole(user, ...allowed);
}

export function isCentralOperatorRoute(pathname: string) {
  return CENTRAL_OPERATOR_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function canCentralOperatorAccess(pathname: string) {
  return isCentralOperatorRoute(pathname);
}
