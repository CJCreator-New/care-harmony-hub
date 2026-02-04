/**
 * Role Interconnection Test Suite
 * 
 * Comprehensive tests for the role interconnection system in CareSync HIMS.
 * Tests cover role hierarchy, permissions, communication paths, workflows, and delegation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateRoleInterconnections,
  validateAllWorkflows,
  getCommunicationPartners,
  getWorkflowPath,
  isValidRoleTransition,
  getRecommendedActions,
  calculateInterconnectionMetrics,
  getRolePermissionSummary,
  getAllRoleSummaries,
  validateRouteProtection,
  generateJSONReport,
  CROSS_ROLE_WORKFLOWS,
  ROLE_COMMUNICATION_MATRIX,
  TASK_DELEGATION_MATRIX,
} from '@/utils/roleInterconnectionValidator';
import {
  UserRole,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_INFO,
  PermissionCategory,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRole,
  canManageRole,
  isValidRole,
  getRoleLevel,
} from '@/types/rbac';

// All defined roles in the system
const ALL_ROLES: UserRole[] = [
  'admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_technician',
  'patient',
];

describe('Role Interconnection System', () => {
  describe('Role Definitions', () => {
    it('should have exactly 7 roles defined', () => {
      expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(7);
      expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(7);
      expect(Object.keys(ROLE_INFO)).toHaveLength(7);
    });

    it('should have all roles defined in ROLE_HIERARCHY', () => {
      ALL_ROLES.forEach(role => {
        expect(ROLE_HIERARCHY[role]).toBeDefined();
        expect(typeof ROLE_HIERARCHY[role]).toBe('number');
      });
    });

    it('should have all roles defined in ROLE_PERMISSIONS', () => {
      ALL_ROLES.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it('should have all roles defined in ROLE_INFO', () => {
      ALL_ROLES.forEach(role => {
        expect(ROLE_INFO[role]).toBeDefined();
        expect(ROLE_INFO[role].label).toBeDefined();
        expect(ROLE_INFO[role].description).toBeDefined();
        expect(ROLE_INFO[role].color).toBeDefined();
        expect(ROLE_INFO[role].icon).toBeDefined();
      });
    });
  });

  describe('Role Hierarchy', () => {
    it('should have admin at the highest level', () => {
      const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY.admin).toBe(maxLevel);
      expect(ROLE_HIERARCHY.admin).toBe(80);
    });

    it('should have patient at the lowest level', () => {
      const minLevel = Math.min(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY.patient).toBe(minLevel);
      expect(ROLE_HIERARCHY.patient).toBe(10);
    });

    it('should have unique hierarchy levels for all roles', () => {
      const levels = Object.values(ROLE_HIERARCHY);
      const uniqueLevels = new Set(levels);
      expect(uniqueLevels.size).toBe(levels.length);
    });

    it('should have correct hierarchy order', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.doctor);
      expect(ROLE_HIERARCHY.doctor).toBeGreaterThan(ROLE_HIERARCHY.nurse);
      expect(ROLE_HIERARCHY.nurse).toBeGreaterThan(ROLE_HIERARCHY.receptionist);
      expect(ROLE_HIERARCHY.receptionist).toBeGreaterThan(ROLE_HIERARCHY.pharmacist);
      expect(ROLE_HIERARCHY.pharmacist).toBeGreaterThan(ROLE_HIERARCHY.lab_technician);
      expect(ROLE_HIERARCHY.lab_technician).toBeGreaterThan(ROLE_HIERARCHY.patient);
    });
  });

  describe('Permission System', () => {
    it('should have admin with most permissions', () => {
      const adminPerms = ROLE_PERMISSIONS.admin.length;
      ALL_ROLES.forEach(role => {
        if (role !== 'admin') {
          expect(adminPerms).toBeGreaterThanOrEqual(ROLE_PERMISSIONS[role].length);
        }
      });
    });

    it('should have patient with fewest permissions', () => {
      const patientPerms = ROLE_PERMISSIONS.patient.length;
      ALL_ROLES.forEach(role => {
        if (role !== 'patient') {
          expect(patientPerms).toBeLessThanOrEqual(ROLE_PERMISSIONS[role].length);
        }
      });
    });

    it('hasPermission should return false for undefined role', () => {
      expect(hasPermission(undefined, PermissionCategory.PATIENT_READ)).toBe(false);
    });

    it('hasAnyPermission should work correctly', () => {
      expect(hasAnyPermission('doctor', [
        PermissionCategory.CONSULTATION_START,
        PermissionCategory.PHARMACY_DISPENSE,
      ])).toBe(true);

      expect(hasAnyPermission('patient', [
        PermissionCategory.STAFF_MANAGE,
        PermissionCategory.SYSTEM_MAINTENANCE,
      ])).toBe(false);
    });

    it('hasAllPermissions should work correctly', () => {
      expect(hasAllPermissions('doctor', [
        PermissionCategory.PATIENT_READ,
        PermissionCategory.CONSULTATION_READ,
      ])).toBe(true);

      expect(hasAllPermissions('patient', [
        PermissionCategory.PATIENT_READ,
        PermissionCategory.PATIENT_WRITE,
      ])).toBe(false);
    });

    it('should give all staff roles settings:read permission', () => {
      const staffRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
      staffRoles.forEach(role => {
        expect(hasPermission(role, PermissionCategory.SETTINGS_READ)).toBe(true);
      });
    });

    it('patient should have portal:access permission', () => {
      expect(hasPermission('patient', PermissionCategory.PORTAL_ACCESS)).toBe(true);
    });
  });

  describe('Role Access Control', () => {
    it('canManageRole should prevent managing higher roles', () => {
      expect(canManageRole('admin', 'doctor')).toBe(true);
      expect(canManageRole('doctor', 'admin')).toBe(false);
    });

    it('isValidRole should validate role strings', () => {
      ALL_ROLES.forEach(role => {
        expect(isValidRole(role)).toBe(true);
      });
      expect(isValidRole('invalid_role')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });

    it('getRoleLevel should return correct levels', () => {
      expect(getRoleLevel('admin')).toBe(80);
      expect(getRoleLevel('patient')).toBe(10);
    });
  });

  describe('Communication Matrix', () => {
    it('should have communication paths defined for all roles', () => {
      ALL_ROLES.forEach(role => {
        expect(ROLE_COMMUNICATION_MATRIX[role]).toBeDefined();
        expect(Array.isArray(ROLE_COMMUNICATION_MATRIX[role])).toBe(true);
      });
    });

    it('admin should be able to communicate with all other roles', () => {
      const otherRoles = ALL_ROLES.filter(r => r !== 'admin');
      otherRoles.forEach(role => {
        expect(ROLE_COMMUNICATION_MATRIX.admin).toContain(role);
      });
    });

    it('doctor and nurse should have bidirectional communication', () => {
      expect(ROLE_COMMUNICATION_MATRIX.doctor).toContain('nurse');
      expect(ROLE_COMMUNICATION_MATRIX.nurse).toContain('doctor');
    });

    it('doctor and pharmacist should have bidirectional communication', () => {
      expect(ROLE_COMMUNICATION_MATRIX.doctor).toContain('pharmacist');
      expect(ROLE_COMMUNICATION_MATRIX.pharmacist).toContain('doctor');
    });

    it('doctor and lab_technician should have bidirectional communication', () => {
      expect(ROLE_COMMUNICATION_MATRIX.doctor).toContain('lab_technician');
      expect(ROLE_COMMUNICATION_MATRIX.lab_technician).toContain('doctor');
    });

    it('getCommunicationPartners should return correct partners', () => {
      const doctorPartners = getCommunicationPartners('doctor');
      expect(doctorPartners.canCommunicateWith).toContain('nurse');
      expect(doctorPartners.canCommunicateWith).toContain('pharmacist');
      expect(doctorPartners.canBeContactedBy).toContain('nurse');
    });

    it('patient should be able to communicate with clinical staff', () => {
      expect(ROLE_COMMUNICATION_MATRIX.patient).toContain('doctor');
      expect(ROLE_COMMUNICATION_MATRIX.patient).toContain('nurse');
      expect(ROLE_COMMUNICATION_MATRIX.patient).toContain('receptionist');
    });
  });

  describe('Task Delegation Matrix', () => {
    it('should have delegation paths defined for all roles', () => {
      ALL_ROLES.forEach(role => {
        expect(TASK_DELEGATION_MATRIX[role]).toBeDefined();
        expect(Array.isArray(TASK_DELEGATION_MATRIX[role])).toBe(true);
      });
    });

    it('higher roles should be able to delegate to lower roles only', () => {
      Object.entries(TASK_DELEGATION_MATRIX).forEach(([fromRole, toRoles]) => {
        const fromLevel = ROLE_HIERARCHY[fromRole as UserRole];
        toRoles.forEach(toRole => {
          const toLevel = ROLE_HIERARCHY[toRole];
          expect(fromLevel).toBeGreaterThan(toLevel);
        });
      });
    });

    it('patient should not be able to delegate to anyone', () => {
      expect(TASK_DELEGATION_MATRIX.patient).toHaveLength(0);
    });

    it('admin should be able to delegate to all staff roles', () => {
      const staffRoles: UserRole[] = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
      staffRoles.forEach(role => {
        expect(TASK_DELEGATION_MATRIX.admin).toContain(role);
      });
    });
  });

  describe('Workflow Validation', () => {
    it('should have all required workflows defined', () => {
      expect(CROSS_ROLE_WORKFLOWS.PATIENT_JOURNEY).toBeDefined();
      expect(CROSS_ROLE_WORKFLOWS.EMERGENCY).toBeDefined();
      expect(CROSS_ROLE_WORKFLOWS.ADMINISTRATIVE).toBeDefined();
      expect(CROSS_ROLE_WORKFLOWS.BILLING).toBeDefined();
      expect(CROSS_ROLE_WORKFLOWS.QA_WORKFLOW).toBeDefined();
    });

    it('validateAllWorkflows should return valid results for all workflows', () => {
      const results = validateAllWorkflows();
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.workflowName).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.steps)).toBe(true);
      });
    });

    it('PATIENT_JOURNEY workflow should have all required steps', () => {
      const workflow = CROSS_ROLE_WORKFLOWS.PATIENT_JOURNEY;
      expect(workflow.steps.length).toBeGreaterThanOrEqual(5);
      
      // Check key steps exist
      const stepActions = workflow.steps.map(s => s.action);
      expect(stepActions).toContain('patient_check_in');
      expect(stepActions).toContain('vitals_complete');
      expect(stepActions).toContain('prescription');
    });

    it('getWorkflowPath should return correct workflow structure', () => {
      const patientJourney = getWorkflowPath('PATIENT_JOURNEY');
      expect(patientJourney.name).toBe('Patient Journey');
      expect(patientJourney.roles.length).toBeGreaterThan(0);
      expect(patientJourney.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Role Transition Validation', () => {

    it('admin should be able to transition to manageable roles', () => {
      const manageableRoles: UserRole[] = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
      manageableRoles.forEach(role => {
        const result = isValidRoleTransition('admin', role);
        expect(result.valid).toBe(true);
      });
    });

    it('operational roles should not be able to transition', () => {
      const operationalRoles: UserRole[] = ['receptionist', 'pharmacist', 'lab_technician', 'patient'];
      operationalRoles.forEach(role => {
        const result = isValidRoleTransition(role, 'doctor');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Recommended Actions', () => {
    it('should return relevant actions for receptionist', () => {
      const actions = getRecommendedActions('receptionist', {});
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.targetRole === 'nurse')).toBe(true);
    });

    it('should return relevant actions for nurse', () => {
      const actions = getRecommendedActions('nurse', {});
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.targetRole === 'doctor')).toBe(true);
    });

    it('should return relevant actions for doctor', () => {
      const actions = getRecommendedActions('doctor', {});
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.targetRole === 'pharmacist')).toBe(true);
      expect(actions.some(a => a.targetRole === 'lab_technician')).toBe(true);
    });

    it('should include priority levels in recommendations', () => {
      const actions = getRecommendedActions('doctor', {});
      actions.forEach(action => {
        expect(['low', 'medium', 'high', 'urgent']).toContain(action.priority);
      });
    });
  });

  describe('Metrics Calculation', () => {
    it('calculateInterconnectionMetrics should return all required metrics', () => {
      const metrics = calculateInterconnectionMetrics();
      expect(metrics.interconnectionCoverage).toBeDefined();
      expect(metrics.permissionConsistency).toBeDefined();
      expect(metrics.workflowCompleteness).toBeDefined();
      expect(metrics.securityCompliance).toBeDefined();
      expect(metrics.overallHealthScore).toBeDefined();
    });

    it('all metrics should be percentages (0-100)', () => {
      const metrics = calculateInterconnectionMetrics();
      expect(metrics.interconnectionCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.interconnectionCoverage).toBeLessThanOrEqual(100);
      expect(metrics.permissionConsistency).toBeGreaterThanOrEqual(0);
      expect(metrics.permissionConsistency).toBeLessThanOrEqual(100);
      expect(metrics.workflowCompleteness).toBeGreaterThanOrEqual(0);
      expect(metrics.workflowCompleteness).toBeLessThanOrEqual(100);
      expect(metrics.securityCompliance).toBeGreaterThanOrEqual(0);
      expect(metrics.securityCompliance).toBeLessThanOrEqual(100);
      expect(metrics.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('workflow completeness should be 100% when all workflows are valid', () => {
      const metrics = calculateInterconnectionMetrics();
      const workflows = validateAllWorkflows();
      const allValid = workflows.every(w => w.valid);
      if (allValid) {
        expect(metrics.workflowCompleteness).toBe(100);
      }
    });
  });

  describe('Role Permission Summary', () => {
    it('getRolePermissionSummary should return complete summary', () => {
      const summary = getRolePermissionSummary('doctor');
      expect(summary.role).toBe('doctor');
      expect(summary.level).toBe(ROLE_HIERARCHY.doctor);
      expect(summary.permissionCount).toBeGreaterThan(0);
      expect(Array.isArray(summary.permissionCategories)).toBe(true);
      expect(Array.isArray(summary.canCommunicateWith)).toBe(true);
      expect(Array.isArray(summary.canDelegateTo)).toBe(true);
      expect(Array.isArray(summary.canReceiveFrom)).toBe(true);
    });

    it('getAllRoleSummaries should return summaries for all roles', () => {
      const summaries = getAllRoleSummaries();
      expect(summaries).toHaveLength(7);
      summaries.forEach(summary => {
        expect(ALL_ROLES).toContain(summary.role);
      });
    });
  });

  describe('Route Protection Validation', () => {
    it('validateRouteProtection should identify missing higher roles', () => {
      const routeConfig = [
        { path: '/patients', allowedRoles: ['admin', 'doctor', 'nurse'] as UserRole[] },
        { path: '/reports', allowedRoles: ['admin'] as UserRole[] },
      ];

      const result = validateRouteProtection(routeConfig);
      expect(result.missingHigherRoles.length).toBe(0);
    });

    it('validateRouteProtection should not flag patient-specific routes', () => {
      const routeConfig = [
        { path: '/patient/portal', allowedRoles: ['patient'] as UserRole[] },
        { path: '/patient/appointments', allowedRoles: ['patient'] as UserRole[] },
      ];

      const result = validateRouteProtection(routeConfig);
      expect(result.missingHigherRoles).toHaveLength(0);
    });

    it('validateRouteProtection should calculate correct score', () => {
      const routeConfig = [
        { path: '/dashboard', allowedRoles: ['admin', 'doctor'] as UserRole[] },
      ];

      const result = validateRouteProtection(routeConfig);
      expect(result.score).toBe(100);
    });
  });

  describe('Report Generation', () => {
    it('generateJSONReport should return complete report structure', () => {
      const report = generateJSONReport() as any;
      
      expect(report.generatedAt).toBeDefined();
      expect(report.version).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.validation).toBeDefined();
      expect(report.roles).toBeDefined();
      expect(report.workflows).toBeDefined();
      expect(report.communicationMatrix).toBeDefined();
      expect(report.delegationMatrix).toBeDefined();
    });

    it('generateJSONReport summary should have correct role count', () => {
      const report = generateJSONReport() as any;
      expect(report.summary.totalRoles).toBe(9);
    });

    it('generateJSONReport should include all roles', () => {
      const report = generateJSONReport() as any;
      expect(report.roles).toHaveLength(7);
    });
  });

  describe('Overall System Validation', () => {
    it('validateRoleInterconnections should return comprehensive result', () => {
      const result = validateRoleInterconnections();
      
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.details).toBeDefined();
      expect(typeof result.details.roleHierarchyValid).toBe('boolean');
      expect(typeof result.details.permissionsConsistent).toBe('boolean');
      expect(typeof result.details.communicationPathsValid).toBe('boolean');
      expect(typeof result.details.workflowPathsValid).toBe('boolean');
      expect(typeof result.details.delegationMatrixValid).toBe('boolean');
    });

    it('role hierarchy should be valid', () => {
      const result = validateRoleInterconnections();
      expect(result.details.roleHierarchyValid).toBe(true);
    });

    it('delegation matrix should be valid', () => {
      const result = validateRoleInterconnections();
      expect(result.details.delegationMatrixValid).toBe(true);
    });

    it('permissions should be consistent', () => {
      const result = validateRoleInterconnections();
      expect(result.details.permissionsConsistent).toBe(true);
    });
  });
});

describe('Role-Specific Tests', () => {
  describe('Doctor Role', () => {
    const role: UserRole = 'doctor';

    it('should have consultation:start permission', () => {
      expect(hasPermission(role, PermissionCategory.CONSULTATION_START)).toBe(true);
    });

    it('should have prescription:write permission', () => {
      expect(hasPermission(role, PermissionCategory.PRESCRIPTION_WRITE)).toBe(true);
    });

    it('should have lab:write permission', () => {
      expect(hasPermission(role, PermissionCategory.LAB_WRITE)).toBe(true);
    });

    it('should have telemedicine:write permission', () => {
      expect(hasPermission(role, PermissionCategory.TELEMEDICINE_WRITE)).toBe(true);
    });

    it('should not have staff:manage permission', () => {
      expect(hasPermission(role, PermissionCategory.STAFF_MANAGE)).toBe(false);
    });
  });

  describe('Nurse Role', () => {
    const role: UserRole = 'nurse';

    it('should have vitals:write permission', () => {
      expect(hasPermission(role, PermissionCategory.VITALS_WRITE)).toBe(true);
    });

    it('should have appointment:check_in permission', () => {
      expect(hasPermission(role, PermissionCategory.APPOINTMENT_CHECK_IN)).toBe(true);
    });

    it('should have queue:manage permission', () => {
      expect(hasPermission(role, PermissionCategory.QUEUE_MANAGE)).toBe(true);
    });

    it('should not have consultation:start permission', () => {
      expect(hasPermission(role, PermissionCategory.CONSULTATION_START)).toBe(false);
    });
  });

  describe('Pharmacist Role', () => {
    const role: UserRole = 'pharmacist';

    it('should have pharmacy:dispense permission', () => {
      expect(hasPermission(role, PermissionCategory.PHARMACY_DISPENSE)).toBe(true);
    });

    it('should have pharmacy:inventory permission', () => {
      expect(hasPermission(role, PermissionCategory.PHARMACY_INVENTORY)).toBe(true);
    });

    it('should have prescription:dispense permission', () => {
      expect(hasPermission(role, PermissionCategory.PRESCRIPTION_DISPENSE)).toBe(true);
    });

    it('should have inventory:manage permission', () => {
      expect(hasPermission(role, PermissionCategory.INVENTORY_MANAGE)).toBe(true);
    });
  });

  describe('Lab Technician Role', () => {
    const role: UserRole = 'lab_technician';

    it('should have lab:process permission', () => {
      expect(hasPermission(role, PermissionCategory.LAB_PROCESS)).toBe(true);
    });

    it('should have lab:upload_results permission', () => {
      expect(hasPermission(role, PermissionCategory.LAB_UPLOAD_RESULTS)).toBe(true);
    });

    it('should have patient:read permission', () => {
      expect(hasPermission(role, PermissionCategory.PATIENT_READ)).toBe(true);
    });

    it('should not have prescription:write permission', () => {
      expect(hasPermission(role, PermissionCategory.PRESCRIPTION_WRITE)).toBe(false);
    });
  });

  describe('Receptionist Role', () => {
    const role: UserRole = 'receptionist';

    it('should have appointment:check_in permission', () => {
      expect(hasPermission(role, PermissionCategory.APPOINTMENT_CHECK_IN)).toBe(true);
    });

    it('should have billing:process permission', () => {
      expect(hasPermission(role, PermissionCategory.BILLING_PROCESS)).toBe(true);
    });

    it('should have queue:manage permission', () => {
      expect(hasPermission(role, PermissionCategory.QUEUE_MANAGE)).toBe(true);
    });

    it('should not have consultation:write permission', () => {
      expect(hasPermission(role, PermissionCategory.CONSULTATION_WRITE)).toBe(false);
    });
  });

  describe('Patient Role', () => {
    const role: UserRole = 'patient';

    it('should have portal:access permission', () => {
      expect(hasPermission(role, PermissionCategory.PORTAL_ACCESS)).toBe(true);
    });

    it('should have appointment:read permission', () => {
      expect(hasPermission(role, PermissionCategory.APPOINTMENT_READ)).toBe(true);
    });

    it('should have prescription:read permission', () => {
      expect(hasPermission(role, PermissionCategory.PRESCRIPTION_READ)).toBe(true);
    });

    it('should have limited permissions only', () => {
      expect(ROLE_PERMISSIONS[role].length).toBeLessThanOrEqual(10);
    });

    it('should not have any write permissions for clinical data', () => {
      expect(hasPermission(role, PermissionCategory.PATIENT_WRITE)).toBe(false);
      expect(hasPermission(role, PermissionCategory.CONSULTATION_WRITE)).toBe(false);
      expect(hasPermission(role, PermissionCategory.PRESCRIPTION_WRITE)).toBe(false);
    });
  });
});
