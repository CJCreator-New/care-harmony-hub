import { describe, it, expect, beforeEach } from 'vitest';
import { PharmacistRBACManager } from '@/utils/pharmacistRBACManager';
import { PharmacistPermission } from '@/types/pharmacist';

describe('RBAC-001: PharmacistRBACManager Canonical Role & Permission Validation', () => {
  beforeEach(() => {
    PharmacistRBACManager.clearMockRolesForTesting();
  });

  it('AC-1: rejects non-pharmacist clinical roles (doctor, nurse, receptionist)', async () => {
    PharmacistRBACManager.setMockUserRoleForTesting('user-doctor', 'doctor');
    PharmacistRBACManager.setMockUserRoleForTesting('user-nurse', 'nurse');
    PharmacistRBACManager.setMockUserRoleForTesting('user-receptionist', 'receptionist');

    const doctorCanDispense = await PharmacistRBACManager.checkPermission('user-doctor', 'dispense_medication');
    const nurseCanDispense = await PharmacistRBACManager.checkPermission('user-nurse', 'dispense_medication');
    const receptionistCanDispense = await PharmacistRBACManager.checkPermission('user-receptionist', 'dispense_medication');

    expect(doctorCanDispense).toBe(false);
    expect(nurseCanDispense).toBe(false);
    expect(receptionistCanDispense).toBe(false);
  });

  it('AC-2: permits authenticated pharmacist to dispense medications and verify prescriptions', async () => {
    PharmacistRBACManager.setMockUserRoleForTesting('user-pharmacist', 'pharmacist');

    const canDispense = await PharmacistRBACManager.canDispenseMedication('user-pharmacist');
    const canVerify = await PharmacistRBACManager.canVerifyPrescription('user-pharmacist');
    const hasReceive = await PharmacistRBACManager.checkPermission('user-pharmacist', PharmacistPermission.PRESCRIPTION_RECEIVE);

    expect(canDispense).toBe(true);
    expect(canVerify).toBe(true);
    expect(hasReceive).toBe(true);
  });

  it('AC-3: permits admin role for administrative oversight and configuration', async () => {
    PharmacistRBACManager.setMockUserRoleForTesting('user-admin', 'admin');

    const adminCheck = await PharmacistRBACManager.checkPermission('user-admin', 'inventory_update');
    const adminDispense = await PharmacistRBACManager.canDispenseMedication('user-admin');

    expect(adminCheck).toBe(true);
    expect(adminDispense).toBe(true);
  });

  it('AC-4: systematically evaluates all 7 canonical roles, only pharmacist and admin pass', async () => {
    const roles: Array<{ role: string; expected: boolean }> = [
      { role: 'admin', expected: true },
      { role: 'pharmacist', expected: true },
      { role: 'doctor', expected: false },
      { role: 'nurse', expected: false },
      { role: 'receptionist', expected: false },
      { role: 'lab_technician', expected: false },
      { role: 'patient', expected: false },
    ];

    for (const { role, expected } of roles) {
      const uid = `test-user-${role}`;
      PharmacistRBACManager.setMockUserRoleForTesting(uid, role);
      const result = await PharmacistRBACManager.canDispenseMedication(uid);
      expect(result).toBe(expected);
    }
  });

  it('returns false for undefined, empty, or unknown users', async () => {
    expect(await PharmacistRBACManager.checkPermission('')).toBe(false);
    expect(await PharmacistRBACManager.checkPermission('unknown-random-user')).toBe(false);
  });
});
