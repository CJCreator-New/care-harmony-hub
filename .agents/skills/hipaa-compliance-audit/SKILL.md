---
name: hipaa-compliance-audit
description: 'Specialized HIPAA compliance checker for the CareSync HIMS. Goes beyond general code review to focus specifically on PHI handling, encryption metadata persistence, consent record coverage, audit log completeness, and Supabase Vault usage patterns. Use when asked to audit HIPAA compliance, check PHI handling, verify audit trails, review consent flows, or assess encryption coverage. Produces a structured compliance gap report with §164 citations and remediation steps.'
argument-hint: 'Scope the audit: a specific file, feature area (auth, pharmacy, lab, billing, patient-portal), or "full app". Optionally specify focus: phi-handling | encryption | audit-trail | consent | vault | rls-policies.'
---

# CareSync — HIPAA Compliance Audit Skill

Performs a structured HIPAA compliance audit focused on the 5 highest-risk areas in this codebase. Output is a gap report with HIPAA §164 citations, severity ratings, affected files, and concrete remediation steps. References the current compliance baseline of **78/100** from `docs/HIPAA_COMPLIANCE.md`.

## When to Use

- "Audit HIPAA compliance for [feature/file]"
- "Check PHI handling in [component]"
- "Verify audit trail coverage for [workflow]"
- "Review consent records for [patient flow]"
- "Check encryption metadata on [table/hook]"
- "Is [feature] HIPAA-ready?"

---

## The 5 Audit Domains

### Domain 1 — PHI Handling & Log Sanitization
**Regulation**: §164.312(a)(2)(iv), §164.312(e)(2)(ii)

PHI fields in CareSync: `ssn`, `dob`, `date_of_birth`, `diagnosis`, `mrn`, `medical_record`, `prescription`, `lab_result`, `vital`, `chief_complaint`, `notes`, `allergies`, `medications`, `insurance`, `patient_name` (when combined with clinical data).

**Scan for:**

| Signal | Issue | Severity |
|--------|-------|----------|
| `console.log(...)` containing any PHI field name | PHI leak to browser console | Critical |
| `toast(...)` or `toast.error(...)` with raw patient object | PHI exposed in UI notification | High |
| `sanitizeForLog` absent before any log/toast touching patient data | Missing PHI sanitization | High |
| PHI passed directly to AI prompt string without stripping | PHI leakage to model | Critical |
| `localStorage.setItem(key, JSON.stringify(patientData))` without encryption | Unencrypted PHI in browser storage | Critical |
| PHI in URL query params (`?mrn=`, `?patient=`) | PHI in server logs/browser history | High |
| Error messages that include patient identifiers | PHI in error responses | Medium |

**Required pattern** — `sanitizeForLog` must be called before any log/toast:
```ts
import { sanitizeForLog } from '@/utils/sanitize';
console.log('[hook]', sanitizeForLog(patientData)); // ✅
console.log('[hook]', patientData);                 // ❌
```

---

### Domain 2 — Encryption & Vault
**Regulation**: §164.312(a)(2)(iv) — Encryption and Decryption, §164.312(e)(2)(ii)

CareSync uses AES-GCM encryption via `useHIPAACompliance()` / `useDataProtection()`. The `fix_encryption_metadata.sql` migration requires that every encrypted row stores a `encryption_metadata` field with the key handle.

**Scan for:**

| Signal | Issue | Severity |
|--------|-------|----------|
| `encrypt(data)` call without subsequent `encryption_metadata` field in the Supabase insert/update | Key handle not persisted — data unrecoverable after key rotation | Critical |
| `useDataProtection` imported but `encryptField` not called on PHI columns before storage | PHI stored in plaintext | Critical |
| Supabase Vault `vault.secrets` referenced in edge functions without error handling | Vault fetch failure silently falls back to plaintext | High |
| `ENCRYPTION_KEY` read from `process.env` in browser code | `process.env` is `undefined` at Vite runtime — encryption silently broken | Critical |
| `VITE_ENCRYPTION_KEY` hardcoded in `.env` committed to git | Secret exposure | Critical |
| PHI fields in `useState` without encryption wrapper | Unencrypted in-memory PHI | Medium |

**Required pattern** for encrypted storage:
```ts
const { encryptField } = useDataProtection();
const encrypted = await encryptField(phi_value);
await supabase.from('table').insert({
  phi_column: encrypted.ciphertext,
  encryption_metadata: encrypted.metadata, // ← required
});
```

---

### Domain 3 — Audit Trail Coverage
**Regulation**: §164.312(b) — Audit Controls, §164.308(a)(1)(ii)(D)

Every create/update/delete touching patient or clinical data must call `logActivity`. Check `src/utils/auditLogger.ts` and `src/hooks/useAudit.ts` for the correct call signature.

**Scan for:**

| Signal | Issue | Severity |
|--------|-------|----------|
| `supabase.from('patients').insert(...)` without `logActivity` call in same function | Missing audit trail for patient creation | Critical |
| `supabase.from('consultations').update(...)` without audit call | Missing audit trail for clinical update | Critical |
| `supabase.from('prescriptions').delete(...)` without audit call | Missing audit trail for prescription deletion | Critical |
| `logActivity` called but `actionType` is generic (`'update'` instead of `'prescription_dispensed'`) | Audit trail too coarse for HIPAA review | Medium |
| `logActivity` inside a `try` block that swallows errors | Audit failure silently ignored | High |
| Edge functions that mutate clinical data without calling `audit-logger` edge function | Server-side audit gap | High |

**Required pattern**:
```ts
await logActivity({
  actionType: 'prescription_created',   // specific, not generic
  resourceType: 'prescription',
  resourceId: prescription.id,
  details: { patient_id, medication_name }, // no raw PHI
});
```

---

### Domain 4 — Consent Records
**Regulation**: §164.506 — Uses and Disclosures, §164.508 — Authorization

CareSync has `patient_consents` and `consent_forms` tables. Telemedicine sessions require `telemedicine_consent = true` before session start.

**Scan for:**

| Signal | Issue | Severity |
|--------|-------|----------|
| Telemedicine session initiated without checking `patient_consents.telemedicine_consent` | Consent gate missing | Critical |
| AI clinical assistant receiving patient data without consent verification | PHI to AI without consent | High |
| `data_sharing_consent` not checked before sending data to third-party integrations (FHIR, insurance) | Unauthorized disclosure | Critical |
| `patient_consents` insert without `hospital_id` | Consent record not hospital-scoped | Medium |
| Consent form displayed but `consent_given` not persisted to DB | Consent not recorded | Critical |
| `patient_consents` table missing RLS — any staff can read all consents | Over-broad access | High |

**Required pattern** for telemedicine:
```ts
const { data: consent } = await supabase
  .from('patient_consents')
  .select('telemedicine_consent')
  .eq('patient_id', patientId)
  .single();

if (!consent?.telemedicine_consent) {
  // show consent form — do NOT start session
  return;
}
```

---

### Domain 5 — RLS Policy Completeness
**Regulation**: §164.312(a)(1) — Access Control, §164.312(a)(2)(i) — Unique User Identification

Known vulnerability pattern in this codebase: `USING (true)` policies were found on `user_sessions`, `dur_criteria`, and `prediction_models` (fixed in `20260223100000_production_backend_hardening.sql`). Audit for regressions.

**Scan for:**

| Signal | Issue | Severity |
|--------|-------|----------|
| `USING (true)` in any RLS policy | Full table exposure to any authenticated user | Critical |
| Table with PHI columns missing `ENABLE ROW LEVEL SECURITY` | No access control | Critical |
| Policy using `auth.jwt() ->> 'role'` instead of `user_roles` table | JWT claim can lag after role change | High |
| `hospital_id` filter absent from policy on multi-tenant table | Cross-tenant data leak | Critical |
| `anon` role can SELECT from clinical tables | Unauthenticated data access | Critical |
| New table added in migration without corresponding RLS policies | Unprotected table | High |

**RLS audit query** (run in Supabase SQL editor to find unprotected tables):
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  )
ORDER BY tablename;
```

---

## Audit Procedure

### Step 1 — Scope Discovery
- **Single file**: read fully, run all 5 domain checks
- **Feature area**: find entry hooks, Supabase mutations, edge functions, and migration files for that area
- **Full app**: prioritize in order: Domain 3 (audit trail) → Domain 1 (PHI logs) → Domain 2 (encryption) → Domain 5 (RLS) → Domain 4 (consent)

### Step 2 — Run Each Domain Pass
Flag every match. Assign severity:
- `critical` — direct HIPAA violation, data breach risk, or PHI exposure
- `high` — degraded safeguard, likely violation under audit
- `medium` — gap that weakens compliance posture
- `low` — documentation or process gap

### Step 3 — Write the Gap Report

Per finding:
```markdown
### [N]) [Severity] — [One-line title]
- **Severity**: Critical | High | Medium | Low
- **HIPAA Regulation**: §164.XXX — [Name]
- **Domain**: PHI Handling | Encryption | Audit Trail | Consent | RLS
- **Files**: `relative/path/to/file.ts:[line]`

#### Finding
[2–3 sentences: what the gap is and why it violates HIPAA in this clinical context.]

#### Remediation
1. [Specific code or config change]
2. [Migration or policy change if needed]
3. [Test to validate the fix]
```

### Step 4 — Compliance Score Impact

Close with:
```markdown
## Compliance Impact
Current baseline: 78/100 (docs/HIPAA_COMPLIANCE.md)

Findings by domain:
- PHI Handling: [N critical, N high]
- Encryption: [N critical, N high]
- Audit Trail: [N critical, N high]
- Consent: [N critical, N high]
- RLS Policies: [N critical, N high]

Estimated score after remediation: [X]/100
Blocking items for production: [list critical findings]
```

---

## Quick Reference — CareSync PHI Field Names

```
patients: first_name, last_name, date_of_birth, ssn, mrn, phone, email, address,
          insurance_provider, insurance_number, emergency_contact_*

consultations: chief_complaint, diagnosis, treatment_plan, notes, soap_*

prescriptions: medication_name, dosage, instructions, diagnosis_code

lab_orders / lab_results: test_name, result_value, reference_range, notes

patient_vitals / vital_signs: all numeric fields + notes

secure_messages: message_body, subject

patient_consents: all fields

after_visit_summaries: all fields
```

Any of these fields appearing in `console.log`, `toast`, error messages, URL params, or unencrypted storage is a HIPAA violation.
