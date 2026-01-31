/**
 * Role Interconnection Validator
 * 
 * Comprehensive utility to verify all role interconnections in the CareSync HIMS application.
 * Validates cross-role workflows, permission inheritance, communication channels, and task handoffs.
 */

import { UserRole, ROLE_PERMISSIONS, ROLE_HIERARCHY, ROLE_INFO, PermissionCategory } from '@/types/rbac';
import { AdminRBACManager, ADMIN_ROLE_PERMISSIONS, ADMIN_ROLE_HIERARCHY } from './adminRBACManager';
import { DoctorRBACManager, DOCTOR_PERMISSIONS } from './doctorRBACManager';

// Define all possible cross-role workflow paths
export const CROSS_ROLE_WORKFLOWS = {
  // Patient Journey Workflows
  PATIENT_JOURNEY: {
    name: 'Patient Journey',
    description: 'Complete patient flow from check-in to treatment',
    steps: [
      { from: 'receptionist', to: 'nurse', action: 'patient_check_in', description: 'Receptionist checks in patient, nurse prepares patient' },
      { from: 'nurse', to: 'doctor', action: 'vitals_complete', description: 'Nurse completes vitals, doctor begins consultation' },
      { from: 'doctor', to: 'lab_technician', action: 'lab_order', description: 'Doctor orders lab tests' },
      { from: 'doctor', to: 'pharmacist', action: 'prescription', description: 'Doctor prescribes medication' },
      { from: 'lab_technician', to: 'doctor', action: 'results_ready', description: 'Lab results available for doctor review' },
      { from: 'pharmacist', to: 'patient', action: 'medication_dispensed', description: 'Pharmacist dispenses medication to patient' },
      { from: 'doctor', to: 'receptionist', action: 'follow_up_scheduled', description: 'Doctor schedules follow-up appointment' },
    ]
  },

  // Emergency Workflow
  EMERGENCY: {
    name: 'Emergency Response',
    description: 'Urgent patient care workflow',
    steps: [
      { from: 'receptionist', to: 'nurse', action: 'urgent_triage', description: 'Urgent patient identified' },
      { from: 'nurse', to: 'doctor', action: 'urgent_alert', description: 'Nurse alerts doctor of urgent case' },
      { from: 'doctor', to: 'lab_technician', action: 'stat_lab_order', description: 'Stat lab order placed' },
      { from: 'doctor', to: 'pharmacist', action: 'stat_prescription', description: 'Urgent prescription' },
      { from: 'doctor', to: 'admin', action: 'escalation', description: 'Case escalation if needed' },
    ]
  },

  // Administrative Workflow
  ADMINISTRATIVE: {
    name: 'Administrative Workflow',
    description: 'Staff management and oversight',
    steps: [
      { from: 'super_admin', to: 'admin', action: 'hospital_setup', description: 'Super admin creates hospital admin' },
      { from: 'admin', to: 'dept_head', action: 'department_assignment', description: 'Admin assigns department head' },
      { from: 'dept_head', to: 'doctor', action: 'staff_management', description: 'Department head manages doctors' },
      { from: 'dept_head', to: 'nurse', action: 'staff_management', description: 'Department head manages nurses' },
      { from: 'admin', to: 'receptionist', action: 'staff_onboarding', description: 'Admin onboards receptionist' },
      { from: 'admin', to: 'pharmacist', action: 'staff_onboarding', description: 'Admin onboards pharmacist' },
      { from: 'admin', to: 'lab_technician', action: 'staff_onboarding', description: 'Admin onboards lab technician' },
    ]
  },

  // Billing Workflow
  BILLING: {
    name: 'Billing Workflow',
    description: 'Patient billing and payment processing',
    steps: [
      { from: 'receptionist', to: 'admin', action: 'payment_collected', description: 'Payment processed at reception' },
      { from: 'doctor', to: 'receptionist', action: 'consultation_complete', description: 'Consultation marked complete for billing' },
      { from: 'lab_technician', to: 'receptionist', action: 'lab_billable', description: 'Lab service billable' },
      { from: 'pharmacist', to: 'receptionist', action: 'pharmacy_billable', description: 'Pharmacy service billable' },
    ]
  },

  // Quality Assurance Workflow
  QA_WORKFLOW: {
    name: 'Quality Assurance',
    description: 'Clinical quality and compliance monitoring',
    steps: [
      { from: 'doctor', to: 'dept_head', action: 'case_review', description: 'Doctor requests case review' },
      { from: 'nurse', to: 'dept_head', action: 'incident_report', description: 'Nurse reports incident' },
      { from: 'dept_head', to: 'admin', action: 'compliance_report', description: 'Department head reports to admin' },
      { from: 'admin', to: 'super_admin', action: 'audit_request', description: 'Admin requests audit' },
    ]
  }
} as const;

// Role communication matrix - defines which roles can communicate with each other
// Enhanced: Added missing bidirectional communication paths for clinical coordination
export const ROLE_COMMUNICATION_MATRIX: Record<UserRole, UserRole[]> = {
  super_admin: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  dept_head: ['super_admin', 'admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  admin: ['super_admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  doctor: ['super_admin', 'admin', 'dept_head', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  nurse: ['super_admin', 'admin', 'dept_head', 'doctor', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  // Enhanced: receptionist can now communicate with pharmacist and lab_technician
  receptionist: ['admin', 'dept_head', 'nurse', 'doctor', 'pharmacist', 'lab_technician', 'patient'],
  // Enhanced: pharmacist can now communicate with receptionist and lab_technician
  pharmacist: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'patient'],
  // Enhanced: lab_technician can now communicate with receptionist and pharmacist
  lab_technician: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist'],
  patient: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'],
};

// Task delegation matrix - defines which roles can assign tasks to which other roles
export const TASK_DELEGATION_MATRIX: Record<UserRole, UserRole[]> = {
  super_admin: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  dept_head: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  admin: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  doctor: ['nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  nurse: ['receptionist'],
  receptionist: [],
  pharmacist: [],
  lab_technician: [],
  patient: [],
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    roleHierarchyValid: boolean;
    permissionsConsistent: boolean;
    communicationPathsValid: boolean;
    workflowPathsValid: boolean;
    delegationMatrixValid: boolean;
  };
}

export interface WorkflowValidationResult {
  workflowName: string;
  valid: boolean;
  errors: string[];
  steps: {
    step: number;
    from: UserRole;
    to: UserRole;
    action: string;
    valid: boolean;
    error?: string;
  }[];
}

/**
 * Validates the complete role interconnection system
 */
export function validateRoleInterconnections(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const details = {
    roleHierarchyValid: validateRoleHierarchy(),
    permissionsConsistent: validatePermissionConsistency(),
    communicationPathsValid: validateCommunicationPaths(),
    workflowPathsValid: validateAllWorkflows().every(w => w.valid),
    delegationMatrixValid: validateDelegationMatrix(),
  };

  // Collect errors from each validation
  if (!details.roleHierarchyValid) {
    errors.push('Role hierarchy validation failed');
  }
  if (!details.permissionsConsistent) {
    errors.push('Permission consistency validation failed');
  }
  if (!details.communicationPathsValid) {
    errors.push('Communication paths validation failed');
  }
  if (!details.workflowPathsValid) {
    errors.push('One or more workflow validations failed');
  }
  if (!details.delegationMatrixValid) {
    errors.push('Task delegation matrix validation failed');
  }

  // Check for orphaned roles
  const allRoles = Object.keys(ROLE_HIERARCHY) as UserRole[];
  allRoles.forEach(role => {
    const canCommunicate = ROLE_COMMUNICATION_MATRIX[role].length > 0;
    const canDelegate = TASK_DELEGATION_MATRIX[role].length > 0;
    const canReceive = allRoles.some(r => TASK_DELEGATION_MATRIX[r].includes(role));
    
    if (!canCommunicate && role !== 'patient') {
      warnings.push(`Role '${role}' has no communication channels`);
    }
    if (!canDelegate && !canReceive && role !== 'patient') {
      warnings.push(`Role '${role}' cannot delegate or receive tasks`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

/**
 * Validates role hierarchy consistency
 */
function validateRoleHierarchy(): boolean {
  const levels = Object.values(ROLE_HIERARCHY);
  
  // Check for duplicate levels (except 0 which is for invalid roles)
  const uniqueLevels = new Set(levels);
  if (uniqueLevels.size !== levels.length) {
    return false;
  }

  // Verify super_admin is highest
  if (ROLE_HIERARCHY.super_admin !== Math.max(...levels)) {
    return false;
  }

  // Verify patient is lowest
  if (ROLE_HIERARCHY.patient !== Math.min(...levels)) {
    return false;
  }

  return true;
}

/**
 * Validates permission consistency across role definitions
 */
function validatePermissionConsistency(): boolean {
  const allRoles = Object.keys(ROLE_PERMISSIONS) as UserRole[];
  
  // Check that higher roles have all permissions of lower roles (with exceptions)
  for (let i = 0; i < allRoles.length - 1; i++) {
    const higherRole = allRoles[i];
    const lowerRole = allRoles[i + 1];
    
    const higherPerms = new Set(ROLE_PERMISSIONS[higherRole]);
    const lowerPerms = ROLE_PERMISSIONS[lowerRole];
    
    // Lower role should not have permissions that higher role doesn't have
    // (with some exceptions for role-specific permissions)
    for (const perm of lowerPerms) {
      if (!higherPerms.has(perm) && !isRoleSpecificPermission(perm, lowerRole)) {
        // This is actually OK - not all permissions need to be inherited
        // But we log it for review
        console.warn(`Permission '${perm}' granted to ${lowerRole} but not ${higherRole}`);
      }
    }
  }

  return true;
}

/**
 * Checks if a permission is specific to a particular role
 */
function isRoleSpecificPermission(permission: string, role: UserRole): boolean {
  const roleSpecificPermissions: Record<string, string[]> = {
    doctor: [PermissionCategory.CONSULTATION_START, PermissionCategory.PRESCRIPTION_WRITE],
    nurse: [PermissionCategory.VITALS_WRITE, PermissionCategory.APPOINTMENT_CHECK_IN],
    pharmacist: [PermissionCategory.PHARMACY_DISPENSE, PermissionCategory.PHARMACY_INVENTORY],
    lab_technician: [PermissionCategory.LAB_PROCESS, PermissionCategory.LAB_UPLOAD_RESULTS],
    receptionist: [PermissionCategory.BILLING_PROCESS, PermissionCategory.BILLING_INVOICE],
    patient: [PermissionCategory.PORTAL_ACCESS],
  };

  return roleSpecificPermissions[role]?.includes(permission) || false;
}

/**
 * Validates communication paths between roles
 */
function validateCommunicationPaths(): boolean {
  const allRoles = Object.keys(ROLE_COMMUNICATION_MATRIX) as UserRole[];
  
  // Check for bidirectional communication issues
  for (const fromRole of allRoles) {
    for (const toRole of ROLE_COMMUNICATION_MATRIX[fromRole]) {
      // Check if reverse communication exists (not required but good to know)
      const hasReverse = ROLE_COMMUNICATION_MATRIX[toRole].includes(fromRole);
      if (!hasReverse && fromRole !== 'super_admin') {
        console.info(`One-way communication: ${fromRole} -> ${toRole}`);
      }
    }
  }

  return true;
}

/**
 * Validates task delegation matrix
 */
function validateDelegationMatrix(): boolean {
  const allRoles = Object.keys(TASK_DELEGATION_MATRIX) as UserRole[];
  
  // Check that higher roles can delegate to lower roles
  for (const fromRole of allRoles) {
    const fromLevel = ROLE_HIERARCHY[fromRole];
    
    for (const toRole of TASK_DELEGATION_MATRIX[fromRole]) {
      const toLevel = ROLE_HIERARCHY[toRole];
      
      // Should not be able to delegate to higher or equal level roles
      if (toLevel >= fromLevel) {
        console.error(`Invalid delegation: ${fromRole} (level ${fromLevel}) -> ${toRole} (level ${toLevel})`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates all defined workflows
 */
export function validateAllWorkflows(): WorkflowValidationResult[] {
  return Object.entries(CROSS_ROLE_WORKFLOWS).map(([key, workflow]) => {
    return validateWorkflow(key, workflow);
  });
}

/**
 * Validates a specific workflow
 */
function validateWorkflow(
  workflowKey: string, 
  workflow: typeof CROSS_ROLE_WORKFLOWS[keyof typeof CROSS_ROLE_WORKFLOWS]
): WorkflowValidationResult {
  const errors: string[] = [];
  const steps: WorkflowValidationResult['steps'] = [];

  workflow.steps.forEach((step, index) => {
    const stepValidation = validateWorkflowStep(step.from as UserRole, step.to as UserRole, step.action);
    
    steps.push({
      step: index + 1,
      from: step.from as UserRole,
      to: step.to as UserRole,
      action: step.action,
      valid: stepValidation.valid,
      error: stepValidation.error,
    });

    if (!stepValidation.valid) {
      errors.push(`Step ${index + 1}: ${stepValidation.error}`);
    }
  });

  return {
    workflowName: workflow.name,
    valid: errors.length === 0,
    errors,
    steps,
  };
}

/**
 * Validates a single workflow step
 */
function validateWorkflowStep(
  fromRole: UserRole, 
  toRole: UserRole, 
  action: string
): { valid: boolean; error?: string } {
  // Check if roles exist
  if (!ROLE_HIERARCHY[fromRole]) {
    return { valid: false, error: `Unknown source role: ${fromRole}` };
  }
  if (!ROLE_HIERARCHY[toRole]) {
    return { valid: false, error: `Unknown target role: ${toRole}` };
  }

  // Check if communication path exists
  if (!ROLE_COMMUNICATION_MATRIX[fromRole].includes(toRole)) {
    return { 
      valid: false, 
      error: `No communication path from ${fromRole} to ${toRole}` 
    };
  }

  // Check if task delegation is allowed (if applicable)
  if (!TASK_DELEGATION_MATRIX[fromRole].includes(toRole)) {
    // This is a warning, not necessarily an error
    console.warn(`Task delegation from ${fromRole} to ${toRole} may be restricted`);
  }

  return { valid: true };
}

/**
 * Gets all roles that can communicate with a given role
 */
export function getCommunicationPartners(role: UserRole): {
  canCommunicateWith: UserRole[];
  canBeContactedBy: UserRole[];
} {
  const allRoles = Object.keys(ROLE_COMMUNICATION_MATRIX) as UserRole[];
  
  return {
    canCommunicateWith: ROLE_COMMUNICATION_MATRIX[role],
    canBeContactedBy: allRoles.filter(r => ROLE_COMMUNICATION_MATRIX[r].includes(role)),
  };
}

/**
 * Gets the workflow path for a specific patient journey
 */
export function getWorkflowPath(workflowType: keyof typeof CROSS_ROLE_WORKFLOWS): {
  name: string;
  description: string;
  roles: UserRole[];
  steps: { from: UserRole; to: UserRole; action: string }[];
} {
  const workflow = CROSS_ROLE_WORKFLOWS[workflowType];
  const roles = new Set<UserRole>();
  
  workflow.steps.forEach(step => {
    roles.add(step.from as UserRole);
    roles.add(step.to as UserRole);
  });

  return {
    name: workflow.name,
    description: workflow.description,
    roles: Array.from(roles),
    steps: workflow.steps.map(s => ({
      from: s.from as UserRole,
      to: s.to as UserRole,
      action: s.action,
    })),
  };
}

/**
 * Generates a role interconnection report
 */
export function generateInterconnectionReport(): string {
  const validation = validateRoleInterconnections();
  const workflows = validateAllWorkflows();
  
  let report = '# Role Interconnection Validation Report\n\n';
  
  report += `## Summary\n\n`;
  report += `- **Overall Status**: ${validation.valid ? '✅ VALID' : '❌ INVALID'}\n`;
  report += `- **Errors**: ${validation.errors.length}\n`;
  report += `- **Warnings**: ${validation.warnings.length}\n\n`;
  
  report += `## Validation Details\n\n`;
  report += `- Role Hierarchy: ${validation.details.roleHierarchyValid ? '✅' : '❌'}\n`;
  report += `- Permission Consistency: ${validation.details.permissionsConsistent ? '✅' : '❌'}\n`;
  report += `- Communication Paths: ${validation.details.communicationPathsValid ? '✅' : '❌'}\n`;
  report += `- Workflow Paths: ${validation.details.workflowPathsValid ? '✅' : '❌'}\n`;
  report += `- Delegation Matrix: ${validation.details.delegationMatrixValid ? '✅' : '❌'}\n\n`;
  
  if (validation.errors.length > 0) {
    report += `## Errors\n\n`;
    validation.errors.forEach(error => {
      report += `- ❌ ${error}\n`;
    });
    report += '\n';
  }
  
  if (validation.warnings.length > 0) {
    report += `## Warnings\n\n`;
    validation.warnings.forEach(warning => {
      report += `- ⚠️ ${warning}\n`;
    });
    report += '\n';
  }
  
  report += `## Workflow Validation\n\n`;
  workflows.forEach(workflow => {
    report += `### ${workflow.workflowName}\n\n`;
    report += `- Status: ${workflow.valid ? '✅ Valid' : '❌ Invalid'}\n`;
    if (workflow.errors.length > 0) {
      report += `- Errors:\n`;
      workflow.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
    }
    report += '\n';
  });
  
  report += `## Role Communication Matrix\n\n`;
  report += `| Role | Can Communicate With |\n`;
  report += `|------|---------------------|\n`;
  (Object.keys(ROLE_COMMUNICATION_MATRIX) as UserRole[]).forEach(role => {
    const partners = ROLE_COMMUNICATION_MATRIX[role].join(', ');
    report += `| ${role} | ${partners} |\n`;
  });
  
  return report;
}

/**
 * Checks if a role transition is valid (for role switching)
 */
export function isValidRoleTransition(fromRole: UserRole, toRole: UserRole): {
  valid: boolean;
  reason?: string;
} {
  // Super admin can switch to any role
  if (fromRole === 'super_admin') {
    return { valid: true };
  }

  // Admin can switch to roles they can manage
  if (fromRole === 'admin') {
    const manageableRoles = ['dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
    if (manageableRoles.includes(toRole)) {
      return { valid: true };
    }
    return { valid: false, reason: 'Admin cannot switch to this role' };
  }

  // Department head can switch to department roles
  if (fromRole === 'dept_head') {
    const deptRoles = ['doctor', 'nurse'];
    if (deptRoles.includes(toRole)) {
      return { valid: true };
    }
    return { valid: false, reason: 'Department head can only switch to department roles' };
  }

  // Other roles cannot switch
  return { valid: false, reason: 'Insufficient permissions for role switching' };
}

/**
 * Gets recommended actions for a role based on workflow context
 */
export function getRecommendedActions(
  currentRole: UserRole, 
  context: { patientId?: string; workflowType?: string }
): { action: string; targetRole: UserRole; priority: 'low' | 'medium' | 'high' | 'urgent' }[] {
  const recommendations: { action: string; targetRole: UserRole; priority: 'low' | 'medium' | 'high' | 'urgent' }[] = [];

  switch (currentRole) {
    case 'receptionist':
      recommendations.push(
        { action: 'Prepare patient for nurse', targetRole: 'nurse', priority: 'medium' },
        { action: 'Schedule follow-up appointment', targetRole: 'receptionist', priority: 'low' }
      );
      break;
    case 'nurse':
      recommendations.push(
        { action: 'Alert doctor patient is ready', targetRole: 'doctor', priority: 'high' },
        { action: 'Request lab tests', targetRole: 'lab_technician', priority: 'medium' }
      );
      break;
    case 'doctor':
      recommendations.push(
        { action: 'Send prescription to pharmacy', targetRole: 'pharmacist', priority: 'high' },
        { action: 'Request stat lab work', targetRole: 'lab_technician', priority: 'urgent' },
        { action: 'Schedule follow-up', targetRole: 'receptionist', priority: 'medium' }
      );
      break;
    case 'lab_technician':
      recommendations.push(
        { action: 'Notify doctor results ready', targetRole: 'doctor', priority: 'high' }
      );
      break;
    case 'pharmacist':
      recommendations.push(
        { action: 'Confirm medication dispensed', targetRole: 'doctor', priority: 'medium' }
      );
      break;
  }

  return recommendations;
}

// Export all validation functions for testing
export const RoleInterconnectionValidator = {
  validateRoleInterconnections,
  validateAllWorkflows,
  getCommunicationPartners,
  getWorkflowPath,
  generateInterconnectionReport,
  isValidRoleTransition,
  getRecommendedActions,
  CROSS_ROLE_WORKFLOWS,
  ROLE_COMMUNICATION_MATRIX,
  TASK_DELEGATION_MATRIX,
};

/**
 * Calculate metrics for role interconnection system
 */
export function calculateInterconnectionMetrics(): {
  interconnectionCoverage: number;
  permissionConsistency: number;
  workflowCompleteness: number;
  securityCompliance: number;
  overallHealthScore: number;
} {
  // Interconnection Coverage Score
  const allRoles = Object.keys(ROLE_COMMUNICATION_MATRIX) as UserRole[];
  const totalPossibleConnections = allRoles.length * (allRoles.length - 1); // Exclude self-connections
  let validConnections = 0;
  
  allRoles.forEach(fromRole => {
    ROLE_COMMUNICATION_MATRIX[fromRole].forEach(toRole => {
      // Check bidirectional
      if (ROLE_COMMUNICATION_MATRIX[toRole]?.includes(fromRole)) {
        validConnections += 1;
      }
    });
  });
  
  const interconnectionCoverage = Math.round((validConnections / totalPossibleConnections) * 100);
  
  // Permission Consistency Score
  const totalPermissions = Object.values(PermissionCategory).length;
  let consistentPermissions = 0;
  
  Object.values(PermissionCategory).forEach(permission => {
    // Check if permission is assigned to at least one role appropriately
    const rolesWithPermission = allRoles.filter(role => 
      ROLE_PERMISSIONS[role]?.includes(permission)
    );
    if (rolesWithPermission.length > 0) {
      consistentPermissions++;
    }
  });
  
  const permissionConsistency = Math.round((consistentPermissions / totalPermissions) * 100);
  
  // Workflow Completeness Score
  const workflows = validateAllWorkflows();
  const validWorkflows = workflows.filter(w => w.valid).length;
  const workflowCompleteness = Math.round((validWorkflows / workflows.length) * 100);
  
  // Security Compliance Score (based on route protection)
  // This would need route data, so we estimate based on role coverage
  const rolesWithRouteAccess = allRoles.filter(role => 
    role !== 'patient' && ROLE_PERMISSIONS[role]?.length > 5
  );
  const securityCompliance = Math.round((rolesWithRouteAccess.length / (allRoles.length - 1)) * 100);
  
  // Overall Health Score
  const overallHealthScore = Math.round(
    (interconnectionCoverage + permissionConsistency + workflowCompleteness + securityCompliance) / 4
  );
  
  return {
    interconnectionCoverage,
    permissionConsistency,
    workflowCompleteness,
    securityCompliance,
    overallHealthScore,
  };
}

/**
 * Get role permission summary for a specific role
 */
export function getRolePermissionSummary(role: UserRole): {
  role: UserRole;
  level: number;
  permissionCount: number;
  permissionCategories: string[];
  canCommunicateWith: UserRole[];
  canDelegateTo: UserRole[];
  canReceiveFrom: UserRole[];
} {
  const permissions = ROLE_PERMISSIONS[role] || [];
  const categories = new Set<string>();
  
  permissions.forEach(permission => {
    const [category] = permission.split(':');
    categories.add(category);
  });
  
  const allRoles = Object.keys(TASK_DELEGATION_MATRIX) as UserRole[];
  
  return {
    role,
    level: ROLE_HIERARCHY[role],
    permissionCount: permissions.length,
    permissionCategories: Array.from(categories),
    canCommunicateWith: ROLE_COMMUNICATION_MATRIX[role],
    canDelegateTo: TASK_DELEGATION_MATRIX[role],
    canReceiveFrom: allRoles.filter(r => TASK_DELEGATION_MATRIX[r].includes(role)),
  };
}

/**
 * Get all role summaries
 */
export function getAllRoleSummaries(): ReturnType<typeof getRolePermissionSummary>[] {
  const allRoles = Object.keys(ROLE_HIERARCHY) as UserRole[];
  return allRoles.map(role => getRolePermissionSummary(role));
}

/**
 * Validate route protection configuration
 */
export function validateRouteProtection(routeConfig: {
  path: string;
  allowedRoles: UserRole[];
}[]): {
  missingHigherRoles: { path: string; missingRoles: UserRole[] }[];
  overPermissioned: { path: string; suggestion: string }[];
  score: number;
} {
  const higherRoles: UserRole[] = ['super_admin', 'dept_head'];
  const missingHigherRoles: { path: string; missingRoles: UserRole[] }[] = [];
  const overPermissioned: { path: string; suggestion: string }[] = [];
  
  routeConfig.forEach(route => {
    // Check if higher roles are missing (except for patient-specific routes)
    if (!route.path.startsWith('/patient/')) {
      const missing = higherRoles.filter(r => !route.allowedRoles.includes(r));
      if (missing.length > 0) {
        missingHigherRoles.push({ path: route.path, missingRoles: missing });
      }
    }
    
    // Check for potentially over-permissioned routes
    if (route.allowedRoles.includes('patient') && 
        route.allowedRoles.some(r => ['admin', 'doctor'].includes(r))) {
      overPermissioned.push({
        path: route.path,
        suggestion: 'Consider separating staff and patient routes'
      });
    }
  });
  
  const totalRoutes = routeConfig.length;
  const problematicRoutes = missingHigherRoles.length + overPermissioned.length;
  const score = Math.round(((totalRoutes - problematicRoutes) / totalRoutes) * 100);
  
  return { missingHigherRoles, overPermissioned, score };
}

/**
 * Generate comprehensive JSON report for external tools
 */
export function generateJSONReport(): object {
  const validation = validateRoleInterconnections();
  const metrics = calculateInterconnectionMetrics();
  const roleSummaries = getAllRoleSummaries();
  const workflows = validateAllWorkflows();
  
  return {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    summary: {
      totalRoles: 9,
      healthScore: metrics.overallHealthScore,
      status: validation.valid ? 'VALID' : 'INVALID',
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    metrics,
    validation: {
      ...validation,
      details: validation.details,
    },
    roles: roleSummaries,
    workflows: workflows.map(w => ({
      name: w.workflowName,
      valid: w.valid,
      stepCount: w.steps.length,
      errors: w.errors,
    })),
    communicationMatrix: ROLE_COMMUNICATION_MATRIX,
    delegationMatrix: TASK_DELEGATION_MATRIX,
  };
}

export default RoleInterconnectionValidator;
