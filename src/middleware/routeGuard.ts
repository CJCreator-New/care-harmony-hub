import type { UserRole } from '@/types/auth';
import type { Permission } from '@/lib/permissions';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  description: string;
}

export const PROTECTED_ROUTE_CONFIG: RouteConfig[] = [
  { path: '/settings', allowedRoles: ['admin'], requiredPermission: 'settings', description: 'Hospital Settings' },
  { path: '/settings/staff', allowedRoles: ['admin'], requiredPermission: 'staff-management', description: 'Staff Management' },
  { path: '/settings/performance', allowedRoles: ['admin'], requiredPermission: 'staff-performance', description: 'Staff Performance' },
  { path: '/settings/activity', allowedRoles: ['admin'], requiredPermission: 'activity-logs', description: 'Activity Logs' },
  { path: '/settings/monitoring', allowedRoles: ['admin'], requiredPermission: 'system-monitoring', description: 'System Monitoring' },
  { path: '/reports', allowedRoles: ['admin'], requiredPermission: 'reports', description: 'Reports' },
  { path: '/consultations', allowedRoles: ['admin', 'doctor', 'nurse'], requiredPermission: 'consultations:read', description: 'Consultations' },
  { path: '/pharmacy', allowedRoles: ['admin', 'pharmacist'], requiredPermission: 'pharmacy', description: 'Pharmacy' },
  { path: '/laboratory', allowedRoles: ['admin', 'doctor', 'nurse', 'lab_technician'], requiredPermission: 'lab:read', description: 'Laboratory' },
  { path: '/patient/appointments', allowedRoles: ['patient'], requiredPermission: 'appointments:read', description: 'Patient Appointments' },
  { path: '/patient/portal', allowedRoles: ['patient'], requiredPermission: 'portal', description: 'Patient Portal' },
];

export function checkRouteAccess(
  path: string,
  userRoles: UserRole[],
): { allowed: boolean; denyReason?: string } {
  const routeConfig = PROTECTED_ROUTE_CONFIG.find(config => path.startsWith(config.path));

  if (!routeConfig) return { allowed: true };

  const hasRequiredRole = userRoles.some(role => routeConfig.allowedRoles.includes(role));
  
  if (!hasRequiredRole) {
    return {
      allowed: false,
      denyReason: `Access denied. Required roles: ${routeConfig.allowedRoles.join(', ')}`,
    };
  }

  if (routeConfig.requiredPermission) {
    const hasPermission = userRoles.some(role => {
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      return rolePerms.includes('*') || rolePerms.includes(routeConfig.requiredPermission as string);
    });

    if (!hasPermission) {
      return {
        allowed: false,
        denyReason: `Permission denied: ${routeConfig.requiredPermission}`,
      };
    }
  }

  return { allowed: true };
}
