# Healthcare Development Checklist for CareSync Contributors

**MUST COMPLETE before every commit to ensure clinical safety, compliance, and security.**

---

## Pre-Development: Understanding the Domain

### Clinical Knowledge ✅

- [ ] Understand vital signs ranges:
  - [ ] Temperature: 36.5-37.5°C (normal); flags >38.5°C or <36°C
  - [ ] Blood Pressure: Normal ~120/80, High >140/90, Hypotensive <90/60
  - [ ] Heart Rate: 60-100 bpm (adult); <50 or >100 = alert needed
  - [ ] Respiratory Rate: 12-20 breaths/min; >20 = tachypnea
  - [ ] O2 Saturation: >95% normal; <90% = critical alert
- [ ] Understand ICD-10/CPT codes (used in prescriptions & billing)
- [ ] Understand LOINC codes (used in lab orders)
- [ ] Understand medication interactions (system validates, but devs must respect constraints)
- [ ] Understand patient privacy laws (HIPAA in US, or local equivalent)
- [ ] Understand role boundaries:
  - [ ] **Doctor**: Can order treatments, write prescriptions, diagnose
  - [ ] **Nurse**: Can perform triage, update vitals, prep patients, dispense medications
  - [ ] **Pharmacist**: Can verify prescriptions, manage drug inventory, counsel patients
  - [ ] **Lab Tech**: Can collect specimens, enter results, flag critical values
  - [ ] **Receptionist**: Can schedule appointments, check patients in, manage queues
  - [ ] **Patient**: Can view own records, request appointments, view results
  - [ ] **Admin**: Can manage users, audit logs, system configuration

### Database Understanding ✅

- [ ] Read [docs/DATABASE.md](./DATABASE.md) — understand 20 critical tables
- [ ] Know which tables use `hospital_id` (all 46 should)
- [ ] Understand the patient journey flow:
  - `patients` → `appointments` → `patient_queue` / `triage_assessments` → `consultations` → `prescriptions` / `lab_orders` → `invoices`
- [ ] Know which tables are PHI (Personally Identifiable Information):
  - All patient tables, consultations, prescriptions, lab orders, billing records

---

## Code Review Checklist

### 1. Security & Authorization ✅

**Every mutation (INSERT, UPDATE, DELETE) MUST have RLS enforcement:**

- [ ] **Hospital Isolation**: Does query include `hospital_id` filter for the current user's hospital?
  ```typescript
  // ❌ WRONG - Exposes other hospitals' patients
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId);
  
  // ✅ CORRECT - Scoped to user's hospital
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('hospital_id', user.hospital_id);
  ```

- [ ] **Role Validation**: Does logic check user role before sensitive operations?
  ```typescript
  // ✅ Only doctors/pharmacists can verify prescriptions
  if (!['doctor', 'pharmacist'].includes(user.role)) {
    throw new Error('Unauthorized: Only doctors/pharmacists can verify prescriptions');
  }
  ```

- [ ] **Patient Portfolio Access**: Can patients only see their own records?
  ```typescript
  // ✅ Patients can see their own appointments
  USING (user_id = auth.uid() OR doctor_id = auth.uid());
  ```

- [ ] **No Direct SQL**: Always use Supabase client, never raw SQL in browser code
  ```typescript
  // ❌ WRONG
  const result = await fetch('/query?sql=SELECT * FROM patients');
  
  // ✅ CORRECT
  const { data } = await supabase.from('patients').select('*');
  ```

**Test It:**
```bash
# Verify a doctor from Hospital A cannot see patients from Hospital B
npm run test:rls-isolation
```

---

### 2. Clinical Data Validation ✅

**All clinical inputs MUST be validated against medical ranges:**

#### Vital Signs

- [ ] **Temperature**: Must be 35-43°C (humans physiology limit)
  ```typescript
  if (vitals.temperature < 35 || vitals.temperature > 43) {
    throw new Error('Temperature out of valid range: 35-43°C');
  }
  ```

- [ ] **Blood Pressure**: Must be reasonable (40-300 mmHg systolic)
  ```typescript
  if (bp.systolic < 40 || bp.systolic > 300) {
    throw new Error('Systolic BP out of range: 40-300 mmHg');
  }
  ```

- [ ] **Heart Rate**: Valid range (20-300 bpm)
  ```typescript
  if (hr < 20 || hr > 300) {
    throw new Error('HR out of range: 20-300 bpm');
  }
  ```

- [ ] **Respiratory Rate**: Valid range (5-60 breaths/min)
  ```typescript
  if (rr < 5 || rr > 60) {
    throw new Error('RR out of range: 5-60');
  }
  ```

- [ ] **O2 Saturation**: Must be 0-100%
  ```typescript
  if (o2 < 0 || o2 > 100) {
    throw new Error('O2 sat must be 0-100%');
  }
  ```

#### Age-Appropriate Rules

- [ ] **Pediatric Dosing**: Children get different doses than adults
  ```typescript
  const pediatricDose = ageInYears < 18
    ? calculatePediatricDose(medication, weight)
    : calculateAdultDose(medication);
  ```

- [ ] **Geriatric Dosing**: Elderly may need dose adjustments
  ```typescript
  if (ageInYears > 65) {
    // Warn about QT prolongation, renal clearance, etc.
    warnings.push('Geriatric patient: verify renal clearance');
  }
  ```

- [ ] **Pregnancy**: Certain drugs are contraindicated in pregnancy
  ```typescript
  if (patient.isPregnant && drug.pregnancy_category === 'X') {
    throw new Error('Medication contraindicated in pregnancy');
  }
  ```

#### Medication Interactions

- [ ] Check against known drug interactions database (LOINC/DrugBank)
  ```typescript
  const interactions = await checkDrugInteractions([
    'metformin',
    'lisinopril',
    'atorvastatin'
  ]);
  
  if (interactions.length > 0) {
    warnings.push(...interactions);
  }
  ```

- [ ] Check against patient allergies
  ```typescript
  if (patient.allergies.includes(medication.generic_name)) {
    throw new Error('Patient is allergic to this medication');
  }
  ```

#### Dosage Rules

- [ ] Validate dosage format (e.g., "500mg" not "5 billion mg")
  ```typescript
  const regex = /^(\d+(?:\.\d+)?)(mg|g|ml|mcg)$/i;
  if (!regex.test(dosage)) {
    throw new Error('Invalid dosage format: use format like "500mg"');
  }
  ```

- [ ] Validate frequency (e.g., "BID" = twice daily, not gibberish like "XYZ")
  ```typescript
  const validFrequencies = ['OD', 'BID', 'TID', 'QID', 'HS', 'AC', 'PC'];
  if (!validFrequencies.includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }
  ```

**Test It:**
```bash
# Unit tests for validation
npm run test:unit -- src/utils/clinicalValidation.test.ts
```

---

### 3. PHI (Personal Health Information) Handling ✅

**CRITICAL: Never leak patient data in logs, error messages, or analytics.**

- [ ] **No PHI in Console Logs**
  ```typescript
  // ❌ WRONG - Logs patient name
  console.log(`Processing patient: ${patient.first_name} ${patient.last_name}`);
  
  // ✅ CORRECT - Use safe logging
  import { sanitizeForLog } from '@/utils/sanitization';
  console.log(`Processing patient: ${sanitizeForLog(patient.mrn)}`);
  // Output: "Processing patient: [REDACTED-MRN]"
  ```

- [ ] **No PHI in Error Messages Shown to User**
  ```typescript
  // ❌ WRONG - User sees patient name in error
  toast.error(`Failed to save appointment for John Smith`);
  
  // ✅ CORRECT - Generic error message
  toast.error('Failed to save appointment. Contact support if issue persists.');
  ```

- [ ] **No PHI in URLs/Query Parameters**
  ```typescript
  // ❌ WRONG
  window.location.href = `/patient/${patient.mrn}?name=${patient.first_name}`;
  
  // ✅ CORRECT
  window.location.href = `/patient/${patient.id}`; // Use UUID, not MRN
  ```

- [ ] **No PHI in API Response Bodies Unless Authorized**
  ```typescript
  // ❌ WRONG - Returns full patient record to any authenticated user
  const response = await supabase
    .from('patients')
    .select('*')
    .eq('hospital_id', auth.user().hospital_id);
  
  // ✅ CORRECT - Only return fields user needs
  const response = await supabase
    .from('patients')
    .select('id, first_name, last_name, mrn')
    .eq('hospital_id', auth.user().hospital_id);
  ```

- [ ] **PHI in Transit is Encrypted** (Supabase handles this, but verify)
  - [ ] All API calls use HTTPS
  - [ ] No sensitive data in localStorage without encryption
  - [ ] `VITE_ENCRYPTION_KEY` is set in .env

- [ ] **Data Exports Contain No PHI** (if you export CSVs/reports)
  ```typescript
  // ✅ Audit log export masks patient names
  const exportData = auditLogs.map(log => ({
    timestamp: log.created_at,
    action: log.action_type,
    entity: log.entity_type,
    // NO patient names or IDs in export
  }));
  ```

**Test It:**
```bash
npm run test:security -- src/utils/sanitization.test.ts
```

---

### 4. Encryption for Sensitive Data ✅

**Some fields MUST be encrypted (encrypted_value, not plaintext):**

- [ ] **HIPAA Encryption**: Patient SSN, credit card, health plan IDs should be encrypted
  ```typescript
  import { useHIPAACompliance } from '@/hooks/useHIPAACompliance';
  
  const { encrypt, decrypt } = useHIPAACompliance();
  
  // Encrypt on save
  const encrypted = await encrypt(patient.ssn, 'patient_ssn');
  
  // Decrypt on read
  const decrypted = await decrypt(encrypted, 'patient_ssn');
  ```

- [ ] **Metadata Tracked**: When you encrypt data, log the encryption method & key version
  ```sql
  -- Must include encrypted_with, encrypted_at, encryption_key_version
  INSERT INTO patients (id, hospital_id, ssn_encrypted, encryption_metadata, ...)
  VALUES (uuid, hospital_id, encrypted_value, 
    jsonb_build_object(
      'encrypted_with', 'AES-256',
      'key_version', 1,
      'encrypted_at', NOW()
    ),
    ...);
  ```

---

### 5. Audit Trail & Logging ✅

**Every high-risk mutation MUST be logged for compliance audits:**

#### High-Risk Operations (MUST audit):
- [ ] Create/Update/Delete patient records
- [ ] Prescribe medications
- [ ] Order lab tests
- [ ] Process payments
- [ ] Discharge patient
- [ ] Access sensitive data (doctors viewing other doctors' notes)

#### Medium-Risk Operations (Should audit):
- [ ] Create appointment
- [ ] Check in patient
- [ ] Enter vital signs
- [ ] Export patient data
- [ ] Verify prescription

#### Example Audit Log:

```typescript
// After updating patient record:
await createAuditLog({
  hospital_id: patient.hospital_id,
  user_id: auth.user().id,
  action_type: 'PATIENT_UPDATE',
  entity_type: 'patients',
  entity_id: patient.id,
  old_values: {
    chronic_conditions: ['HTN', 'DM'],
    allergies: ['Penicillin']
  },
  new_values: {
    chronic_conditions: ['HTN', 'DM', 'CKD'],  // Added CKD
    allergies: ['Penicillin', 'NSAIDs']  // Added NSAID allergy
  },
  severity: 'info',
  ip_address: req.headers['x-forwarded-for'],
  user_agent: req.headers['user-agent']
});
```

**Verify in Database:**
```sql
-- Query audit trail
SELECT timestamp, user_id, action_type, old_values, new_values
FROM activity_logs
WHERE hospital_id = current_hospital_id
ORDER BY created_at DESC
LIMIT 20;
```

---

### 6. Row-Level Security (RLS) Testing ✅

**Before committing, verify RLS prevents cross-hospital access:**

#### Test: Doctor from Hospital A Cannot See Hospital B's Patients

```bash
# 1. Sign in as doctor@hospital-a.com
# 2. Run this in browser console:

fetch('http://localhost:5173/api/patients')
  .then(r => r.json())
  .then(patients => {
    const allHospitalIds = [...new Set(patients.map(p => p.hospital_id))];
    
    if (allHospitalIds.length === 1) {
      console.log('✅ RLS working: Can only see 1 hospital');
    } else {
      console.error('❌ RLS BROKEN: Can see', allHospitalIds.length, 'hospitals!');
    }
  });
```

#### Test: Nurse Cannot Update Doctor Notes

```typescript
// Nurse tries to modify doctor's consultation notes
const { error } = await supabase
  .from('consultations')
  .update({ clinical_notes: 'Hacked!' })
  .eq('id', consultation_id);

// Should return: 403 Forbidden (RLS policy rejects)
// If it succeeds, RLS is broken!
```

#### Database Inspection Script

```bash
# Verify RLS is enabled on all critical tables
npm run inspect:rls

# Should output:
# tables_with_rls: 46/46 ✅
# hospital_scoped_tables: 46/46 ✅
# sample_policies: [list of 10 RLS policies] ✅
```

---

### 7. Error Handling & Resilience ✅

**Ensure code doesn't crash in production:**

- [ ] **No Unhandled Promises**
  ```typescript
  // ❌ WRONG - Promise rejection not caught
  supabase.from('patients').insert(newPatient);
  
  // ✅ CORRECT
  try {
    const { error } = await supabase
      .from('patients')
      .insert(newPatient);
    
    if (error) throw error;
  } catch (err) {
    console.error('Failed to create patient:', sanitizeForLog(err.message));
    toast.error('Failed to create patient');
  }
  ```

- [ ] **No Null/Undefined Access**
  ```typescript
  // ❌ WRONG - Crashes if hospital is undefined
  const wardName = hospital.wards[0].name;
  
  // ✅ CORRECT - Safe navigation
  const wardName = hospital?.wards?.[0]?.name ?? 'Unknown';
  ```

- [ ] **Network Errors Handled**
  ```typescript
  // ✅ Retry logic for flaky networks
  const fetchWithRetry = async (url, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetch(url);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };
  ```

- [ ] **Empty Data Handled**
  ```typescript
  // ✅ Handle empty patient list
  const patients = data || [];
  const isEmpty = patients.length === 0;
  
  return isEmpty ? <EmptyState /> : <PatientList patients={patients} />;
  ```

**Test It:**
```bash
npm run test:error-resilience
```

---

### 8. TypeScript & Type Safety ✅

- [ ] **No `any` types**
  ```typescript
  // ❌ WRONG
  const patient: any = data;
  
  // ✅ CORRECT
  interface Patient {
    id: string;
    first_name: string;
    hospital_id: string;
  }
  const patient: Patient = data;
  ```

- [ ] **No Non-null Assertions** (unless absolutely necessary + documented)
  ```typescript
  // ❌ WRONG
  const name = (hospital!.name)!;
  
  // ✅ CORRECT
  const name = hospital?.name ?? 'Unknown Hospital';
  ```

- [ ] **Strict Mode Enabled** in tsconfig.json
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true
    }
  }
  ```

**Verify:**
```bash
npm run type-check
# Should output: 0 errors found
```

---

### 9. Code Quality Standards ✅

- [ ] **Lint Passes**: No ESLint warnings
  ```bash
  npm run lint -- src/your-changed-file.ts
  ```

- [ ] **No Console.log in Production Code**
  ```typescript
  // ❌ WRONG in components (unless behind env check)
  console.log('Patient ID:', patient.id);
  
  // ✅ CORRECT
  if (process.env.NODE_ENV === 'development') {
    console.log('Patient ID:', patient.id);
  }
  ```

- [ ] **Comments Explain "Why", Not "What"**
  ```typescript
  // ❌ WRONG - Comment just restates code
  // Increment counter by 1
  counter++;
  
  // ✅ CORRECT - Comment explains intent
  // Increment counter for each medication refill request
  // to track pharmacy workload patterns
  counter++;
  ```

- [ ] **Function Size < 50 Lines** (keep functions focused)
  ```typescript
  // ❌ WRONG - 200-line function doing too much
  async function processMedicationOrder() {
    // ... 200 lines ...
  }
  
  // ✅ CORRECT - Break into focused functions
  async function processMedicationOrder(prescription) {
    await validatePrescription(prescription);
    await checkInventory(prescription);
    await dispense(prescription);
  }
  ```

**Run All Checks:**
```bash
npm run type-check && npm run lint && npm run test:unit
```

---

### 10. Testing Requirements ✅

**For any feature change, add tests:**

- [ ] **Unit Tests**: Test individual functions
  ```typescript
  describe('validateVitalSigns', () => {
    it('should reject temperature > 43°C', () => {
      expect(() => validateVitalSigns({ temperature: 45 }))
        .toThrow('Temperature out of range');
    });
    
    it('should accept normal temperature', () => {
      expect(validateVitalSigns({ temperature: 37.2 }))
        .not.toThrow();
    });
  });
  ```

- [ ] **Integration Tests**: Test flows (auth → read patient → create appointment)
  ```typescript
  describe('Patient Appointment Flow', () => {
    it('doctor can schedule appointment for patient', async () => {
      const doctor = await loginAs('doctor');
      const patient = await getTestPatient();
      
      const appointment = await doctor.scheduleAppointment(patient.id, {
        date: tomorrow,
        time: '10:00'
      });
      
      expect(appointment.status).toBe('scheduled');
    });
  });
  ```

- [ ] **E2E Tests**: Test complete user workflows
  ```typescript
  test('Doctor completes patient consultation', async ({ page }) => {
    await page.goto('/login');
    await loginAsRole(page, 'doctor');
    
    await page.click('[data-testid="patient-123"]');
    await page.fill('[data-testid="chief-complaint"]', 'Headache');
    await page.click('[data-testid="save-consultation"]');
    
    await expect(page.locator('[data-testid="consultation-saved"]')).toBeVisible();
  });
  ```

**Run Tests:**
```bash
npm run test:unit                          # Fast unit tests
npm run test:integration                   # Slower integration tests
npm run test:e2e -- --grep "my-feature"   # E2E tests for specific feature
```

---

## Pre-Commit Checklist

**Before running `git commit`:**

- [ ] All tests pass: `npm run test:unit`
- [ ] No lint errors: `npm run lint`
- [ ] Type check passes: `npm run type-check`
- [ ] No console.log in production code
- [ ] No hardcoded secrets in code
- [ ] Healthcare domain rules validated (vitals, dosages, ages)
- [ ] RLS enforcement verified (hospital_id included)
- [ ] PHI logging checked (used sanitizeForLog)
- [ ] Audit trail added (for high-risk mutations)
- [ ] Error handling complete (try/catch)
- [ ] No `any` types or non-null assertions without reason
- [ ] Database schema change includes reversible migration
- [ ] Commit message follows: `feat/fix/docs/refactor: description`

**One-Command Check:**
```bash
npm run review:check
# Runs: type-check, lint, test:unit, no-console, no-secrets
```

---

## Healthcare-Specific Review Questions

> **Ask yourself these before pushing code:**

1. ✅ **Clinical Safety**: Would a nurse trust this calculation/validation?
2. ✅ **Privacy**: Could any patient data leak in logs/errors?
3. ✅ **Compliance**: Would an auditor approve this audit trail?
4. ✅ **Interoperability**: Does this work with FHIR/HL7 standards?
5. ✅ **Accessibility**: Can a nurse with tremors use this interface?
6. ✅ **Localization**: Does this work in different timezones/countries?

---

## Examples of Passing Commits

### ✅ Example 1: Add Prescription Dosage Validation

```bash
git commit -m "feat: validate prescription dosage against pediatric/geriatric rules

- Add pediatric dosage calculator for patients <18 years
- Add geriatric dosage warning for patients >65 years
- Validate dosage format matches medication standard
- Add unit tests for edge cases (neonates, elderly)
- Audit log tracks dosage changes
- RLS enforces doctor/hospital scope
- No PHI in error messages

Fixes: CARE-456"
```

**Passes Checklist:**
- ✅ Clinical rules applied (age-appropriate dosing)
- ✅ Tests added (pediatric + geriatric cases)
- ✅ RLS verified (doctor + hospital scoped)
- ✅ Audit trail included
- ✅ Error messages safe (no patient data)

### ❌ Example 2: What Gets Rejected

```bash
git commit -m "fix: patient search

- Speed up database query"
```

**Gets Rejected Because:**
- ❌ No security review (could expose other hospitals' patients)
- ❌ No tests added
- ❌ Unclear what changed
- ❌ Doesn't mention RLS/hospital_id scoping

---

## Questions?

- 📚 **Database schema questions?** → [docs/DATABASE.md](./DATABASE.md)
- 🔐 **RLS/Security questions?** → [docs/SECURITY.md](./SECURITY.md)
- 🏥 **Clinical guidance?** → [docs/REQUIREMENTS.md](./REQUIREMENTS.md)
- 🧪 **Testing questions?** → [docs/TESTING.md](./TESTING.md)
- 💬 **Slack**: `#caresync-dev`

---

**By reviewing this checklist before every commit, you help ensure CareSync is safe, secure, and compliant for patient care. Thank you! 🏥**
