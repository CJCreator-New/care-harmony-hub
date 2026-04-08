import type { UserRole } from '@/types/auth';

export type Permission = string;

const PERMISSION_ALIASES: Record<string, Permission> = {
  'patient:read': 'patients:read',
  'patient:write': 'patients:write',
  'patient:delete': 'patients:delete',
  'appointment:read': 'appointments:read',
  'appointment:write': 'appointments:write',
  'appointment:delete': 'appointments:delete',
  'appointment:check_in': 'appointments:write',
  'consultation:read': 'consultations:read',
  'consultation:write': 'consultations:write',
  'consultation:start': 'consultations:write',
  'prescription:read': 'prescriptions:read',
  'prescription:write': 'prescriptions:write',
  'prescription:dispense': 'prescriptions:write',
  'pharmacy:dispense': 'pharmacy:write',
  'pharmacy:inventory': 'inventory:write',
  'staff:read': 'staff-management',
  'staff:write': 'staff-management',
  'staff:manage': 'staff-management',
  'staff:invite': 'staff-management',
  'settings:read': 'settings',
  'settings:write': 'settings',
  'hospital:settings': 'hospital:settings',
  'reports:generate': 'reports',
  'reports:write': 'reports',
  'workflow:read': 'workflow-dashboard',
  'workflow:manage': 'workflow-dashboard',
  'activity_logs:read': 'activity-logs',
  'portal:access': 'portal',
  'audit:logs': 'activity-logs',
  'compliance:reports': 'compliance-reports',
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['*'],
  doctor: [
    'patients',
    'patients:read',
    'patients:write',
    'appointments',
    'appointments:read',
    'consultations',
    'consultations:read',
    'consultations:write',
    'prescriptions',
    'prescriptions:read',
    'prescriptions:write',
    'lab',
    'lab:read',
    'lab:write',
    'telemedicine',
    'telemedicine:read',
    'telemedicine:write',
    'queue:read',
    'vitals:read',
    'ai-demo',
    'differential-diagnosis',
    'treatment-recommendations',
    'treatment-plan-optimization',
    'predictive-analytics',
    'length-of-stay-forecasting',
    'resource-utilization-optimization',
    'voice-clinical-notes',
    'workflow-dashboard',
  ],
  nurse: [
    'patients:read',
    'queue',
    'queue:read',
    'queue:write',
    'vitals',
    'vitals:read',
    'vitals:write',
    'medications',
    'medications:read',
    'medications:write',
    'consultations:read',
    'telemedicine:read',
    'lab:read',
    'voice-clinical-notes',
    'workflow-dashboard',
  ],
  receptionist: [
    'patients',
    'patients:read',
    'patients:write',
    'appointments',
    'appointments:read',
    'appointments:write',
    'queue',
    'queue:read',
    'queue:write',
    'billing:read',
    'workflow-dashboard',
  ],
  pharmacist: [
    'pharmacy',
    'pharmacy:read',
    'pharmacy:write',
    'prescriptions',
    'prescriptions:read',
    'prescriptions:write',
    'inventory',
    'inventory:read',
    'inventory:write',
    'clinical-pharmacy',
    'patients:read',
    'workflow-dashboard',
  ],
  lab_technician: [
    'laboratory',
    'lab:read',
    'lab:write',
    'lab-orders',
    'samples',
    'patients:read',
    'workflow-dashboard',
  ],
  patient: [
    'portal',
    'appointments:read',
    'prescriptions:read',
    'lab:read',
    'billing:read',
    'vitals:read',
  ],
};

export function normalizePermission(permission: Permission): Permission {
  return PERMISSION_ALIASES[permission] ?? permission;
}

export function getRolePermissions(role: UserRole | string | undefined): Permission[] {
  if (!role) return [];
  return (ROLE_PERMISSIONS[role as UserRole] ?? []).map(normalizePermission);
}

function hasNormalizedPermission(
  permissions: Permission[],
  requestedPermission: Permission,
): boolean {
  if (permissions.includes('*')) return true;

  const normalizedPermission = normalizePermission(requestedPermission);
  if (permissions.includes(normalizedPermission)) return true;

  const basePermission = normalizedPermission.split(':')[0];
  if (permissions.some((permission) => permission.startsWith(`${basePermission}:`))) {
    return !normalizedPermission.includes(':') || permissions.includes(normalizedPermission);
  }

  if (permissions.includes(basePermission)) {
    return true;
  }

  return false;
}

export function hasPermission(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return hasNormalizedPermission(getRolePermissions(role), permission);
}

export function hasAnyPermission(
  role: UserRole | string | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: UserRole | string | undefined,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function hasAnyAllowedRole(
  userRoles: Array<UserRole | string>,
  requiredRoles: Array<UserRole | string>,
): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.some((requiredRole) => userRoles.includes(requiredRole));
}

export function hasPermissionForAnyRole(
  roles: Array<UserRole | string>,
  permission: Permission,
): boolean {
  return roles.some((role) => hasPermission(role, permission));
}

export function getEffectivePermissions(roles: Array<UserRole | string>): Permission[] {
  const permissionSet = new Set<Permission>();

  roles.forEach((role) => {
    getRolePermissions(role).forEach((permission) => permissionSet.add(permission));
  });

  return Array.from(permissionSet);
}

export function getAccessibleRoutes(role: UserRole | string | undefined): string[] {
  if (!role) return ['/'];

  if (role === 'patient') {
    return ['/dashboard', '/patient/portal'];
  }

  const routes: string[] = ['/dashboard'];

  if (hasPermission(role, 'patients')) routes.push('/patients');
  if (hasPermission(role, 'appointments')) routes.push('/appointments');
  if (hasPermission(role, 'consultations')) routes.push('/consultations');
  if (hasPermission(role, 'prescriptions')) routes.push('/prescriptions');
  if (hasPermission(role, 'lab')) routes.push('/laboratory');
  if (hasPermission(role, 'pharmacy')) routes.push('/pharmacy');
  if (hasPermission(role, 'inventory')) routes.push('/inventory');
  if (hasPermission(role, 'billing')) routes.push('/billing');
  if (hasPermission(role, 'reports')) routes.push('/reports');
  if (hasPermission(role, 'queue')) routes.push('/queue');
  if (hasPermission(role, 'telemedicine')) routes.push('/telemedicine');
  if (hasPermission(role, 'clinical-pharmacy')) routes.push('/pharmacy/clinical');
  if (hasPermission(role, 'laboratory')) routes.push('/laboratory/automation');
  if (hasPermission(role, 'staff-management')) routes.push('/settings/staff');
  if (hasPermission(role, 'settings')) routes.push('/settings');
  if (hasPermission(role, 'workflow-dashboard')) routes.push('/integration/workflow');
  if (hasPermission(role, 'staff-performance')) routes.push('/settings/performance');
  if (hasPermission(role, 'activity-logs')) routes.push('/settings/activity');
  if (hasPermission(role, 'portal')) routes.push('/patient/portal');
  if (hasPermission(role, 'ai-demo')) routes.push('/ai-demo');
  if (hasPermission(role, 'differential-diagnosis')) routes.push('/differential-diagnosis');
  if (hasPermission(role, 'treatment-recommendations')) routes.push('/treatment-recommendations');
  if (hasPermission(role, 'treatment-plan-optimization')) routes.push('/treatment-plan-optimization');
  if (hasPermission(role, 'predictive-analytics')) routes.push('/predictive-analytics');
  if (hasPermission(role, 'length-of-stay-forecasting')) routes.push('/length-of-stay-forecasting');
  if (hasPermission(role, 'resource-utilization-optimization')) routes.push('/resource-utilization-optimization');
  if (hasPermission(role, 'voice-clinical-notes')) routes.push('/voice-clinical-notes');

  return routes;
}
