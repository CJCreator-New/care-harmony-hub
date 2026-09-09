/**
 * Unified Authentication & Authorization Service
 * Single authoritative permission resolution hub consolidating:
 * 1. Categorical Enum Matrix (src/types/rbac.ts)
 * 2. Flat String Permission Registry (src/lib/permissions.ts)
 * 3. Role-specific Managers (Doctor, Nurse, Receptionist, Pharmacist, Patient, Admin)
 * 
 * Enforces Architectural Invariants (ADR-0002, ADR-0005):
 * - Billing Boundary: Doctors and Nurses NEVER have billing permissions.
 * - Patient Boundary: Patients can only access their own records.
 */

import { UserRole, PermissionCategory, ROLE_PERMISSIONS, hasPermission as checkEnumPermission } from '@/types/rbac';
import { hasPermission as checkStringPermission, normalizePermission } from '@/lib/permissions';

export class UnifiedAuthService {
  static readonly CANONICAL_ROLES: UserRole[] = [
    'admin',
    'doctor',
    'nurse',
    'receptionist',
    'pharmacist',
    'lab_technician',
    'patient',
  ];

  /**
   * Validates if a role is one of the 7 canonical roles
   */
  static isValidRole(role: string | undefined): boolean {
    if (!role) return false;
    return this.CANONICAL_ROLES.includes(role as UserRole);
  }
  /**
   * Evaluates if a role has the given permission across both enum categories and flat string keys.
   * Enforces strict billing boundary: Doctors and nurses are denied all billing permissions.
   */
  static hasPermission(role: UserRole | string | undefined, permission: string | PermissionCategory): boolean {
    if (!role) return false;

    // Strict Billing Boundary (ADR-0002 & ADR-0005)
    // Clinical staff (doctor, nurse) must NEVER have access to billing
    const permString = String(permission).toLowerCase();
    if (
      (role === 'doctor' || role === 'nurse') &&
      (permString.startsWith('billing') || permString.includes(':billing') || permString.includes('invoice'))
    ) {
      return false;
    }

    // Check against canonical enum permissions
    const enumResult = checkEnumPermission(role as UserRole, permission as any);
    // Check against normalized string permissions
    const stringResult = checkStringPermission(role as UserRole, permission as string);

    return enumResult || stringResult;
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(
    role: UserRole | string | undefined,
    permissions: Array<string | PermissionCategory>
  ): boolean {
    if (!role) return false;
    return permissions.every((p) => this.hasPermission(role, p));
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(
    role: UserRole | string | undefined,
    permissions: Array<string | PermissionCategory>
  ): boolean {
    if (!role) return false;
    return permissions.some((p) => this.hasPermission(role, p));
  }

  /**
   * Verify patient self-access constraint: Patient can only access resources where resource.ownerId === patientUserId
   */
  static canPatientAccessResource(patientUserId: string, resourceOwnerId: string): boolean {
    if (!patientUserId || !resourceOwnerId) return false;
    return patientUserId === resourceOwnerId;
  }
}
