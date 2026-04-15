import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEffectivePermissions,
  hasAnyAllowedRole,
  hasPermission,
  hasPermissionForAnyRole,
  type Permission,
} from '@/lib/permissions';
import type { UserRole } from '@/types/auth';
import { getDevTestRole } from '@/utils/devRoleSwitch';

export function usePermissions() {
  const { primaryRole, roles } = useAuth();

  const persistedTestRole = getDevTestRole(roles);
  const effectiveRoles = persistedTestRole ? [persistedTestRole] : roles;

  const currentPermissions = useMemo(() => {
    return new Set(getEffectivePermissions(persistedTestRole ? [persistedTestRole] : (primaryRole ? [primaryRole] : [])));
  }, [primaryRole, persistedTestRole]);

  const allPermissions = useMemo(() => {
    return new Set(getEffectivePermissions(effectiveRoles));
  }, [effectiveRoles]);

  const can = (permission: Permission) => hasPermissionForAnyRole(effectiveRoles, permission);
  const canAny = (permissions: Permission[]) => permissions.some((permission) => can(permission));
  const canAll = (permissions: Permission[]) => permissions.every((permission) => can(permission));
  const canInPrimaryRole = (permission: Permission) => hasPermission(persistedTestRole || primaryRole, permission);
  const canInAnyRole = (permission: Permission) => hasPermissionForAnyRole(effectiveRoles, permission);

  return {
    can,
    canAny,
    canAll,
    canInAnyRole,
    canInPrimaryRole,
    permissions: currentPermissions,
    allPermissions,
    canCreatePatients: can('patients:write'),
    canViewPatients: can('patients:read'),
    canManageStaff: can('staff-management'),
    canViewReports: can('reports:read'),
    canManageQueue: can('queue:write'),
    canRecordVitals: can('vitals:write'),
  };
}

export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return hasAnyAllowedRole(userRoles, requiredRoles);
}
