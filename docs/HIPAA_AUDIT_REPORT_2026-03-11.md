# CareSync HIMS — HIPAA Compliance Audit Report
**Date**: March 11, 2026  
**Baseline Score**: 78/100 (see `docs/HIPAA_COMPLIANCE.md`)  
**Auditor**: Automated HIPAA Compliance Audit (hipaa-compliance-audit skill)  
**Scope**: Full app — all hooks under `src/hooks/`, all `supabase/migrations/`, telemedicine consent flows, offline storage, AI/FHIR integrations  

---

## Executive Summary

The audit identified **20 findings** across all five HIPAA domains. The highest-risk items are:

1. **Plaintext PHI written to localStorage** by `useMobileWorkflow` and `useSampleTracking` — patient PII and clinical lab data stored unencrypted in the browser.
2. **No audit trail** on consultations or prescriptions — the two highest-volume PHI-touching workflows have zero `logActivity` calls.
3. **No consent gate** before telemedicine sessions or FHIR patient exports — PHI is disclosed without checking `patient_consents`.
4. **No field-level encryption** on consultation and prescription clinical narratives (`chief_complaint`, `final_diagnosis`, `clinical_notes`, `medication_name`, `dosage`).
5. **Unsanitized error logging** in insurance claims, audit failures, and lab critical-value paths.

After full remediation, the estimated compliance score rises from **78 → 91/100**.

---

## Findings by Domain

### Domain 1 — PHI Handling & Log Sanitization
**Regulation**: §164.312(a)(2)(iv), §164.312(e)(2)(ii)

---

#### F1.1 — High — Unsanitized error logging in `useInsuranceClaims`
- **Severity**: High
- **HIPAA Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption; §164.312(e)(2)(ii) — Encryption
- **Domain**: PHI Handling
- **Files**: `src/hooks/useInsuranceClaims.ts:70`, `src/hooks/useInsuranceClaims.ts:87`

#### Finding
`console.error('Failed to submit claim to provider', error)` and `console.error('Failed to check claim status', error)` pass the raw `error` object directly to the console. The `submitClaimToProvider` function passes `patient_id`, `policy_number`, `diagnosis_codes`, and `procedure_codes` to the insurance edge function—if the invocation error contains a serialized request body or response (common with network errors), those PHI fields will appear verbatim in browser console logs that may be captured by monitoring tools.

#### Remediation
1. Replace both calls with `sanitizeForLog`:
```ts
// useInsuranceClaims.ts:70
console.error('Failed to submit claim to provider', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));

// useInsuranceClaims.ts:87
console.error('Failed to check claim status', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
```
2. Import `sanitizeLogMessage` from `@/utils/sanitize` (already used elsewhere in the file's consuming hooks).
3. Test: run `npm run test:security` after change.

---

#### F1.2 — High — Unsanitized error logging in `useAudit` failure path
- **Severity**: High
- **HIPAA Regulation**: §164.312(b) — Audit Controls; §164.312(a)(2)(iv)
- **Domain**: PHI Handling
- **Files**: `src/hooks/useAudit.ts:48`, `src/hooks/useAudit.ts:51`

#### Finding
`console.error('Audit Logging Failed:', error)` and `console.error('Failed to log activity:', err)` log the raw error object. The `useAudit` hook accepts `oldValues` and `newValues` parameters that can contain PHI-rich patient record snapshots. If Supabase throws a serialization error that includes the rejected insert payload in its message, the full PHI payload would be logged to the browser console.

#### Remediation
1. Sanitize the error in the failure path:
```ts
// useAudit.ts — inside the catch block
if (error) {
  console.error('Audit Logging Failed:', sanitizeForLog(String(error)));
}
// outer catch
console.error('Failed to log activity:', sanitizeForLog(String(err)));
```
2. Import `sanitizeForLog` from `@/utils/sanitize`.

---

#### F1.3 — High — Unsanitized error logging in `useLaboratory` critical value path
- **Severity**: High
- **HIPAA Regulation**: §164.312(a)(2)(iv); §164.312(e)(2)(ii)
- **Domain**: PHI Handling
- **Files**: `src/hooks/useLaboratory.ts:186`

#### Finding
`console.error('Failed to create critical value notification:', err)` logs the raw error in `createCriticalValueNotification`, which is called immediately after `addLabResult`. The local `result` object passed to this function contains `patient_id`, `loinc_code`, `result_value`, `result_unit`, and `critical_flag` — all HIPAA-protected lab PHI. Supabase constraint errors frequently echo back the rejected row, which would include these fields.

#### Remediation
```ts
// useLaboratory.ts:186
console.error('Failed to create critical value notification:', sanitizeForLog(err instanceof Error ? err.message : 'Unknown error'));
```
Import `sanitizeForLog` from `@/utils/sanitize` at the top of the file.

---

#### F1.4 — Medium — Direct AI error logging may expose patient context
- **Severity**: Medium
- **HIPAA Regulation**: §164.312(a)(2)(iv)
- **Domain**: PHI Handling
- **Files**: `src/hooks/useAIClinicalSuggestions.ts:79`, `:230`, `:275`, `:318`

#### Finding
The four `console.error` / `console.warn` calls that catch failures from AI inference functions (`analyzeDrugInteractions`, `analyzeClinicalGuidelines`, `assessPatientRisks`) log raw `error` objects. These AI functions forward `patientData` including `current_medications`, `allergies`, `chief_complaint`, and `vital_signs` to `/api/ai/` endpoints. If a network error captures the request body in its message, the logged error object may contain PHI fragments.

#### Remediation
Replace all four calls with `sanitizeForLog(err instanceof Error ? err.message : 'AI operation failed')`.

---

### Domain 2 — Encryption & Vault
**Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption, §164.312(e)(2)(ii)

---

#### F2.1 — Critical — Plaintext PHI written to localStorage in `useMobileWorkflow`
- **Severity**: Critical
- **HIPAA Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption
- **Domain**: Encryption
- **Files**: `src/hooks/useMobileWorkflow.ts:126`, `src/hooks/useMobileWorkflow.ts:214`

#### Finding
`localStorage.setItem('offline_data', JSON.stringify(syncedData))` writes the full `OfflineData` object to localStorage **without any encryption**. The `syncedData.patients` array is populated directly from `supabase.from('patients').select('*')` and contains every PHI field: `first_name`, `last_name`, `date_of_birth`, `mrn`, `phone`, `email`, `address`, `allergies`, `chronic_conditions`, `current_medications`, `insurance_provider`, `insurance_policy_number`, and `emergency_contact_*`. This data persists in browser storage indefinitely and is accessible to any XSS payload or malicious browser extension.

#### Remediation
1. Replace the raw `localStorage.setItem` calls with the `secureTransmission.prepareForTransmission` pattern already used in `useOfflineSync.ts`:
```ts
// useMobileWorkflow.ts — inside syncOfflineData mutationFn, after building syncedData
import { secureTransmission } from '@/utils/dataProtection';

const phiFields = [
  'first_name', 'last_name', 'date_of_birth', 'phone', 'email',
  'address', 'allergies', 'chronic_conditions', 'current_medications',
  'insurance_provider', 'insurance_policy_number',
];

const { data: encryptedPatients, encryptionMetadata } =
  await secureTransmission.prepareForTransmission(syncedData.patients, phiFields);

localStorage.setItem('offline_data', JSON.stringify({
  ...syncedData,
  patients: encryptedPatients,
  _encryption_metadata: encryptionMetadata,
}));
```
2. Update `addOfflineChange` (line 214) with the same encryption before persisting.
3. Update the `useEffect` that reads `offline_data` on mount to decrypt using `secureTransmission.restoreFromTransmission`.
4. Test: verify that `localStorage.getItem('offline_data')` returns encrypted ciphertext strings for PHI fields, not plaintext names.

---

#### F2.2 — Critical — Plaintext lab sample PHI written to localStorage in `useSampleTracking`
- **Severity**: Critical
- **HIPAA Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption
- **Domain**: Encryption
- **Files**: `src/hooks/useSampleTracking.ts:20`

#### Finding
`window.localStorage.setItem(LOCAL_SAMPLES_KEY, JSON.stringify(samples))` stores `LabSample` objects as a fallback when the `lab_samples` table is unavailable. The `LabSample` interface includes `patient_id`, `patient.first_name`, `patient.last_name`, `patient.medical_record_number`, `test_type`, and `notes` — all HIPAA-protected. The fallback path (`createSampleMutation` on lines ~130-145) is reached in production during schema migrations, making this an active risk.

#### Remediation
1. Apply `secureTransmission.prepareForTransmission` before all `saveLocalSamples` calls:
```ts
// useSampleTracking.ts — saveLocalSamples function
import { secureTransmission } from '@/utils/dataProtection';

async function saveLocalSamples(samples: LabSample[]) {
  const phiFields = ['patient_id', 'notes'];
  const { data: encrypted, encryptionMetadata } =
    await secureTransmission.prepareForTransmission(samples, phiFields);
  try {
    window.localStorage.setItem(LOCAL_SAMPLES_KEY, JSON.stringify({ data: encrypted, meta: encryptionMetadata }));
  } catch { /* ignore storage failures */ }
}
```
2. Update `loadLocalSamples` to decrypt using `secureTransmission.restoreFromTransmission`.
3. Note: `patient.first_name`, `patient.last_name`, `patient.medical_record_number` are joined from the patients table query — strip or hash these before persisting to the fallback store.

---

#### F2.3 — High — Consultation clinical narratives stored without field-level encryption
- **Severity**: High
- **HIPAA Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption
- **Domain**: Encryption
- **Files**: `src/hooks/useConsultations.ts` (no `useHIPAACompliance` import), `supabase/migrations/20260204000001_core_schema.sql` (consultations table definition)

#### Finding
`useConsultations.ts` has no import of `useHIPAACompliance` or `useDataProtection` and performs no field-level encryption before inserting or updating consultation records. The `consultations` table stores highly sensitive PHI as plaintext TEXT/JSONB columns: `chief_complaint`, `history_of_present_illness`, `provisional_diagnosis[]`, `final_diagnosis[]`, `treatment_plan`, `clinical_notes`, `follow_up_notes`, `handoff_notes`. In contrast, the `patients` table correctly encrypts PHI using `encryptPHI` before storage. This is an inconsistency in the encryption model that leaves the most clinically sensitive data unprotected at rest.

#### Remediation
1. Add `useHIPAACompliance` to `useCreateConsultation` / `useUpdateConsultation`:
```ts
// useConsultations.ts — create mutation
const { encryptPHI } = useHIPAACompliance();

mutationFn: async (consultationData: ConsultationInsert) => {
  const sensitiveFields = {
    chief_complaint: consultationData.chief_complaint,
    treatment_plan: consultationData.treatment_plan,
    clinical_notes: consultationData.clinical_notes,
  };
  const { data: encryptedFields, metadata } = await encryptPHI(sensitiveFields);
  
  const { data, error } = await supabase
    .from('consultations')
    .insert({ ...consultationData, ...encryptedFields, encryption_metadata: metadata })
    .select();
  // ...
}
```
2. Add a corresponding `decryptPHI` call in `useConsultations` and `useConsultation` query functions.
3. Run `supabase migration new add_encryption_metadata_to_consultations` to add the `encryption_metadata` column.

---

#### F2.4 — High — Prescription items stored without field-level encryption
- **Severity**: High
- **HIPAA Regulation**: §164.312(a)(2)(iv)
- **Domain**: Encryption
- **Files**: `src/hooks/usePrescriptions.ts` (no `useHIPAACompliance` import)

#### Finding
`useCreatePrescription` inserts `prescription_items` rows containing `medication_name`, `dosage`, `frequency`, `duration`, and `instructions` — all HIPAA PHI under §164.312 — without any field-level encryption. The data is stored as plaintext in the `prescription_items` table.

#### Remediation
Mirror the patient-record encryption pattern: encrypt `medication_name`, `dosage`, and `instructions` fields using `encryptField` from `useDataProtection` before insert, and persist `encryption_metadata` on the `prescriptions` table row (not per item — store the key handle on the parent prescription).

---

### Domain 3 — Audit Trail Coverage
**Regulation**: §164.312(b) — Audit Controls, §164.308(a)(1)(ii)(D)

---

#### F3.1 — Critical — No audit trail for consultation create/update
- **Severity**: Critical
- **HIPAA Regulation**: §164.312(b) — Audit Controls
- **Domain**: Audit Trail
- **Files**: `src/hooks/useConsultations.ts` (entire file — no `logActivity` or `useAudit` calls)

#### Finding
`useCreateConsultation` and `useUpdateConsultation` (when found) perform Supabase inserts and updates on the `consultations` table — which contains `chief_complaint`, `final_diagnosis`, `treatment_plan`, and `clinical_notes` — without any `logActivity` call. A review of `Select-String -Pattern "logActivity|useAudit"` across all hooks confirms zero matches in `useConsultations.ts`. Under §164.312(b), every PHI access and modification must be logged. Clinical assessments and treatment plans are the highest-value PHI records in the system.

#### Remediation
```ts
// useConsultations.ts — useCreateConsultation
const { logActivity } = useAudit();

onSuccess: (data) => {
  void logActivity({
    actionType: 'CONSULTATION_CREATED',
    entityType: 'consultations',
    entityId: data.id,
    details: { patient_id: data.patient_id, doctor_id: data.doctor_id },
    severity: 'info',
  });
  // existing invalidation...
}
```
Add equivalent `CONSULTATION_UPDATED`, `CONSULTATION_COMPLETED`, and `CONSULTATION_CANCELLED` events for each mutation.

---

#### F3.2 — Critical — No audit trail for prescription create/dispense
- **Severity**: Critical
- **HIPAA Regulation**: §164.312(b) — Audit Controls
- **Domain**: Audit Trail
- **Files**: `src/hooks/usePrescriptions.ts` (entire file — no `logActivity` or `useAudit` calls)

#### Finding
`useCreatePrescription` inserts prescriptions and prescription items. `useDispensePrescription` updates the prescription status to `dispensed`. Neither mutation calls `logActivity`. Prescription creation and dispensing are controlled substance–relevant events; without an audit trail, the system cannot produce the activity logs required under HIPAA's §164.312(b) audit control standard or demonstrate chain-of-custody.

#### Remediation
```ts
// usePrescriptions.ts — useCreatePrescription.onSuccess
const { logActivity } = useAudit();

onSuccess: (data, variables) => {
  void logActivity({
    actionType: 'PRESCRIPTION_CREATED',
    entityType: 'prescriptions',
    entityId: data.id,
    details: { patient_id: variables.patientId, item_count: variables.items.length },
    severity: 'info',
  });
  // existing work...
}

// usePrescriptions.ts — useDispensePrescription.onSuccess
void logActivity({
  actionType: 'PRESCRIPTION_DISPENSED',
  entityType: 'prescriptions',
  entityId: prescriptionId,
  severity: 'info',
});
```

---

#### F3.3 — High — No audit trail for telemedicine session lifecycle
- **Severity**: High
- **HIPAA Regulation**: §164.312(b) — Audit Controls; §164.506 — Uses and Disclosures
- **Domain**: Audit Trail
- **Files**: `src/hooks/useTelemedicine.ts` (entire file — no `logActivity` or `useAudit` calls)

#### Finding
`createSession`, `joinSession`, `endSession`, and `recordConsultation` mutations invoke Edge Functions that create, join, and close telemedicine sessions. None call `logActivity`. Telemedicine sessions create a new treatment context involving PHI (notes, prescriptions passed to `recordConsultation`) and involve real-time patient video — they must appear in the HIPAA audit log.

#### Remediation
Add `useAudit` to `useTelemedicine` and fire `TELEMEDICINE_SESSION_CREATED`, `TELEMEDICINE_SESSION_JOINED`, `TELEMEDICINE_SESSION_ENDED` events from each mutation's `onSuccess` callback with `{ appointment_id, patient_id, doctor_id }` as details.

---

#### F3.4 — High — No audit trail for insurance claims
- **Severity**: High
- **HIPAA Regulation**: §164.312(b) — Audit Controls; §164.506 — Uses and Disclosures
- **Domain**: Audit Trail
- **Files**: `src/hooks/useInsuranceClaims.ts` (`createClaim`, `submitClaim`, `updateClaim` mutations)

#### Finding
`createClaim`, `submitClaim`, and `updateClaim` involve external PHI disclosure to insurance providers (`submitClaimToProvider` invokes the `insurance-integration` Edge Function with `patient_id`, `policy_number`, `diagnosis_codes`, `procedure_codes`). Under §164.506, disclosures of PHI for payment purposes must be tracked. None of these mutations call `logActivity`.

#### Remediation
```ts
// useInsuranceClaims.ts — submitClaim.onSuccess
void logActivity({
  actionType: 'INSURANCE_CLAIM_SUBMITTED',
  entityType: 'insurance_claims',
  entityId: claimId,
  details: { insurance_provider: existingClaim.insurance_provider, claim_amount: existingClaim.claim_amount },
  severity: 'warning', // PHI disclosure warrants higher severity
});
```
Add `INSURANCE_CLAIM_CREATED` and `INSURANCE_CLAIM_UPDATED` events similarly.

---

#### F3.5 — High — Audit log failures silently swallowed with no fallback
- **Severity**: High
- **HIPAA Regulation**: §164.312(b) — Audit Controls; §164.308(a)(1)(ii)(D) — Information System Activity Review
- **Domain**: Audit Trail
- **Files**: `src/hooks/useAudit.ts:47-54`

#### Finding
The `try/catch` in `logActivity` catches both the Supabase insert error (line 48) and the outer exception (line 51) and silently logs to console without any alerting, fallback queue, or re-throw. If the `activity_logs` table is unavailable due to a schema migration or DB connectivity issue, all audit events are silently dropped. HIPAA §164.308(a)(1)(ii)(D) requires a review mechanism to detect audit failures.

#### Remediation
1. In the error path, invoke `toast.error('Audit logging temporarily unavailable')` so operators are aware of the gap.
2. Consider a local `sessionStorage` queue for failed audit entries that replays on reconnect (similar to `useOfflineSync.ts`'s pending actions pattern).
3. At minimum, add the error to error tracking:
```ts
if (error) {
  console.error('Audit Logging Failed:', sanitizeForLog(String(error)));
  // Alert monitoring
  void supabase.from('error_tracking').insert({
    hospital_id: profile.hospital_id,
    error_message: 'Audit log write failed',
    severity: 'critical',
    context: { action: params.actionType },
  }).then(() => {});
}
```

---

#### F3.6 — Medium — `useAIClinicalSuggestions` bypasses `useAudit` with a direct insert
- **Severity**: Medium
- **HIPAA Regulation**: §164.312(b) — Audit Controls
- **Domain**: Audit Trail
- **Files**: `src/hooks/useAIClinicalSuggestions.ts:59-74`

#### Finding
`useAIClinicalSuggestions` calls `await supabase.from('activity_logs').insert(...)` directly (line 59) instead of using `useAudit`'s `logActivity`. This bypasses any centralized PHI scrubbing, metadata enrichment (`pathname`, `user_agent`, `severity`), or future middleware added to the `useAudit` hook. If the call fails, it is silently swallowed in the surrounding `try/catch`.

#### Remediation
Replace the direct insert with `useAudit`:
```ts
const { logActivity } = useAudit();
// inside successful queryFn:
void logActivity({
  actionType: 'AI_CLINICAL_ANALYSIS',
  entityType: 'patient',
  entityId: patientId,
  details: { insights_generated: insights.length, analysis_types: [...new Set(insights.map(i => i.type))] },
});
```

---

### Domain 4 — Consent Records
**Regulation**: §164.506 — Uses and Disclosures, §164.508 — Authorization

---

#### F4.1 — Critical — Telemedicine session created without consent gate
- **Severity**: Critical
- **HIPAA Regulation**: §164.506(c) — Uses and Disclosures; §164.508(a) — Authorizations Required
- **Domain**: Consent
- **Files**: `src/hooks/useTelemedicine.ts:18-34`

#### Finding
`createSession` invokes the `telemedicine` Edge Function with `appointment_id`, `doctor_id`, and `patient_id` without first querying `patient_consents.telemedicine_consent`. The `telemedicine_consent` column exists on `patient_consents` (confirmed in migration `20260220070446`). A telemedicine video session is a real-time treatment disclosure that legally requires explicit patient consent under §164.506. Starting a session before consent is verified is a HIPAA violation regardless of whether consent was obtained through other channels.

#### Remediation
```ts
// useTelemedicine.ts — createSession mutationFn, before the functions.invoke call:
const { data: consent, error: consentError } = await supabase
  .from('patient_consents')
  .select('telemedicine_consent')
  .eq('patient_id', patientId)
  .single();

if (consentError || !consent?.telemedicine_consent) {
  throw new Error('Patient has not provided telemedicine consent. Please obtain consent before starting the session.');
}
// ... then proceed with functions.invoke('telemedicine', ...)
```
Surface this as a blocking UI prompt so clinicians can obtain and record consent inline.

---

#### F4.2 — Critical — FHIR patient export without `data_sharing_consent` check
- **Severity**: Critical
- **HIPAA Regulation**: §164.506(c)(1) — Treatment/Payment/Operations; §164.508 — Authorizations Required
- **Domain**: Consent
- **Files**: `src/hooks/useFHIRIntegration.ts:103-107`

#### Finding
`exportPatient` invokes `invokeFHIRAction('export_patient', { patient_id: patientId })` which sends a full FHIR Patient resource (name, birthDate, gender, address, telecom, identifiers) to an external system. There is no query of `patient_consents.data_sharing_consent` or any other consent check before the export. Third-party data sharing under FHIR for non-treatment purposes requires explicit patient authorization under §164.508. Even for treatment-related FHIR exchanges, the consent must be documented.

#### Remediation
```ts
// useFHIRIntegration.ts — exportPatient.mutationFn
const { data: consent } = await supabase
  .from('patient_consents')
  .select('data_sharing_consent')
  .eq('patient_id', patientId)
  .single();

if (!consent?.data_sharing_consent) {
  throw new Error('Patient data sharing consent not recorded. Cannot export FHIR data.');
}
// ... then proceed with invokeFHIRAction
```

---

#### F4.3 — High — AI clinical analysis proceeds without consent verification
- **Severity**: High
- **HIPAA Regulation**: §164.508 — Authorizations Required; §164.506(c)
- **Domain**: Consent
- **Files**: `src/hooks/useAIClinicalSuggestions.ts:37-82`

#### Finding
`useAIClinicalSuggestions` fetches `medical_history`, `current_medications`, `allergies`, `age`, `gender`, `chief_complaint`, and `vital_signs` from the `patients` table and passes them to `/api/ai/drug-interactions`, `/api/ai/clinical-guidelines`, and `/api/ai/risk-assessment` — all external AI inference endpoints. Patient PHI is sent to a third-party AI service without checking any consent record. Under §164.508, disclosures to AI services for purposes beyond direct treatment require authorization.

#### Remediation
Before the AI analysis block (line ~47), add:
```ts
const { data: consent } = await supabase
  .from('patient_consents')
  .select('data_sharing_consent')
  .eq('patient_id', patientId)
  .single();

if (!consent?.data_sharing_consent) {
  // Use fallback analysis only (rule-based, no external AI call)
  return generateFallbackInsights(patientData);
}
```
This ensures PHI is only sent to the AI service when the patient has explicitly consented to data sharing.

---

### Domain 5 — RLS Policy Completeness
**Regulation**: §164.312(a)(1) — Access Control, §164.312(a)(2)(i) — Unique User Identification

---

#### F5.1 — Medium — Single-patient query in `usePatient` missing explicit hospital scoping
- **Severity**: Medium
- **HIPAA Regulation**: §164.312(a)(1) — Access Control
- **Domain**: RLS Policies
- **Files**: `src/hooks/usePatients.ts:125-148` (`usePatient` hook)

#### Finding
The `usePatient(patientId)` query fetches a patient by primary key only:
```ts
supabase.from('patients').select('*').eq('id', patientId).maybeSingle()
```
There is no `.eq('hospital_id', hospital.id)` filter. While the RLS policy `"Staff can view patients in their hospital"` provides database-level protection, defence-in-depth requires that the application layer also enforces hospital scoping. If a staff member from Hospital A obtains or guesses a `patientId` from Hospital B, the query succeeds at the application level and only the RLS policy prevents the data leak — a single layer of defense for the highest-sensitivity data.

#### Remediation
```ts
// usePatients.ts — usePatient queryFn
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patientId)
  .eq('hospital_id', hospital.id)  // ← add explicit application-layer scope
  .maybeSingle();
```
Also add `enabled: !!patientId && !!hospital?.id` to the query options to prevent execution without both identifiers.

---

#### F5.2 — Medium — Cryptographically weak session token in `useDigitalCheckin`
- **Severity**: Medium
- **HIPAA Regulation**: §164.312(a)(2)(i) — Unique User Identification; §164.312(d) — Person or Entity Authentication
- **Domain**: RLS Policies / Authentication
- **Files**: `src/hooks/usePatientPortal.ts` (near line ~850, `generateSessionToken` function)

#### Finding
```ts
const generateSessionToken = (): string =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);
```
`Math.random()` is not a cryptographically secure PRNG. The resulting token has approximately 84 bits of entropy but is generated from a predictable seed. Session tokens for patient digital check-in are stored in `digital_checkin_sessions` and represent a pathway to patient self-service PHI access. A predictable token could allow an attacker to spoof a patient check-in session.

#### Remediation
Replace `Math.random()` with the Web Crypto API:
```ts
const generateSessionToken = (): string =>
  crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
```
Or use a shorter but still secure token:
```ts
const generateSessionToken = (): string => {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};
```

---

#### F5.3 — Low — `vital_signs` table missing `hospital_id` column for direct hospital scoping
- **Severity**: Low
- **HIPAA Regulation**: §164.312(a)(1) — Access Control
- **Domain**: RLS Policies
- **Files**: `supabase/migrations/20260204000001_core_schema.sql` (vital_signs table)

#### Finding
The `vital_signs` table has no `hospital_id` column. Its RLS policy joins through `patients` to determine hospital membership:
```sql
EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND user_belongs_to_hospital(auth.uid(), p.hospital_id))
```
This is functionally correct but incurs a subquery on every RLS evaluation. More importantly, if the `patients` table RLS policy itself has a gap (e.g., during future schema changes), the `vital_signs` RLS would inherit the gap silently. Adding `hospital_id` directly to `vital_signs` would provide independent scoping.

#### Remediation
```sql
-- New migration
ALTER TABLE public.vital_signs ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id);
-- Backfill
UPDATE public.vital_signs vs SET hospital_id = p.hospital_id
FROM public.patients p WHERE p.id = vs.patient_id;
-- Drop old policy and replace
DROP POLICY IF EXISTS "Staff can view vital signs" ON public.vital_signs;
CREATE POLICY "Staff can view vital signs" ON public.vital_signs FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
```

---

## Compliance Impact

| Metric | Value |
|--------|-------|
| Baseline score | 78 / 100 |
| Estimated score after all remediations | 91 / 100 |
| Total findings | 20 |
| Critical | 6 (F2.1, F2.2, F3.1, F3.2, F4.1, F4.2) |
| High | 8 (F1.1, F1.2, F1.3, F2.3, F2.4, F3.3, F3.4, F3.5, F4.3) |
| Medium | 4 (F1.4, F3.6, F5.1, F5.2) |
| Low | 1 (F5.3) |

### Findings by Domain

| Domain | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| PHI Handling | 0 | 3 | 1 | 0 |
| Encryption | 2 | 2 | 0 | 0 |
| Audit Trail | 2 | 3 | 1 | 0 |
| Consent | 2 | 1 | 0 | 0 |
| RLS Policies | 0 | 0 | 2 | 1 |

### Blocking Items for Production

All **Critical** findings must be remediated before handling real patient data:

1. **F2.1** — `useMobileWorkflow` plaintext PHI in localStorage
2. **F2.2** — `useSampleTracking` plaintext lab PHI in localStorage
3. **F3.1** — No audit trail on consultation create/update
4. **F3.2** — No audit trail on prescription create/dispense
5. **F4.1** — No telemedicine consent gate
6. **F4.2** — No FHIR export consent gate

### Recommended Remediation Sequence

```
Day 1 (blocking):  F4.1, F4.2 — consent gate additions (30 min each, low risk)
Day 1 (blocking):  F3.1, F3.2 — logActivity additions (30 min each)
Day 2 (blocking):  F2.1 — useMobileWorkflow encryption (2 hours)
Day 2 (blocking):  F2.2 — useSampleTracking encryption (1 hour)
Day 3 (high):      F1.1, F1.2, F1.3, F1.4 — sanitizeForLog additions (1 hour total)
Day 3 (high):      F3.3, F3.4 — telemedicine + insurance audit trails (1 hour)
Day 3 (high):      F3.5 — audit failure alerting (1 hour)
Day 4 (high):      F2.3 — consultation field-level encryption (4 hours, requires migration)
Day 4 (high):      F2.4 — prescription field-level encryption (3 hours, requires migration)
Week 2:            F4.3, F5.1, F5.2, F3.6, F5.3 — remaining medium/low findings
```

---

*Report generated on 2026-03-11. Re-audit recommended after all Critical and High findings are remediated.*
