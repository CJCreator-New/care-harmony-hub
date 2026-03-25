/**
 * Permission System Validation Tests
 * Verifies that the hasPermission() function correctly handles wildcard
 * and sub-permission inheritance for all roles.
 * 
 * @group permissions
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '@/lib/permissions';

describe('Permission System Validation', () => {
  
  describe('hasPermission() - Basic Functionality', () => {
    
    it('should return false for undefined role', () => {
      expect(hasPermission(undefined, 'patients')).toBe(false);
      expect(hasPermission(undefined, 'patients:read')).toBe(false);
    });

    it('should return false for non-existent role', () => {
      expect(hasPermission('invalid_role_xyz', 'patients')).toBe(false);
    });

    it('should grant admin full access via wildcard', () => {
      expect(hasPermission('admin', 'patients')).toBe(true);
      expect(hasPermission('admin', 'anything:really')).toBe(true);
      expect(hasPermission('admin', 'fake:permission')).toBe(true);
    });
  });

  describe('hasPermission() - Base Permission Inheritance', () => {
    
    it('receptionist should have appointments base permission (includes :read and :write)', () => {
      expect(hasPermission('receptionist', 'appointments')).toBe(true);
      expect(hasPermission('receptionist', 'appointments:read')).toBe(true);
      expect(hasPermission('receptionist', 'appointments:write')).toBe(true);
    });

    it('receptionist should NOT have appointments:delete (not in permissions)', () => {
      expect(hasPermission('receptionist', 'appointments:delete')).toBe(false);
    });

    it('receptionist should have patients base permission', () => {
      expect(hasPermission('receptionist', 'patients')).toBe(true);
      expect(hasPermission('receptionist', 'patients:read')).toBe(true);
      expect(hasPermission('receptionist', 'patients:write')).toBe(true);
    });

    it('receptionist should NOT have prescriptions (not in permissions)', () => {
      expect(hasPermission('receptionist', 'prescriptions')).toBe(false);
      expect(hasPermission('receptionist', 'prescriptions:read')).toBe(false);
    });

    it('receptionist should have queue base permission', () => {
      expect(hasPermission('receptionist', 'queue')).toBe(true);
      expect(hasPermission('receptionist', 'queue:read')).toBe(true);
      expect(hasPermission('receptionist', 'queue:write')).toBe(true);
    });

    it('receptionist should have billing:read (limited)', () => {
      expect(hasPermission('receptionist', 'billing:read')).toBe(true);
      expect(hasPermission('receptionist', 'billing:write')).toBe(false);
      // Base permission 'billing' should be accessible because role has 'billing:read'
      expect(hasPermission('receptionist', 'billing')).toBe(true);
    });
  });

  describe('hasPermission() - Doctor Permissions', () => {
    
    it('doctor should have patients permissions', () => {
      expect(hasPermission('doctor', 'patients')).toBe(true);
      expect(hasPermission('doctor', 'patients:read')).toBe(true);
      expect(hasPermission('doctor', 'patients:write')).toBe(true);
    });

    it('doctor should have consultations', () => {
      expect(hasPermission('doctor', 'consultations')).toBe(true);
      expect(hasPermission('doctor', 'consultations:read')).toBe(true);
      expect(hasPermission('doctor', 'consultations:write')).toBe(true);
    });

    it('doctor should have prescriptions', () => {
      expect(hasPermission('doctor', 'prescriptions')).toBe(true);
      expect(hasPermission('doctor', 'prescriptions:write')).toBe(true);
    });

    it('doctor should have lab readonly', () => {
      expect(hasPermission('doctor', 'lab')).toBe(true);
      expect(hasPermission('doctor', 'lab:read')).toBe(true);
      expect(hasPermission('doctor', 'lab:write')).toBe(true);
    });

    it('doctor should NOT have pharmacy', () => {
      expect(hasPermission('doctor', 'pharmacy')).toBe(false);
      expect(hasPermission('doctor', 'pharmacy:read')).toBe(false);
    });

    it('doctor should have queue readonly', () => {
      expect(hasPermission('doctor', 'queue:read')).toBe(true);
      expect(hasPermission('doctor', 'queue:write')).toBe(false);
      // Base 'queue' should require explicit mapping, but doctor has only :read
      expect(hasPermission('doctor', 'queue')).toBe(true); // Due to :read subpermission
    });
  });

  describe('hasPermission() - Nurse Permissions', () => {
    
    it('nurse should have patients readonly', () => {
      expect(hasPermission('nurse', 'patients:read')).toBe(true);
      expect(hasPermission('nurse', 'patients:write')).toBe(false);
    });

    it('nurse should have queue full access', () => {
      expect(hasPermission('nurse', 'queue')).toBe(true);
      expect(hasPermission('nurse', 'queue:read')).toBe(true);
      expect(hasPermission('nurse', 'queue:write')).toBe(true);
    });

    it('nurse should have vitals full access', () => {
      expect(hasPermission('nurse', 'vitals')).toBe(true);
      expect(hasPermission('nurse', 'vitals:write')).toBe(true);
    });

    it('nurse should have medications full access', () => {
      expect(hasPermission('nurse', 'medications')).toBe(true);
      expect(hasPermission('nurse', 'medications:write')).toBe(true);
    });

    it('nurse should have consultations readonly', () => {
      expect(hasPermission('nurse', 'consultations:read')).toBe(true);
      expect(hasPermission('nurse', 'consultations:write')).toBe(false);
    });

    it('nurse should NOT have appointments', () => {
      expect(hasPermission('nurse', 'appointments')).toBe(false);
      expect(hasPermission('nurse', 'appointments:read')).toBe(false);
    });
  });

  describe('hasPermission() - Pharmacist Permissions', () => {
    
    it('pharmacist should have pharmacy full access', () => {
      expect(hasPermission('pharmacist', 'pharmacy')).toBe(true);
      expect(hasPermission('pharmacist', 'pharmacy:write')).toBe(true);
    });

    it('pharmacist should have prescriptions full access', () => {
      expect(hasPermission('pharmacist', 'prescriptions')).toBe(true);
      expect(hasPermission('pharmacist', 'prescriptions:write')).toBe(true);
    });

    it('pharmacist should have inventory full access', () => {
      expect(hasPermission('pharmacist', 'inventory')).toBe(true);
      expect(hasPermission('pharmacist', 'inventory:write')).toBe(true);
    });

    it('pharmacist should have patients readonly', () => {
      expect(hasPermission('pharmacist', 'patients:read')).toBe(true);
      expect(hasPermission('pharmacist', 'patients:write')).toBe(false);
    });

    it('pharmacist should NOT have consultations', () => {
      expect(hasPermission('pharmacist', 'consultations')).toBe(false);
    });
  });

  describe('hasPermission() - Lab Tech Permissions', () => {
    
    it('lab tech should have laboratory full access', () => {
      expect(hasPermission('lab_technician', 'laboratory')).toBe(true);
      expect(hasPermission('lab_technician', 'lab:write')).toBe(true);
    });

    it('lab tech should have lab-orders access', () => {
      expect(hasPermission('lab_technician', 'lab-orders')).toBe(true);
    });

    it('lab tech should have samples access', () => {
      expect(hasPermission('lab_technician', 'samples')).toBe(true);
    });

    it('lab tech should have patients readonly', () => {
      expect(hasPermission('lab_technician', 'patients:read')).toBe(true);
      expect(hasPermission('lab_technician', 'patients:write')).toBe(false);
    });

    it('lab tech should NOT have pharmacy', () => {
      expect(hasPermission('lab_technician', 'pharmacy')).toBe(false);
    });
  });

  describe('hasPermission() - Patient Permissions', () => {
    
    it('patient should have portal access', () => {
      expect(hasPermission('patient', 'portal')).toBe(true);
    });

    it('patient should have appointments readonly', () => {
      expect(hasPermission('patient', 'appointments:read')).toBe(true);
      expect(hasPermission('patient', 'appointments:write')).toBe(false);
    });

    it('patient should have prescriptions readonly', () => {
      expect(hasPermission('patient', 'prescriptions:read')).toBe(true);
      expect(hasPermission('patient', 'prescriptions:write')).toBe(false);
    });

    it('patient should have lab readonly', () => {
      expect(hasPermission('patient', 'lab:read')).toBe(true);
      expect(hasPermission('patient', 'lab:write')).toBe(false);
    });

    it('patient should have vitals readonly', () => {
      expect(hasPermission('patient', 'vitals:read')).toBe(true);
      expect(hasPermission('patient', 'vitals:write')).toBe(false);
    });

    it('patient should NOT have queue, consultations, or pharmacy', () => {
      expect(hasPermission('patient', 'queue')).toBe(false);
      expect(hasPermission('patient', 'consultations')).toBe(false);
      expect(hasPermission('patient', 'pharmacy')).toBe(false);
    });
  });

  describe('Permission Matrix Completeness', () => {
    
    it('all defined roles should have permissions', () => {
      const rolesWithPerms = Object.keys(ROLE_PERMISSIONS);
      expect(rolesWithPerms).toContain('admin');
      expect(rolesWithPerms).toContain('doctor');
      expect(rolesWithPerms).toContain('nurse');
      expect(rolesWithPerms).toContain('receptionist');
      expect(rolesWithPerms).toContain('pharmacist');
      expect(rolesWithPerms).toContain('lab_technician');
      expect(rolesWithPerms).toContain('patient');
    });

    it('each role should have non-empty permission array', () => {
      for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        expect(Array.isArray(permissions)).toBe(true);
        expect(permissions.length).toBeGreaterThan(0);
      }
    });

    it('admin should have wildcard permission for full access', () => {
      const adminPerms = ROLE_PERMISSIONS['admin'];
      expect(adminPerms).toContain('*');
    });
  });

  describe('Sub-Permission Wildcard Testing', () => {
    
    it('base permission grants access to all sub-permission queries', () => {
      // Doctor has 'lab' (base), should grant access to lab:* variants
      expect(hasPermission('doctor', 'lab')).toBe(true);
      expect(hasPermission('doctor', 'lab:read')).toBe(true);
      expect(hasPermission('doctor', 'lab:write')).toBe(true);
      // But not other permissions
      expect(hasPermission('doctor', 'lab:admin')).toBe(false);
    });

    it('specific permission should NOT grant access to other sub-permissions', () => {
      // Doctor has 'queue:read' (specific), should NOT grant queue:write
      expect(hasPermission('doctor', 'queue:read')).toBe(true);
      expect(hasPermission('doctor', 'queue:write')).toBe(false);
      // Doctor has queue:read, so 'queue' base should be true (has subperm)
      expect(hasPermission('doctor', 'queue')).toBe(true);
    });
  });
});
