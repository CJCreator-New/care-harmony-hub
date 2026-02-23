import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, hasPermission, hasAnyPermission, Permission, UserRole, PermissionCategory } from '@/types/rbac';

export function usePermissions() {
  const { primaryRole, roles } = useAuth();

  // Memoize permission set for current role
  const currentPermissions = useMemo(() => {
    if (!primaryRole) return new Set<Permission>();
    return new Set(ROLE_PERMISSIONS[primaryRole] || []);
  }, [primaryRole]);

  // Memoize all permissions across all roles
  const allPermissions = useMemo(() => {
    const perms = new Set<Permission>();
    roles.forEach(role => {
      (ROLE_PERMISSIONS[role] || []).forEach(p => perms.add(p));
    });
    return perms;
  }, [roles]);

  const can = (permission: Permission) => {
    return currentPermissions.has(permission);
  };

  const canAny = (permissions: Permission[]) => {
    return permissions.some(p => currentPermissions.has(p));
  };

  const canAll = (permissions: Permission[]) => {
    return permissions.every(p => currentPermissions.has(p));
  };

  const canInAnyRole = (permission: Permission) => {
    return allPermissions.has(permission);
  };

  return {
    can,
    canAny,
    canAll,
    canInAnyRole,
    permissions: currentPermissions,
    allPermissions,
    // Convenience helpers used across components
    canCreatePatients: can(PermissionCategory.PATIENT_WRITE),
    canViewPatients: can(PermissionCategory.PATIENT_READ),
    canManageStaff: can(PermissionCategory.STAFF_MANAGE),
    canViewReports: can(PermissionCategory.REPORTS_READ),
    canManageQueue: can(PermissionCategory.QUEUE_WRITE),
    canRecordVitals: can(PermissionCategory.VITALS_WRITE),
  };
}

export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return false;
  return requiredRoles.some(role => userRoles.includes(role));
}
