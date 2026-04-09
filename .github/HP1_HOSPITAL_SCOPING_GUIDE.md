# HP-1 Implementation Guide: Hospital Scoping Enforcement

**Priority**: 🔴 CRITICAL (Security Vulnerability)  
**Effort**: 3/5 (Systematic application of pattern)  
**Timeline**: 4-5 PRs over 1-2 weeks  
**Owner**: Backend Lead

---

## The Problem

Currently, many backend queries do NOT filter by `hospital_id`, creating a **data isolation vulnerability**:

```typescript
// ❌ BAD - Patient data not scoped to hospital
const getPatients = async (req) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .limit(100);
  return data; // Returns ALL patients, not just hospital's patients!
};

// ✅ GOOD - Scoped to hospital
const getPatients = async (req) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('hospital_id', req.user.hospital_id)  // <-- Critical
    .limit(100);
  return data; // Returns only this hospital's patients
};
```

**HIPAA Impact**: Without hospital scoping, Doctor A from Hospital X could see Patient B from Hospital Y's data. **This is a critical compliance violation.**

---

## The Solution

### Step 1: Identify All Queries Needing Hospital Scoping

**Search Pattern**:
```bash
# Find all Supabase database queries
cd src/services
grep -n "\.from\|\.select\|\.insert\|\.update\|\.delete" *.ts | head -50

# Manually verify each:
# - Does .eq('hospital_id', ...) appear after .from()?
# - Is it ALWAYS present?
```

**Common Table Queries** (need hospital_id filter):
```
- patients (critical)
- prescriptions
- appointments  
- lab_orders
- lab_results
- pharmacy_orders
- vitals
- consultations
- notes
- medical_history
- insurance_details
- billing_transactions
- laboratory_test_results
- medications (may not need - system-wide)
- users (may not need - system-wide)
```

### Step 2: Apply Pattern to Repository Layer

Create a **base repository** method that enforces hospital scoping:

**File**: `src/services/repositories/base.repository.ts` (create/update)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export class BaseRepository {
  protected supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * CRITICAL: Add hospital_id filter to all queries
   * This enforces multi-tenancy data isolation
   */
  protected withHospitalScoping(query: any, hospitalId: string) {
    if (!hospitalId) {
      throw new Error('Hospital ID is required for data access');
    }
    return query.eq('hospital_id', hospitalId);
  }

  /**
   * Safe query against patients table (always scoped to hospital)
   */
  protected selectPatients(hospitalId: string) {
    return this.withHospitalScoping(
      this.supabase.from('patients').select('*'),
      hospitalId
    );
  }

  /**
   * Generic method for all multi-tenant tables
   */
  protected selectFromTable(
    table: string,
    hospitalId: string,
    columns = '*'
  ) {
    return this.withHospitalScoping(
      this.supabase.from(table).select(columns),
      hospitalId
    );
  }
}
```

### Step 3: Refactor Services to Use Pattern

**Example**: Patient Service Refactor

**Before** (❌ UNSAFE):
```typescript
// src/services/patientService.ts
import { supabase } from '@/integrations/supabase/client';

export const patientService = {
  async getPatients(limit = 100) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getPatientById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
};
```

**After** (✅ SAFE):
```typescript
// src/services/patientService.ts or src/services/repositories/patientRepository.ts
import { BaseRepository } from './base.repository';
import type { Patient } from '@/types/database';

export class PatientRepository extends BaseRepository {
  
  /**
   * Get all patients for a specific hospital
   * @param hospitalId - Hospital identifier (from auth context)
   */
  async getPatients(hospitalId: string, limit = 100): Promise<Patient[]> {
    const query = this
      .selectFromTable('patients', hospitalId)
      .limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Patient query error (sanitized)');
      throw new Error('Failed to fetch patients');
    }
    
    return data || [];
  }

  /**
   * Get single patient (MUST verify hospital_id match in controller)
   */
  async getPatientById(
    hospitalId: string,
    patientId: string
  ): Promise<Patient> {
    const { data, error } = await this
      .selectFromTable('patients', hospitalId)
      .eq('id', patientId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Patient not found');
      }
      throw error;
    }
    
    return data as Patient;
  }

  /**
   * Create new patient record (always includes hospital_id)
   */
  async createPatient(
    hospitalId: string,
    patientData: Partial<Patient>
  ): Promise<Patient> {
    const { data, error } = await this.supabase
      .from('patients')
      .insert([{
        ...patientData,
        hospital_id: hospitalId,  // <-- CRITICAL
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as Patient;
  }

  /**
   * Update patient (only if belongs to hospital)
   */
  async updatePatient(
    hospitalId: string,
    patientId: string,
    updates: Partial<Patient>
  ): Promise<Patient> {
    // Verify patient belongs to hospital first
    await this.getPatientById(hospitalId, patientId);
    
    const { data, error } = await this.supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)  // <-- Double-check
      .select()
      .single();
    
    if (error) throw error;
    return data as Patient;
  }
}

// Export singleton instance
export const patientRepository = new PatientRepository();
```

### Step 4: Update Controllers to Pass hospitalId

**Before** (❌ UNSAFE - no hospital context):
```typescript
// src/routes/patients.ts
router.get('/patients', async (req, res) => {
  const patients = await patientService.getPatients(100);
  res.json(patients);
});
```

**After** (✅ SAFE - hospital-scoped):
```typescript
// src/routes/patients.ts
import { requireAuth } from '@/middleware/requireAuth';
import { patientRepository } from '@/services/repositories/patientRepository';

router.get('/patients', 
  requireAuth,  // Ensures req.user exists
  async (req, res) => {
    try {
      const hospitalId = req.user.hospital_id;
      if (!hospitalId) {
        return res.status(401).json({ error: 'Hospital context required' });
      }
      
      const patients = await patientRepository.getPatients(hospitalId, 100);
      res.json(patients);
    } catch (error) {
      console.error('Error fetching patients (sanitized)');
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  }
);
```

### Step 5: PR Template for Hospital Scoping

**PR Title**: 
```
[Phase 1] [Backend] Hospital Scoping: Add filters to patient-related queries
```

**PR Description**:
```markdown
## 🔒 Security Fix: Hospital Data Isolation

### Problem
Patient queries were not scoped to hospital_id, allowing data leakage between hospitals.

### Solution
- [x] Updated PatientRepository to extend BaseRepository
- [x] Added hospital_id filter to all patient queries (.select, .insert, .update, .delete)
- [x] Updated controllers to pass hospitalId from req.user
- [x] Added test coverage for hospital isolation

### Files Changed
- `src/services/repositories/base.repository.ts` (create)
- `src/services/repositories/patientRepository.ts` (update)
- `src/routes/patients.ts` (update)

### Test Coverage
- ✅ PatientRepository.getPatients() returns only hospital's patients
- ✅ PatientRepository.getPatientById() returns 404 if patient belongs to different hospital
- ✅ Cross-hospital access blocked (security test)

### Audit Impact
- Hospital Scoping: 1/1 services → 100%
- Overall backend score: +5 points

### HIPAA Compliance
- [x] Multi-tenant data isolation verified
- [x] No patient data from other hospitals accessible
- [x] Audit trail: All hospital_id filters applied
```

---

## Implementation Timeline & Work Breakdown

### PR 1: Create BaseRepository (Day 1)
**Changes**:
- Create `src/services/repositories/base.repository.ts`
- Add hospital scoping wrapper methods
- Add unit tests
**Reviewers**: Tech Lead
**Merge Criteria**: All tests pass, no TypeScript errors

### PR 2: Refactor Patient Service (Day 2-3)
**Changes**:
- Create `src/services/repositories/patientRepository.ts`
- Migrate patientService logic → PatientRepository
- Update controllers to use new repository
- Add integration tests
**Reviewers**: Backend Lead + Tech Lead
**Merge Criteria**: All patient routes tested, hospital isolation verified

### PR 3: Refactor Prescription Service (Day 4-5)
**Changes**:
- Create `src/services/repositories/prescriptionRepository.ts`
- Apply hospital scoping to all prescription queries
- Update controllers
**Scope**: prescriptions, prescription_items, audit trail

### PR 4: Refactor Appointment Service (Day 6-7)
**Changes**:
- Create `src/services/repositories/appointmentRepository.ts`
- Apply hospital scoping
- Add tests for appointment scheduling cross-hospital blocking

### PR 5: Lint & Verify All Services (Day 8)
**Changes**:
- Run audit: `python scripts/phase1-audit.py`
- Verify all backend services score ≥90% for hospital scoping
- Document any exceptions

---

## Validation Checklist

After each PR, verify:

```bash
# 1. TypeScript compilation
npm run type-check

# 2. Unit tests pass
npm run test:unit -- --grep "hospital"

# 3. Integration tests pass (with test database)
npm run test:integration -- --grep "hospital"

# 4. Security audit passes
npm run test:security

# 5. Code audit shows improvement
python scripts/phase1-audit.py

# 6. No hospital_id hardcoded (security)
grep -r "hospital_id.*=.*['\"]" src/services/ | grep -v req.user | grep -v test
```

---

## Risk Mitigation

**Risk**: Breaking existing queries  
**Mitigation**: Git history available for rollback + feature flags if needed

**Risk**: Performance impact of added .eq() filters  
**Mitigation**: Existing database indexes on hospital_id already in place

**Risk**: Missing a service layer  
**Mitigation**: Comprehensive grep search before starting; code review catch-all

---

## Success Metrics

- [ ] All patient/prescription/appointment queries include hospital_id filter
- [ ] Zero security findings in code review
- [ ] Hospital Scoping audit score: 100% (from ~50%)
- [ ] Integration tests verify cross-hospital access blocked
- [ ] HIPAA audit compliance confirmed
- [ ] Performance SLA maintained (<500ms query response)

---

**Ready to start?** Begin with PR 1 (BaseRepository) today.  
**Questions?** Review DEVELOPMENT_STANDARDS.md > Backend Architecture section.
