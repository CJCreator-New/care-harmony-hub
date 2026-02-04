// Enhanced RBAC System for CareSync HIMS
// Implements 9 roles with granular permissions and clear hierarchies

export type UserRole =
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_technician'
  | 'patient';

// Permission Categories
export enum PermissionCategory {
  // Patient Management
  PATIENT_READ = 'patient:read',
  PATIENT_WRITE = 'patient:write',
  PATIENT_DELETE = 'patient:delete',

  // Appointment Management
  APPOINTMENT_READ = 'appointment:read',
  APPOINTMENT_WRITE = 'appointment:write',
  APPOINTMENT_DELETE = 'appointment:delete',
  APPOINTMENT_CHECK_IN = 'appointment:check_in',

  // Consultation Management
  CONSULTATION_READ = 'consultation:read',
  CONSULTATION_WRITE = 'consultation:write',
  CONSULTATION_START = 'consultation:start',

  // Prescription Management
  PRESCRIPTION_READ = 'prescription:read',
  PRESCRIPTION_WRITE = 'prescription:write',
  PRESCRIPTION_DISPENSE = 'prescription:dispense',

  // Lab Management
  LAB_READ = 'lab:read',
  LAB_WRITE = 'lab:write',
  LAB_PROCESS = 'lab:process',
  LAB_UPLOAD_RESULTS = 'lab:upload_results',

  // Pharmacy Management
  PHARMACY_READ = 'pharmacy:read',
  PHARMACY_WRITE = 'pharmacy:write',
  PHARMACY_DISPENSE = 'pharmacy:dispense',
  PHARMACY_INVENTORY = 'pharmacy:inventory',

  // Billing Management
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  BILLING_PROCESS = 'billing:process',
  BILLING_INVOICE = 'billing:invoice',

  // Staff Management
  STAFF_READ = 'staff:read',
  STAFF_WRITE = 'staff:write',
  STAFF_MANAGE = 'staff:manage',
  STAFF_INVITE = 'staff:invite',

  // Settings & Configuration
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  HOSPITAL_SETTINGS = 'hospital:settings',

  // Reports & Analytics
  REPORTS_READ = 'reports:read',
  REPORTS_GENERATE = 'reports:generate',

  // Queue Management
  QUEUE_READ = 'queue:read',
  QUEUE_WRITE = 'queue:write',
  QUEUE_MANAGE = 'queue:manage',

  // Vitals Management
  VITALS_READ = 'vitals:read',
  VITALS_WRITE = 'vitals:write',

  // Inventory Management
  INVENTORY_READ = 'inventory:read',
  INVENTORY_WRITE = 'inventory:write',
  INVENTORY_MANAGE = 'inventory:manage',

  // Telemedicine
  TELEMEDICINE_READ = 'telemedicine:read',
  TELEMEDICINE_WRITE = 'telemedicine:write',

  // Workflow Management
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_MANAGE = 'workflow:manage',

  // Activity Logs
  ACTIVITY_LOGS_READ = 'activity_logs:read',

  // Patient Portal
  PORTAL_ACCESS = 'portal:access',

  // Admin-only Features
  SYSTEM_MAINTENANCE = 'system:maintenance',
  AUDIT_LOGS = 'audit:logs',
  COMPLIANCE_REPORTS = 'compliance:reports',
}

export type Permission = PermissionCategory | string;

// Role Hierarchies and Permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Administrative permissions
    PermissionCategory.STAFF_READ,
    PermissionCategory.STAFF_WRITE,
    PermissionCategory.STAFF_MANAGE,
    PermissionCategory.STAFF_INVITE,
    PermissionCategory.SETTINGS_READ,
    PermissionCategory.SETTINGS_WRITE,
    PermissionCategory.HOSPITAL_SETTINGS,
    PermissionCategory.REPORTS_READ,
    PermissionCategory.REPORTS_GENERATE,
    PermissionCategory.WORKFLOW_READ,
    PermissionCategory.ACTIVITY_LOGS_READ,
    PermissionCategory.SYSTEM_MAINTENANCE,
    PermissionCategory.AUDIT_LOGS,
    PermissionCategory.COMPLIANCE_REPORTS,
    // Full clinical access
    PermissionCategory.PATIENT_READ,
    PermissionCategory.PATIENT_WRITE,
    PermissionCategory.PATIENT_DELETE,
    PermissionCategory.APPOINTMENT_READ,
    PermissionCategory.APPOINTMENT_WRITE,
    PermissionCategory.APPOINTMENT_DELETE,
    PermissionCategory.APPOINTMENT_CHECK_IN,
    PermissionCategory.CONSULTATION_READ,
    PermissionCategory.LAB_READ,
    PermissionCategory.PHARMACY_READ,
    PermissionCategory.PHARMACY_WRITE,
    PermissionCategory.BILLING_READ,
    PermissionCategory.BILLING_WRITE,
    PermissionCategory.BILLING_PROCESS,
    PermissionCategory.BILLING_INVOICE,
    PermissionCategory.QUEUE_READ,
    PermissionCategory.QUEUE_WRITE,
    PermissionCategory.QUEUE_MANAGE,
    PermissionCategory.INVENTORY_READ,
    PermissionCategory.INVENTORY_WRITE,
  ],

  doctor: [
    // Clinical permissions
    PermissionCategory.PATIENT_READ,
    PermissionCategory.PATIENT_WRITE,
    PermissionCategory.APPOINTMENT_READ,
    PermissionCategory.APPOINTMENT_WRITE,
    PermissionCategory.CONSULTATION_READ,
    PermissionCategory.CONSULTATION_WRITE,
    PermissionCategory.CONSULTATION_START,
    PermissionCategory.PRESCRIPTION_READ,
    PermissionCategory.PRESCRIPTION_WRITE,
    PermissionCategory.LAB_READ,
    PermissionCategory.LAB_WRITE,
    PermissionCategory.PHARMACY_READ,
    PermissionCategory.QUEUE_READ,
    PermissionCategory.VITALS_READ,
    PermissionCategory.TELEMEDICINE_READ,
    PermissionCategory.TELEMEDICINE_WRITE,
    PermissionCategory.REPORTS_READ,
    PermissionCategory.SETTINGS_READ,
  ],

  nurse: [
    // Nursing permissions
    PermissionCategory.PATIENT_READ,
    PermissionCategory.PATIENT_WRITE,
    PermissionCategory.APPOINTMENT_READ,
    PermissionCategory.APPOINTMENT_WRITE,
    PermissionCategory.APPOINTMENT_CHECK_IN,
    PermissionCategory.CONSULTATION_READ,
    PermissionCategory.QUEUE_READ,
    PermissionCategory.QUEUE_WRITE,
    PermissionCategory.QUEUE_MANAGE,
    PermissionCategory.VITALS_READ,
    PermissionCategory.VITALS_WRITE,
    PermissionCategory.PHARMACY_READ,
    PermissionCategory.PHARMACY_DISPENSE,
    PermissionCategory.LAB_READ,
    PermissionCategory.INVENTORY_READ,
    PermissionCategory.SETTINGS_READ,
  ],

  receptionist: [
    // Front desk permissions
    PermissionCategory.PATIENT_READ,
    PermissionCategory.PATIENT_WRITE,
    PermissionCategory.APPOINTMENT_READ,
    PermissionCategory.APPOINTMENT_WRITE,
    PermissionCategory.APPOINTMENT_CHECK_IN,
    PermissionCategory.QUEUE_READ,
    PermissionCategory.QUEUE_WRITE,
    PermissionCategory.QUEUE_MANAGE,
    PermissionCategory.BILLING_READ,
    PermissionCategory.BILLING_PROCESS,
    PermissionCategory.BILLING_INVOICE,
    PermissionCategory.SETTINGS_READ,
  ],

  pharmacist: [
    // Pharmacy permissions
    PermissionCategory.PATIENT_READ,
    PermissionCategory.PRESCRIPTION_READ,
    PermissionCategory.PRESCRIPTION_WRITE,
    PermissionCategory.PRESCRIPTION_DISPENSE,
    PermissionCategory.PHARMACY_READ,
    PermissionCategory.PHARMACY_WRITE,
    PermissionCategory.PHARMACY_DISPENSE,
    PermissionCategory.PHARMACY_INVENTORY,
    PermissionCategory.INVENTORY_READ,
    PermissionCategory.INVENTORY_WRITE,
    PermissionCategory.INVENTORY_MANAGE,
    PermissionCategory.CONSULTATION_READ,
    PermissionCategory.SETTINGS_READ,
  ],

  lab_technician: [
    // Lab permissions
    PermissionCategory.PATIENT_READ,
    PermissionCategory.LAB_READ,
    PermissionCategory.LAB_WRITE,
    PermissionCategory.LAB_PROCESS,
    PermissionCategory.LAB_UPLOAD_RESULTS,
    PermissionCategory.CONSULTATION_READ,
    PermissionCategory.SETTINGS_READ,
  ],

  patient: [
    // Patient portal permissions
    PermissionCategory.PORTAL_ACCESS,
    PermissionCategory.APPOINTMENT_READ,
    PermissionCategory.PRESCRIPTION_READ,
    PermissionCategory.LAB_READ,
    PermissionCategory.BILLING_READ,
    PermissionCategory.VITALS_READ,
  ],
};

// Role Hierarchy Levels (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 80,
  doctor: 70,
  nurse: 60,
  receptionist: 50,
  pharmacist: 40,
  lab_technician: 30,
  patient: 10,
};

// Role Display Information
export const ROLE_INFO: Record<UserRole, {
  label: string;
  description: string;
  color: string;
  icon: string;
}> = {
  admin: {
    label: 'Administrator',
    description: 'Hospital administration and staff management',
    color: 'bg-purple-500',
    icon: 'Settings',
  },
  doctor: {
    label: 'Doctor',
    description: 'Patient consultations and medical care',
    color: 'bg-blue-500',
    icon: 'Stethoscope',
  },
  nurse: {
    label: 'Nurse',
    description: 'Patient care and vital monitoring',
    color: 'bg-pink-500',
    icon: 'Heart',
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Appointments and patient coordination',
    color: 'bg-green-500',
    icon: 'UserCheck',
  },
  pharmacist: {
    label: 'Pharmacist',
    description: 'Medication dispensing and inventory',
    color: 'bg-orange-500',
    icon: 'Pill',
  },
  lab_technician: {
    label: 'Lab Technician',
    description: 'Laboratory testing and results',
    color: 'bg-cyan-500',
    icon: 'TestTube2',
  },
  patient: {
    label: 'Patient',
    description: 'Access to personal health records',
    color: 'bg-gray-500',
    icon: 'User',
  },
};

// Permission Checking Functions
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;

  const rolePermissions = ROLE_PERMISSIONS[role] || [];

  // Check exact permission match
  if (rolePermissions.includes(permission)) return true;

  // Check wildcard permissions (e.g., 'patient:read' covers 'patient:*')
  const [category] = permission.split(':');
  const wildcardPermission = `${category}:*` as Permission;
  if (rolePermissions.includes(wildcardPermission)) return true;

  return false;
}

export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

export function canAccessRole(userRole: UserRole, targetRole: UserRole): boolean {
  // Admins can access roles below them
  if (userRole === 'admin') {
    return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY.admin;
  }

  // Users can only access their own role level or below
  return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY[userRole];
}

export function getAccessibleRoutes(role: UserRole): string[] {
  const routes: string[] = ['/dashboard'];

  if (hasPermission(role, PermissionCategory.PATIENT_READ)) routes.push('/patients');
  if (hasPermission(role, PermissionCategory.APPOINTMENT_READ)) routes.push('/appointments');
  if (hasPermission(role, PermissionCategory.CONSULTATION_READ)) routes.push('/consultations');
  if (hasPermission(role, PermissionCategory.PRESCRIPTION_READ)) routes.push('/prescriptions');
  if (hasPermission(role, PermissionCategory.LAB_READ)) routes.push('/laboratory');
  if (hasPermission(role, PermissionCategory.PHARMACY_READ)) routes.push('/pharmacy');
  if (hasPermission(role, PermissionCategory.INVENTORY_READ)) routes.push('/inventory');
  if (hasPermission(role, PermissionCategory.BILLING_READ)) routes.push('/billing');
  if (hasPermission(role, PermissionCategory.REPORTS_READ)) routes.push('/reports');
  if (hasPermission(role, PermissionCategory.QUEUE_READ)) routes.push('/queue');
  if (hasPermission(role, PermissionCategory.TELEMEDICINE_READ)) routes.push('/telemedicine');
  if (hasPermission(role, PermissionCategory.STAFF_READ)) routes.push('/settings/staff');
  if (hasPermission(role, PermissionCategory.SETTINGS_READ)) routes.push('/settings');
  if (hasPermission(role, PermissionCategory.PORTAL_ACCESS)) routes.push('/patient/portal');

  return routes;
}

// Role Validation
export function isValidRole(role: string): role is UserRole {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] || 0;
}

export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}