/**
 * Patient RBAC Manager
 * Manages access control and self-service permissions for the Patient role.
 * Enforces strict self-scoping: patients can only access and modify their own records.
 */

import { UserRole } from '@/types/auth';

export enum PatientPermission {
  PORTAL_ACCESS = 'portal:access',
  APPOINTMENT_READ = 'appointment:read',
  APPOINTMENT_BOOK = 'appointment:book',
  APPOINTMENT_CANCEL = 'appointment:cancel',
  PRESCRIPTION_READ = 'prescription:read',
  LAB_READ = 'lab:read',
  BILLING_READ = 'billing:read',
  VITALS_READ = 'vitals:read',
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',
}

export const PATIENT_PERMISSIONS: PatientPermission[] = [
  PatientPermission.PORTAL_ACCESS,
  PatientPermission.APPOINTMENT_READ,
  PatientPermission.APPOINTMENT_BOOK,
  PatientPermission.APPOINTMENT_CANCEL,
  PatientPermission.PRESCRIPTION_READ,
  PatientPermission.LAB_READ,
  PatientPermission.BILLING_READ,
  PatientPermission.VITALS_READ,
  PatientPermission.PROFILE_READ,
  PatientPermission.PROFILE_UPDATE,
];

export class PatientRBACManager {
  /**
   * Evaluates if role has patient portal access
   */
  static canAccessPatientPortal(role: UserRole | undefined): boolean {
    return role === 'patient' || role === 'admin';
  }

  /**
   * Checks whether the user has a specific patient permission
   */
  static hasPermission(role: UserRole | undefined, permission: PatientPermission): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    if (role !== 'patient') return false;
    return PATIENT_PERMISSIONS.includes(permission);
  }

  /**
   * Enforces strict HIPAA Self-Access constraint (ADR-0005):
   * Patients may only view or update resources where the record's profile/owner matches their own auth UID.
   */
  static canAccessOwnRecord(authUserId: string | undefined, recordOwnerProfileId: string | undefined): boolean {
    if (!authUserId || !recordOwnerProfileId) return false;
    return authUserId === recordOwnerProfileId;
  }

  /**
   * Verifies that the patient cannot access clinical or administrative screens
   */
  static isClinicalOrAdminActionBlocked(action: string): boolean {
    const blockedKeywords = [
      'prescribe',
      'dispense',
      'staff',
      'consultation_create',
      'billing_write',
      'billing_process',
      'settings_write',
      'inventory',
      'lab_process',
      'lab_upload',
    ];
    const normalized = action.toLowerCase();
    return blockedKeywords.some((keyword) => normalized.includes(keyword));
  }
}
