/**
 * RBAC entry point (ADR-0005). The only place in src/ that decides whether an
 * acting role may see a route, a nav item or a capability.
 *
 * Data: the permission matrix and canonical roles live in `src/types/rbac.ts`.
 * Policy: per-route access lives in `ROUTE_POLICIES` (lib/routePolicy.ts).
 */
export {
  CANONICAL_ROLES,
  PermissionCategory,
  type UserRole,
} from '@/types/rbac';
export {
  can,
  canAll,
  canAny,
  grantedCapabilities,
  hasAnyRole,
  isCanonicalRole,
  resolveActingRole,
  type CanonicalRole,
} from './lib/access';
export { resolveCapability } from './lib/aliases';
export {
  ROLE_SCOPE_ONLY_PATHS,
  ROUTE_POLICIES,
  ROUTE_POLICY_INVALID_ROLES,
  accessibleRoutes,
  decideRouteAccess,
  findRoutePolicy,
  policyRolesFor,
  type RouteDecision,
  type RoutePolicy,
} from './lib/routePolicy';
