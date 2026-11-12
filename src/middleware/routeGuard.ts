import { decideRouteAccess, type RouteDecision } from '@/modules/rbac';

/**
 * Route guard decision for a pathname and the acting role (see `resolveActingRole`).
 * The policy lives in `@/modules/rbac`, the same table the sidebar reads.
 */
export function checkRouteAccess(path: string, actingRole: string | null | undefined): RouteDecision {
  return decideRouteAccess(path, actingRole);
}
