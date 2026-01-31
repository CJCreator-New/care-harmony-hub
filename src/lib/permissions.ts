export type Permission = 
  | '*' // Full access
  | 'patients' | 'patients:read' | 'patients:write'
  | 'appointments' | 'appointments:read' | 'appointments:write'
  | 'consultations' | 'consultations:read' | 'consultations:write'
  | 'prescriptions' | 'prescriptions:read' | 'prescriptions:write'
  | 'lab' | 'lab:read' | 'lab:write'
  | 'pharmacy' | 'pharmacy:read' | 'pharmacy:write'
  | 'inventory' | 'inventory:read' | 'inventory:write'
  | 'billing' | 'billing:read' | 'billing:write'
  | 'reports' | 'reports:read' | 'reports:write'
  | 'queue' | 'queue:read' | 'queue:write'
  | 'vitals' | 'vitals:read' | 'vitals:write'
  | 'medications' | 'medications:read' | 'medications:write'
  | 'telemedicine' | 'telemedicine:read' | 'telemedicine:write'
  | 'clinical-pharmacy' | 'laboratory' | 'lab-orders' | 'samples'
  | 'portal' | 'staff-management' | 'settings' | 'workflow-dashboard'
  | 'staff-performance' | 'activity-logs' | 'system-monitoring' | 'ai-demo' | 'differential-diagnosis' | 'treatment-recommendations' | 'treatment-plan-optimization' | 'predictive-analytics' | 'length-of-stay-forecasting' | 'resource-utilization-optimization' | 'voice-clinical-notes';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['*'],
  doctor: [
    'patients', 'patients:read', 'patients:write',
    'appointments', 'appointments:read',
    'consultations', 'consultations:read', 'consultations:write',
    'prescriptions', 'prescriptions:read', 'prescriptions:write',
    'lab', 'lab:read', 'lab:write',
    'telemedicine', 'telemedicine:read', 'telemedicine:write',
    'queue:read', 'vitals:read',
    'ai-demo', 'differential-diagnosis', 'treatment-recommendations', 'treatment-plan-optimization', 'predictive-analytics', 'length-of-stay-forecasting', 'resource-utilization-optimization', 'voice-clinical-notes'
  ],
  nurse: [
    'patients', 'patients:read',
    'queue', 'queue:read', 'queue:write',
    'vitals', 'vitals:read', 'vitals:write',
    'medications', 'medications:read', 'medications:write',
    'inventory:read',
    'consultations:read',
    'telemedicine:read',
    'lab:read',
    'voice-clinical-notes'
  ],
  receptionist: [
    'patients', 'patients:read', 'patients:write',
    'appointments', 'appointments:read', 'appointments:write',
    'queue', 'queue:read', 'queue:write',
    'billing:read'
  ],
  pharmacist: [
    'pharmacy', 'pharmacy:read', 'pharmacy:write',
    'prescriptions', 'prescriptions:read', 'prescriptions:write',
    'inventory', 'inventory:read', 'inventory:write',
    'clinical-pharmacy',
    'patients:read'
  ],
  lab_technician: [
    'laboratory', 'lab:read', 'lab:write',
    'lab-orders', 'samples',
    'patients:read'
  ],
  patient: [
    'portal',
    'appointments:read',
    'prescriptions:read',
    'lab:read',
    'vitals:read'
  ]
};

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // Admin has full access
  if (permissions.includes('*')) return true;
  
  // Check exact permission
  if (permissions.includes(permission)) return true;
  
  // Check wildcard permission (e.g., 'patients' includes 'patients:read')
  const basePermission = permission.split(':')[0] as Permission;
  if (permissions.includes(basePermission)) return true;
  
  return false;
}

export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function getAccessibleRoutes(role: string | undefined): string[] {
  if (!role) return ['/'];
  
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
  if (hasPermission(role, 'laboratory')) routes.push('/lab/automation');
  if (hasPermission(role, 'staff-management')) routes.push('/staff');
  if (hasPermission(role, 'settings')) routes.push('/settings');
  if (hasPermission(role, 'workflow-dashboard')) routes.push('/integration/workflow');
  if (hasPermission(role, 'staff-performance')) routes.push('/staff/performance');
  if (hasPermission(role, 'activity-logs')) routes.push('/activity-logs');
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
