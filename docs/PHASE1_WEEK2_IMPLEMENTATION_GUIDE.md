# Phase 1-2 Week 2: Authorization & Security Layer Implementation (Apr 18-24, 2026)

**Duration**: 1 week (35 hours)  
**Owner**: Security Engineer  
**Goal**: Consolidate RBAC/RLS authorization, achieve 100% pass rate on RLS tests  
**Success Criteria**: 0 cross-hospital data leaks, RBAC tests all green, hospital_id scoping validation complete

---

## Current State Analysis

**RBAC Hooks in src/hooks/**:
- `usePermissions.ts` - Role-based access control per user
- `usePermissionAudit.ts` - Audit trail for permission changes
- `useSession.ts` / `useSessionTimeout.ts` - Session management per role

**RLS Enforcement**: PostgreSQL row-level security policies (backend enforcement)

**Goal This Week**: Centralize auth logic to `src/lib/hooks/auth/`, verify 0 vulnerabilities

---

## Week 2 Implementation Tasks

### Task 2.1: Consolidate RBAC & Sessions (8 hours)

**Hooks to Migrate**:
```
src/hooks/usePermissions.ts           → src/lib/hooks/auth/usePermissions.ts
src/hooks/usePermissionAudit.ts       → src/lib/hooks/auth/usePermissionAudit.ts
src/hooks/useSessionTimeout.ts        → src/lib/hooks/auth/useSessionTimeout.ts
src/hooks/useTwoFactorAuth.ts         → src/lib/hooks/auth/useTwoFactorAuth.ts
```

**Sub-task 2.1.1: Create Auth Directory**
```bash
mkdir -p src/lib/hooks/auth
```

**Sub-task 2.1.2: Migrate RBAC Hooks**
- [ ] Copy `usePermissions.ts` to `src/lib/hooks/auth/`
- [ ] Copy `usePermissionAudit.ts` to `src/lib/hooks/auth/`
- [ ] Copy `useSessionTimeout.ts` to `src/lib/hooks/auth/`
- [ ] Copy `useTwoFactorAuth.ts` to `src/lib/hooks/auth/`

**Sub-task 2.1.3: Enhance usePermissions Hook**
Add fine-grained capability checks (example for doctor role):
```typescript
export function usePermissions() {
  const { profile } = useAuthContext();
  const { hospitalId } = useHospitalScope();
  
  const can = {
    // Doctor capabilities
    createConsultation: () => profile?.role === 'doctor',
    viewPatientHistory: () => profile?.role === 'doctor',
    writePrescription: () => profile?.role === 'doctor',
    
    // Nurse capabilities  
    createNurseNotes: () => profile?.role === 'nurse',
    updateVitals: () => profile?.role === 'nurse',
    dispenseReminder: () => profile?.role === 'nurse',
    
    // Pharmacist capabilities
    approvePrescription: () => profile?.role === 'pharmacist',
    managePrescriptionQueue: () => profile?.role === 'pharmacist',
    
    // Admin capabilities
    manageUsers: () => profile?.role === 'admin',
    configureHospital: () => profile?.role === 'admin',
    
    // All roles: hospital scoping
    accessData: (dataHospitalId: string) => dataHospitalId === hospitalId
  };
  
  return { can, role: profile?.role, hospitalId };
}
```

**Sub-task 2.1.4: Create RoleProtectedRoute Component**
Create `src/lib/components/RoleProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/lib/hooks/auth';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles, 
  fallback 
}: RoleProtectedRouteProps) {
  const { role } = usePermissions();
  
  if (!role) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role)) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
}
```

**Sub-task 2.1.5: Create Index File**
Create `src/lib/hooks/auth/index.ts`:
```typescript
export { usePermissions } from './usePermissions';
export { usePermissionAudit } from './usePermissionAudit';
export { useSessionTimeout } from './useSessionTimeout';
export { useTwoFactorAuth } from './useTwoFactorAuth';
export { useHospitalScope } from './useHospitalScope';
```

**Sub-task 2.1.6: Update All RBAC Imports**
```bash
# Find all permission hook imports
grep -r "from '@/hooks/usePermissions'" src/
grep -r "from '@/hooks/useSessionTimeout'" src/
# ... etc

# Replace with:
import { usePermissions } from '@/lib/hooks/auth';
```

**Sub-task 2.1.7: Verify RBAC Tests**
```bash
npm run test:unit -- src/hooks/__tests__/usePermissions.test.ts
npm run test:unit -- src/hooks/__tests__/useSessionTimeout.test.ts
npm run test:unit -- --grep "RBAC"

# Expected: 20+ tests passing
# Acceptance: All role-based access tests green
```

**Time Budget**: 8 hours

---

### Task 2.2: RLS Policy Validation & Testing (10 hours)

**Objective**: Verify Row-Level Security policies prevent cross-hospital data leaks

**Sub-task 2.2.1: Document Current RLS Policies**
List all RLS policies in production schema (reference from supabase/migrations/):

```sql
-- Example RLS policies to verify:
CREATE POLICY "hospital_scope_patients" ON public.patients
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "hospital_scope_appointments" ON public.appointments
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "hospital_scope_prescriptions" ON public.prescriptions
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));
```

**Sub-task 2.2.2: Create RLS Validation Test Suite**
Create `tests/security/rls-validation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Enforcement - Cross-Hospital Data Leak Prevention', () => {
  it('should prevent doctor from Hospital A accessing patients from Hospital B', async () => {
    // Setup: Create two hospitals with different doctors
    // Test: Doctor A tries to access Hospital B patients
    // Expected: 0 results (RLS blocks)
    expect(result).toEqual([]);
  });
  
  it('should prevent prescription access across hospitals', async () => {
    // Setup: Prescription in Hospital A
    // Test: Pharmacist from Hospital B tries to access
    // Expected: RLS error or empty result
  });
  
  it('should allow legitimate hospital-scoped access', async () => {
    // Setup: Doctor in Hospital A
    // Test: Access own hospital patients
    // Expected: Full result set (RLS allows)
  });
});
```

**Sub-task 2.2.3: Run RLS Test Suite**
```bash
npm run test:security -- tests/security/rls-enforcement.test.ts

# Reference existing test:
# tests/security/rls-enforcement.test.ts (already exists from Phase 3)
# Run to baseline: Should see 100% pass rate (0 RLS breaches)
```

**Sub-task 2.2.4: Create RLS Audit Matrix**
Create documentation showing each role's authorized/unauthorized access:

| Resource | Doctor | Nurse | Pharmacist | Admin | Notes |
|----------|--------|-------|-----------|-------|-------|
| Patients (own hospital) | ✅ READ/WRITE | ✅ WRITE (vitals) | ✅ READ | ✅ ALL | Via RLS hospital_id |
| Patients (other hospital) | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | RLS enforces |
| Prescriptions (own) | ✅ CREATE | ❌ | ✅ APPROVE | ✅ ALL | Workflow state |
| Lab Results (own) | ✅ CREATE | ❌ | ❌ | ✅ ALL | Owner scoping |
| Billing (own) | ❌ | ❌ | ❌ | ✅ WRITE | Admin only |

**Sub-task 2.2.5: Test Edge Cases**
```typescript
describe('RLS Edge Cases', () => {
  it('should handle NULL hospital_id gracefully (reject)', async () => {
    // User with no hospital_id should get 0 rows
  });
  
  it('should prevent privilege escalation via role change', async () => {
    // Change role from nurse → doctor, verify old permissions revoked
  });
  
  it('should audit RLS policy breaches', async () => {
    // Attempted breach should be logged
  });
});
```

**Sub-task 2.2.6: HIPAA Domain 5 Validation**
Verify compliance requirement: "Multi-tenancy isolation"
```bash
npm run test:integration -- --grep "HIPAA.*multi.?tenant"
# Expected: All multi-tenancy tests pass
```

**Acceptance Criteria**:
- ✅ 100% RLS test pass rate
- ✅ 0 cross-hospital data leaks possible (proven via test)
- ✅ HIPAA Domain 5 validated
- ✅ All edge cases tested

**Time Budget**: 10 hours

---

### Task 2.3: Sensitive Data Sanitization & PHI Protection (9 hours)

**Objective**: Ensure all logging sanitizes PHI (patient health information)

**Sub-task 2.3.1: Centralize Sanitization Utilities**
Create `src/lib/utils/sanitizeForLog.ts`:
```typescript
/**
 * Sanitize object for safe logging (remove all PHI fields)
 * PHI = UHID, patient name, diagnoses, lab values, etc.
 */
export function sanitizeForLog(data: any): any {
  if (!data) return null;
  
  // Fields to redact
  const redactedFields = {
    'patient_name': '[REDACTED_NAME]',
    'patient_id': '[REDACTED_ID]',
    'uhid': '[REDACTED_UHID]',
    'diagnosis': '[REDACTED_DIAGNOSIS]',
    'lab_value': '[REDACTED_VALUE]',
    'prescription': '[REDACTED_RX]',
    'medical_notes': '[REDACTED_NOTES]',
    'ssn': '[REDACTED_SSN]',
    'phone': '[REDACTED_PHONE]',
    'dob': '[REDACTED_DOB]'
  };
  
  const sanitized = { ...data };
  Object.keys(redactedFields).forEach(field => {
    if (field in sanitized) {
      sanitized[field] = redactedFields[field];
    }
  });
  
  return sanitized;
}

// Logging middleware
export function createSafeLogger(namespace: string) {
  return {
    info: (message: string, data?: any) => {
      console.log(`[${namespace}] ${message}`, sanitizeForLog(data));
    },
    error: (message: string, error?: any) => {
      console.error(`[${namespace}] ${message}`, sanitizeForLog(error));
    }
  };
}
```

**Sub-task 2.3.2: Audit All Log Statements**
```bash
# Find all console.log, console.error in src/
grep -r "console\.log\|console\.error" src/hooks src/components src/pages --include="*.ts" --include="*.tsx"

# Result: 50+ log statements to review
```

**Sub-task 2.3.3: Migrate Log Calls to Use sanitizeForLog()**
For each log statement with patient data:
```typescript
// OLD (PHI leaked!):
console.log('Patient loaded:', patient);

// NEW (PHI safe):
const logger = createSafeLogger('PatientHook');
logger.info('Patient loaded', patient);
// Output: Patient loaded { patient_name: '[REDACTED_NAME]', ... }
```

**Sub-task 2.3.4: Verify Sentry/Error Tracking PHI Masking**
If using Sentry for error tracking:
```typescript
// Configure Sentry to sanitize errors
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // Remove PHI from error context
    if (event.extra) {
      event.extra = sanitizeForLog(event.extra);
    }
    return event;
  }
});
```

**Sub-task 2.3.5: Create PHI Logging Audit Test**
Create `tests/security/phi-logging-audit.test.ts`:
```typescript
describe('PHI Logging Prevention', () => {
  it('should redact UHID in logs', () => {
    const data = { uhid: '12345', name: 'John' };
    const sanitized = sanitizeForLog(data);
    expect(sanitized.uhid).toBe('[REDACTED_UHID]');
  });
  
  it('should redact diagnosis in error logs', () => {
    // Test sanitizeForLog covers all PHI fields
  });
});
```

**Sub-task 2.3.6: Run PHI Audit Tests**
```bash
npm run test:security -- tests/security/phi-logging-audit.test.ts
npm run test:unit -- --grep "sanitize"

# Expected: All tests passing (PHI properly redacted)
```

**Acceptance Criteria**:
- ✅ 0 PHI leaks in logs (verified via test)
- ✅ All log statements reviewed and sanitized
- ✅ Sentry configured to redact PHI
- ✅ Sanitization tests passing

**Time Budget**: 9 hours

---

### Task 2.4: Endpoint Authorization Audit (8 hours)

**Objective**: Verify all API endpoints enforce role-based access control

**Sub-task 2.4.1: Document All Protected Endpoints**
Create list of all API routes requiring authorization:

```
GET   /api/patients                 → Requires: doctor, nurse, admin
POST  /api/patients                 → Requires: admin
GET   /api/patients/:id             → Requires: doctor (own patient), admin
POST  /api/appointments             → Requires: receptionist, admin
POST  /api/prescriptions            → Requires: doctor
POST  /api/prescriptions/:id/approve → Requires: pharmacist
GET   /api/billing                  → Requires: admin, receptionist
```

**Sub-task 2.4.2: Create RBAC Endpoint Test Suite**
Create `tests/security/rbac-endpoint-audit.test.ts`:
```typescript
describe('RBAC Endpoint Authorization', () => {
  it('should deny doctor access to billing endpoint', async () => {
    const response = await api.get('/api/billing', {
      headers: { authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status).toBe(403);
  });
  
  it('should allow pharmacist to approve prescriptions', async () => {
    const response = await api.post('/api/prescriptions/123/approve', {}, {
      headers: { authorization: `Bearer ${pharmacistToken}` }
    });
    expect(response.status).toBe(200);
  });
});
```

**Sub-task 2.4.3: Run Endpoint Auth Tests**
```bash
npm run test:integration -- tests/security/rbac-endpoint-audit.test.ts

# Expected: All 40+ endpoint tests passing
# Acceptance: 0 unauthorized access possible
```

**Sub-task 2.4.4: Update Missing Authorization Checks**
If any endpoints lack authorization:
- [ ] Add usePermissions() check to component
- [ ] Add role validation to API route handler
- [ ] Document in audit matrix

**Acceptance Criteria**:
- ✅ All endpoints have authorization checks
- ✅ Endpoint tests 100% passing
- ✅ 0 role bypass vulnerabilities

**Time Budget**: 8 hours

---

## Daily Execution Schedule

### Monday (Apr 18): RBAC Consolidation
- [ ] **9:00 AM**: Create src/lib/hooks/auth/ directory
- [ ] **9:15 AM**: Migrate 4 auth hooks
- [ ] **10:00 AM**: Enhance usePermissions with fine-grained checks
- [ ] **11:00 AM**: Create RoleProtectedRoute component
- [ ] **2:00 PM**: Find and update all RBAC imports
- [ ] **3:00 PM**: Run RBAC tests → verify 20+ passing
- [ ] **4:00 PM**: Document migration completion

### Tuesday (Apr 19): RLS Testing - Part 1
- [ ] **9:00 AM**: Document all RLS policies
- [ ] **10:00 AM**: Create RLS validation test suite
- [ ] **11:00 AM**: Run existing RLS enforcement tests
- [ ] **1:00 PM**: Review any failing RLS tests
- [ ] **2:00 PM**: Document RLS audit matrix
- [ ] **3:00 PM**: Add edge case tests

### Wednesday (Apr 20): RLS Testing - Part 2
- [ ] **9:00 AM**: Run complete RLS test suite
- [ ] **10:00 AM**: Verify 0 cross-hospital leaks
- [ ] **11:00 AM**: HIPAA Domain 5 validation tests
- [ ] **1:00 PM**: Document any RLS policy improvements needed
- [ ] **2:00 PM**: Create RLS compliance report
- [ ] **3:00 PM**: Gate review prep (RLS section)

### Thursday (Apr 21): PHI Sanitization
- [ ] **9:00 AM**: Create sanitizeForLog() utility
- [ ] **10:00 AM**: Audit all log statements (grep search)
- [ ] **11:00 AM**: Migrate 25+ log calls to sanitizeForLog()
- [ ] **1:00 PM**: Configure Sentry/error tracking
- [ ] **2:00 PM**: Run PHI audit test suite
- [ ] **3:00 PM**: Verify 0 PHI in logs

### Friday (Apr 22): Endpoint Authorization
- [ ] **9:00 AM**: Document all protected endpoints
- [ ] **10:00 AM**: Create RBAC endpoint test suite
- [ ] **11:00 AM**: Run endpoint auth tests
- [ ] **1:00 PM**: Remediate any auth gaps
- [ ] **2:00 PM**: Complete 40+ endpoint tests (all green)
- [ ] **3:00 PM**: Gate review prep (auth section complete)

---

## Success Metrics (End of Week 2)

| Metric | Target | Owner |
|--------|--------|-------|
| RBAC hooks migrated | 4/4 | Backend |
| RBAC tests passing | 20+ | QA |
| RLS tests passing | 100% | QA |
| Cross-hospital leaks | 0 | Security |
| PHI in logs | 0 | Security |
| PHI sanitization tests | 100% pass | QA |
| Endpoint auth tests | 40+ pass | QA |
| Unauthorized access exploits | 0 | Security |

---

## Deliverables

**By Friday Apr 22**:
1. ✅ 4 auth hooks migrated to lib/hooks/auth/
2. ✅ 100% RLS enforcement tests passing
3. ✅ 0 cross-hospital data leak vulnerabilities proven via test
4. ✅ RoleProtectedRoute component implemented
5. ✅ sanitizeForLog utility implemented (0 PHI leaks)
6. ✅ 40+ endpoint authorization tests passing
7. ✅ HIPAA Domain 5 (multi-tenancy) compliance verified
8. ✅ Authority & Authorization summary document
9. ✅ Gate review 100% ready (Authorization section complete for HP 80%)

