import { describe, it, expect } from 'vitest';
import { PermissionCategory, ROLE_HIERARCHY } from '@/types/rbac';
import { can, canAll, canAny, hasAnyRole, grantedCapabilities } from '@/modules/rbac';

// Admin-panel behaviour, asserted through the canonical RBAC module (ADR-0005).

describe('Admin RBAC (canonical module)', () => {
  it('admin holds staff, settings, report and audit capabilities', () => {
    expect(can('admin', PermissionCategory.STAFF_MANAGE)).toBe(true);
    expect(can('admin', PermissionCategory.STAFF_WRITE)).toBe(true);
    expect(can('admin', PermissionCategory.SETTINGS_WRITE)).toBe(true);
    expect(can('admin', PermissionCategory.HOSPITAL_SETTINGS)).toBe(true);
    expect(can('admin', PermissionCategory.AUDIT_LOGS)).toBe(true);
    expect(can('admin', PermissionCategory.REPORTS_GENERATE)).toBe(true);
  });

  it('clinical staff hold no admin capabilities', () => {
    expect(can('doctor', PermissionCategory.STAFF_MANAGE)).toBe(false);
    expect(can('nurse', PermissionCategory.REPORTS_GENERATE)).toBe(false);
    expect(can('patient', PermissionCategory.HOSPITAL_SETTINGS)).toBe(false);
    expect(can('nurse', PermissionCategory.AUDIT_LOGS)).toBe(false);
  });

  it('only admin is an admin-panel role', () => {
    expect(hasAnyRole('admin', ['admin'])).toBe(true);
    for (const role of ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient']) {
      expect(hasAnyRole(role, ['admin'])).toBe(false);
    }
  });

  it('denies undefined, null and unknown roles', () => {
    expect(can(undefined, PermissionCategory.STAFF_MANAGE)).toBe(false);
    expect(can(null, PermissionCategory.STAFF_MANAGE)).toBe(false);
    expect(can('invalid_role', PermissionCategory.STAFF_MANAGE)).toBe(false);
    expect(hasAnyRole(undefined, ['admin'])).toBe(false);
  });

  it('canAny / canAll combine capabilities correctly', () => {
    const adminCaps = [PermissionCategory.STAFF_MANAGE, PermissionCategory.SYSTEM_MAINTENANCE];
    expect(canAny('admin', adminCaps)).toBe(true);
    expect(canAny('doctor', adminCaps)).toBe(false);
    expect(canAll('admin', adminCaps)).toBe(true);
    expect(canAll('admin', [PermissionCategory.STAFF_MANAGE, PermissionCategory.PATIENT_WRITE])).toBe(true);
    expect(canAll('doctor', [PermissionCategory.PATIENT_WRITE, PermissionCategory.STAFF_MANAGE])).toBe(false);
  });

  it('empty capability lists: any is false, all is true', () => {
    expect(canAny('admin', [])).toBe(false);
    expect(canAll('admin', [])).toBe(true);
  });

  it('admin has more granted capabilities than doctor and nurse', () => {
    const admin = grantedCapabilities('admin').length;
    expect(admin).toBeGreaterThan(0);
    expect(admin).toBeGreaterThan(grantedCapabilities('doctor').length);
    expect(admin).toBeGreaterThan(grantedCapabilities('nurse').length);
  });

  it('role hierarchy: admin outranks clinical roles, patient is lowest', () => {
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.doctor);
    expect(ROLE_HIERARCHY.doctor).toBeGreaterThan(ROLE_HIERARCHY.nurse);
    expect(Math.min(...Object.values(ROLE_HIERARCHY))).toBe(ROLE_HIERARCHY.patient);
  });
});
