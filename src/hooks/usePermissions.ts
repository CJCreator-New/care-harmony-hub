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

export function usePermissions() {
  const { primaryRole, roles } = useAuth();

  const currentPermissions = useMemo(() => {
    return new Set(getEffectivePermissions(primaryRole ? [primaryRole] : []));
  }, [primaryRole]);

  const allPermissions = useMemo(() => {
    return new Set(getEffectivePermissions(roles));
  }, [roles]);

  const can = (permission: Permission) => hasPermissionForAnyRole(roles, permission);
  const canAny = (permissions: Permission[]) => permissions.some((permission) => can(permission));
  const canAll = (permissions: Permission[]) => permissions.every((permission) => can(permission));
  const canInPrimaryRole = (permission: Permission) => hasPermission(primaryRole, permission);
  const canInAnyRole = (permission: Permission) => hasPermissionForAnyRole(roles, permission);

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
