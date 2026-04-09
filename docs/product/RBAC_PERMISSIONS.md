# CareSync HIMS - Role-Based Access Control (RBAC) & Permissions

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026

---

## Role Hierarchy & Scope

### 7 Core Roles

```
┌─────────────────────────────────────────────────────────────┐
│ ROLE HIERARCHY                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hospital Admin                                              │
│    ├─ Unrestricted access (all features, all data)          │
│    └─ Can delegate roles to other users                     │
│                                                              │
│  Clinical Roles:                                             │
│    ├─ Doctor                                                │
│    │   ├─ Consults & diagnostics                            │
│    │   ├─ Orders (prescriptions, labs, imaging)             │
│    │   ├─ Approves lab results                              │
│    │   └─ Scope: Assigned patients only                     │
│    │                                                         │
│    ├─ Nurse                                                 │
│    │   ├─ Vital signs entry                                │
│    │   ├─ Medication administration tracking               │
│    │   ├─ Care plan execution                              │
│    │   └─ Scope: Ward/floor assignment                     │
│    │                                                         │
│    ├─ Pharmacist                                           │
│    │   ├─ Prescription dispensing                          │
│    │   ├─ Inventory management                             │
│    │   ├─ Drug interaction validation                      │
│    │   └─ Scope: Pharmacy location                         │
│    │                                                         │
│    └─ Lab Technician                                       │
│        ├─ Specimen collection                              │
│        ├─ Results entry                                    │
│        ├─ QC tracking                                      │
│        └─ Scope: Laboratory                                │
│                                                              │
│  Operations Roles:                                           │
│    ├─ Receptionist                                         │
│    │   ├─ Appointment scheduling                           │
│    │   ├─ Patient check-in                                 │
│    │   ├─ Insurance verification                           │
│    │   └─ Scope: Front desk/registration                   │
│    │                                                         │
│    └─ Patient                                              │
│        ├─ Self-service portal access                       │
│        ├─ View own records (Rx, Labs, Appt)               │
│        ├─ Book appointments                                │
│        └─ Scope: Own data only (PHI)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Permission Matrix

### All 40+ Permissions Defined Below

| Permission | Admin | Doctor | Nurse | Pharmacist | Lab Tech | Receptionist | Patient |
|-----------|:-----:|:------:|:-----:|:---------:|:--------:|:----------:|:-------:|
| **PATIENT MANAGEMENT** | | | | | | | |
| `patients:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔒 |
| `patients:write` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `patients:delete` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **APPOINTMENTS** | | | | | | | |
| `appointments:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔒 |
| `appointments:write` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | 🔒 |
| `appointments:cancel` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | 🔒 |
| **CONSULTATIONS** | | | | | | | |
| `consultations:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `consultations:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔒 |
| `consultations:edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **VITAL SIGNS** | | | | | | | |
| `vitals:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔒 |
| `vitals:write` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `vitals:alert_critical` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PRESCRIPTIONS** | | | | | | | |
| `prescriptions:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `prescriptions:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🔒 |
| `prescriptions:sign` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `prescriptions:recall` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PHARMACY** | | | | | | | |
| `pharmacy:dispense` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `pharmacy:inventory` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `pharmacy:interactions` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **LABORATORY** | | | | | | | |
| `laboratory:order` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `laboratory:read` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | 🔒 |
| `laboratory:enter_results` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `laboratory:approve_results` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **BILLING** | | | | | | | |
| `billing:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | 🔒 |
| `billing:write` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `billing:charges` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `billing:insurance` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **REPORTS & ANALYTICS** | | | | | | | |
| `reports:generate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `reports:financial` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `analytics:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **USER MANAGEMENT** | | | | | | | |
| `users:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users:2fa` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AUDIT & COMPLIANCE** | | | | | | | |
| `audit:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `audit:export` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SETTINGS** | | | | | | | |
| `settings:hospital` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings:roles` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings:password` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend**:
- ✅ = Full permission  
- 🔒 = Own data only (patient sees only own records)
- ❌ = No permission

---

## Data Scoping Rules

### Hospital-Level Isolation

**Rule 1**: Every user belongs to exactly ONE hospital  
**Rule 2**: Every query includes `hospital_id` filter + RLS enforcement  
**Rule 3**: Cross-hospital access is never allowed (except for rare inter-hospital referrals, which require explicit authorization)

```typescript
// Example: Doctor viewing patients
const { data: patients } = useQuery({
  queryFn: async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', currentHospital.id)  // ← MANDATORY
      .eq('assigned_doctor_id', currentUser.id); // ← Doctor sees own patients
    return data;
  }
});
```

### Role-Specific Data Scoping

| Role | Data Scope | Details |
|------|-----------|---------|
| **Admin** | All hospital data | Can see all patients, users, transactions |
| **Doctor** | Assigned patients | Only patients assigned to them + referrals from other doctors |
| **Nurse** | Ward/floor assignment | All patients admitted to their assigned ward |
| **Pharmacist** | All patients | Can fill Rx for any patient in their pharmacy |
| **Lab Tech** | All patients | Can enter results for any patient in their lab |
| **Receptionist** | Desk-assigned location | Check-in only for their front desk or clinic location |
| **Patient** | Own data | PMR (personal medical record), own appointments, own Rx |

---

## Feature-Level Permission Rules

### Prescriptions (Complex Example)

```typescript
// Who can CREATE a prescription?
hasPermission('prescriptions:create')
  → Only doctors (doctor role)
  → On THEIR assigned patients

// Who can SIGN a prescription?
hasPermission('prescriptions:sign')
  → Only doctors
  → Own prescriptions only (cannot sign another doctor's Rx)
  → Patient must not have allergy/interaction

// Who can DISPENSE a prescription?
hasPermission('pharmacy:dispense')
  → Only pharmacists
  → After doctor has signed
  → At their pharmacy location only

// Who can RECALL a prescription?
hasPermission('prescriptions:recall')
  → Doctor (within 1 hour of signing)
  → Admin (any time, with reason)
  → With reason documented (audit required)

// Who can VIEW a prescription?
hasPermission('prescriptions:read')
  → Doctor (their prescriptions)
  → Nurse (patients on their ward)
  → Pharmacist (unfilled Rx queue)
  → Patient (own Rx)
```

---

## RLS (Row-Level Security) Policies

### Database-Level Enforcement

All permissions are ALSO enforced at the database level (RLS policies) for defense-in-depth:

```sql
-- EXAMPLE: Prescriptions RLS
CREATE POLICY "Doctors can see their own prescriptions" ON prescriptions
  FOR SELECT
  USING (
    doctor_id = auth.uid() 
    AND hospital_id = auth.hospital_id()
  );

CREATE POLICY "Pharmacists can see unsigned prescriptions" ON prescriptions
  FOR SELECT
  USING (
    status = 'Signed' 
    AND hospital_id = auth.hospital_id()
    AND auth.role() = 'pharmacist'
  );

CREATE POLICY "Patients can see their own prescriptions" ON prescriptions
  FOR SELECT
  USING (
    patient_id = auth.uid() 
    AND auth.role() = 'patient'
  );

-- ENFORCEMENT: Only doctors can sign
CREATE POLICY "Only doctors can sign" ON prescriptions
  FOR UPDATE
  USING (
    auth.role() = 'doctor'
    AND doctor_id = auth.uid()
  )
  WITH CHECK (
    status = 'Signed'
    AND doctor_id = auth.uid()
    AND hospital_id = auth.hospital_id()
  );
```

---

## Permission Enforcement Flow

### 3-Layer Permission Model

```
┌─────────────────────────────────────────────────┐
│ LAYER 1: Frontend (React)                       │
│ ├─ usePermissions() hook                        │
│ ├─ Check if user has permission                 │
│ ├─ Hide button / show disabled state            │
│ └─ UX layer (fastest feedback)                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ LAYER 2: API (PostgREST / Edge Functions)       │
│ ├─ Validate JWT token                           │
│ ├─ Check auth.uid(), auth.role()                │
│ ├─ Enforce permission check                     │
│ ├─ Return 403 if denied                         │
│ └─ (Prevents bypass via API calls)              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ LAYER 3: Database (RLS Policies)                │
│ ├─ Final gatekeeper                             │
│ ├─ WHERE clauses enforce hospital_id           │
│ ├─ GRANT/REVOKE policies per role               │
│ ├─ Return 0 rows if not authorized              │
│ └─ (Defense-in-depth; no data leakage)          │
└─────────────────────────────────────────────────┘
```

### Example: Doctor Tries to Access Patient Lab Results

```
1. Frontend (React)
   usePermissions('laboratory:read') → true (doctor has permission)
   → Display button: "View Lab Results"

2. Doctor clicks button
   → API call: GET /api/patients/{id}/lab-results

3. API Layer (Route Handler)
   → Verify JWT: auth.uid = doctor_id  ✓
   → Check permission: hasPermission('laboratory:read')  ✓
   → Check scope: patient_id in doctor's assigned patients  ✓
   → Query database with hospital_id filter

4. Database Layer (Supabase RLS)
   → Query: SELECT * FROM lab_results 
     WHERE patient_id = {id} 
       AND hospital_id = auth.hospital_id()
       AND doctor_id = auth.uid() [RLS policy]
   → ✓ Results returned

RESULT: Doctor sees own patients' lab results ✓
```

### Example: Nurse Tries to Sign a Prescription (Should Fail)

```
1. Frontend (React)
   usePermissions('prescriptions:sign') → false (nurse not allowed)
   → Button is disabled / hidden
   → Alert if nurse forces API call anyway

2. If nurse somehow force-calls API
   → API Layer checks JWT + permission
   → hasPermission('prescriptions:sign') → false
   → Return 403 Forbidden

3. If nurse bypasses API (direct DB query attempt)
   → Database RLS policy blocks:
     CREATE POLICY "Only doctors can sign" 
       FOR UPDATE 
       USING (auth.role() = 'doctor')
   → Query returns 0 rows / access denied

RESULT: Prescription NOT signed; audit logged; no data leaked ✓
```

---

## Special Permission Rules

### Escalation & Delegation

Some actions allow temporary escalation:

| Action | Default | Can Escalate? | Escalation Requirements |
|--------|---------|--------------|----------------------|
| Approve lab results | Doctor only | Yes (to Lab Supervisor) | No primary doctor available, documented reason |
| Sign high-cost billing item | Billing + Admin approval | Yes (to CFO) | >$50K claim, insurance dispute |
| Override drug interaction alert | Doctor + Pharmacist consensus | Yes (to Chief Medical Officer) | Critical patient situation documented |
| Recall recent Rx | Doctor (1hr) | Yes (to Admin, anytime) | Patient safety concern documented |

---

## Audit Trail for Permission Denials

Every permission denial is logged:

```sql
-- Audit Log Entry When Nurse Tries to Sign Prescription
INSERT INTO activity_logs (
  hospital_id,
  user_id,
  action,
  entity_type,
  entity_id,
  result,
  reason,
  timestamp
) VALUES (
  'hosp-123',
  'nurse-456',
  'prescriptions:sign',  -- Attempted action
  'prescription',
  'rx-789',
  'DENIED',              -- Permission denied
  'User role=nurse does not have prescriptions:sign permission',
  NOW()
);
```

---

## Testing Role-Based Features

### E2E Test Example: Prescription Signing

```typescript
// tests/e2e/roles/doctor/prescription-signing.spec.ts
test('Doctor can sign prescription', async ({ page }) => {
  // Login as doctor
  await login(page, 'doctor@hospital.com');
  
  // Navigate to prescription
  await page.goto('/prescriptions/rx-123');
  
  // Verify sign button is VISIBLE
  const signButton = page.locator('button:has-text("Sign")');
  await expect(signButton).toBeVisible();
  
  // Click & sign
  await signButton.click();
  
  // Verify success
  await expect(page.locator('text=Prescription signed')).toBeVisible();
});

test('Nurse CANNOT sign prescription', async ({ page }) => {
  // Login as nurse
  await login(page, 'nurse@hospital.com');
  
  // Navigate to prescription
  await page.goto('/prescriptions/rx-123');
  
  // Verify sign button is DISABLED or HIDDEN
  const signButton = page.locator('button:has-text("Sign")');
  await expect(signButton).not.toBeVisible(); // Hidden by permission check
});
```

---

## Permission Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Permission Denied" on simple read | User role + permission mismatch | Check `usePermissions()` + RLS policy |
| Feature visible but API returns 403 | Frontend permission check bypassed | API still enforces; verify backend check |
| User can access data they shouldn't | Missing `hospital_id` filter in query | Add `.eq('hospital_id', hospital.id)` |
| RLS policy not working | Incorrect `auth.uid()` or `auth.role()` | Verify auth context → RLS policy logic |
| Cross-hospital data visible | Hospital isolation broken | Audit all queries; ensure hospital_id enforced |

---

## Creating New Roles or Permissions

### Checklist for Adding New Permission

1. [ ] Define permission name (e.g., `prescriptions:bulk_sign`)
2. [ ] Document which roles have permission
3. [ ] Add to `src/lib/permissions.ts` ROLE_PERMISSIONS map
4. [ ] Add frontend check: `hasPermission('prescriptions:bulk_sign')`
5. [ ] Add API check: Validate JWT + permission
6. [ ] Add RLS policy: Database-level enforcement
7. [ ] Write E2E test: Authorized user CAN, unauthorized user CANNOT
8. [ ] Update RBAC documentation (this file)
9. [ ] Add audit logging for the action
10. [ ] Deploy + monitor for permission denials (should be zero if correctly implemented)

---

**Questions?** Contact Security/RBAC team or refer to specific role documentation in `/docs/workflows/`.
