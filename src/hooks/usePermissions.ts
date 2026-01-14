import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { abacManager, UserAttributes, ResourceAttributes, EnvironmentAttributes, PermissionRequest } from '@/utils/abacManager';

interface Permissions {
  // Patient Management
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;

  // Appointments
  canViewAppointments: boolean;
  canCreateAppointments: boolean;
  canEditAppointments: boolean;
  canCheckInPatients: boolean;

  // Consultations
  canViewConsultations: boolean;
  canStartConsultation: boolean;
  canRecordVitals: boolean;
  canPrescribe: boolean;
  canOrderLabs: boolean;

  // Pharmacy
  canViewPharmacy: boolean;
  canDispenseMedication: boolean;
  canManageInventory: boolean;

  // Laboratory
  canViewLaboratory: boolean;
  canProcessLabOrders: boolean;
  canUploadResults: boolean;

  // Billing
  canViewBilling: boolean;
  canProcessPayments: boolean;
  canGenerateInvoices: boolean;

  // Staff Management
  canViewStaff: boolean;
  canManageStaff: boolean;
  canInviteStaff: boolean;

  // Settings
  canViewSettings: boolean;
  canManageHospitalSettings: boolean;

  // Reports
  canViewReports: boolean;
  canGenerateReports: boolean;
}

const rolePermissions: Record<UserRole, Partial<Permissions>> = {
  admin: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewAppointments: true,
    canCreateAppointments: true,
    canEditAppointments: true,
    canCheckInPatients: true,
    canViewConsultations: true,
    canStartConsultation: false,
    canRecordVitals: false,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: true,
    canDispenseMedication: false,
    canManageInventory: true,
    canViewLaboratory: true,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: true,
    canProcessPayments: true,
    canGenerateInvoices: true,
    canViewStaff: true,
    canManageStaff: true,
    canInviteStaff: true,
    canViewSettings: true,
    canManageHospitalSettings: true,
    canViewReports: true,
    canGenerateReports: true,
  },
  doctor: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewAppointments: true,
    canCreateAppointments: true,
    canEditAppointments: true,
    canCheckInPatients: false,
    canViewConsultations: true,
    canStartConsultation: true,
    canRecordVitals: true,
    canPrescribe: true,
    canOrderLabs: true,
    canViewPharmacy: true,
    canDispenseMedication: false,
    canManageInventory: false,
    canViewLaboratory: true,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: false,
    canProcessPayments: false,
    canGenerateInvoices: false,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: true,
    canGenerateReports: true,
  },
  nurse: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewAppointments: true,
    canCreateAppointments: true,
    canEditAppointments: true,
    canCheckInPatients: true,
    canViewConsultations: true,
    canStartConsultation: false,
    canRecordVitals: true,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: true,
    canDispenseMedication: false,
    canManageInventory: false,
    canViewLaboratory: true,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: false,
    canProcessPayments: false,
    canGenerateInvoices: false,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: false,
    canGenerateReports: false,
  },
  receptionist: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewAppointments: true,
    canCreateAppointments: true,
    canEditAppointments: true,
    canCheckInPatients: true,
    canViewConsultations: false,
    canStartConsultation: false,
    canRecordVitals: false,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: false,
    canDispenseMedication: false,
    canManageInventory: false,
    canViewLaboratory: false,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: true,
    canProcessPayments: true,
    canGenerateInvoices: true,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: false,
    canGenerateReports: false,
  },
  pharmacist: {
    canViewPatients: true,
    canCreatePatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewAppointments: false,
    canCreateAppointments: false,
    canEditAppointments: false,
    canCheckInPatients: false,
    canViewConsultations: true,
    canStartConsultation: false,
    canRecordVitals: false,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: true,
    canDispenseMedication: true,
    canManageInventory: true,
    canViewLaboratory: false,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: false,
    canProcessPayments: false,
    canGenerateInvoices: false,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: false,
    canGenerateReports: false,
  },
  lab_technician: {
    canViewPatients: true,
    canCreatePatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewAppointments: false,
    canCreateAppointments: false,
    canEditAppointments: false,
    canCheckInPatients: false,
    canViewConsultations: true,
    canStartConsultation: false,
    canRecordVitals: false,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: false,
    canDispenseMedication: false,
    canManageInventory: false,
    canViewLaboratory: true,
    canProcessLabOrders: true,
    canUploadResults: true,
    canViewBilling: false,
    canProcessPayments: false,
    canGenerateInvoices: false,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: false,
    canGenerateReports: false,
  },
  patient: {
    canViewPatients: false,
    canCreatePatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewAppointments: true,
    canCreateAppointments: true,
    canEditAppointments: false,
    canCheckInPatients: false,
    canViewConsultations: true,
    canStartConsultation: false,
    canRecordVitals: false,
    canPrescribe: false,
    canOrderLabs: false,
    canViewPharmacy: false,
    canDispenseMedication: false,
    canManageInventory: false,
    canViewLaboratory: true,
    canProcessLabOrders: false,
    canUploadResults: false,
    canViewBilling: true,
    canProcessPayments: true,
    canGenerateInvoices: false,
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    canViewSettings: true,
    canManageHospitalSettings: false,
    canViewReports: false,
    canGenerateReports: false,
  },
};

const defaultPermissions: Permissions = {
  canViewPatients: false,
  canCreatePatients: false,
  canEditPatients: false,
  canDeletePatients: false,
  canViewAppointments: false,
  canCreateAppointments: false,
  canEditAppointments: false,
  canCheckInPatients: false,
  canViewConsultations: false,
  canStartConsultation: false,
  canRecordVitals: false,
  canPrescribe: false,
  canOrderLabs: false,
  canViewPharmacy: false,
  canDispenseMedication: false,
  canManageInventory: false,
  canViewLaboratory: false,
  canProcessLabOrders: false,
  canUploadResults: false,
  canViewBilling: false,
  canProcessPayments: false,
  canGenerateInvoices: false,
  canViewStaff: false,
  canManageStaff: false,
  canInviteStaff: false,
  canViewSettings: false,
  canManageHospitalSettings: false,
  canViewReports: false,
  canGenerateReports: false,
};

export function usePermissions(): Permissions {
  const { roles } = useAuth();

  // Merge permissions from all roles (OR logic - if any role has permission, grant it)
  const mergedPermissions = { ...defaultPermissions };

  roles.forEach(role => {
    const perms = rolePermissions[role];
    if (perms) {
      Object.keys(perms).forEach(key => {
        const permKey = key as keyof Permissions;
        if (perms[permKey]) {
          mergedPermissions[permKey] = true;
        }
      });
    }
  });

  return mergedPermissions;
}

export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

export function hasAllRoles(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.every(role => userRoles.includes(role));
}

// ABAC-based permission checking
async function checkABACPermission(
  user: any,
  profile: any,
  roles: UserRole[],
  primaryRole: UserRole,
  hospital: any,
  resource: ResourceAttributes,
  action: string,
  environment?: Partial<EnvironmentAttributes>
): Promise<{ allowed: boolean; reason?: string }> {
  if (!user || !profile) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  const userAttributes: UserAttributes = {
    id: user.id,
    roles,
    primaryRole,
    hospitalId: profile.hospital_id,
    department: profile.department || undefined,
    seniority: profile.seniority || undefined,
    clearanceLevel: profile.clearance_level || 'low',
    isActive: profile.is_active !== false,
    lastLoginAt: profile.last_login_at || undefined,
    deviceType: environment?.deviceType,
    location: environment?.location
  };

  const defaultEnvironment: EnvironmentAttributes = {
    time: new Date(),
    ipAddress: environment?.ipAddress,
    userAgent: environment?.userAgent,
    deviceType: environment?.deviceType || 'unknown',
    location: environment?.location || 'unknown',
    isEmergency: environment?.isEmergency || false,
    accessLevel: environment?.accessLevel || 'normal'
  };

  const request: PermissionRequest = {
    user: userAttributes,
    resource,
    action,
    environment: { ...defaultEnvironment, ...environment }
  };

  return await abacManager.evaluateAccess(request);
}

// Enhanced permission checking with both RBAC and ABAC
export function useEnhancedPermissions(): {
  permissions: Permissions;
  checkPermission: (resource: ResourceAttributes, action: string, environment?: Partial<EnvironmentAttributes>) => Promise<{ allowed: boolean; reason?: string }>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
} {
  const { user, profile, hospital, roles, primaryRole } = useAuth();
  const basicPermissions = usePermissions();

  const checkPermission = async (
    resource: ResourceAttributes,
    action: string,
    environment?: Partial<EnvironmentAttributes>
  ): Promise<{ allowed: boolean; reason?: string }> => {
    // First check ABAC (more fine-grained)
    const abacResult = await checkABACPermission(user, profile, roles, primaryRole, hospital, resource, action, environment);
    if (abacResult.allowed) {
      return abacResult;
    }

    // Fallback to basic RBAC permissions for backward compatibility
    const rbacAllowed = checkBasicPermission(action, basicPermissions);
    return {
      allowed: rbacAllowed,
      reason: rbacAllowed ? 'RBAC permission granted' : abacResult.reason
    };
  };

  const hasRole = (role: UserRole): boolean => roles.includes(role);

  const hasAnyRoleFn = (requiredRoles: UserRole[]): boolean => hasAnyRole(roles, requiredRoles);

  const hasAllRolesFn = (requiredRoles: UserRole[]): boolean => hasAllRoles(roles, requiredRoles);

  return {
    permissions: basicPermissions,
    checkPermission,
    hasRole,
    hasAnyRole: hasAnyRoleFn,
    hasAllRoles: hasAllRolesFn
  };
}

// Helper function to map actions to basic permissions
function checkBasicPermission(action: string, permissions: Permissions): boolean {
  const actionMap: Record<string, keyof Permissions> = {
    'view_patients': 'canViewPatients',
    'create_patients': 'canCreatePatients',
    'edit_patients': 'canEditPatients',
    'delete_patients': 'canDeletePatients',
    'view_appointments': 'canViewAppointments',
    'create_appointments': 'canCreateAppointments',
    'edit_appointments': 'canEditAppointments',
    'checkin_patients': 'canCheckInPatients',
    'view_consultations': 'canViewConsultations',
    'start_consultation': 'canStartConsultation',
    'record_vitals': 'canRecordVitals',
    'prescribe': 'canPrescribe',
    'order_labs': 'canOrderLabs',
    'view_pharmacy': 'canViewPharmacy',
    'dispense_medication': 'canDispenseMedication',
    'manage_inventory': 'canManageInventory',
    'view_laboratory': 'canViewLaboratory',
    'process_lab_orders': 'canProcessLabOrders',
    'upload_results': 'canUploadResults',
    'view_billing': 'canViewBilling',
    'process_payments': 'canProcessPayments',
    'generate_invoices': 'canGenerateInvoices',
    'view_staff': 'canViewStaff',
    'manage_staff': 'canManageStaff',
    'invite_staff': 'canInviteStaff',
    'view_settings': 'canViewSettings',
    'manage_hospital_settings': 'canManageHospitalSettings',
    'view_reports': 'canViewReports',
    'generate_reports': 'canGenerateReports'
  };

  const permissionKey = actionMap[action];
  return permissionKey ? permissions[permissionKey] : false;
}
