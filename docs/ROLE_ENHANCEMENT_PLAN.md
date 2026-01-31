# CareSync HIMS Role Enhancement Plan

**Document Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** Active  
**Related:** [ROLE_INTERCONNECTION_REPORT.md](./ROLE_INTERCONNECTION_REPORT.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Priority Matrix](#priority-matrix)
3. [Phase 1: Critical Fixes](#phase-1-critical-fixes)
4. [Phase 2: Workflow Enhancements](#phase-2-workflow-enhancements)
5. [Phase 3: UI/UX Optimization](#phase-3-uiux-optimization)
6. [Code Implementation Details](#code-implementation-details)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## Overview

This document outlines the implementation plan for enhancing the role interconnection system based on findings from the Role Interconnection Analysis Report. All enhancements are prioritized by business impact and technical complexity.

### Goals
- Achieve 100% route protection coverage
- Enable bidirectional communication for all clinical roles
- Ensure complete workflow path validation
- Eliminate all critical security gaps

### Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Route Protection Coverage | 73% | 100% |
| Communication Path Coverage | 78% | 95% |
| Permission Consistency | 91% | 100% |
| Overall Health Score | 87% | 95% |

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
         P1             │              P0
    (This Sprint)       │         (Immediate)
                        │
    ────────────────────┼────────────────────
                        │
         P3             │              P2
       (Backlog)        │         (Next Sprint)
                        │
                   LOW IMPACT
         
         LOW EFFORT ──────────── HIGH EFFORT
```

---

## Phase 1: Critical Fixes

**Timeline:** Days 1-5  
**Resources:** 1 Senior Developer  
**Risk Level:** Low

### Fix 1.1: Add Super Admin and Dept Head to Route Protections

**File:** `src/App.tsx`  
**Effort:** Small (2-3 hours)  
**Impact:** Critical

```typescript
// BEFORE (lines 240-400)
<RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>

// AFTER
<RoleProtectedRoute allowedRoles={['super_admin', 'dept_head', 'admin', 'doctor', 'nurse', 'receptionist']}>
```

**Routes to Update:**

| Route | Current Roles | Add Roles |
|-------|---------------|-----------|
| `/patients` | admin, doctor, nurse, receptionist | super_admin, dept_head |
| `/patients/:id` | admin, doctor, nurse, receptionist | super_admin, dept_head |
| `/appointments` | admin, doctor, nurse, receptionist | super_admin, dept_head |
| `/consultations` | admin, doctor, nurse | super_admin, dept_head |
| `/consultations/:id` | admin, doctor, nurse | super_admin, dept_head |
| `/consultations/mobile` | admin, doctor | super_admin, dept_head |
| `/pharmacy` | admin, pharmacist | super_admin, dept_head |
| `/pharmacy/clinical` | admin, pharmacist | super_admin, dept_head |
| `/queue` | admin, doctor, nurse, receptionist | super_admin, dept_head |
| `/laboratory` | admin, doctor, nurse, lab_technician | super_admin, dept_head |
| `/laboratory/automation` | admin, lab_technician | super_admin, dept_head |
| `/billing` | admin, receptionist | super_admin, dept_head |
| `/inventory` | admin, pharmacist | super_admin, dept_head |
| `/reports` | admin | super_admin, dept_head, doctor |
| `/messages` | admin, doctor, nurse | super_admin, dept_head, pharmacist, lab_technician |

---

### Fix 1.2: Consolidate UserRole Type Definitions

**Files:** 
- `src/types/auth.ts`
- `src/types/rbac.ts`

**Effort:** Small (1-2 hours)  
**Impact:** High

**Current Issue:**
```typescript
// src/types/auth.ts (INCOMPLETE)
export type UserRole = 'patient' | 'doctor' | 'nurse' | 'receptionist' | 
                       'pharmacist' | 'lab_technician' | 'admin';

// src/types/rbac.ts (COMPLETE)
export type UserRole = 'super_admin' | 'dept_head' | 'admin' | 'doctor' | 
                       'nurse' | 'receptionist' | 'pharmacist' | 
                       'lab_technician' | 'patient';
```

**Solution:**
```typescript
// src/types/auth.ts - Update to re-export from rbac.ts
export { UserRole } from './rbac';

// Or update the type definition to match:
export type UserRole = 
  | 'super_admin'
  | 'dept_head'
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_technician'
  | 'patient';
```

---

### Fix 1.3: Update Communication Matrix

**File:** `src/utils/roleInterconnectionValidator.ts`  
**Effort:** Small (1 hour)  
**Impact:** Medium

```typescript
// Update ROLE_COMMUNICATION_MATRIX
export const ROLE_COMMUNICATION_MATRIX: Record<UserRole, UserRole[]> = {
  super_admin: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  dept_head: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  admin: ['dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  doctor: ['admin', 'dept_head', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  nurse: ['admin', 'dept_head', 'doctor', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
  // ADD: receptionist -> pharmacist, lab_technician
  receptionist: ['admin', 'nurse', 'doctor', 'pharmacist', 'lab_technician', 'patient'],
  // ADD: pharmacist -> receptionist, lab_technician
  pharmacist: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'patient'],
  // ADD: lab_technician -> receptionist, pharmacist
  lab_technician: ['admin', 'dept_head', 'doctor', 'nurse', 'receptionist', 'pharmacist'],
  patient: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'],
};
```

---

### Fix 1.4: Add Missing Dept Head Permissions

**File:** `src/types/rbac.ts`  
**Effort:** Small (30 minutes)  
**Impact:** Medium

```typescript
// Update ROLE_PERMISSIONS for dept_head
dept_head: [
  // Existing permissions...
  PermissionCategory.DEPT_HEAD_ACCESS,
  PermissionCategory.STAFF_MANAGE,
  PermissionCategory.REPORTS_GENERATE,
  PermissionCategory.WORKFLOW_MANAGE,
  PermissionCategory.ACTIVITY_LOGS_READ,
  
  // ADD these missing permissions:
  PermissionCategory.STAFF_INVITE,           // Can invite staff to department
  PermissionCategory.AUDIT_LOGS,             // Can view audit logs for department
  PermissionCategory.INVENTORY_READ,         // Can view inventory status
  
  // ... rest of existing permissions
],
```

---

## Phase 2: Workflow Enhancements

**Timeline:** Weeks 2-3  
**Resources:** 2 Developers  
**Risk Level:** Medium

### Enhancement 2.1: Verify/Create Workflow Database Tables

**Effort:** Medium (4-6 hours)  
**Impact:** High

```sql
-- Migration: Create workflow tables if not exist

-- Workflow Events Table
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  source_user UUID,
  source_role VARCHAR(50),
  payload JSONB DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'normal',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Rules Table
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  name VARCHAR(200) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Tasks Table
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  assigned_role VARCHAR(50),
  assigned_to UUID,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  workflow_type VARCHAR(100),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Action Failures Table
CREATE TABLE IF NOT EXISTS workflow_action_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  workflow_event_id VARCHAR(100),
  action_type VARCHAR(100),
  action_metadata JSONB,
  error_message TEXT,
  retry_attempts INTEGER DEFAULT 0,
  patient_id UUID REFERENCES patients(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Messages Table
CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  sender_id UUID NOT NULL,
  sender_role VARCHAR(50),
  sender_name VARCHAR(200),
  recipient_id UUID,
  recipient_role VARCHAR(50),
  message_type VARCHAR(50) NOT NULL,
  subject VARCHAR(300),
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  patient_id UUID REFERENCES patients(id),
  related_entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Threads Table
CREATE TABLE IF NOT EXISTS communication_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  participants UUID[] NOT NULL,
  patient_id UUID REFERENCES patients(id),
  subject VARCHAR(300),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_events_hospital ON workflow_events(hospital_id);
CREATE INDEX idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_tasks_assigned ON workflow_tasks(assigned_to, status);
CREATE INDEX idx_communication_messages_recipient ON communication_messages(recipient_id, read);
CREATE INDEX idx_communication_messages_role ON communication_messages(recipient_role, read);

-- RLS Policies
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
```

---

### Enhancement 2.2: Complete Workflow Orchestrator

**File:** `src/hooks/useWorkflowOrchestrator.ts`  
**Effort:** Medium (6-8 hours)  
**Impact:** High

```typescript
// Add new workflow event types
export const WORKFLOW_EVENT_TYPES = {
  // Patient Journey Events
  PATIENT_CHECKED_IN: 'patient.checked_in',
  VITALS_RECORDED: 'vitals.recorded',
  PATIENT_READY_FOR_DOCTOR: 'patient.ready_for_doctor',
  CONSULTATION_STARTED: 'consultation.started',
  CONSULTATION_COMPLETED: 'consultation.completed',
  
  // Lab Events
  LAB_ORDER_CREATED: 'lab.order_created',
  LAB_SAMPLE_COLLECTED: 'lab.sample_collected',
  LAB_RESULTS_READY: 'lab.results_ready',
  LAB_CRITICAL_ALERT: 'lab.critical_alert',
  
  // Pharmacy Events
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_VERIFIED: 'prescription.verified',
  MEDICATION_DISPENSED: 'medication.dispensed',
  
  // Billing Events
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_RECEIVED: 'payment.received',
  
  // Administrative Events
  STAFF_INVITED: 'staff.invited',
  ROLE_ASSIGNED: 'role.assigned',
  ESCALATION_TRIGGERED: 'escalation.triggered',
} as const;

// Add workflow step completion tracking
export function useWorkflowStepTracker() {
  const { hospital } = useAuth();
  
  const trackStep = async (
    patientId: string,
    workflowType: string,
    stepName: string,
    completedBy: string,
    completedByRole: UserRole
  ) => {
    await supabase.from('workflow_step_completions').insert({
      hospital_id: hospital?.id,
      patient_id: patientId,
      workflow_type: workflowType,
      step_name: stepName,
      completed_by: completedBy,
      completed_by_role: completedByRole,
      completed_at: new Date().toISOString()
    });
  };
  
  return { trackStep };
}
```

---

### Enhancement 2.3: Add RLS Policies for Missing Roles

**Effort:** Medium (4-6 hours)  
**Impact:** High

```sql
-- Comprehensive RLS Policies by Role

-- Patients table policies
CREATE POLICY "pharmacist_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

-- Appointments table policies
CREATE POLICY "pharmacist_view_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = appointments.hospital_id
    )
  );

-- Consultations table policies for read access
CREATE POLICY "pharmacist_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

-- Patient portal access
CREATE POLICY "patient_view_own_data" ON patients
  FOR SELECT USING (
    patients.user_id = auth.uid()
  );

CREATE POLICY "patient_view_own_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = appointments.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_prescriptions" ON prescriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = prescriptions.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_lab_orders" ON lab_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = lab_orders.patient_id 
      AND patients.user_id = auth.uid()
    )
  );
```

---

## Phase 3: UI/UX Optimization

**Timeline:** Week 4  
**Resources:** 1 Developer + 1 Designer  
**Risk Level:** Low

### Optimization 3.1: Enhanced Role Switcher

**File:** `src/components/auth/RoleSwitcher.tsx`  
**Effort:** Medium (4 hours)  
**Impact:** Medium

```typescript
import { isValidRoleTransition } from '@/utils/roleInterconnectionValidator';

export function EnhancedRoleSwitcher() {
  const { roles, primaryRole, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);
  
  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (!primaryRole) return;
    
    // Validate transition before switching
    const validation = isValidRoleTransition(primaryRole, targetRole);
    
    if (!validation.valid) {
      toast.error(`Cannot switch to ${targetRole}: ${validation.reason}`);
      return;
    }
    
    setSwitching(true);
    try {
      await switchRole(targetRole);
      toast.success(`Switched to ${ROLE_INFO[targetRole].label}`);
    } catch (error) {
      toast.error('Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };
  
  // Filter to only show valid transition targets
  const availableRoles = roles.filter(role => {
    if (role === primaryRole) return false;
    const validation = isValidRoleTransition(primaryRole!, role);
    return validation.valid;
  });
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={switching}>
          <Users className="h-4 w-4 mr-2" />
          {ROLE_INFO[primaryRole!]?.label || 'Select Role'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {availableRoles.map(role => (
          <DropdownMenuItem 
            key={role}
            onClick={() => handleRoleSwitch(role)}
          >
            <span className={`mr-2 ${ROLE_INFO[role].color}`}>
              •
            </span>
            {ROLE_INFO[role].label}
          </DropdownMenuItem>
        ))}
        {availableRoles.length === 0 && (
          <DropdownMenuItem disabled>
            No other roles available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Optimization 3.2: Permission Caching

**File:** `src/hooks/usePermissions.ts`  
**Effort:** Small (2 hours)  
**Impact:** Medium

```typescript
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, hasPermission, hasAnyPermission, Permission } from '@/types/rbac';

export function usePermissions() {
  const { primaryRole, roles } = useAuth();
  
  // Memoize permission set for current role
  const currentPermissions = useMemo(() => {
    if (!primaryRole) return new Set<Permission>();
    return new Set(ROLE_PERMISSIONS[primaryRole] || []);
  }, [primaryRole]);
  
  // Memoize all permissions across all roles
  const allPermissions = useMemo(() => {
    const perms = new Set<Permission>();
    roles.forEach(role => {
      (ROLE_PERMISSIONS[role] || []).forEach(p => perms.add(p));
    });
    return perms;
  }, [roles]);
  
  const can = useCallback((permission: Permission) => {
    return currentPermissions.has(permission);
  }, [currentPermissions]);
  
  const canAny = useCallback((permissions: Permission[]) => {
    return permissions.some(p => currentPermissions.has(p));
  }, [currentPermissions]);
  
  const canAll = useCallback((permissions: Permission[]) => {
    return permissions.every(p => currentPermissions.has(p));
  }, [currentPermissions]);
  
  const canInAnyRole = useCallback((permission: Permission) => {
    return allPermissions.has(permission);
  }, [allPermissions]);
  
  return {
    can,
    canAny,
    canAll,
    canInAnyRole,
    permissions: currentPermissions,
    allPermissions,
  };
}
```

---

### Optimization 3.3: Workflow Progress Component

**File:** `src/components/workflow/PatientJourneyTracker.tsx`  
**Effort:** Medium (4 hours)  
**Impact:** Low

```typescript
import { CROSS_ROLE_WORKFLOWS, getWorkflowPath } from '@/utils/roleInterconnectionValidator';

interface PatientJourneyTrackerProps {
  patientId: string;
  workflowType?: keyof typeof CROSS_ROLE_WORKFLOWS;
}

export function PatientJourneyTracker({ 
  patientId, 
  workflowType = 'PATIENT_JOURNEY' 
}: PatientJourneyTrackerProps) {
  const workflow = getWorkflowPath(workflowType);
  const { data: completedSteps } = useQuery({
    queryKey: ['workflow-steps', patientId, workflowType],
    queryFn: () => fetchCompletedSteps(patientId, workflowType),
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {workflow.name}
        </CardTitle>
        <CardDescription>{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          {/* Steps */}
          <div className="space-y-4">
            {workflow.steps.map((step, index) => {
              const isCompleted = completedSteps?.includes(step.action);
              const isCurrent = !isCompleted && 
                (index === 0 || completedSteps?.includes(workflow.steps[index - 1].action));
              
              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Step indicator */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    !isCompleted && !isCurrent && "bg-white border-gray-300"
                  )}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ROLE_INFO[step.from].label}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge variant="outline">
                        {ROLE_INFO[step.to].label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {step.action.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Code Implementation Details

### File Changes Summary

| File | Type | Priority | Changes |
|------|------|----------|---------|
| `src/App.tsx` | Update | P0 | Add roles to 15+ route protections |
| `src/types/auth.ts` | Update | P0 | Fix UserRole type definition |
| `src/types/rbac.ts` | Update | P1 | Add dept_head permissions |
| `src/utils/roleInterconnectionValidator.ts` | Update | P1 | Expand communication matrix |
| `src/hooks/useWorkflowOrchestrator.ts` | Enhance | P2 | Add event types and tracking |
| `src/hooks/usePermissions.ts` | Create | P2 | Permission caching hook |
| `src/components/auth/RoleSwitcher.tsx` | Enhance | P3 | Add validation |
| `src/components/workflow/PatientJourneyTracker.tsx` | Create | P3 | Visual progress |
| `supabase/migrations/*_workflow_tables.sql` | Create | P2 | Database tables |
| `supabase/migrations/*_rls_policies.sql` | Create | P2 | RLS policies |

---

## Testing Strategy

### Unit Tests

```typescript
// src/test/role-interconnection.test.ts
describe('Role Interconnection System', () => {
  describe('validateRoleInterconnections', () => {
    it('should validate all role hierarchies correctly', () => {
      const result = validateRoleInterconnections();
      expect(result.details.roleHierarchyValid).toBe(true);
    });
    
    it('should identify all communication paths', () => {
      const result = validateRoleInterconnections();
      expect(result.details.communicationPathsValid).toBe(true);
    });
    
    it('should validate all workflows', () => {
      const workflows = validateAllWorkflows();
      workflows.forEach(wf => {
        expect(wf.valid).toBe(true);
      });
    });
  });
  
  describe('isValidRoleTransition', () => {
    it('should allow super_admin to transition to any role', () => {
      const roles: UserRole[] = ['admin', 'doctor', 'nurse', 'patient'];
      roles.forEach(role => {
        expect(isValidRoleTransition('super_admin', role).valid).toBe(true);
      });
    });
    
    it('should prevent receptionist from transitioning', () => {
      const result = isValidRoleTransition('receptionist', 'doctor');
      expect(result.valid).toBe(false);
    });
  });
  
  describe('getCommunicationPartners', () => {
    it('should return bidirectional partners for doctor', () => {
      const partners = getCommunicationPartners('doctor');
      expect(partners.canCommunicateWith).toContain('nurse');
      expect(partners.canBeContactedBy).toContain('nurse');
    });
  });
});
```

### Integration Tests

```typescript
// src/test/integration/role-workflow.test.ts
describe('Role Workflow Integration', () => {
  it('should complete patient journey workflow', async () => {
    // Setup test data
    const patient = await createTestPatient();
    
    // Step 1: Receptionist check-in
    await actAs('receptionist', async () => {
      await checkInPatient(patient.id);
    });
    
    // Step 2: Nurse vitals
    await actAs('nurse', async () => {
      await recordVitals(patient.id, mockVitals);
    });
    
    // Step 3: Doctor consultation
    await actAs('doctor', async () => {
      const consultation = await startConsultation(patient.id);
      await createLabOrder(consultation.id, mockLabOrder);
      await createPrescription(consultation.id, mockPrescription);
    });
    
    // Verify workflow completion
    const workflow = await getPatientWorkflow(patient.id);
    expect(workflow.completedSteps).toHaveLength(3);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/role-switching.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Role Switching', () => {
  test('admin can switch to department head', async ({ page }) => {
    await loginAs(page, 'admin@hospital.com');
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-dept_head"]');
    await expect(page.locator('[data-testid="current-role"]')).toHaveText('Department Head');
  });
  
  test('receptionist cannot access reports', async ({ page }) => {
    await loginAs(page, 'receptionist@hospital.com');
    await page.goto('/reports');
    await expect(page).toHaveURL('/unauthorized');
  });
});
```

---

## Rollout Plan

### Stage 1: Development (Week 1)
- [ ] Complete Phase 1 fixes
- [ ] Write unit tests
- [ ] Code review
- [ ] Deploy to development environment

### Stage 2: Testing (Week 2)
- [ ] Complete Phase 2 enhancements
- [ ] Integration testing
- [ ] Performance testing
- [ ] Security audit

### Stage 3: Staging (Week 3)
- [ ] Complete Phase 3 optimizations
- [ ] E2E testing on staging
- [ ] UAT with stakeholders
- [ ] Documentation updates

### Stage 4: Production (Week 4)
- [ ] Deploy database migrations
- [ ] Deploy application changes
- [ ] Monitor for issues
- [ ] Post-deployment verification

### Rollback Plan
1. Keep previous deployment artifacts for 7 days
2. Database migrations have DOWN migrations
3. Feature flags for new workflow features
4. Monitoring alerts for error rate spikes

---

## Appendix: Quick Reference Commands

```bash
# Run role validation
npm run validate:roles

# Run role tests
npm run test:roles

# Generate migration
npm run supabase:migration:create add_workflow_tables

# Apply migrations
npm run supabase:migration:up

# Check route coverage
npm run audit:routes
```

---

**Document Status:** Ready for Implementation  
**Approved By:** [Pending]  
**Implementation Start Date:** [TBD]
