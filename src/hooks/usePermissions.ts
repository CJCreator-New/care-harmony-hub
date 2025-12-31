import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

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
