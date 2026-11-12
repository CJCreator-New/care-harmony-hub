import {
  CANONICAL_ROLES,
  PermissionCategory,
  ROLE_PERMISSIONS,
  hasPermission as matrixHasPermission,
  type UserRole,
} from '@/types/rbac';
import { resolveCapability } from './aliases';

export type CanonicalRole = UserRole;

const CANONICAL_ROLE_SET: ReadonlySet<string> = new Set<string>(CANONICAL_ROLES);
const CAPABILITY_VALUES: ReadonlySet<string> = new Set<string>(Object.values(PermissionCategory));

export function isCanonicalRole(value: unknown): value is CanonicalRole {
  return typeof value === 'string' && CANONICAL_ROLE_SET.has(value);
}

/**
 * The single role the UI and the route guards act as.
 *
 * A dev test role wins, then the primary role. Other roles held by the user are
 * ignored on purpose: a doctor who also has receptionist access acts as a
 * doctor, and the sidebar and the guard must agree on that. Returns null when
 * no canonical role applies, which callers must treat as deny.
 */
export function resolveActingRole(input: {
  primaryRole?: string | null;
  testRole?: string | null;
}): CanonicalRole | null {
  if (input.testRole) return isCanonicalRole(input.testRole) ? input.testRole : null;
  if (input.primaryRole) return isCanonicalRole(input.primaryRole) ? input.primaryRole : null;
  return null;
}

/**
 * True when the canonical role holds the capability. The capability may be a
 * canonical PermissionCategory or a legacy key from the alias table. Unknown
 * keys, unknown roles and missing roles are all denied.
 */
export function can(role: string | null | undefined, permission: string): boolean {
  if (!isCanonicalRole(role)) return false;
  const capability = resolveCapability(permission);
  if (!capability) return false;
  return matrixHasPermission(role, capability);
}

export function canAny(role: string | null | undefined, permissions: readonly string[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function canAll(role: string | null | undefined, permissions: readonly string[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

export function hasAnyRole(role: string | null | undefined, roles: readonly string[]): boolean {
  return isCanonicalRole(role) && roles.includes(role);
}

/** Capabilities the canonical role holds, straight from the matrix. */
export function grantedCapabilities(role: string | null | undefined): PermissionCategory[] {
  if (!isCanonicalRole(role)) return [];
  return ROLE_PERMISSIONS[role].filter((permission): permission is PermissionCategory =>
    CAPABILITY_VALUES.has(permission)
  );
}
