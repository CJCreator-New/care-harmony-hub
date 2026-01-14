import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';

export interface UserAttributes {
  id: string;
  roles: UserRole[];
  primaryRole: UserRole | null;
  hospitalId: string | null;
  department?: string;
  seniority?: number;
  clearanceLevel?: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastLoginAt?: string;
  deviceType?: string;
  location?: string;
}

export interface ResourceAttributes {
  id: string;
  type: 'patient' | 'appointment' | 'consultation' | 'prescription' | 'lab_order' | 'billing' | 'staff' | 'report';
  ownerId?: string;
  hospitalId: string | null;
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentAttributes {
  time: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  location?: string;
  isEmergency?: boolean;
  accessLevel: 'normal' | 'elevated' | 'emergency';
}

export interface PermissionRequest {
  user: UserAttributes;
  resource: ResourceAttributes;
  action: string;
  environment: EnvironmentAttributes;
}

export interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: ABACCondition[];
  effect: 'allow' | 'deny';
  enabled: boolean;
}

export interface ABACCondition {
  attribute: 'user' | 'resource' | 'environment' | 'action';
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'matches';
  value: any;
}

export class ABACManager {
  private static instance: ABACManager;
  private policies: ABACPolicy[] = [];

  private constructor() {
    this.loadDefaultPolicies();
  }

  static getInstance(): ABACManager {
    if (!ABACManager.instance) {
      ABACManager.instance = new ABACManager();
    }
    return ABACManager.instance;
  }

  private loadDefaultPolicies(): void {
    // Emergency access policy - highest priority
    this.policies.push({
      id: 'emergency-access',
      name: 'Emergency Access Override',
      description: 'Allow emergency access to critical resources',
      priority: 100,
      conditions: [
        { attribute: 'environment', field: 'isEmergency', operator: 'equals', value: true },
        { attribute: 'environment', field: 'accessLevel', operator: 'equals', value: 'emergency' }
      ],
      effect: 'allow',
      enabled: true
    });

    // Admin full access policy
    this.policies.push({
      id: 'admin-full-access',
      name: 'Administrator Full Access',
      description: 'Administrators have full access to all resources',
      priority: 90,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'admin' }
      ],
      effect: 'allow',
      enabled: true
    });

    // Doctor patient access policy
    this.policies.push({
      id: 'doctor-patient-access',
      name: 'Doctor Patient Access',
      description: 'Doctors can access patient records in their hospital based on clearance level',
      priority: 80,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'doctor' },
        { attribute: 'user', field: 'hospitalId', operator: 'equals', value: 'field:resource.hospitalId' },
        { attribute: 'resource', field: 'type', operator: 'in', value: ['patient', 'consultation', 'prescription', 'lab_order'] },
        { attribute: 'user', field: 'clearanceLevel', operator: 'not_equals', value: 'low' }
      ],
      effect: 'allow',
      enabled: true
    });

    // Nurse restricted access policy
    this.policies.push({
      id: 'nurse-restricted-access',
      name: 'Nurse Restricted Access',
      description: 'Nurses have limited access to sensitive patient data',
      priority: 70,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'nurse' },
        { attribute: 'user', field: 'hospitalId', operator: 'equals', value: 'field:resource.hospitalId' },
        { attribute: 'resource', field: 'sensitivityLevel', operator: 'not_equals', value: 'restricted' },
        { attribute: 'action', operator: 'in', value: ['read', 'update'] }
      ],
      effect: 'allow',
      enabled: true
    });

    // Pharmacist medication access policy
    this.policies.push({
      id: 'pharmacist-medication-access',
      name: 'Pharmacist Medication Access',
      description: 'Pharmacists can manage medications and prescriptions',
      priority: 70,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'pharmacist' },
        { attribute: 'user', field: 'hospitalId', operator: 'equals', value: 'field:resource.hospitalId' },
        { attribute: 'resource', field: 'type', operator: 'in', value: ['prescription', 'medication'] }
      ],
      effect: 'allow',
      enabled: true
    });

    // Lab technician lab access policy
    this.policies.push({
      id: 'lab-tech-lab-access',
      name: 'Lab Technician Lab Access',
      description: 'Lab technicians can process lab orders and upload results',
      priority: 70,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'lab_technician' },
        { attribute: 'user', field: 'hospitalId', operator: 'equals', value: 'field:resource.hospitalId' },
        { attribute: 'resource', field: 'type', operator: 'equals', value: 'lab_order' }
      ],
      effect: 'allow',
      enabled: true
    });

    // Patient self-access policy
    this.policies.push({
      id: 'patient-self-access',
      name: 'Patient Self Access',
      description: 'Patients can access their own records',
      priority: 60,
      conditions: [
        { attribute: 'user', field: 'roles', operator: 'contains', value: 'patient' },
        { attribute: 'user', field: 'id', operator: 'equals', value: 'field:resource.ownerId' },
        { attribute: 'resource', field: 'sensitivityLevel', operator: 'not_equals', value: 'restricted' }
      ],
      effect: 'allow',
      enabled: true
    });

    // Time-based restrictions
    this.policies.push({
      id: 'after-hours-restriction',
      name: 'After Hours Restriction',
      description: 'Restrict access to sensitive data after business hours',
      priority: 50,
      conditions: [
        { attribute: 'environment', field: 'time', operator: 'matches', value: 'after_hours' },
        { attribute: 'resource', field: 'sensitivityLevel', operator: 'equals', value: 'restricted' },
        { attribute: 'user', field: 'clearanceLevel', operator: 'not_equals', value: 'high' }
      ],
      effect: 'deny',
      enabled: true
    });

    // Default deny policy - lowest priority
    this.policies.push({
      id: 'default-deny',
      name: 'Default Deny',
      description: 'Deny access by default',
      priority: 0,
      conditions: [],
      effect: 'deny',
      enabled: true
    });
  }

  private evaluateCondition(condition: ABACCondition, request: PermissionRequest): boolean {
    const { attribute, field, operator, value } = condition;

    let actualValue: any;

    switch (attribute) {
      case 'user':
        actualValue = this.getNestedValue(request.user, field);
        break;
      case 'resource':
        actualValue = this.getNestedValue(request.resource, field);
        break;
      case 'environment':
        actualValue = this.getNestedValue(request.environment, field);
        break;
      case 'action':
        actualValue = request.action;
        break;
      default:
        return false;
    }

    // Handle cross-attribute references (e.g., user.hospitalId equals resource.hospitalId)
    let expectedValue = value;
    if (typeof value === 'string' && value.startsWith('field:')) {
      const refPath = value.substring(6); // Remove 'field:' prefix
      const [refAttribute, refField] = refPath.split('.');
      switch (refAttribute) {
        case 'user':
          expectedValue = this.getNestedValue(request.user, refField);
          break;
        case 'resource':
          expectedValue = this.getNestedValue(request.resource, refField);
          break;
        case 'environment':
          expectedValue = this.getNestedValue(request.environment, refField);
          break;
        default:
          expectedValue = value;
      }
    }

    return this.evaluateOperator(actualValue, operator, expectedValue);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateOperator(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue);
        }
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        if (Array.isArray(actualValue)) {
          return !actualValue.includes(expectedValue);
        }
        return !String(actualValue).includes(String(expectedValue));
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'in':
        return Array.isArray(expectedValue) ? expectedValue.includes(actualValue) : false;
      case 'not_in':
        return Array.isArray(expectedValue) ? !expectedValue.includes(actualValue) : true;
      case 'matches':
        // Simple pattern matching for time-based rules
        if (expectedValue === 'after_hours') {
          if (actualValue instanceof Date) {
            const hour = actualValue.getHours();
            // After hours: before 6 AM or after 6 PM
            return hour < 6 || hour >= 18;
          }
          return false;
        }
        return false;
      default:
        return false;
    }
  }

  async evaluateAccess(request: PermissionRequest): Promise<{ allowed: boolean; reason?: string; policyId?: string }> {
    // Sort policies by priority (highest first)
    const sortedPolicies = [...this.policies]
      .filter(policy => policy.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      const conditionsMet = policy.conditions.length === 0 ||
        policy.conditions.every(condition => this.evaluateCondition(condition, request));

      if (conditionsMet) {
        // Log the access decision for audit
        await this.logAccessDecision(request, policy, conditionsMet);

        return {
          allowed: policy.effect === 'allow',
          reason: policy.description,
          policyId: policy.id
        };
      }
    }

    return { allowed: false, reason: 'No matching policy found' };
  }

  private async logAccessDecision(
    request: PermissionRequest,
    policy: ABACPolicy,
    conditionsMet: boolean
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_id: request.user.id,
        action: `access_${request.action}`,
        resource_type: request.resource.type,
        resource_id: request.resource.id,
        details: {
          policy_id: policy.id,
          policy_name: policy.name,
          conditions_met: conditionsMet,
          effect: policy.effect,
          user_attributes: {
            roles: request.user.roles,
            hospital_id: request.user.hospitalId,
            clearance_level: request.user.clearanceLevel
          },
          resource_attributes: {
            sensitivity_level: request.resource.sensitivityLevel,
            hospital_id: request.resource.hospitalId
          },
          environment_attributes: {
            time: request.environment.time.toISOString(),
            device_type: request.environment.deviceType,
            access_level: request.environment.accessLevel
          }
        },
        ip_address: request.environment.ipAddress,
        user_agent: request.environment.userAgent,
        hospital_id: request.user.hospitalId
      });
    } catch (error) {
      console.error('Failed to log access decision:', error);
    }
  }

  // Add custom policies
  addPolicy(policy: ABACPolicy): void {
    this.policies.push(policy);
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  // Remove policies
  removePolicy(policyId: string): void {
    this.policies = this.policies.filter(p => p.id !== policyId);
  }

  // Enable/disable policies
  setPolicyEnabled(policyId: string, enabled: boolean): void {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) {
      policy.enabled = enabled;
    }
  }

  // Get all policies
  getPolicies(): ABACPolicy[] {
    return [...this.policies];
  }
}

export const abacManager = ABACManager.getInstance();