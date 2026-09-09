import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UnifiedAuthService } from '@/services/unifiedAuthService';
import { PatientRBACManager, PatientPermission } from '@/utils/patientRBACManager';
import { DoctorRBACManager } from '@/utils/doctorRBACManager';
import { NurseRBACManager } from '@/utils/nurseRBACManager';
import { PharmacistRBACManager, PharmacistPermission } from '@/utils/pharmacistRBACManager';
import { ReceptionistRBACManager } from '@/utils/receptionistRBACManager';
import { LabTechRBACManager } from '@/utils/labTechRBACManager';
import { AdminRBACManager } from '@/utils/adminRBACManager';
import { PermissionCategory, hasPermission as checkEnumPermission, UserRole } from '@/types/rbac';
import { hasPermission as checkStringPermission } from '@/lib/permissions';

describe('RBAC-UNIFY: Consolidated Authorization & Boundary Testing (Ticket 15)', () => {
  const canonicalRoles: UserRole[] = [
    'admin',
    'doctor',
    'nurse',
    'receptionist',
    'pharmacist',
    'lab_technician',
    'patient',
  ];

  describe('AC-1: Consistent Permission Resolution via UnifiedAuthService', () => {
    it('resolves permissions consistently across enum categories and string keys', () => {
      // Admin has full patient access
      expect(UnifiedAuthService.hasPermission('admin', PermissionCategory.PATIENT_READ)).toBe(true);
      expect(UnifiedAuthService.hasPermission('admin', 'patients:read')).toBe(true);

      // Doctor has consultation and prescription access
      expect(UnifiedAuthService.hasPermission('doctor', PermissionCategory.CONSULTATION_READ)).toBe(true);
      expect(UnifiedAuthService.hasPermission('doctor', 'consultations:read')).toBe(true);
      expect(UnifiedAuthService.hasPermission('doctor', PermissionCategory.PRESCRIPTION_READ)).toBe(true);

      // Pharmacist has pharmacy dispense access
      expect(UnifiedAuthService.hasPermission('pharmacist', PermissionCategory.PHARMACY_DISPENSE)).toBe(true);
      expect(UnifiedAuthService.hasPermission('pharmacist', 'pharmacy:write')).toBe(true);

      // Lab technician has lab upload results access
      expect(UnifiedAuthService.hasPermission('lab_technician', PermissionCategory.LAB_UPLOAD_RESULTS)).toBe(true);
      expect(UnifiedAuthService.hasPermission('lab_technician', 'lab:write')).toBe(true);
    });

    it('handles hasAllPermissions and hasAnyPermission accurately', () => {
      expect(
        UnifiedAuthService.hasAllPermissions('doctor', [
          PermissionCategory.PATIENT_READ,
          PermissionCategory.CONSULTATION_READ,
        ])
      ).toBe(true);

      expect(
        UnifiedAuthService.hasAllPermissions('doctor', [
          PermissionCategory.PATIENT_READ,
          PermissionCategory.BILLING_READ,
        ])
      ).toBe(false);

      expect(
        UnifiedAuthService.hasAnyPermission('receptionist', [
          PermissionCategory.BILLING_READ,
          PermissionCategory.SYSTEM_MAINTENANCE,
        ])
      ).toBe(true);
    });
  });

  describe('AC-2: Strict Billing Boundary Consistency (ADR-0002 & ADR-0005)', () => {
    const billingPermissions = [
      PermissionCategory.BILLING_READ,
      PermissionCategory.BILLING_WRITE,
      PermissionCategory.BILLING_PROCESS,
      PermissionCategory.BILLING_INVOICE,
      'billing',
      'billing:read',
      'billing:write',
      'billing:process',
      'billing:invoice',
      'invoices:read',
      'invoices:write',
    ];

    it('denies all billing permissions to doctor role across UnifiedAuthService and types/rbac', () => {
      billingPermissions.forEach((perm) => {
        expect(UnifiedAuthService.hasPermission('doctor', perm)).toBe(false);
        expect(checkEnumPermission('doctor', perm as any)).toBe(false);
        expect(checkStringPermission('doctor', perm)).toBe(false);
      });
    });

    it('denies all billing permissions to nurse role across UnifiedAuthService and types/rbac', () => {
      billingPermissions.forEach((perm) => {
        expect(UnifiedAuthService.hasPermission('nurse', perm)).toBe(false);
        expect(checkEnumPermission('nurse', perm as any)).toBe(false);
        expect(checkStringPermission('nurse', perm)).toBe(false);
      });
    });

    it('allows billing permissions to admin and receptionist', () => {
      expect(UnifiedAuthService.hasPermission('admin', PermissionCategory.BILLING_READ)).toBe(true);
      expect(UnifiedAuthService.hasPermission('admin', PermissionCategory.BILLING_INVOICE)).toBe(true);
      expect(UnifiedAuthService.hasPermission('receptionist', PermissionCategory.BILLING_READ)).toBe(true);
      expect(UnifiedAuthService.hasPermission('receptionist', PermissionCategory.BILLING_INVOICE)).toBe(true);
    });
  });

  describe('AC-3: PatientRBACManager Implementation & Scoping', () => {
    it('allows patient portal access for patient and admin, disallows other roles', () => {
      expect(PatientRBACManager.canAccessPatientPortal('patient')).toBe(true);
      expect(PatientRBACManager.canAccessPatientPortal('admin')).toBe(true);
      expect(PatientRBACManager.canAccessPatientPortal('doctor')).toBe(false);
      expect(PatientRBACManager.canAccessPatientPortal('nurse')).toBe(false);
      expect(PatientRBACManager.canAccessPatientPortal('receptionist')).toBe(false);
    });

    it('verifies patient self-service permissions', () => {
      expect(PatientRBACManager.hasPermission('patient', PatientPermission.PORTAL_ACCESS)).toBe(true);
      expect(PatientRBACManager.hasPermission('patient', PatientPermission.APPOINTMENT_READ)).toBe(true);
      expect(PatientRBACManager.hasPermission('patient', PatientPermission.APPOINTMENT_BOOK)).toBe(true);
      expect(PatientRBACManager.hasPermission('patient', PatientPermission.BILLING_READ)).toBe(true);
      expect(PatientRBACManager.hasPermission('patient', PatientPermission.PROFILE_UPDATE)).toBe(true);
    });

    it('strictly enforces own-record access constraint (auth.uid === recordOwnerId)', () => {
      const authUserId = 'pat-uuid-123';
      const ownRecordId = 'pat-uuid-123';
      const foreignRecordId = 'pat-uuid-999';

      expect(PatientRBACManager.canAccessOwnRecord(authUserId, ownRecordId)).toBe(true);
      expect(PatientRBACManager.canAccessOwnRecord(authUserId, foreignRecordId)).toBe(false);
      expect(PatientRBACManager.canAccessOwnRecord(undefined, ownRecordId)).toBe(false);
      expect(PatientRBACManager.canAccessOwnRecord(authUserId, undefined)).toBe(false);

      expect(UnifiedAuthService.canPatientAccessResource(authUserId, ownRecordId)).toBe(true);
      expect(UnifiedAuthService.canPatientAccessResource(authUserId, foreignRecordId)).toBe(false);
    });

    it('blocks clinical and administrative actions for patient', () => {
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('prescribe_medication')).toBe(true);
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('dispense_drug')).toBe(true);
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('billing_write')).toBe(true);
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('settings_write')).toBe(true);
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('lab_process')).toBe(true);
      expect(PatientRBACManager.isClinicalOrAdminActionBlocked('view_profile')).toBe(false);
    });
  });

  describe('AC-4: Parity & ABAC Logging Verification', () => {
    it('verifies abacManager logs access decisions to activity_logs table', () => {
      const abacSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/utils/abacManager.ts'),
        'utf8'
      );
      expect(abacSource).toContain(".from('activity_logs')");
      expect(abacSource).not.toContain(".from('audit_logs').insert");
    });

    it('ensures all 7 canonical roles are recognized without error', () => {
      expect(canonicalRoles.length).toBe(7);
      canonicalRoles.forEach((role) => {
        expect(() => UnifiedAuthService.hasPermission(role, PermissionCategory.PATIENT_READ)).not.toThrow();
      });
    });
  });
});
