# CareSync HIMS — Comprehensive Production-Readiness Plan

**Document Version**: 1.1
**Date**: March 31, 2026
**Status**: DRAFT — Pending Review & Approval
**Overall Assessment**: 80% Complete — 15-20 hours to production-ready
**Skills Integration**: All tasks mapped to available CareSync skills

---

## Executive Summary

CareSync HIMS is a Healthcare Information Management System built with React/TypeScript frontend and Supabase backend. The application has completed Phases 1-5B with comprehensive security, audit trail, and testing infrastructure. **Phase 6 (Staged Rollout) requires 15-20 hours of focused work** to achieve production readiness.

### Available Skills

This plan leverages 20 specialized CareSync skills:

| Skill | Purpose | Use In Plan |
|-------|---------|-------------|
| `hims-rbac-abac` | Role-based access control | Phase 1.1, 1.2 |
| `hims-security-companion` | Security validation | Phase 1.1, 1.2 |
| `hims-privacy-enforcer` | PHI protection | Phase 1.2 |
| `hims-audit-trail` | Audit logging | Phase 2.2 |
| `hims-observability` | Monitoring & metrics | Phase 4.1 |
| `hims-devops-guardian` | CI/CD & deployment | Phase 4.2 |
| `hims-clinical-forms` | Clinical validation | Phase 1.4 |
| `hims-domain-expert` | Healthcare domain | Phase 1.4 |
| `hims-error-resilience` | Error handling | Phase 2.1 |
| `hims-performance-safety` | Performance optimization | Phase 2.1 |
| `hims-e2e-testing-complete` | E2E test coverage | Phase 3.1 |
| `hims-browser-test-automation` | Browser testing | Phase 3.1 |
| `hims-edgecase-tester` | Edge case testing | Phase 3.2 |
| `frontend-design` | UI/UX improvements | Phase 2.1, 2.2 |
| `hims-onboarding-helper` | Developer onboarding | Phase 4.2 |
| `hims-documentation-coach` | Documentation | Phase 5.1 |
| `hims-billing-validator` | Billing validation | Phase 1.3 |
| `hims-fhir-specialist` | FHIR compliance | Phase 3.2 |
| `product-strategy-session` | Product planning | Phase 5.1 |
| `workflow-creator` | Workflow design | Phase 1.4 |

### Current State

| Category | Status | Completion |
|----------|--------|------------|
| **Core Features** | ✅ Complete | 100% |
| **Security (RLS, RBAC)** | ✅ Complete | 100% |
| **Audit Trail** | ✅ Complete | 100% |
| **Testing Infrastructure** | ✅ Complete | 90% |
| **Monitoring & Metrics** | ⚠️ Partial | 70% |
| **Deployment Procedures** | ❌ Missing | 0% |
| **Active Bugs** | ⚠️ 27 Open | 40% Fixed |

### Critical Blockers (Must Fix Before Production)

1. **Route-Level Permission Enforcement** (BUG-PERM-001) — P0 Critical
2. **Patient Demographics Edit Restrictions** (BUG-PERM-002) — P0 Critical
3. **Dashboard Data Consistency** (BUG-DATA-SYNC-001, 002, 003) — P0/P1 Critical
4. **Consultation Workflow Validation** (BUG-WF-VALIDATION-001) — P0 Critical

---

## Phase 1: Critical Security Fixes (Week 1 — 8-10 hours)

### 1.1 Route-Level Permission Enforcement (BUG-PERM-001)

**Skill**: `hims-rbac-abac` + `hims-security-companion`

**Prompt to use**:
```
Using the hims-rbac-abac and hims-security-companion skills, help me:
1. Create centralized route permission enforcement middleware
2. Implement route-level RBAC checks that cannot be bypassed via direct URL access
3. Add permission denial logging for security audit trail
4. Validate that all protected routes enforce hospital_id scoping
5. Create E2E tests to verify permission enforcement across all 7 roles
```

**Problem**: Route-level access control is applied only to sidebar navigation, not at the route handler or middleware level. URL-based access bypasses all sidebar guards.

**Impact**: Unauthorized roles can view and modify sensitive admin data (hospital settings, staff management, financial reports).

**Root Cause**: The `withRoleAccess` function in [`routeDefinitions.tsx`](src/routes/routeDefinitions.tsx:204) wraps routes with `RoleProtectedRoute`, but the protection is only enforced at component render time, not at the route matching level.

**Solution**:

```typescript
// Create middleware-level route protection
// File: src/middleware/routeGuard.ts

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types/auth';
import type { Permission } from '@/lib/permissions';

interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
}

const ROUTE_PERMISSIONS: RouteConfig[] = [
  { path: '/settings', allowedRoles: ['admin'], requiredPermission: 'settings' },
  { path: '/settings/staff', allowedRoles: ['admin'], requiredPermission: 'staff-management' },
  { path: '/settings/performance', allowedRoles: ['admin'], requiredPermission: 'staff-performance' },
  { path: '/settings/activity', allowedRoles: ['admin'], requiredPermission: 'activity-logs' },
  { path: '/settings/monitoring', allowedRoles: ['admin'], requiredPermission: 'system-monitoring' },
  { path: '/reports', allowedRoles: ['admin'], requiredPermission: 'reports' },
  // ... all other protected routes
];

export function useRouteGuard() {
  const { primaryRole, roles } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  const checkAccess = (path: string): boolean => {
    const config = ROUTE_PERMISSIONS.find(r => path.startsWith(r.path));
    if (!config) return true; // Public route

    const hasRole = config.allowedRoles.includes(primaryRole);
    const hasPermission = config.requiredPermission ? can(config.requiredPermission) : true;

    return hasRole && hasPermission;
  };

  return { checkAccess, currentPath: location.pathname };
}
```

**Implementation Steps**:

1. Create `src/middleware/routeGuard.ts` with centralized route permission configuration
2. Update `ProtectedRoute` component to use route guard before rendering
3. Add server-side validation in Supabase Edge Functions for sensitive operations
4. Add E2E tests to verify permission enforcement across all roles
5. Update `usePermissionAudit` to log all access attempts (successful and denied)

**Files to Modify**:
- [`src/routes/routeDefinitions.tsx`](src/routes/routeDefinitions.tsx:82) — Add route guard to ProtectedRoute
- [`src/components/auth/RoleProtectedRoute.tsx`](src/components/auth/RoleProtectedRoute.tsx) — Enhance with middleware check
- [`src/hooks/usePermissionAudit.ts`](src/hooks/usePermissionAudit.ts:20) — Log all access attempts

**Testing**:
```bash
# Add to tests/security/route-permissions.test.ts
npm run test:security -- tests/security/route-permissions.test.ts
```

**Estimated Duration**: 3-4 hours

---

### 1.2 Patient Demographics Edit Restrictions (BUG-PERM-002)

**Skill**: `hims-privacy-enforcer` + `hims-rbac-abac`

**Prompt to use**:
```
Using the hims-privacy-enforcer and hims-rbac-abac skills, help me:
1. Split patient detail page into demographics (admin/receptionist only) and clinical (doctor/nurse) sections
2. Implement role-based conditional rendering for edit buttons
3. Add backend validation to reject unauthorized demographic updates
4. Ensure PHI is protected from unauthorized modification
5. Add audit logging for all demographic changes
```

**Problem**: Doctor role can edit patient demographics (First Name, Last Name, Phone, Email, Address, Insurance Provider, Policy Number).

**Impact**: Clinical staff can modify patient identification data, compromising data integrity and audit trails.

**Root Cause**: Patient detail page "Edit Details" button is not role-gated. The edit form renders for all roles with write access to patients.

**Solution**:

```typescript
// File: src/components/patients/PatientDemographicsForm.tsx

import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

export function PatientDemographicsForm({ patient, onSave }) {
  const { primaryRole } = useAuth();
  const { can } = usePermissions();

  // Only admin and receptionist can edit demographics
  const canEditDemographics = primaryRole === 'admin' || primaryRole === 'receptionist';

  // Doctor can only edit clinical sections
  const canEditClinical = ['admin', 'doctor', 'nurse'].includes(primaryRole);

  return (
    <div>
      {/* Demographics Section - Read-only for Doctor */}
      <section>
        <h3>Patient Demographics</h3>
        {canEditDemographics ? (
          <EditableDemographicsForm patient={patient} onSave={onSave} />
        ) : (
          <ReadOnlyDemographicsView patient={patient} />
        )}
      </section>

      {/* Clinical Section - Editable for Doctor */}
      <section>
        <h3>Clinical Information</h3>
        {canEditClinical ? (
          <EditableClinicalForm patient={patient} onSave={onSave} />
        ) : (
          <ReadOnlyClinicalView patient={patient} />
        )}
      </section>
    </div>
  );
}
```

**Implementation Steps**:

1. Split patient detail page into demographics and clinical sections
2. Add role-based conditional rendering for edit buttons
3. Update `PatientProfilePage` to enforce edit restrictions
4. Add backend validation in Supabase to reject unauthorized demographic updates
5. Add audit logging for demographic changes

**Files to Modify**:
- [`src/pages/patients/PatientProfilePage.tsx`](src/pages/patients/PatientProfilePage.tsx) — Add role checks
- [`src/hooks/usePatients.ts`](src/hooks/usePatients.ts:12481) — Add validation layer
- Create `src/components/patients/ReadOnlyDemographicsView.tsx`

**Testing**:
```bash
# Add to tests/security/patient-edit-permissions.test.ts
npm run test:security -- tests/security/patient-edit-permissions.test.ts
```

**Estimated Duration**: 2-3 hours

---

### 1.3 Dashboard Data Consistency (BUG-DATA-SYNC-001, 002, 003)

**Skill**: `hims-billing-validator` + `hims-error-resilience`

**Prompt to use**:
```
Using the hims-billing-validator and hims-error-resilience skills, help me:
1. Create unified useDashboardMetrics hook as single source of truth for all KPIs
2. Ensure billing and appointment counts are consistent across all views
3. Add data validation layer to catch inconsistencies before they reach UI
4. Implement real-time subscriptions for live dashboard updates
5. Add error handling for stale or missing data scenarios
```

**Problem**: Multiple data mismatches across dashboard KPIs:
- Today's Appointments: Dashboard KPI shows 15, panel shows 0, module shows 1
- Total Patients: Dashboard shows 42, module shows 50
- Pending Labs: Dashboard shows 4, module shows 3
- Queue Metrics: Dashboard shows 3 waiting, module shows 0

**Impact**: Cannot trust dashboard metrics; impacts clinical decision-making and reporting.

**Root Cause**: Different components use different data sources and query scopes:
- KPI cards aggregate from stale data store or use different date filters
- Modules reflect live state from database
- No unified data access layer for dashboard metrics

**Solution**:

```typescript
// File: src/hooks/useDashboardMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

export interface DashboardMetrics {
  todayAppointments: number;
  totalPatients: number;
  pendingLabs: number;
  queueWaiting: number;
  queueInService: number;
  completedToday: number;
  cancelledToday: number;
}

export function useDashboardMetrics() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['dashboard-metrics', hospital?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!hospital?.id) throw new Error('No hospital context');

      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Single source of truth for all dashboard metrics
      const [
        appointmentsResult,
        patientsResult,
        labOrdersResult,
        queueResult,
      ] = await Promise.all([
        // Today's appointments
        supabase
          .from('appointments')
          .select('id, status', { count: 'exact' })
          .eq('hospital_id', hospital.id)
          .gte('appointment_date', todayStart)
          .lte('appointment_date', todayEnd),

        // Total patients
        supabase
          .from('patients')
          .select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id),

        // Pending lab orders
        supabase
          .from('lab_orders')
          .select('id, priority', { count: 'exact' })
          .eq('hospital_id', hospital.id)
          .in('status', ['pending', 'in_progress']),

        // Queue status
        supabase
          .from('patient_queue')
          .select('id, status', { count: 'exact' })
          .eq('hospital_id', hospital.id)
          .in('status', ['waiting', 'in_service']),
      ]);

      // Calculate metrics from single source
      const appointments = appointmentsResult.data || [];
      const queue = queueResult.data || [];

      return {
        todayAppointments: appointmentsResult.count || 0,
        totalPatients: patientsResult.count || 0,
        pendingLabs: labOrdersResult.count || 0,
        queueWaiting: queue.filter(q => q.status === 'waiting').length,
        queueInService: queue.filter(q => q.status === 'in_service').length,
        completedToday: appointments.filter(a => a.status === 'completed').length,
        cancelledToday: appointments.filter(a => a.status === 'cancelled').length,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}
```

**Implementation Steps**:

1. Create unified `useDashboardMetrics` hook as single source of truth
2. Update all dashboard KPI cards to use this hook
3. Remove duplicate data fetching from individual components
4. Add real-time subscriptions for live updates
5. Add data validation layer to catch inconsistencies

**Files to Modify**:
- Create `src/hooks/useDashboardMetrics.ts`
- [`src/components/dashboard/AdminDashboard.tsx`](src/components/dashboard/AdminDashboard.tsx) — Use unified hook
- [`src/components/dashboard/DoctorDashboard.tsx`](src/components/dashboard/DoctorDashboard.tsx) — Use unified hook
- [`src/components/dashboard/NurseDashboard.tsx`](src/components/dashboard/NurseDashboard.tsx) — Use unified hook
- [`src/hooks/useAdminStats.ts`](src/hooks/useAdminStats.ts:13368) — Refactor to use unified hook

**Testing**:
```bash
# Add to tests/unit/dashboard-metrics.test.ts
npm run test:unit -- tests/unit/dashboard-metrics.test.ts
```

**Estimated Duration**: 3-4 hours

---

### 1.4 Consultation Workflow Validation (BUG-WF-VALIDATION-001)

**Skill**: `hims-clinical-forms` + `hims-domain-expert` + `workflow-creator`

**Prompt to use**:
```
Using the hims-clinical-forms, hims-domain-expert, and workflow-creator skills, help me:
1. Create Zod validation schemas for each consultation step (Chief Complaint, Diagnosis, Treatment Plan)
2. Define required clinical fields based on healthcare domain best practices
3. Add visual feedback for validation errors in consultation workflow
4. Prevent step progression until validation passes
5. Add backend validation in Supabase to reject incomplete consultations
```

**Problem**: Consultation steps can be completed without entering any clinical data. Empty Chief Complaint, Diagnosis, and Treatment Plan are accepted.

**Impact**: Incomplete/blank consultations can be signed off and locked, creating invalid clinical records.

**Root Cause**: No validation on required clinical fields before allowing step progression.

**Solution**:

```typescript
// File: src/lib/validation/consultationValidation.ts

import { z } from 'zod';

export const chiefComplaintSchema = z.object({
  chief_complaint: z.string()
    .min(10, 'Chief complaint must be at least 10 characters')
    .max(2000, 'Chief complaint must not exceed 2000 characters'),
  history_of_present_illness: z.string()
    .min(20, 'HPI must be at least 20 characters')
    .max(5000, 'HPI must not exceed 5000 characters'),
  onset: z.string().optional(),
  location: z.string().optional(),
  duration: z.string().optional(),
  character: z.string().optional(),
  aggravating_factors: z.string().optional(),
  relieving_factors: z.string().optional(),
  timing: z.string().optional(),
  severity: z.number().min(1).max(10).optional(),
});

export const diagnosisSchema = z.object({
  primary_diagnosis: z.string().min(1, 'Primary diagnosis is required'),
  icd10_code: z.string().min(1, 'ICD-10 code is required'),
  secondary_diagnoses: z.array(z.object({
    diagnosis: z.string(),
    icd10_code: z.string(),
  })).optional(),
  differential_diagnoses: z.array(z.string()).optional(),
  clinical_reasoning: z.string()
    .min(50, 'Clinical reasoning must be at least 50 characters')
    .max(3000, 'Clinical reasoning must not exceed 3000 characters'),
});

export const treatmentPlanSchema = z.object({
  treatment_plan: z.string()
    .min(20, 'Treatment plan must be at least 20 characters')
    .max(5000, 'Treatment plan must not exceed 5000 characters'),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })).min(1, 'At least one medication is required'),
  follow_up: z.string().optional(),
  referrals: z.array(z.string()).optional(),
  patient_education: z.string().optional(),
});

export function validateConsultationStep(step: number, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (step) {
    case 1: // Chief Complaint
      const ccResult = chiefComplaintSchema.safeParse(data);
      if (!ccResult.success) {
        errors.push(...ccResult.error.errors.map(e => e.message));
      }
      break;

    case 2: // Diagnosis
      const dxResult = diagnosisSchema.safeParse(data);
      if (!dxResult.success) {
        errors.push(...dxResult.error.errors.map(e => e.message));
      }
      break;

    case 3: // Treatment Plan
      const txResult = treatmentPlanSchema.safeParse(data);
      if (!txResult.success) {
        errors.push(...txResult.error.errors.map(e => e.message));
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}
```

**Implementation Steps**:

1. Create validation schemas for each consultation step
2. Integrate validation into consultation workflow components
3. Add visual feedback for validation errors
4. Prevent step progression until validation passes
5. Add backend validation in Supabase to reject invalid consultations

**Files to Modify**:
- Create `src/lib/validation/consultationValidation.ts`
- [`src/components/consultations/steps/ChiefComplaintStep.tsx`](src/components/consultations/steps/ChiefComplaintStep.tsx) — Add validation
- [`src/components/consultations/steps/DiagnosisStep.tsx`](src/components/consultations/steps/DiagnosisStep.tsx) — Add validation
- [`src/components/consultations/steps/TreatmentPlanStep.tsx`](src/components/consultations/steps/TreatmentPlanStep.tsx) — Add validation
- [`src/hooks/useConsultations.ts`](src/hooks/useConsultations.ts:22535) — Add validation layer

**Testing**:
```bash
# Add to tests/unit/consultation-validation.test.ts
npm run test:unit -- tests/unit/consultation-validation.test.ts
```

**Estimated Duration**: 2-3 hours

---

## Phase 2: Data Consistency & Real-Time Updates (Week 1 — 4-6 hours)

### 2.1 Real-Time Dashboard Updates (BUG-DASHBOARD-REACTIVITY-001)

**Skill**: `hims-performance-safety` + `hims-error-resilience` + `frontend-design`

**Prompt to use**:
```
Using the hims-performance-safety, hims-error-resilience, and frontend-design skills, help me:
1. Implement real-time dashboard updates via Supabase subscriptions
2. Ensure performance impact is <50ms per update
3. Add error handling for subscription failures
4. Implement optimistic UI updates for better user experience
5. Add loading states and error recovery patterns
```

**Problem**: Dashboard KPIs don't update after clinical actions. Counters update only after manual refresh.

**Solution**:

```typescript
// File: src/hooks/useRealtimeDashboard.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeDashboard() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hospital?.id) return;

    // Subscribe to relevant table changes
    const channels = [
      supabase
        .channel('dashboard-appointments')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospital.id}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        }),

      supabase
        .channel('dashboard-queue')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `hospital_id=eq.${hospital.id}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        }),

      supabase
        .channel('dashboard-lab-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'lab_orders',
          filter: `hospital_id=eq.${hospital.id}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        }),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [hospital?.id, queryClient]);
}
```

**Estimated Duration**: 2-3 hours

---

### 2.2 Recent Activity Feed Population (BUG-RECENT-ACTIVITY-001)

**Skill**: `hims-audit-trail` + `frontend-design`

**Prompt to use**:
```
Using the hims-audit-trail and frontend-design skills, help me:
1. Create useRecentActivity hook to fetch and display recent clinical actions
2. Ensure activity feed shows relevant actions (consultations, prescriptions, lab orders)
3. Add proper formatting and timestamps for activity items
4. Implement real-time updates for activity feed
5. Add filtering and search capabilities for activity feed
```

**Problem**: Recent Activity widget shows nothing even after clinical actions.

**Solution**:

```typescript
// File: src/hooks/useRecentActivity.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityItem {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
  user_name: string;
}

export function useRecentActivity(limit = 20) {
  const { hospital, user } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', hospital?.id, user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!hospital?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action_type,
          entity_type,
          entity_id,
          details,
          created_at,
          profiles!inner(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .or(`user_id.eq.${user.id},entity_type.in.(consultation,prescription,lab_order)`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        user_name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
```

**Estimated Duration**: 2-3 hours

---

## Phase 3: Testing & Quality Assurance (Week 2 — 6-8 hours)

### 3.1 Complete Accessibility Tests

**Skill**: `hims-e2e-testing-complete` + `hims-browser-test-automation`

**Prompt to use**:
```
Using the hims-e2e-testing-complete and hims-browser-test-automation skills, help me:
1. Add axe-core assertions to all page components
2. Test keyboard navigation across all workflows
3. Verify screen reader compatibility
4. Test color contrast ratios (WCAG AAA 7:1)
5. Add ARIA labels where missing
```

**Current Status**: Stubs in place, WCAG AAA assertions needed.

**Implementation Steps**:

1. Add axe-core assertions to all page components
2. Test keyboard navigation across all workflows
3. Verify screen reader compatibility
4. Test color contrast ratios
5. Add ARIA labels where missing

**Files to Create/Modify**:
- `tests/accessibility/dashboard.test.tsx`
- `tests/accessibility/patients.test.tsx`
- `tests/accessibility/consultations.test.tsx`
- `tests/accessibility/pharmacy.test.tsx`
- `tests/accessibility/laboratory.test.tsx`

**Estimated Duration**: 3-4 hours

---

### 3.2 Disaster Recovery Testing

**Skill**: `hims-edgecase-tester` + `hims-fhir-specialist`

**Prompt to use**:
```
Using the hims-edgecase-tester and hims-fhir-specialist skills, help me:
1. Test database backup restoration procedures
2. Test rollback procedures for feature flags
3. Test multi-hospital isolation under load
4. Validate FHIR compliance during disaster recovery
5. Document recovery time objectives (RTO/RPO)
```

**Current Status**: Documented but not tested.

**Implementation Steps**:

1. Test database backup restoration
2. Test rollback procedures
3. Test feature flag kill-switch
4. Test multi-hospital isolation under load
5. Document recovery time objectives (RTO/RPO)

**Estimated Duration**: 3-4 hours

---

## Phase 4: Deployment & Operations (Week 2 — 4-6 hours)

### 4.1 Grafana Dashboard Configuration

**Skill**: `hims-observability`

**Prompt to use**:
```
Using the hims-observability skill, help me:
1. Deploy clinical-operations.json dashboard to Grafana
2. Configure Prometheus alert rules for SLO breaches
3. Wire metrics into clinical workflows (prescriptions, labs, vitals)
4. Test alert thresholds and notification channels
5. Document dashboard usage and interpretation
```

**Current Status**: Dashboard JSON exists but not fully configured.

**Implementation Steps**:

1. Deploy clinical-operations.json dashboard to Grafana
2. Configure Prometheus alert rules
3. Wire metrics into clinical workflows
4. Test alert thresholds
5. Document dashboard usage

**Files to Modify**:
- [`monitoring/grafana/dashboards/clinical-operations.json`](monitoring/grafana/dashboards/clinical-operations.json)
- [`monitoring/alert_rules.yml`](monitoring/alert_rules.yml)

**Estimated Duration**: 2-3 hours

---

### 4.2 Deployment Playbook Finalization

**Skill**: `hims-devops-guardian` + `hims-onboarding-helper`

**Prompt to use**:
```
Using the hims-devops-guardian and hims-onboarding-helper skills, help me:
1. Validate canary rollout procedures (10% → 50% → 100%)
2. Test rollback scripts and procedures
3. Document on-call runbooks for critical scenarios
4. Create incident response templates
5. Schedule tabletop exercise with team
```

**Current Status**: Playbook exists but needs validation.

**Implementation Steps**:

1. Validate canary rollout procedures
2. Test rollback scripts
3. Document on-call runbooks
4. Create incident response templates
5. Schedule tabletop exercise

**Files to Modify**:
- [`docs/PHASE_6_DEPLOYMENT_PLAYBOOK.md`](docs/PHASE_6_DEPLOYMENT_PLAYBOOK.md)
- [`docs/ROLLBACK_PROCEDURES.md`](docs/ROLLBACK_PROCEDURES.md)

**Estimated Duration**: 2-3 hours

---

## Phase 5: Final Validation & Sign-Off (Week 2 — 2-3 hours)

### 5.1 Pre-Production Checklist

**Skill**: `hims-documentation-coach` + `product-strategy-session`

**Prompt to use**:
```
Using the hims-documentation-coach and product-strategy-session skills, help me:
1. Create comprehensive pre-production checklist
2. Document all success criteria and validation steps
3. Create stakeholder sign-off templates
4. Plan post-launch monitoring and feedback collection
5. Create product strategy for Phase 7 enhancements
```

```markdown
## Code Quality
- [ ] TypeScript strict mode: 0 errors
- [ ] Unit tests: 100% pass
- [ ] Integration tests: 100% pass
- [ ] E2E smoke tests: 100% pass
- [ ] Accessibility tests: 100% pass
- [ ] Security tests: 100% pass
- [ ] No console.log in production code
- [ ] No hardcoded secrets

## Security
- [ ] RLS policies validated on all 46 tables
- [ ] Route-level permission enforcement verified
- [ ] Patient demographics edit restrictions enforced
- [ ] PHI logging audit passed
- [ ] Encryption metadata tracked

## Data Integrity
- [ ] Dashboard metrics unified and consistent
- [ ] Real-time updates working
- [ ] Recent activity feed populated
- [ ] Consultation validation enforced

## Operations
- [ ] Grafana dashboards deployed
- [ ] Alert rules configured
- [ ] Deployment playbook validated
- [ ] Rollback procedures tested
- [ ] Disaster recovery tested

## Approvals
- [ ] QA sign-off
- [ ] Dev lead sign-off
- [ ] Clinical expert sign-off
- [ ] CTO security review
```

**Estimated Duration**: 2-3 hours

---

## Implementation Timeline

```
WEEK 1 (March 31 - April 4)
├─ Day 1-2: Phase 1.1 — Route Permission Enforcement (3-4h)
├─ Day 2-3: Phase 1.2 — Patient Demographics Restrictions (2-3h)
├─ Day 3-4: Phase 1.3 — Dashboard Data Consistency (3-4h)
└─ Day 4-5: Phase 1.4 — Consultation Validation (2-3h)

WEEK 2 (April 7-11)
├─ Day 1: Phase 2.1 — Real-Time Updates (2-3h)
├─ Day 1-2: Phase 2.2 — Activity Feed (2-3h)
├─ Day 2-3: Phase 3.1 — Accessibility Tests (3-4h)
├─ Day 3-4: Phase 3.2 — Disaster Recovery Testing (3-4h)
├─ Day 4: Phase 4.1 — Grafana Configuration (2-3h)
├─ Day 4-5: Phase 4.2 — Deployment Playbook (2-3h)
└─ Day 5: Phase 5.1 — Final Validation & Sign-Off (2-3h)

TOTAL: 15-20 hours over 2 weeks
```

---

## Resource Requirements

| Role | Hours | Availability |
|------|-------|--------------|
| **Dev 1** (Frontend) | 8-10h | Week 1 |
| **Dev 2** (Backend/DevOps) | 6-8h | Week 1-2 |
| **QA Lead** | 3-4h | Week 2 |
| **Clinical Expert** | 1-2h | Week 2 |
| **CTO** | 1-2h | Week 2 |

**Total**: 15-20 developer hours

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Permission bypass discovered in production | High | Critical | Phase 1.1 fixes this |
| Data inconsistency causes clinical errors | High | Critical | Phase 1.3 fixes this |
| Incomplete consultations locked | Medium | High | Phase 1.4 fixes this |
| Deployment without rollback capability | Medium | High | Phase 4.2 fixes this |
| Accessibility lawsuit | Low | Medium | Phase 3.1 addresses this |

---

## Success Criteria

### Technical Metrics
- ✅ 0 TypeScript errors
- ✅ 100% unit test pass rate
- ✅ 100% integration test pass rate
- ✅ 100% E2E smoke test pass rate
- ✅ 100% accessibility test pass rate
- ✅ 0 critical security vulnerabilities
- ✅ All 46 tables have RLS policies
- ✅ Dashboard metrics 100% consistent

### Operational Metrics
- ✅ Grafana dashboards operational
- ✅ Alert rules firing correctly
- ✅ Rollback procedures tested
- ✅ Disaster recovery tested
- ✅ Deployment playbook validated

### Business Metrics
- ✅ All 7 user roles can complete workflows
- ✅ No unauthorized data access
- ✅ Audit trail complete for compliance
- ✅ Real-time updates working
- ✅ Clinical workflows validated

---

## Post-Launch Monitoring

### Week 1 Post-Launch
- Monitor error rates (target < 0.1%)
- Monitor latency p99 (target < 5s)
- Track feature flag rollout progress
- Collect user feedback

### Week 2-4 Post-Launch
- Analyze usage patterns
- Identify performance bottlenecks
- Plan Phase 7 enhancements
- Conduct post-mortem review

---

## Appendix A: Bug Priority Matrix

| Bug ID | Description | Severity | Phase | Status |
|--------|-------------|----------|-------|--------|
| BUG-PERM-001 | Role Leakage (Systemic) | P0 Critical | 1.1 | 🔴 Open |
| BUG-PERM-002 | Doctor Can Edit Demographics | P0 Critical | 1.2 | 🔴 Open |
| BUG-DATA-SYNC-001 | Appointments 3-Way Mismatch | P0 Critical | 1.3 | 🔴 Open |
| BUG-WF-VALIDATION-001 | Consultation No Validation | P0 Critical | 1.4 | 🔴 Open |
| BUG-DATA-MISMATCH-001 | Total Patients Count | P1 High | 1.3 | 🔴 Open |
| BUG-DATA-MISMATCH-002 | Pending Labs Count | P1 High | 1.3 | 🔴 Open |
| BUG-DATA-MISMATCH-003 | Queue Metrics Inconsistent | P1 High | 1.3 | 🔴 Open |
| BUG-DOCTOR-DATA-001 | Doctor Dashboard Patient Count | P1 High | 1.3 | 🔴 Open |
| BUG-UI-OVERFLOW-001 | Appointments Table Scroll | P1 High | 2.1 | 🔴 Open |
| BUG-PERM-ROLELEAKAGE-001 | Lab Tech Queue Access | P2 Medium | 1.1 | 🔴 Open |
| BUG-WF-CONSULTATION-001 | Completed Consultation Edit | P2 Medium | 1.4 | 🔴 Open |
| BUG-DATA-MISMATCH-004 | Appointments Completed Count | P2 Medium | 1.3 | 🔴 Open |
| BUG-DATA-MISMATCH-005 | Reports Patients Seen | P2 Medium | 1.3 | 🔴 Open |
| BUG-DATA-MISMATCH-006 | Workflow Stage Performance | P2 Medium | 2.1 | 🔴 Open |
| BUG-DATA-MISMATCH-007 | Nurse Dashboard Ready Count | P2 Medium | 1.3 | 🔴 Open |
| BUG-SEARCH-001 | Patient Search False Matches | P2 Medium | 2.1 | 🔴 Open |
| BUG-UI-GREETING-001 | Doctor Dashboard Greeting | P3 Low | 2.1 | 🔴 Open |
| BUG-RECENT-ACTIVITY-001 | Activity Feed Empty | P2 Medium | 2.2 | 🔴 Open |
| BUG-DASHBOARD-REACTIVITY-001 | KPI No Real-Time Update | P2 Medium | 2.1 | 🔴 Open |
| BUG-TESTDATA-001 | Inconsistent Gender Tags | P3 Low | Cleanup | 🔴 Open |
| BUG-TESTDATA-002 | Admin Listed as Patient | P3 Low | Cleanup | 🔴 Open |
| BUG-TESTDATA-003 | MRN Format Inconsistency | P3 Low | Cleanup | 🔴 Open |
| BUG-TESTDATA-004 | Duplicate Queue Entries | P3 Low | Cleanup | 🔴 Open |
| BUG-UI-GENDER-BREAKDOWN-001 | Gender Breakdown Gap | P3 Low | 2.1 | 🔴 Open |
| BUG-KIOSK-BRANDING-001 | Kiosk Hardcoded Branding | P3 Low | 2.1 | 🔴 Open |

---

## Appendix B: File Modification Index

### New Files to Create
- `src/middleware/routeGuard.ts` — Centralized route permission enforcement
- `src/hooks/useDashboardMetrics.ts` — Unified dashboard data source
- `src/hooks/useRealtimeDashboard.ts` — Real-time dashboard updates
- `src/hooks/useRecentActivity.ts` — Recent activity feed
- `src/lib/validation/consultationValidation.ts` — Consultation step validation
- `src/components/patients/ReadOnlyDemographicsView.tsx` — Read-only demographics view
- `tests/security/route-permissions.test.ts` — Route permission tests
- `tests/security/patient-edit-permissions.test.ts` — Patient edit permission tests
- `tests/unit/dashboard-metrics.test.ts` — Dashboard metrics tests
- `tests/unit/consultation-validation.test.ts` — Consultation validation tests
- `tests/accessibility/dashboard.test.tsx` — Dashboard accessibility tests
- `tests/accessibility/patients.test.tsx` — Patients page accessibility tests

### Files to Modify
- [`src/routes/routeDefinitions.tsx`](src/routes/routeDefinitions.tsx:82) — Add route guard
- [`src/components/auth/RoleProtectedRoute.tsx`](src/components/auth/RoleProtectedRoute.tsx) — Enhance protection
- [`src/hooks/usePermissionAudit.ts`](src/hooks/usePermissionAudit.ts:20) — Log all access attempts
- [`src/pages/patients/PatientProfilePage.tsx`](src/pages/patients/PatientProfilePage.tsx) — Add role checks
- [`src/hooks/usePatients.ts`](src/hooks/usePatients.ts:12481) — Add validation layer
- [`src/components/dashboard/AdminDashboard.tsx`](src/components/dashboard/AdminDashboard.tsx) — Use unified hook
- [`src/components/dashboard/DoctorDashboard.tsx`](src/components/dashboard/DoctorDashboard.tsx) — Use unified hook
- [`src/components/dashboard/NurseDashboard.tsx`](src/components/dashboard/NurseDashboard.tsx) — Use unified hook
- [`src/hooks/useAdminStats.ts`](src/hooks/useAdminStats.ts:13368) — Refactor to use unified hook
- [`src/components/consultations/steps/ChiefComplaintStep.tsx`](src/components/consultations/steps/ChiefComplaintStep.tsx) — Add validation
- [`src/components/consultations/steps/DiagnosisStep.tsx`](src/components/consultations/steps/DiagnosisStep.tsx) — Add validation
- [`src/components/consultations/steps/TreatmentPlanStep.tsx`](src/components/consultations/steps/TreatmentPlanStep.tsx) — Add validation
- [`src/hooks/useConsultations.ts`](src/hooks/useConsultations.ts:22535) — Add validation layer
- [`monitoring/grafana/dashboards/clinical-operations.json`](monitoring/grafana/dashboards/clinical-operations.json) — Deploy dashboard
- [`monitoring/alert_rules.yml`](monitoring/alert_rules.yml) — Configure alerts
- [`docs/PHASE_6_DEPLOYMENT_PLAYBOOK.md`](docs/PHASE_6_DEPLOYMENT_PLAYBOOK.md) — Validate playbook
- [`docs/ROLLBACK_PROCEDURES.md`](docs/ROLLBACK_PROCEDURES.md) — Test rollback

---

## Appendix C: Testing Strategy

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific test suites
npm run test:unit -- tests/unit/dashboard-metrics.test.ts
npm run test:unit -- tests/unit/consultation-validation.test.ts
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration -- tests/integration/dashboard-consistency.test.ts
```

### Security Tests
```bash
# Run all security tests
npm run test:security

# Run specific security tests
npm run test:security -- tests/security/route-permissions.test.ts
npm run test:security -- tests/security/patient-edit-permissions.test.ts
```

### E2E Tests
```bash
# Run smoke tests
npm run test:e2e:smoke

# Run role-specific tests
npm run test:e2e:roles

# Run full E2E suite
npm run test:e2e:full
```

### Accessibility Tests
```bash
# Run accessibility tests
npm run test:accessibility
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 31, 2026 | Kilo Code (Architect) | Initial comprehensive plan |

**Next Review**: After Phase 1 completion (Week 1)  
**Approval Required**: CTO, Dev Lead, QA Lead, Clinical Expert

---

**END OF PLAN**
