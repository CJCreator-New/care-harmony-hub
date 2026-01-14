import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abacManager, ABACManager, UserAttributes, ResourceAttributes, EnvironmentAttributes, PermissionRequest } from './abacManager';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('ABACManager', () => {
  let user: UserAttributes;
  let resource: ResourceAttributes;
  let environment: EnvironmentAttributes;

  beforeEach(() => {
    vi.clearAllMocks();

    user = {
      id: 'user-123',
      roles: ['doctor'],
      primaryRole: 'doctor',
      hospitalId: 'hospital-123',
      department: 'cardiology',
      seniority: 5,
      clearanceLevel: 'high',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      deviceType: 'desktop',
      location: 'hospital'
    };

    resource = {
      id: 'patient-456',
      type: 'patient',
      ownerId: 'patient-456',
      hospitalId: 'hospital-123',
      sensitivityLevel: 'confidential',
      department: 'cardiology',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    environment = {
      time: new Date(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceType: 'desktop',
      location: 'hospital',
      isEmergency: false,
      accessLevel: 'normal'
    };
  });

  describe('evaluateAccess', () => {
    it('should allow admin full access', async () => {
      const adminUser = { ...user, roles: ['admin'] };
      const request: PermissionRequest = {
        user: adminUser,
        resource,
        action: 'delete',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('admin-full-access');
    });

    it('should allow doctor access to patient records in same hospital', async () => {
      const request: PermissionRequest = {
        user,
        resource,
        action: 'read',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('doctor-patient-access');
    });

    it('should deny doctor access to patient records in different hospital', async () => {
      const differentHospitalResource = { ...resource, hospitalId: 'hospital-999' };
      const request: PermissionRequest = {
        user,
        resource: differentHospitalResource,
        action: 'read',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(false);
    });

    it('should allow nurse limited access to non-restricted data', async () => {
      const nurseUser = { ...user, roles: ['nurse'] };
      const nonRestrictedResource = { ...resource, sensitivityLevel: 'internal' as const };
      const request: PermissionRequest = {
        user: nurseUser,
        resource: nonRestrictedResource,
        action: 'read',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
    });

    it('should deny nurse access to restricted data', async () => {
      const nurseUser = { ...user, roles: ['nurse'] };
      const restrictedResource = { ...resource, sensitivityLevel: 'restricted' as const };
      const request: PermissionRequest = {
        user: nurseUser,
        resource: restrictedResource,
        action: 'read',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(false);
    });

    it('should allow pharmacist medication access', async () => {
      const pharmacistUser = { ...user, roles: ['pharmacist'] };
      const medicationResource = { ...resource, type: 'prescription' as const };
      const request: PermissionRequest = {
        user: pharmacistUser,
        resource: medicationResource,
        action: 'update',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('pharmacist-medication-access');
    });

    it('should allow patient self-access', async () => {
      const patientUser = { ...user, roles: ['patient'], id: 'patient-456' };
      const request: PermissionRequest = {
        user: patientUser,
        resource,
        action: 'read',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('patient-self-access');
    });

    it('should allow emergency access override', async () => {
      const emergencyEnvironment = { ...environment, isEmergency: true, accessLevel: 'emergency' as const };
      const restrictedResource = { ...resource, sensitivityLevel: 'restricted' as const };
      const request: PermissionRequest = {
        user,
        resource: restrictedResource,
        action: 'read',
        environment: emergencyEnvironment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('emergency-access');
    });

    it('should deny access after hours for restricted data with low clearance', async () => {
      const afterHoursTime = new Date();
      afterHoursTime.setHours(20); // 8 PM

      const lowClearanceUser = { ...user, clearanceLevel: 'low' as const };
      const restrictedResource = { ...resource, sensitivityLevel: 'restricted' as const };
      const afterHoursEnvironment = { ...environment, time: afterHoursTime };

      const request: PermissionRequest = {
        user: lowClearanceUser,
        resource: restrictedResource,
        action: 'read',
        environment: afterHoursEnvironment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(false);
      expect(result.policyId).toBe('after-hours-restriction');
    });

    it('should deny access by default when no policy matches', async () => {
      const unknownUser = { ...user, roles: [] };
      const unknownResource = { ...resource, type: 'unknown' as any };
      const request: PermissionRequest = {
        user: unknownUser,
        resource: unknownResource,
        action: 'unknown',
        environment
      };

      const result = await abacManager.evaluateAccess(request);
      expect(result.allowed).toBe(false);
      expect(result.policyId).toBe('default-deny');
    });
  });

  describe('policy management', () => {
    it('should add custom policies', () => {
      const customPolicy = {
        id: 'custom-policy',
        name: 'Custom Policy',
        description: 'Test custom policy',
        priority: 75,
        conditions: [
          { attribute: 'user' as const, field: 'department', operator: 'equals' as const, value: 'cardiology' }
        ],
        effect: 'allow' as const,
        enabled: true
      };

      abacManager.addPolicy(customPolicy);
      const policies = abacManager.getPolicies();
      expect(policies.some(p => p.id === 'custom-policy')).toBe(true);
    });

    it('should remove policies', () => {
      abacManager.removePolicy('custom-policy');
      const policies = abacManager.getPolicies();
      expect(policies.some(p => p.id === 'custom-policy')).toBe(false);
    });

    it('should enable/disable policies', () => {
      abacManager.setPolicyEnabled('doctor-patient-access', false);
      // Policy should be disabled but still exist
      const policies = abacManager.getPolicies();
      const policy = policies.find(p => p.id === 'doctor-patient-access');
      expect(policy?.enabled).toBe(false);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate equals condition', () => {
      const manager = ABACManager.getInstance() as any;
      const request: PermissionRequest = { user, resource, action: 'read', environment };

      const condition = { attribute: 'user' as const, field: 'hospitalId', operator: 'equals' as const, value: 'hospital-123' };
      const result = manager.evaluateCondition(condition, request);
      expect(result).toBe(true);
    });

    it('should evaluate contains condition', () => {
      const manager = ABACManager.getInstance() as any;
      const request: PermissionRequest = { user, resource, action: 'read', environment };

      const condition = { attribute: 'user' as const, field: 'roles', operator: 'contains' as const, value: 'doctor' };
      const result = manager.evaluateCondition(condition, request);
      expect(result).toBe(true);
    });

    it('should evaluate in condition', () => {
      const manager = ABACManager.getInstance() as any;
      const request: PermissionRequest = { user, resource, action: 'read', environment };

      const condition = { attribute: 'resource' as const, field: 'type', operator: 'in' as const, value: ['patient', 'consultation'] };
      const result = manager.evaluateCondition(condition, request);
      expect(result).toBe(true);
    });

    it('should evaluate time-based condition', () => {
      const manager = ABACManager.getInstance() as any;
      const afterHoursTime = new Date();
      afterHoursTime.setHours(22); // 10 PM
      const afterHoursEnvironment = { ...environment, time: afterHoursTime };
      const request: PermissionRequest = { user, resource, action: 'read', environment: afterHoursEnvironment };

      const condition = { attribute: 'environment' as const, field: 'time', operator: 'matches' as const, value: 'after_hours' };
      const result = manager.evaluateCondition(condition, request);
      expect(result).toBe(true);
    });
  });
});