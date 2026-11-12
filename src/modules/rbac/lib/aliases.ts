import { PermissionCategory } from '@/types/rbac';

/**
 * Legacy permission keys used by call sites, route definitions and older
 * components, mapped onto the canonical matrix in `src/types/rbac.ts`.
 *
 * Anything not listed here and not a canonical PermissionCategory value is
 * denied. There is no wildcard and no substring matching.
 */
const C = PermissionCategory;

export const LEGACY_PERMISSION_ALIASES: Readonly<Record<string, PermissionCategory>> = {
  patients: C.PATIENT_READ,
  'patients:read': C.PATIENT_READ,
  'patients:write': C.PATIENT_WRITE,
  'patients:delete': C.PATIENT_DELETE,

  appointments: C.APPOINTMENT_READ,
  'appointments:read': C.APPOINTMENT_READ,
  'appointments:write': C.APPOINTMENT_WRITE,
  'appointments:delete': C.APPOINTMENT_DELETE,

  consultations: C.CONSULTATION_READ,
  'consultations:read': C.CONSULTATION_READ,
  'consultations:write': C.CONSULTATION_WRITE,
  'consultations:start': C.CONSULTATION_START,

  prescriptions: C.PRESCRIPTION_READ,
  'prescriptions:read': C.PRESCRIPTION_READ,
  'prescriptions:write': C.PRESCRIPTION_WRITE,
  'prescriptions:dispense': C.PRESCRIPTION_DISPENSE,

  lab: C.LAB_READ,
  'lab:read': C.LAB_READ,
  'lab:write': C.LAB_WRITE,
  'lab:process': C.LAB_PROCESS,

  pharmacy: C.PHARMACY_READ,
  'pharmacy:read': C.PHARMACY_READ,
  'pharmacy:write': C.PHARMACY_WRITE,
  'pharmacy:dispense': C.PHARMACY_DISPENSE,

  inventory: C.INVENTORY_READ,
  'inventory:read': C.INVENTORY_READ,
  'inventory:write': C.INVENTORY_WRITE,

  billing: C.BILLING_READ,
  'billing:read': C.BILLING_READ,
  'billing:write': C.BILLING_WRITE,
  'billing:process': C.BILLING_PROCESS,
  'billing:invoice': C.BILLING_INVOICE,

  queue: C.QUEUE_READ,
  'queue:read': C.QUEUE_READ,
  'queue:write': C.QUEUE_WRITE,
  'queue:manage': C.QUEUE_MANAGE,

  vitals: C.VITALS_READ,
  'vitals:read': C.VITALS_READ,
  'vitals:write': C.VITALS_WRITE,

  telemedicine: C.TELEMEDICINE_READ,
  'telemedicine:read': C.TELEMEDICINE_READ,
  'telemedicine:write': C.TELEMEDICINE_WRITE,

  reports: C.REPORTS_READ,
  'reports:read': C.REPORTS_READ,
  'reports:generate': C.REPORTS_GENERATE,

  'staff-management': C.STAFF_MANAGE,
  'staff-performance': C.STAFF_READ,
  'staff:read': C.STAFF_READ,
  'staff:write': C.STAFF_WRITE,
  'staff:manage': C.STAFF_MANAGE,
  'staff:invite': C.STAFF_INVITE,

  settings: C.HOSPITAL_SETTINGS,
  'hospital:settings': C.HOSPITAL_SETTINGS,
  'settings:read': C.SETTINGS_READ,
  'settings:write': C.SETTINGS_WRITE,

  'activity-logs': C.ACTIVITY_LOGS_READ,
  'activity_logs:read': C.ACTIVITY_LOGS_READ,

  'audit-logs': C.AUDIT_LOGS,
  'audit:logs': C.AUDIT_LOGS,

  'system-health': C.SYSTEM_MAINTENANCE,
  'system-monitoring': C.SYSTEM_MAINTENANCE,

  'workflow-dashboard': C.WORKFLOW_READ,
  'workflow:read': C.WORKFLOW_READ,
  'workflow:manage': C.WORKFLOW_MANAGE,

  portal: C.PORTAL_ACCESS,
  'portal:access': C.PORTAL_ACCESS,

  'compliance:reports': C.COMPLIANCE_REPORTS,
};

const CANONICAL_CAPABILITIES: ReadonlySet<string> = new Set(Object.values(PermissionCategory));

/**
 * Resolve a canonical capability or a legacy key to its canonical capability.
 * Returns null when the key has no canonical equivalent (callers must deny).
 */
export function resolveCapability(permission: string): PermissionCategory | null {
  if (Object.prototype.hasOwnProperty.call(LEGACY_PERMISSION_ALIASES, permission)) {
    return LEGACY_PERMISSION_ALIASES[permission];
  }
  return CANONICAL_CAPABILITIES.has(permission) ? (permission as PermissionCategory) : null;
}
