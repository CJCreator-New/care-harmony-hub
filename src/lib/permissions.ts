/**
 * Compatibility facade over the RBAC module (ADR-0005).
 *
 * This file no longer owns a permission matrix. Every decision is made by
 * `@/modules/rbac`, which reads `src/types/rbac.ts`. Legacy permission keys
 * such as 'patients:write' are resolved by the module's alias table. Keys with
 * no canonical equivalent are denied.
 *
 * New code should import from `@/modules/rbac` directly.
 */
import { accessibleRoutes, can, canAll, canAny, hasAnyRole } from '@/modules/rbac';

export type Permission = string;

/** Routes a role may open, from the route policy (not a separate list). */
export const getAccessibleRoutes = accessibleRoutes;

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return can(role, permission);
}

export function hasAnyPermission(
  role: string | null | undefined,
  permissions: Permission[]
): boolean {
  return canAny(role, permissions);
}

export function hasAllPermissions(
  role: string | null | undefined,
  permissions: Permission[]
): boolean {
  return canAll(role, permissions);
}

/**
 * True when one of the user's roles is in `requiredRoles`. An empty
 * `requiredRoles` denies, so a missing policy never grants access.
 */
export function hasAnyAllowedRole(
  userRoles: Array<string | null | undefined>,
  requiredRoles: Array<string>
): boolean {
  if (requiredRoles.length === 0) return false;
  return userRoles.some((role) => hasAnyRole(role, requiredRoles));
}
