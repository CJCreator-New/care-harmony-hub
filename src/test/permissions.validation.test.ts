/**
 * Permission System Validation Tests
 *
 * Checks role-by-role access against the canonical matrix in src/types/rbac.ts
 * (ADR-0005), through the `@/lib/permissions` facade and the RBAC module.
 * Access is deny by default. There is no admin wildcard and no substring or
 * category-prefix matching (SECF-07).
 *
 * @group permissions
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/lib/permissions';
import { CANONICAL_ROLES, grantedCapabilities } from '@/modules/rbac';

describe('Permission System Validation', () => {
  describe('deny by default', () => {
    it('denies undefined and non-canonical roles', () => {
      expect(hasPermission(undefined, 'patients')).toBe(false);
      expect(hasPermission('invalid_role_xyz', 'patients')).toBe(false);
      expect(hasPermission('super_admin', 'patients:read')).toBe(false);
    });

    it('denies unknown permission keys, including the removed admin wildcard', () => {
      expect(hasPermission('admin', 'anything:really')).toBe(false);
      expect(hasPermission('admin', 'fake:permission')).toBe(false);
    });

    it('gives every canonical role at least one capability in the matrix', () => {
      for (const role of CANONICAL_ROLES) {
        expect(grantedCapabilities(role).length, role).toBeGreaterThan(0);
      }
    });
  });

  describe('receptionist (ADR-0002 front-desk billing)', () => {
    it('has appointments, patients, queue and billing', () => {
      expect(hasPermission('receptionist', 'appointments:read')).toBe(true);
      expect(hasPermission('receptionist', 'appointments:write')).toBe(true);
      expect(hasPermission('receptionist', 'patients:write')).toBe(true);
      expect(hasPermission('receptionist', 'queue:write')).toBe(true);
      expect(hasPermission('receptionist', 'billing:read')).toBe(true);
      expect(hasPermission('receptionist', 'billing:write')).toBe(true);
    });

    it('has no prescriptions', () => {
      expect(hasPermission('receptionist', 'prescriptions:read')).toBe(false);
      expect(hasPermission('receptionist', 'prescriptions:write')).toBe(false);
    });
  });

  describe('doctor', () => {
    it('has patient, consultation and prescription writes', () => {
      expect(hasPermission('doctor', 'patients:write')).toBe(true);
      expect(hasPermission('doctor', 'consultations:write')).toBe(true);
      expect(hasPermission('doctor', 'prescriptions:write')).toBe(true);
    });

    it('has no pharmacy and no billing (ADR-0002)', () => {
      expect(hasPermission('doctor', 'pharmacy:write')).toBe(false);
      expect(hasPermission('doctor', 'billing:read')).toBe(false);
      expect(hasPermission('doctor', 'billing:write')).toBe(false);
    });
  });

  describe('nurse', () => {
    it('has vitals and queue writes, and reads consultations', () => {
      expect(hasPermission('nurse', 'vitals:write')).toBe(true);
      expect(hasPermission('nurse', 'queue:write')).toBe(true);
      expect(hasPermission('nurse', 'consultations:read')).toBe(true);
    });

    it('has no prescription writes and no billing', () => {
      expect(hasPermission('nurse', 'prescriptions:write')).toBe(false);
      expect(hasPermission('nurse', 'billing:read')).toBe(false);
    });
  });

  describe('pharmacist', () => {
    it('has pharmacy, prescription dispensing and inventory', () => {
      expect(hasPermission('pharmacist', 'pharmacy:write')).toBe(true);
      expect(hasPermission('pharmacist', 'prescriptions:write')).toBe(true);
      expect(hasPermission('pharmacist', 'prescriptions:dispense')).toBe(true);
      expect(hasPermission('pharmacist', 'inventory:write')).toBe(true);
    });

    it('has no consultation writes', () => {
      expect(hasPermission('pharmacist', 'consultations:write')).toBe(false);
    });
  });

  describe('lab_technician', () => {
    it('has lab writes and reads patients and consultations', () => {
      expect(hasPermission('lab_technician', 'lab:write')).toBe(true);
      expect(hasPermission('lab_technician', 'patients:read')).toBe(true);
      expect(hasPermission('lab_technician', 'consultations:read')).toBe(true);
    });

    it('has no pharmacy and no prescription writes', () => {
      expect(hasPermission('lab_technician', 'pharmacy:write')).toBe(false);
      expect(hasPermission('lab_technician', 'prescriptions:write')).toBe(false);
    });
  });

  describe('patient', () => {
    it('has portal access and read-only personal data', () => {
      expect(hasPermission('patient', 'portal')).toBe(true);
      expect(hasPermission('patient', 'appointments:read')).toBe(true);
      expect(hasPermission('patient', 'prescriptions:read')).toBe(true);
      expect(hasPermission('patient', 'appointments:write')).toBe(false);
    });

    it('has no queue, consultation or pharmacy access', () => {
      expect(hasPermission('patient', 'queue:read')).toBe(false);
      expect(hasPermission('patient', 'consultations:read')).toBe(false);
      expect(hasPermission('patient', 'pharmacy:read')).toBe(false);
    });
  });

  describe('admin (no clinical writes)', () => {
    it('has administrative and read access', () => {
      expect(hasPermission('admin', 'staff-management')).toBe(true);
      expect(hasPermission('admin', 'settings')).toBe(true);
      expect(hasPermission('admin', 'patients:read')).toBe(true);
    });

    it('has no clinical writes', () => {
      expect(hasPermission('admin', 'prescriptions:write')).toBe(false);
      expect(hasPermission('admin', 'consultations:write')).toBe(false);
    });
  });
});
