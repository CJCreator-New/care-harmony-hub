/**
 * T-P01: Permissions Matrix Unit Tests
 * Tests hasPermission, hasAnyPermission, hasAllPermissions, getAccessibleRoutes
 * from @/lib/permissions, which delegates to the single RBAC module (ADR-0005).
 * The matrix is src/types/rbac.ts. There is no admin wildcard (SECF-07).
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

  it('admin has administrative and read access, but no wildcard', () => {
    expect(hasPermission('admin', 'patients')).toBe(true);
    expect(hasPermission('admin', 'billing:write')).toBe(true);
    expect(hasPermission('admin', 'lab:read')).toBe(true);
    expect(hasPermission('admin', 'portal')).toBe(false);
    expect(hasPermission('admin', '*')).toBe(false);
  });

  it('admin cannot perform clinical writes (ADR-0002, ADR-0005)', () => {
    expect(hasPermission('admin', 'prescriptions:write')).toBe(false);
    expect(hasPermission('admin', 'consultations:write')).toBe(false);
  });

  it('doctor can write consultations and prescriptions', () => {
    expect(hasPermission('doctor', 'consultations:write')).toBe(true);
    expect(hasPermission('doctor', 'prescriptions:write')).toBe(true);
  });

  it('doctor cannot dispense or access pharmacy writes', () => {
    expect(hasPermission('doctor', 'pharmacy:write')).toBe(false);
    expect(hasPermission('doctor', 'prescriptions:dispense')).toBe(false);
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

  it('lab_technician can write lab orders', () => {
    expect(hasPermission('lab_technician', 'lab:write')).toBe(true);
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

  it('doctor has read and write on patients (exact matrix entries, no category wildcard)', () => {
    expect(hasPermission('doctor', 'patients:read')).toBe(true);
    expect(hasPermission('doctor', 'patients:write')).toBe(true);
  });

  it('returns false for unknown role', () => {
    expect(hasPermission('unknown_role', 'patients')).toBe(false);
  });

  it('denies unknown permission keys instead of matching by substring', () => {
    expect(hasPermission('doctor', 'patient')).toBe(false);
    expect(hasPermission('nurse', 'lab-orders')).toBe(false);
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

  it('admin fails an all-permissions check that includes a clinical write', () => {
    expect(hasAllPermissions('admin', ['billing:write', 'lab:read'])).toBe(true);
    expect(hasAllPermissions('admin', ['billing:write', 'prescriptions:write'])).toBe(false);
  });
});

describe('getAccessibleRoutes', () => {
  it('returns only "/" for undefined role', () => {
    expect(getAccessibleRoutes(undefined)).toEqual(['/']);
  });

  it('admin can access administrative and business routes', () => {
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
    expect(routes).not.toContain('/laboratory/automation');
  });

  it('lab_technician routes include lab automation', () => {
    const routes = getAccessibleRoutes('lab_technician');
    expect(routes).toContain('/laboratory/automation');
    expect(routes).not.toContain('/pharmacy');
  });
});
