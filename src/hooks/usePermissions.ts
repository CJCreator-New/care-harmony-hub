import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  can,
  canAll,
  canAny,
  grantedCapabilities,
  hasAnyRole as roleIsListed,
  resolveActingRole,
  type PermissionCategory,
} from '@/modules/rbac';
import { getDevTestRole } from '@/utils/devRoleSwitch';

/**
 * Permission checks for the acting role (the dev test role, else the primary role).
 * Route guards and the sidebar use the same role, so a check that passes here
 * matches what the guard allows. Other roles the user holds are not used.
 */
export function usePermissions() {
  const { primaryRole, roles } = useAuth();
  const persistedTestRole = getDevTestRole(roles);

  const actingRole = useMemo(
    () => resolveActingRole({ primaryRole, testRole: persistedTestRole }),
    [primaryRole, persistedTestRole]
  );

  const granted = useMemo(
    () => new Set<PermissionCategory>(grantedCapabilities(actingRole)),
    [actingRole]
  );

  return {
    actingRole,
    can: (permission: string) => can(actingRole, permission),
    canAny: (permissions: string[]) => canAny(actingRole, permissions),
    canAll: (permissions: string[]) => canAll(actingRole, permissions),
    permissions: granted,
    canCreatePatients: can(actingRole, 'patients:write'),
    canViewPatients: can(actingRole, 'patients:read'),
    canManageStaff: can(actingRole, 'staff-management'),
    canViewReports: can(actingRole, 'reports:read'),
    canManageQueue: can(actingRole, 'queue:write'),
    canRecordVitals: can(actingRole, 'vitals:write'),
  };
}

/** True when one of the given roles is listed. An empty list denies. */
export function hasAnyRole(
  userRoles: readonly string[],
  requiredRoles: readonly string[]
): boolean {
  return requiredRoles.length > 0 && userRoles.some((role) => roleIsListed(role, requiredRoles));
}
