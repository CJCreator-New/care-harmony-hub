# Phase 1A: Developer Onboarding Baseline — COMPLETE

**Status**: ✅ COMPLETE  
**Date Completed**: March 14, 2026  
**Risk Level**: ⭐ VERY LOW (non-breaking, local development only)

---

## 1. CareSync 15-Minute Quick-Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for Supabase)
- Git
- VS Code (recommended)

### Step-by-Step Setup

```bash
# 1. Clone repository and install dependencies (2 min)
git clone https://github.com/aroCord/care-harmony-hub.git
cd care-harmony-hub
npm install

# 2. Start Supabase backend (3 min)
docker-compose up -d supabase_db supabase_rest
npx supabase start
npx supabase db pull --remote  # Sync schema from remote

# 3. Seed test data for all healthcare personas (2 min)
npm run seed:test-data

# 4. Create test user accounts (2 min)
node scripts/create-test-users.js

# 5. Start development server (1 min)
npm run dev

# 6. Done! Access http://localhost:5173
```

**Expected Output**:
```
VITE v5.0.0 ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Press h + enter to show help

Supabase started successfully.
Auth endpoint: http://localhost:54321
Database endpoint: http://localhost:54322
```

**Verify Setup**:
- [ ] http://localhost:5173 loads without errors
- [ ] Login with doctor@test.local / Test@123 succeeds
- [ ] Supabase Studio accessible at http://localhost:54323
- [ ] Database contains test patients with diverse personas

---

## 2. Test User Accounts & Roles

### Test Hospital: Sunrise Medical (hospital_id: test_hospital)

All test accounts use password: `Test@123`

| Email | Role | Purpose | Hospital | Features Available |
|-------|------|---------|----------|-------------------|
| **doctor@test.local** | DOCTOR | Patient charts, prescriptions, discharge | Sunrise Medical | Rx creation, vital review, discharge orders |
| **nurse@test.local** | NURSE | Ward rounds, vital signs, patient prep | Sunrise Medical | Vital recording, patient monitoring, alerts |
| **pharmacist@test.local** | PHARMACIST | Prescription queue, dispensing, inventory | Sunrise Medical | Rx verification, dispensing, interaction checks |
| **lab@test.local** | LAB_TECHNICIAN | Lab orders, specimen processing, results | Sunrise Medical | Lab order creation, specimen tracking, result entry |
| **receptionist@test.local** | RECEPTIONIST | Scheduling, patient check-in, queues | Sunrise Medical | Appointments, patient registration, queue management |
| **patient@test.local** | PATIENT | View appointments, results, prescriptions | Sunrise Medical | Personal health record access, appointment booking |
| **admin@test.local** | ADMIN | User management, audit logs, config | Sunrise Medical | System configuration, user management, audit access |

### Creating Additional Test Users

```bash
# Create individual test user
node scripts/create-test-user.js \
  --email clinician@test.local \
  --role DOCTOR \
  --hospital test_hospital

# Create bulk test users (new hospital)
node scripts/create-test-users.js \
  --hospital secondary_hospital \
  --count 5  # Creates doctor, nurse, pharmacist, lab, receptionist
```

---

## 3. Test Data Personas (Healthcare Scenarios)

The test database includes diverse patient personas for realistic testing:

### Persona 1: Elderly Patient (65+) — Comorbidities
- **Name**: James Miller, Age 72
- **Conditions**: Hypertension (HTN), Type 2 Diabetes (DM2), COPD
- **Medications**: Lisinopril, Metformin, Albuterol
- **Recent Encounter**: Admitted 2 weeks ago for COPD exacerbation
- **Test Scenario**: Medication reconciliation, fall risk assessment, polypharmacy checks

**Location**: `supabase/seed-data/persona-elderly.sql`

### Persona 2: Pediatric Patient (0-12) — Age-Appropriate Dosing
- **Name**: Emma Johnson, Age 7
- **Conditions**: Acute otitis media (ear infection), asthma
- **Medications**: Amoxicillin (pediatric dosing), Albuterol inhaler
- **Recent Encounter**: Outpatient visit for earache complaint
- **Test Scenario**: Age-appropriate dosing validation, pediatric vitals ranges, growth charts

**Location**: `supabase/seed-data/persona-pediatric.sql`

### Persona 3: Obstetric Patient — Pregnancy Planning
- **Name**: Sarah Khan, Age 28
- **Status**: 32 weeks pregnant, G2P1
- **Medications**: Prenatal vitamins, safe in pregnancy
- **Recent Labs**: Hemoglobin 10.8 (mild anemia), glucose normal
- **Test Scenario**: Medication safety checks (pregnancy category), prenatal lab interpretation, delivery planning

**Location**: `supabase/seed-data/persona-obstetric.sql`

### Persona 4: Chronic Disease — Diabetes Management
- **Name**: Robert Chen, Age 58
- **Conditions**: Type 2 Diabetes, hypertension, obesity
- **Medications**: Metformin, HCTZ, Aspirin
- **Lab History**: HbA1c trending (6 months); glucose log entries
- **Test Scenario**: Lab trending visualization, glycemic control assessment, medication optimization

**Location**: `supabase/seed-data/persona-chronic.sql`

### Persona 5: Acute/Emergency — Critical Vitals
- **Name**: Michael Brown, Age 45
- **Presenting Issue**: Chest pain, SOB (shortness of breath)
- **Vitals**: BP 168/98 (elevated), HR 102, SpO2 92% (low)
- **Current Meds**: No chronic meds
- **Test Scenario**: Critical alert triggers, triage workflow, emergency order entry

**Location**: `supabase/seed-data/persona-acute.sql`

### Persona 6: Post-Discharge — Follow-Up Care
- **Name**: Margaret Williams, Age 61
- **Recent Discharge**: 3 days ago from hip replacement surgery
- **Follow-Up Meds**: Opioid pain management, DVT prophylaxis
- **Appointments**: Scheduled PT/OT, follow-up surgery visit
- **Test Scenario**: Medication adherence tracking, appointment compliance, discharge summary access

**Location**: `supabase/seed-data/persona-postdischarge.sql`

### Seeding All Personas

```bash
npm run seed:test-data
# Populates: patients, encounters, vitals, prescriptions, lab_orders, audit_logs
```

---

## 4. CareSync Developer Contribution Checklist

### Before Committing Code

- [ ] **TypeScript Strict Mode Passes**
  ```bash
  npm run type-check
  # Expected: 0 errors
  ```

- [ ] **Linting Passes**
  ```bash
  npm run lint
  npm run format  # Auto-fixes formatting
  # Expected: 0 errors
  ```

- [ ] **Unit Tests Pass**
  ```bash
  npm run test:unit
  # Expected: 100% pass rate
  ```

- [ ] **No Console Logging in Production Code**
  - ✅ Allowed: `logger.info()`, `logger.error()` (structured logging)
  - ❌ Not allowed: `console.log()`, `console.warn()`, `console.error()` in src/
  - Reason: Console output not structured for log aggregation

- [ ] **No PHI Logging**
  ```typescript
  // ❌ BAD: Logs patient name and diagnosis
  console.log(`Diagnosis: ${patient.name} has ${diagnosis}`);
  
  // ✅ GOOD: Logs only non-sensitive context
  logger.info('Diagnosis updated', { 
    patient_id: patient.id,  // FK, not name
    diagnosis_code: diagnosis.icd10  // Code, not description
  });
  
  // Use sanitizeForLog() utility for extra safety
  import { sanitizeForLog } from '@/lib/utils/sanitize';
  logger.info('Process started', sanitizeForLog({ data: payload }));
  ```

- [ ] **RLS Policy Aligned with Feature**
  ```typescript
  // If modifying patient data, ensure query includes hospital_id:
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('hospital_id', currentHospitalId)  // ✅ REQUIRED
    .eq('patient_id', patientId);
  ```

- [ ] **Audit Trail Added for High-Risk Mutations**
  ```typescript
  // If creating/updating prescriptions:
  await auditLog({
    action: 'CREATE_PRESCRIPTION',
    entity_type: 'prescription',
    entity_id: rx.id,
    change_reason: 'Initial prescription for patient condition',
    hospital_id: currentHospitalId
  });
  ```

- [ ] **Clinical Domain Input Validated**
  ```typescript
  // ❌ BAD: No dosage validation
  const dosage = formValues.dosage;  // Could be "9999mg"
  
  // ✅ GOOD: Validate against clinical ranges
  const dosageSchema = z.number()
    .min(0.1, 'Dosage must be > 0')
    .max(2000, 'Dosage exceeds max (check drug)');
  
  const validatedDosage = dosageSchema.parse(formValues.dosage);
  ```

- [ ] **If Database Schema Change: Migration is Reversible**
  ```sql
  -- ✅ REVERSIBLE: Add column
  ALTER TABLE patients ADD COLUMN phone_encrypted TEXT;
  
  -- ❌ NOT REVERSIBLE: Drop column (data loss)
  ALTER TABLE patients DROP COLUMN old_phone;
  
  -- If deprecating, use soft-deprecation:
  ALTER TABLE patients ADD COLUMN phone_deprecated TEXT;
  COMMENT ON COLUMN patients.phone_deprecated 
    IS 'Soft-deprecated in v2.0, use phone_encrypted instead. Sunset: v3.0';
  ```

---

## 5. Database Tables for Clinical Features

### Patient-Facing Core Tables

| Table | Purpose | Key Fields | RLS Policy |
|-------|---------|-----------|-----------|
| **patients** | Patient demographics | patient_id, name, phone_encrypted, hospital_id | Hospital-scoped |
| **encounters** | Hospital visits (admissions, outpatient) | encounter_id, patient_id, admission_time, discharge_time | Hospital-scoped |
| **vital_signs** | Vital measurements (BP, HR, Temp, etc.) | vital_id, encounter_id, patient_id, value, unit, timestamp | Hospital-scoped |
| **prescriptions** | Medication orders | rx_id, patient_id, drug_name, dosage, refills, status | Hospital-scoped |
| **lab_orders** | Lab test requests | order_id, patient_id, test_name, priority, result_status | Hospital-scoped |
| **allergies** | Patient medication/food allergies | allergy_id, patient_id, allergen_name, reaction_type | Hospital-scoped |
| **diagnoses** | ICD-10 codes linked to visits | diagnosis_id, encounter_id, icd10_code, description | Hospital-scoped |

### Operational Tables

| Table | Purpose | Audit Required |
|-------|---------|---|
| **audit_logs** | Immutable workflow trail | N/A (IS the audit log) |
| **alerts** | Clinical safety alerts (critical vitals, interactions) | Yes |
| **users** | Staff/admin logins | Yes |
| **hospital_config** | Hospital-specific settings | Yes |

### Inspecting Database State Locally

```bash
# Open Supabase Studio
open http://localhost:54323

# Or via SQL CLI:
psql postgresql://postgres:postgres@localhost:54322/postgres

# Check patient count
SELECT COUNT(*) as patient_count FROM patients WHERE hospital_id = 'test_hospital';

# Check recent prescriptions
SELECT rx_id, patient_id, drug_name, created_at 
FROM prescriptions 
WHERE hospital_id = 'test_hospital' 
ORDER BY created_at DESC 
LIMIT 10;

# Check allergy data populated
SELECT patient_id, allergen_name, COUNT(*) 
FROM allergies 
WHERE hospital_id = 'test_hospital' 
GROUP BY patient_id, allergen_name;
```

---

## 6. RLS (Row-Level Security) Testing Locally

### What is RLS?
Row-Level Security ensures a doctor at Hospital A cannot see patients from Hospital B, even if they have a valid login.

### Testing RLS Locally

```bash
# 1. Login as doctor@test.local (Hospital A)
# Check: Can view patients, prescriptions from hospital_id = test_hospital ONLY

# 2. In Supabase Studio, view audit_logs table:
# Should see RLS policy applied:
-- RLS Policy: "enable read access if in same hospital"
-- USING: current_hospital_id() = hospital_id

# 3. Test RLS enforcement
npm run validate:rls
# Expected output: ✅ All tables have hospital_id scoping
```

### Manual RLS Bypass (For Testing Only)

```javascript
// Use service_role key (has RLS bypass) - ONLY in tests/migrations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Bypass RLS
);

// In tests: Create data across hospitals, then verify RLS blocks access
const patient2 = await supabaseAdmin
  .from('patients')
  .insert([{ patient_id: 'p2', hospital_id: 'other_hospital' }]);

// Now try to read as regular user:
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('patient_id', 'p2');

// Expected: error.code = 'PGRST116' (permission denied)
```

---

## 7. Contributing to CareSync: Full Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/patient-allergy-warnings
```

### 2. Make Code Changes
- Follow contribution checklist above
- Update tests if behavior changes
- Add/update database migrations if schema changes

### 3. Local Validation
```bash
npm run type-check      # Catch TypeScript errors
npm run lint            # Fix formatting
npm run test:unit       # Run unit tests
npm run test:e2e:smoke  # Run smoke tests
npm run validate:rls    # Verify RLS policies intact
```

### 4. Create Pull Request
```bash
git commit -m "feat: Add allergy warning banner to prescription form"
git push origin feature/patient-allergy-warnings
# Create PR on GitHub
```

### 5. GitHub Actions Runs Automatically
- ✅ Type-check passes
- ✅ Lint passes
- ✅ Unit tests pass
- ✅ RLS validation passes
- ✅ No hardcoded secrets
- ✅ No console.log in production code

### 6. Prepare for Code Review
- Link to related issues
- Include before/after screenshots (for UI changes)
- Mark as "Ready for Review"

### 7. Merge After Approval
- ✅ 1+ maintainer approval
- ✅ All GitHub Actions pass
- ✅ Branch is up-to-date with main

---

## 8. Troubleshooting Common Issues

### Issue: "Cannot connect to Supabase"
```bash
# Check if Docker containers are running
docker ps | grep supabase

# Restart Supabase
docker-compose down
docker-compose up -d

# Verify endpoint
curl http://localhost:54321/auth/v1/health
# Expected: 200 OK
```

### Issue: "Test user login fails"
```bash
# Recreate test users (clears old ones)
rm supabase/seed-data/.seeded.flag  # Remove completion marker
node scripts/create-test-users.js  # Run again

# Verify user created
psql postgresql://postgres:postgres@localhost:54322/postgres
SELECT email FROM auth.users WHERE email LIKE '%test.local';
```

### Issue: "RLS prevents me from accessing patient data"
```bash
# Ensure hospital_id matches your user's hospital
SELECT hospital_id FROM users WHERE id = auth.uid();

# Your queries must filter by matched hospital_id
SELECT * FROM patients WHERE hospital_id = 'test_hospital';
```

### Issue: "npm run test:unit fails with module not found"
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# If still failing, check TypeScript
npm run type-check
```

---

## 9. Phase 1A Success Criteria

✅ **All criteria met**:
- [x] Every new developer can run `./scripts/setup.sh` and have working system in 15 minutes
- [x] Test data includes 6 healthcare personas (elderly, pediatric, obstetric, chronic, acute, post-discharge)
- [x] 7 role-based test accounts ready (doctor, nurse, pharmacist, lab, receptionist, patient, admin)
- [x] RLS policies prevent cross-hospital access (verified with validation script)
- [x] Database inspection tools documented (SQL queries for common checks)
- [x] Contribution checklist covers HIPAA/clinical safety (no PHI logging, RLS checks, dosage validation)

---

## 10. Next Steps

→ **Phase 1B**: CI/CD Safety Gates (RLS validation in pipeline, deployment gates)  
→ **Phase 2A**: Audit Trail Implementation (immutable clinical workflow logging)  
→ **Phase 3A**: Clinical Metrics Setup (SLO tracking, health check endpoints)

---

**Document Owner**: CareSync DevOps Team  
**Last Updated**: March 14, 2026  
**Review Cycle**: Quarterly (or after onboarding feedback)
