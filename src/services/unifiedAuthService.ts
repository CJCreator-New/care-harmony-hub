/**
 * Authorization facade (ADR-0005). Delegates every decision to `@/modules/rbac`.
 * It used to OR two permission models together. It now reads the one matrix in
 * `src/types/rbac.ts`, and the billing boundary (ADR-0002) is enforced by that matrix.
 */
import { CANONICAL_ROLES, can, canAll, canAny, isCanonicalRole } from '@/modules/rbac';

export class UnifiedAuthService {
  static readonly CANONICAL_ROLES = CANONICAL_ROLES;

  /** True when the role is one of the seven canonical roles. */
  static isValidRole(role: string | undefined): boolean {
    return isCanonicalRole(role);
  }

  /** True when the role holds the capability (canonical key or legacy alias). Deny by default. */
  static hasPermission(role: string | undefined, permission: string): boolean {
    return can(role, permission);
  }

  static hasAllPermissions(role: string | undefined, permissions: string[]): boolean {
    return canAll(role, permissions);
  }

  static hasAnyPermission(role: string | undefined, permissions: string[]): boolean {
    return canAny(role, permissions);
  }

  /**
   * Patient self-access: a patient can only access resources where resource.ownerId === patientUserId.
   */
  static canPatientAccessResource(patientUserId: string, resourceOwnerId: string): boolean {
    if (!patientUserId || !resourceOwnerId) return false;
    return patientUserId === resourceOwnerId;
  }
}
