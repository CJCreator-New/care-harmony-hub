import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, hasPermission, hasAnyPermission, Permission } from '@/types/rbac';

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
  };
}