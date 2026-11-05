import { CANONICAL_ROLES, PermissionCategory, type UserRole } from '@/types/rbac';
import { can, isCanonicalRole } from './access';

/**
 * One access policy per protected path. The route guard, the sidebar and the
 * manifest all read this table, so they cannot disagree.
 *
 * A path is allowed for a role when:
 *   - the role is listed in `roles`, and
 *   - when `capability` is set, the role holds it in the matrix (rbac.ts).
 *
 * Paths match on whole segments and the longest policy wins, so `/laboratory/automation`
 * has its own entry and `/patients/123` falls under `/patients`.
 *
 * Entries without a `capability` are gated by role scope only. They have no
 * canonical capability in rbac.ts yet. Those are listed in `ROLE_SCOPE_ONLY_PATHS`
 * and need a product or security decision before they gain one.
 */
export interface RoutePolicy {
  readonly path: string;
  readonly roles: readonly UserRole[];
  readonly capability?: PermissionCategory;
}

const ALL: readonly UserRole[] = CANONICAL_ROLES;
const ADMIN_ONLY: readonly UserRole[] = ['admin'];
const ADMIN_DOCTOR: readonly UserRole[] = ['admin', 'doctor'];
const ADMIN_DOCTOR_NURSE: readonly UserRole[] = ['admin', 'doctor', 'nurse'];
const ADMIN_PHARMACIST: readonly UserRole[] = ['admin', 'pharmacist'];
const ADMIN_RECEPTIONIST: readonly UserRole[] = ['admin', 'receptionist'];
const ADMIN_NURSE: readonly UserRole[] = ['admin', 'nurse'];
const ADMIN_LAB: readonly UserRole[] = ['admin', 'lab_technician'];
const FRONT_DESK_CLINICAL: readonly UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist'];
const LAB_VIEWERS: readonly UserRole[] = ['admin', 'doctor', 'nurse', 'lab_technician'];
const WORKFLOW_ROLES: readonly UserRole[] = [
  'admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_technician',
];
const DISCHARGE_ROLES: readonly UserRole[] = [
  'admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
];
const PATIENT: readonly UserRole[] = ['patient'];

const C = PermissionCategory;

export const ROUTE_POLICIES: readonly RoutePolicy[] = [
  // Core operations
  { path: '/dashboard', roles: ALL },
  { path: '/profile', roles: ALL },
  { path: '/patients', roles: FRONT_DESK_CLINICAL, capability: C.PATIENT_READ },
  { path: '/appointments', roles: FRONT_DESK_CLINICAL, capability: C.APPOINTMENT_READ },
  { path: '/queue', roles: FRONT_DESK_CLINICAL, capability: C.QUEUE_READ },
  { path: '/nurse/protocols', roles: ADMIN_NURSE },
  { path: '/scheduling', roles: ['admin', 'doctor', 'receptionist'], capability: C.APPOINTMENT_READ },
  { path: '/scheduler', roles: ADMIN_RECEPTIONIST, capability: C.APPOINTMENT_READ },
  { path: '/receptionist/smart-scheduler', roles: ADMIN_RECEPTIONIST, capability: C.APPOINTMENT_READ },
  { path: '/documents', roles: FRONT_DESK_CLINICAL },
  { path: '/hospital/role-setup', roles: ADMIN_ONLY, capability: C.STAFF_INVITE },
  { path: '/hospital/doctor/dashboard', roles: ['doctor'] },
  { path: '/hospital/pharmacy/queue', roles: ['pharmacist'] },
  { path: '/hospital/nurse/medications', roles: ['nurse'] },

  // Clinical care
  { path: '/consultations', roles: ADMIN_DOCTOR_NURSE, capability: C.CONSULTATION_READ },
  { path: '/consultations/mobile', roles: ADMIN_DOCTOR },
  { path: '/telemedicine', roles: ADMIN_DOCTOR_NURSE },
  { path: '/voice-clinical-notes', roles: ADMIN_DOCTOR_NURSE },
  { path: '/messages', roles: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician'] },
  { path: '/workflow/discharge', roles: DISCHARGE_ROLES },
  { path: '/workflow/optimization', roles: WORKFLOW_ROLES },
  { path: '/integration/workflow', roles: WORKFLOW_ROLES },

  // Pharmacy and inventory
  { path: '/pharmacy', roles: ADMIN_PHARMACIST, capability: C.PHARMACY_READ },
  { path: '/pharmacy/clinical', roles: ADMIN_PHARMACIST },
  { path: '/inventory', roles: ADMIN_PHARMACIST, capability: C.INVENTORY_READ },
  { path: '/suppliers', roles: ADMIN_PHARMACIST },

  // Laboratory and radiology
  { path: '/laboratory', roles: LAB_VIEWERS, capability: C.LAB_READ },
  { path: '/laboratory/automation', roles: ADMIN_LAB },
  { path: '/radiology', roles: LAB_VIEWERS, capability: C.LAB_READ },

  // AI tools (role scope only, see ROLE_SCOPE_ONLY_PATHS)
  { path: '/ai-demo', roles: ADMIN_DOCTOR },
  { path: '/differential-diagnosis', roles: ADMIN_DOCTOR },
  { path: '/treatment-recommendations', roles: ADMIN_DOCTOR },
  { path: '/treatment-plan-optimization', roles: ADMIN_DOCTOR },
  { path: '/predictive-analytics', roles: ADMIN_DOCTOR },
  { path: '/length-of-stay-forecasting', roles: ADMIN_DOCTOR },
  { path: '/resource-utilization-optimization', roles: ADMIN_DOCTOR },

  // Business operations
  { path: '/billing', roles: ADMIN_RECEPTIONIST, capability: C.BILLING_READ },
  { path: '/kiosk', roles: ADMIN_RECEPTIONIST, capability: C.PATIENT_READ },
  { path: '/reports', roles: ADMIN_ONLY, capability: C.REPORTS_READ },

  // Administration
  { path: '/settings', roles: ADMIN_ONLY, capability: C.HOSPITAL_SETTINGS },
  { path: '/settings/staff', roles: ADMIN_ONLY, capability: C.STAFF_MANAGE },
  { path: '/settings/performance', roles: ADMIN_ONLY, capability: C.STAFF_READ },
  { path: '/settings/activity', roles: ADMIN_ONLY, capability: C.ACTIVITY_LOGS_READ },
  { path: '/settings/monitoring', roles: ADMIN_ONLY, capability: C.SYSTEM_MAINTENANCE },
  { path: '/settings/health', roles: ADMIN_ONLY, capability: C.SYSTEM_MAINTENANCE },
  { path: '/settings/audit-logs', roles: ADMIN_ONLY, capability: C.AUDIT_LOGS },
  { path: '/testing', roles: ADMIN_ONLY },

  // Patient portal
  { path: '/patient/portal', roles: PATIENT, capability: C.PORTAL_ACCESS },
  { path: '/patient/messages', roles: PATIENT, capability: C.PORTAL_ACCESS },
  { path: '/patient/medical-history', roles: PATIENT, capability: C.PORTAL_ACCESS },
  { path: '/patient/appointments', roles: PATIENT, capability: C.APPOINTMENT_READ },
  { path: '/patient/prescriptions', roles: PATIENT, capability: C.PRESCRIPTION_READ },
  { path: '/patient/lab-results', roles: PATIENT, capability: C.LAB_READ },
];

/** Every policy must name only canonical roles. Checked at module load and in tests. */
export const ROUTE_POLICY_INVALID_ROLES: readonly string[] = ROUTE_POLICIES.flatMap((policy) =>
  policy.roles.filter((role) => !isCanonicalRole(role)).map((role) => `${policy.path}:${role}`)
);

const POLICIES_BY_LENGTH: readonly RoutePolicy[] = [...ROUTE_POLICIES].sort(
  (left, right) => right.path.length - left.path.length
);

/** Policy for a pathname, matched on whole segments with the longest path winning. */
export function findRoutePolicy(pathname: string): RoutePolicy | undefined {
  return POLICIES_BY_LENGTH.find(
    (policy) => pathname === policy.path || pathname.startsWith(`${policy.path}/`)
  );
}

export interface RouteDecision {
  readonly allowed: boolean;
  readonly denyReason?: string;
}

/**
 * Single decision for route guards and navigation. `role` is the acting role
 * (see `resolveActingRole`). Paths with no policy are denied.
 */
export function decideRouteAccess(pathname: string, role: string | null | undefined): RouteDecision {
  const policy = findRoutePolicy(pathname);
  if (!policy) {
    return { allowed: false, denyReason: 'No access policy is defined for this route.' };
  }
  if (!isCanonicalRole(role) || !policy.roles.includes(role)) {
    return {
      allowed: false,
      denyReason: `Access denied. Required roles: ${policy.roles.join(', ')}`,
    };
  }
  if (policy.capability && !can(role, policy.capability)) {
    return { allowed: false, denyReason: `Permission denied: ${policy.capability}` };
  }
  return { allowed: true };
}

/** Roles a path lists in its policy. Used to derive navigation metadata. */
export function policyRolesFor(pathname: string): readonly UserRole[] {
  return findRoutePolicy(pathname)?.roles ?? [];
}

/**
 * Concrete routes a role may open, derived from the same policy table.
 * Parameterised policy paths are skipped. Missing role returns ['/'].
 */
export function accessibleRoutes(role: string | null | undefined): string[] {
  if (!role) return ['/'];
  return ROUTE_POLICIES.filter(
    (policy) => !policy.path.includes(':') && decideRouteAccess(policy.path, role).allowed
  ).map((policy) => policy.path);
}

/** Paths gated by role scope only, because rbac.ts has no capability for them. */
export const ROLE_SCOPE_ONLY_PATHS: readonly string[] = ROUTE_POLICIES.filter(
  (policy) => !policy.capability
).map((policy) => policy.path);
