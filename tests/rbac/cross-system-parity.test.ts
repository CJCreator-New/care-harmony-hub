import { describe, it, expect } from 'vitest';
import { UnifiedAuthService } from '@/services/unifiedAuthService';
import { PermissionCategory, hasPermission as checkEnumPermission, UserRole } from '@/types/rbac';
import { hasPermission as checkStringPermission } from '@/lib/permissions';
import { PatientRBACManager, PatientPermission } from '@/utils/patientRBACManager';

describe('TEST-GAPS: Cross-System RBAC Parity Regression Suite', () => {
  const canonicalRoles: UserRole[] = [
    'admin',
    'doctor',
    'nurse',
    'receptionist',
    'pharmacist',
    'lab_technician',
    'patient',
  ];

  it('AC-1.1: validates that only 7 canonical roles are recognized', () => {
    expect(canonicalRoles).toHaveLength(7);
    canonicalRoles.forEach((role) => {
      expect(UnifiedAuthService.isValidRole(role)).toBe(true);
    });

    // Legacy or deprecated roles fail
    expect(UnifiedAuthService.isValidRole('super_admin')).toBe(false);
    expect(UnifiedAuthService.isValidRole('guest')).toBe(false);
    expect(UnifiedAuthService.isValidRole(undefined)).toBe(false);
  });

  it('AC-1.2: enforces ADR-0002/ADR-0005 billing lockout parity across all systems for doctor & nurse', () => {
    const clinicalRoles: UserRole[] = ['doctor', 'nurse'];
    const billingPermissions = [
      PermissionCategory.BILLING_READ,
      PermissionCategory.BILLING_WRITE,
      PermissionCategory.BILLING_PROCESS,
      PermissionCategory.BILLING_INVOICE,
    ];

    clinicalRoles.forEach((role) => {
      billingPermissions.forEach((perm) => {
        // UnifiedAuthService must deny
        expect(UnifiedAuthService.hasPermission(role, perm)).toBe(false);
        // permissions.ts must deny
        expect(checkStringPermission(role, perm)).toBe(false);
        // rbac.ts must deny
        expect(checkEnumPermission(role, perm)).toBe(false);
      });
    });
  });

  it('AC-1.3: enforces billing access parity for admin and receptionist', () => {
    expect(UnifiedAuthService.hasPermission('admin', PermissionCategory.BILLING_READ)).toBe(true);
    expect(checkStringPermission('admin', 'billing')).toBe(true);
    expect(checkEnumPermission('admin', PermissionCategory.BILLING_READ)).toBe(true);

    expect(UnifiedAuthService.hasPermission('receptionist', PermissionCategory.BILLING_READ)).toBe(true);
    expect(checkStringPermission('receptionist', 'billing')).toBe(true);
    expect(checkEnumPermission('receptionist', PermissionCategory.BILLING_READ)).toBe(true);
  });

  it('AC-1.4: enforces pharmacy dispense boundary parity', () => {
    // Pharmacist has dispense
    expect(UnifiedAuthService.hasPermission('pharmacist', PermissionCategory.PHARMACY_DISPENSE)).toBe(true);
    expect(checkEnumPermission('pharmacist', PermissionCategory.PHARMACY_DISPENSE)).toBe(true);

    // Doctor & Nurse do not have pharmacy dispense
    expect(UnifiedAuthService.hasPermission('doctor', PermissionCategory.PHARMACY_DISPENSE)).toBe(false);
    expect(checkEnumPermission('doctor', PermissionCategory.PHARMACY_DISPENSE)).toBe(false);

    expect(UnifiedAuthService.hasPermission('nurse', PermissionCategory.PHARMACY_DISPENSE)).toBe(false);
    expect(checkEnumPermission('nurse', PermissionCategory.PHARMACY_DISPENSE)).toBe(false);
  });

  it('AC-1.5: enforces lab technician boundary parity', () => {
    // Lab Tech has lab processing
    expect(UnifiedAuthService.hasPermission('lab_technician', PermissionCategory.LAB_PROCESS)).toBe(true);
    expect(checkEnumPermission('lab_technician', PermissionCategory.LAB_PROCESS)).toBe(true);

    // Lab Tech cannot access prescriptions or billing
    expect(UnifiedAuthService.hasPermission('lab_technician', PermissionCategory.PRESCRIPTION_WRITE)).toBe(false);
    expect(UnifiedAuthService.hasPermission('lab_technician', PermissionCategory.BILLING_WRITE)).toBe(false);
    expect(checkEnumPermission('lab_technician', PermissionCategory.BILLING_WRITE)).toBe(false);
  });

  it('AC-1.6: enforces patient portal confinement parity', () => {
    expect(UnifiedAuthService.hasPermission('patient', PermissionCategory.PORTAL_ACCESS)).toBe(true);
    expect(PatientRBACManager.canAccessPatientPortal('patient')).toBe(true);
    expect(PatientRBACManager.hasPermission('patient', PatientPermission.PORTAL_ACCESS)).toBe(true);

    // Patients cannot access any staff/clinical endpoints
    const staffCategories = [
      PermissionCategory.PATIENT_WRITE,
      PermissionCategory.STAFF_MANAGE,
      PermissionCategory.BILLING_PROCESS,
      PermissionCategory.PRESCRIPTION_WRITE,
      PermissionCategory.LAB_PROCESS,
      PermissionCategory.AUDIT_LOGS,
    ];

    staffCategories.forEach((cat) => {
      expect(UnifiedAuthService.hasPermission('patient', cat)).toBe(false);
      expect(checkEnumPermission('patient', cat)).toBe(false);
    });

    // Patient cannot perform doctor/dispense actions
    expect(PatientRBACManager.isClinicalOrAdminActionBlocked('prescribe_medication')).toBe(true);
    expect(PatientRBACManager.isClinicalOrAdminActionBlocked('dispense_drug')).toBe(true);
  });
});
