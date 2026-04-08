/**
 * T-P01: Permissions Matrix Unit Tests
 * Tests hasPermission, hasAnyPermission, hasAllPermissions, getAccessibleRoutes
 * from the real @/lib/permissions module (pure TypeScript — no external deps).
 *
 * Pyramid layer: UNIT (70%)
 * F.I.R.S.T.: Fast (<1ms), Isolated, Repeatable, Self-validating, Timely
 */
import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAccessibleRoutes,
} from '@/lib/permissions';

describe('hasPermission', () => {
  it('returns false for undefined role', () => {
    expect(hasPermission(undefined, 'patients')).toBe(false);
  });

  it('admin wildcard grants every permission', () => {
    expect(hasPermission('admin', 'patients')).toBe(true);
    expect(hasPermission('admin', 'billing:write')).toBe(true);
    expect(hasPermission('admin', 'lab:read')).toBe(true);
    expect(hasPermission('admin', 'portal')).toBe(true);
  });

  it('doctor can write consultations and prescriptions', () => {
    expect(hasPermission('doctor', 'consultations:write')).toBe(true);
    expect(hasPermission('doctor', 'prescriptions:write')).toBe(true);
  });

  it('doctor cannot access pharmacy:write', () => {
    expect(hasPermission('doctor', 'pharmacy:write')).toBe(false);
  });

  it('nurse can write vitals but not prescriptions', () => {
    expect(hasPermission('nurse', 'vitals:write')).toBe(true);
    expect(hasPermission('nurse', 'prescriptions:write')).toBe(false);
  });

  it('receptionist can write appointments but not prescriptions', () => {
    expect(hasPermission('receptionist', 'appointments:write')).toBe(true);
    expect(hasPermission('receptionist', 'prescriptions:write')).toBe(false);
  });

  it('pharmacist can manage inventory and pharmacy', () => {
    expect(hasPermission('pharmacist', 'inventory:write')).toBe(true);
    expect(hasPermission('pharmacist', 'pharmacy:write')).toBe(true);
  });

  it('pharmacist cannot write consultations', () => {
    expect(hasPermission('pharmacist', 'consultations:write')).toBe(false);
  });

  it('lab_technician can read/write lab orders and samples', () => {
    expect(hasPermission('lab_technician', 'lab:write')).toBe(true);
    expect(hasPermission('lab_technician', 'lab-orders')).toBe(true);
    expect(hasPermission('lab_technician', 'samples')).toBe(true);
  });

  it('lab_technician cannot write prescriptions or pharmacy', () => {
    expect(hasPermission('lab_technician', 'prescriptions:write')).toBe(false);
    expect(hasPermission('lab_technician', 'pharmacy:write')).toBe(false);
  });

  it('patient can only access portal and read-only clinical data', () => {
    expect(hasPermission('patient', 'portal')).toBe(true);
    expect(hasPermission('patient', 'appointments:read')).toBe(true);
    expect(hasPermission('patient', 'appointments:write')).toBe(false);
    expect(hasPermission('patient', 'prescriptions:write')).toBe(false);
  });

  it('wildcard base permission grants child read/write (doctor has "patients")', () => {
    // 'patients' in doctor perms should cover 'patients:read' and 'patients:write'
    expect(hasPermission('doctor', 'patients:read')).toBe(true);
    expect(hasPermission('doctor', 'patients:write')).toBe(true);
  });

  it('returns false for unknown role', () => {
    expect(hasPermission('unknown_role', 'patients')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true if at least one permission matches', () => {
    expect(hasAnyPermission('nurse', ['pharmacy:write', 'vitals:write'])).toBe(true);
  });

  it('returns false when none of the permissions match', () => {
    expect(hasAnyPermission('patient', ['billing:write', 'pharmacy:write'])).toBe(false);
  });

  it('returns false for undefined role', () => {
    expect(hasAnyPermission(undefined, ['patients', 'appointments'])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when role has all listed permissions', () => {
    expect(hasAllPermissions('doctor', ['consultations:read', 'consultations:write'])).toBe(true);
  });

  it('returns false when role is missing any listed permission', () => {
    expect(hasAllPermissions('nurse', ['vitals:write', 'billing:write'])).toBe(false);
  });

  it('admin passes all-permissions check for any set', () => {
    expect(hasAllPermissions('admin', ['billing:write', 'portal', 'lab:read'])).toBe(true);
  });
});

describe('getAccessibleRoutes', () => {
  it('returns only "/" for undefined role', () => {
    expect(getAccessibleRoutes(undefined)).toEqual(['/']);
  });

  it('admin can access all clinical routes', () => {
    const routes = getAccessibleRoutes('admin');
    expect(routes).toContain('/dashboard');
    expect(routes).toContain('/patients');
    expect(routes).toContain('/pharmacy');
    expect(routes).toContain('/billing');
    expect(routes).toContain('/laboratory');
    expect(routes).toContain('/settings/staff');
    expect(routes).toContain('/ai-demo');
  });

  it('patient route set is limited to portal', () => {
    const routes = getAccessibleRoutes('patient');
    expect(routes).toContain('/patient/portal');
    expect(routes).not.toContain('/patients');
    expect(routes).not.toContain('/billing');
    expect(routes).not.toContain('/pharmacy');
  });

  it('pharmacist routes include pharmacy but not lab automation', () => {
    const routes = getAccessibleRoutes('pharmacist');
    expect(routes).toContain('/pharmacy');
    expect(routes).not.toContain('/lab/automation');
  });

  it('lab_technician routes include lab automation', () => {
    const routes = getAccessibleRoutes('lab_technician');
    expect(routes).toContain('/laboratory/automation');
    expect(routes).not.toContain('/pharmacy');
  });
});
