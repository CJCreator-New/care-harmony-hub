import type { UserRole } from '@/types/auth';
import type { Permission } from '@/lib/permissions';
import { hasAnyAllowedRole, hasPermissionForAnyRole } from '@/lib/permissions';
import { flatRouteManifest } from '@/config/routeManifest';

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  description: string;
}

const MANIFEST_ROUTE_CONFIG: RouteConfig[] = flatRouteManifest.map((route) => ({
  path: route.href,
  allowedRoles: route.allowedRoles,
  requiredPermission: route.requiredPermission,
  description: route.label,
}));

const EXPLICIT_ROUTE_CONFIG: RouteConfig[] = [
  { path: '/settings', allowedRoles: ['admin'], requiredPermission: 'settings', description: 'Hospital Settings' },
  { path: '/settings/staff', allowedRoles: ['admin'], requiredPermission: 'staff-management', description: 'Staff Management' },
  { path: '/settings/performance', allowedRoles: ['admin'], requiredPermission: 'staff-performance', description: 'Staff Performance' },
  { path: '/settings/activity', allowedRoles: ['admin'], requiredPermission: 'activity-logs', description: 'Activity Logs' },
  { path: '/settings/monitoring', allowedRoles: ['admin'], requiredPermission: 'system-monitoring', description: 'System Monitoring' },
  { path: '/reports', allowedRoles: ['admin'], requiredPermission: 'reports', description: 'Reports' },
  { path: '/consultations', allowedRoles: ['admin', 'doctor', 'nurse'], requiredPermission: 'consultations:read', description: 'Consultations' },
  { path: '/consultations/mobile', allowedRoles: ['admin', 'doctor'], description: 'Mobile Consultations' },
  { path: '/consultations/', allowedRoles: ['admin', 'doctor', 'nurse'], description: 'Consultation Workflow' },
  { path: '/pharmacy', allowedRoles: ['admin', 'pharmacist'], requiredPermission: 'pharmacy', description: 'Pharmacy' },
  { path: '/laboratory', allowedRoles: ['admin', 'doctor', 'nurse', 'lab_technician'], requiredPermission: 'lab:read', description: 'Laboratory' },
  { path: '/messages', allowedRoles: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician'], description: 'Messages' },
  { path: '/suppliers', allowedRoles: ['admin', 'pharmacist'], description: 'Suppliers' },
  { path: '/scheduling', allowedRoles: ['admin', 'doctor', 'receptionist'], description: 'Scheduling' },
  { path: '/documents', allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist'], description: 'Documents' },
  { path: '/nurse/protocols', allowedRoles: ['admin', 'nurse'], description: 'Nurse Protocols' },
  { path: '/workflow/optimization', allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'], description: 'Workflow Optimization' },
  { path: '/workflow/discharge', allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'], description: 'Discharge Workflow' },
  { path: '/patient/appointments', allowedRoles: ['patient'], requiredPermission: 'appointments:read', description: 'Patient Appointments' },
  { path: '/patient/portal', allowedRoles: ['patient'], requiredPermission: 'portal', description: 'Patient Portal' },
];

export const PROTECTED_ROUTE_CONFIG: RouteConfig[] = [...MANIFEST_ROUTE_CONFIG, ...EXPLICIT_ROUTE_CONFIG].sort(
  (left, right) => right.path.length - left.path.length,
);

export function checkRouteAccess(
  path: string,
  userRoles: UserRole[],
): { allowed: boolean; denyReason?: string } {
  const routeConfig = PROTECTED_ROUTE_CONFIG.find(config => path.startsWith(config.path));

  if (!routeConfig) return { allowed: true };

  const hasRequiredRole = hasAnyAllowedRole(userRoles, routeConfig.allowedRoles);
  
  if (!hasRequiredRole) {
    return {
      allowed: false,
      denyReason: `Access denied. Required roles: ${routeConfig.allowedRoles.join(', ')}`,
    };
  }

  if (routeConfig.requiredPermission) {
    if (!hasPermissionForAnyRole(userRoles, routeConfig.requiredPermission)) {
      return {
        allowed: false,
        denyReason: `Permission denied: ${routeConfig.requiredPermission}`,
      };
    }
  }

  return { allowed: true };
}
