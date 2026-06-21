/** Rutas y redirección del perfil Operador Central de Despacho */
export const OPERADOR_CENTRAL_ROLE = 'OPERADOR_CENTRAL';

export const CENTRAL_OPERATOR_ROUTES = [
  '/despacho360',
  '/central-despachos-parral',
  '/central-express',
  '/central-operativa',
  '/central-despachos',
  '/central-despachos/variantes',
  '/operational-map',
  '/incidents',
] as const;

export function isCentralOperator(role?: string | null) {
  return role === OPERADOR_CENTRAL_ROLE;
}

export function getDefaultRouteForRole(role?: string | null) {
  if (isCentralOperator(role)) return '/despacho360';
  return '/dashboard';
}

export function isCentralOperatorRoute(pathname: string) {
  return CENTRAL_OPERATOR_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function canCentralOperatorAccess(pathname: string) {
  return isCentralOperatorRoute(pathname);
}
