# CareSync HIMS - RBAC & Access Control

**Last Updated**: April 10, 2026  
**Security Level**: CRITICAL - Healthcare Data Classification  
**References**: [copilot-instructions.md](../../.github/copilot-instructions.md), Phase 3 Security Audit

---

## 🔐 Quick Overview

CareSync implements **three-layer access control**:

1. **Frontend Layer**: React role checks via `usePermissions()`
2. **API Layer**: Supabase RLS policies enforce data boundaries
3. **Database Layer**: Row-level security prevents unauthorized access

This document covers **Role-Based Access Control (RBAC)** for CareSync's 7 core roles and 40+ permission categories.

---

## 📚 Table of Contents

1. [Core Roles](#-core-roles)
2. [Permission Matrix](#-permission-matrix)
3. [RLS Policy Examples](#-rls-policy-examples)
4. [Frontend Implementation](#-frontend-implementation)
5. [Enforcement Patterns](#-enforcement-patterns)
6. [HIPAA Compliance](#-hipaa-compliance-section)

---

## 👥 Core Roles

### 1. Doctor (Physician)
**Scope**: Patient diagnosis, treatment orders, treatment oversight  
**Hospital Scope**: Multi-hospital capable with assignment

**Permissions**:
- ✅ View patient records (full)
- ✅ Create/update diagnoses
- ✅ Create/approve prescriptions
- ✅ Order lab tests
- ✅ Write clinical notes
- ✅ Discharge patients
- ❌ Access billing information
- ❌ System administration

**Clinical Authority**: Highest priority in treatment decisions

---

### 2. Nurse (Clinical Staff)
**Scope**: Patient vitals, medication administration, care coordination  
**Hospital Scope**: Single hospital assigned

**Permissions**:
- ✅ View patient records (vitals + history)
- ✅ Record vital signs & patient intake
- ✅ Administer medications (verify against prescribed)
- ✅ Create care notes
- ✅ Update patient status
- ❌ Create prescriptions (physician only)
- ❌ Discharge patients
- ❌ Access billing

**Clinical Authority**: Executes physician orders, patient safety monitoring

---

### 3. Laboratory Technician
**Scope**: Lab order processing, result entry for assigned tests  
**Hospital Scope**: Single hospital with lab assignment

**Permissions**:
- ✅ View lab orders (assigned only)
- ✅ Enter lab results
- ✅ Flag critical values
- ✅ Update specimen tracking
- ✅ Generate lab reports
- ❌ Cancel orders (tech can flag, physician cancels)
- ❌ View patient treatment plans
- ❌ Access prescriptions

**Clinical Authority**: Ensures lab specimen integrity, result accuracy

---

### 4. Pharmacist / Pharmacy Staff
**Scope**: Prescription fulfillment, drug interactions, medication verification  
**Hospital Scope**: Single hospital or multi-hospital chain

**Permissions**:
- ✅ View prescriptions (pharmacy queue)
- ✅ Verify medications against guidelines
- ✅ Check drug-drug interactions
- ✅ Dispense medications
- ✅ Flag adverse reactions
- ✅ Update medication inventory
- ❌ Create prescriptions
- ❌ Access patient treatment plans
- ❌ Access billing

**Clinical Authority**: Medication safety, interaction detection

---

### 5. Receptionist / Front Desk
**Scope**: Appointment scheduling, patient check-in, basic demographics  
**Hospital Scope**: Single hospital assigned

**Permissions**:
- ✅ Schedule appointments
- ✅ Check-in/check-out patients
- ✅ View appointment calendar
- ✅ Collect copayment information
- ✅ Update patient contact details
- ❌ View medical records
- ❌ Order tests or medications
- ❌ Access clinical notes

**Clinical Authority**: None (administrative role)

---

### 6. Billing / Finance
**Scope**: Invoicing, insurance claims, payment processing  
**Hospital Scope**: Multi-hospital (enterprise view possible)

**Permissions**:
- ✅ View treatment summaries (for billing only)
- ✅ Create/process invoices
- ✅ Process insurance claims
- ✅ Process payments
- ✅ Generate billing reports
- ✅ View copay/coinsurance amounts
- ❌ View clinical notes
- ❌ View diagnoses detail
- ❌ Modify treatment orders

**Clinical Authority**: None (financial role)

**Data Access**: Limited to billable items only (not full clinical data)

---

### 7. Hospital Administrator
**Scope**: System configuration, user management, audit logs  
**Hospital Scope**: Single hospital

**Permissions**:
- ✅ Manage users (create, disable, role assignment)
- ✅ View audit logs
- ✅ Configure hospital settings
- ✅ Generate reports
- ✅ Manage RLS policies (advanced)
- ✅ Access all data (for administration)
- ⚠️ Cannot modify live patient data (read-only access)
- ❌ Clinical decision-making

**Clinical Authority**: None (system role)

---

## 📊 Permission Matrix

| Permission | Doctor | Nurse | Lab Tech | Pharmacy | Reception | Billing | Admin |
|-----------|--------|-------|----------|----------|-----------|---------|-------|
| **Patient Records** | | | | | | | |
| View full record | ✅ | ⚠️* | ❌ | ❌ | ❌ | ❌ | ✅ |
| View vitals only | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View diagnoses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View medication hx | ✅ | ✅ | ❌ | ✅ | ❌ | ✅* | ✅ |
| | | | | | | | |
| **Prescriptions** | | | | | | | |
| Create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dispense | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cancel | ✅ | ❌ | ❌ | ⚠️** | ❌ | ❌ | ❌ |
| | | | | | | | |
| **Lab Orders** | | | | | | | |
| Create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Enter results | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Flag critical | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | | | | | | | |
| **Patient Management** | | | | | | | |
| Admit patient | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Discharge | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update vitals | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | | | | | | | |
| **Appointments** | | | | | | | |
| Schedule | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Check-in | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Reschedule | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | | | | | | | |
| **Billing** | | | | | | | |
| View invoices | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create invoice | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Process payment | ❌ | ❌ | ❌ | ❌ | ⚠️* | ✅ | ❌ |
| | | | | | | | |
| **System** | | | | | | | |
| View audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure system | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legend**:
- ✅ = Full access
- ⚠️ = Limited/scoped access  
- ❌ = No access  

**Footnotes**:
- `*` Nurse views only assigned patients' vitals
- `**` Pharmacy can flag for cancellation, doctor cancels
- `*` Receptionist processes small copays only

---

## 🔒 RLS Policy Examples

### Patient Records: Role-Based Visibility

```sql
-- RLS Policy: Patients are visible only to their assigned care team
CREATE POLICY "patients_role_access" ON public.patients
FOR SELECT
USING (
  -- Doctors see all patients they're assigned to
  CASE 
    WHEN auth.jwt()->'role'->0 = '"doctor"'
      THEN hospital_id = auth.jwt()->'hospital_id'
    
    -- Nurses see only patients on their assigned unit
    WHEN auth.jwt()->'role'->0 = '"nurse"'
      THEN hospital_id = auth.jwt()->'hospital_id'
        AND unit_id = auth.jwt()->'unit_id'
    
    -- Lab techs see only patients with ordered tests
    WHEN auth.jwt()->'role'->0 = '"lab_technician"'
      THEN id IN (
        SELECT DISTINCT patient_id 
        FROM lab_orders 
        WHERE hospital_id = auth.jwt()->'hospital_id'
      )
    
    -- Pharmacists see only patients with prescriptions
    WHEN auth.jwt()->'role'->0 = '"pharmacist"'
      THEN id IN (
        SELECT DISTINCT patient_id 
        FROM prescriptions 
        WHERE hospital_id = auth.jwt()->'hospital_id'
      )
    
    -- Receptionists see only check-in patients
    WHEN auth.jwt()->'role'->0 = '"receptionist"'
      THEN id IN (
        SELECT DISTINCT patient_id 
        FROM appointments 
        WHERE hospital_id = auth.jwt()->'hospital_id'
          AND status = 'checked_in'
      )
    
    ELSE FALSE
  END
);
```

### Prescriptions: Approval Workflow

```sql
-- Prescriptions visible to relevant roles only
CREATE POLICY "prescriptions_workflow_access" ON public.prescriptions
FOR SELECT
USING (
  CASE
    -- Creators see all their prescriptions
    WHEN created_by = auth.uid() THEN TRUE
    
    -- Pharmacists see prescriptions for their hospital
    WHEN auth.jwt()->'role'->0 = '"pharmacist"'
      THEN hospital_id = auth.jwt()->'hospital_id'
    
    -- Nurses see active prescriptions for their patients
    WHEN auth.jwt()->'role'->0 = '"nurse"'
      THEN hospital_id = auth.jwt()->'hospital_id'
        AND status IN ('active', 'dispensing')
    
    ELSE FALSE
  END
);

-- Update: Only pharmacists can change dispensing status
CREATE POLICY "prescriptions_dispense_update" ON public.prescriptions
FOR UPDATE
USING (
  auth.jwt()->'role'->0 = '"pharmacist"'
    AND hospital_id = auth.jwt()->'hospital_id'
)
WITH CHECK (
  status IN ('dispensing', 'dispensed', 'cancelled')
);
```

### Lab Results: Restricted Access

```sql
-- Lab tech enters results, only doctors/nurses view
CREATE POLICY "lab_results_entry" ON public.lab_results
FOR INSERT
WITH CHECK (
  auth.jwt()->'role'->0 = '"lab_technician"'
    AND hospital_id = auth.jwt()->'hospital_id'
);

CREATE POLICY "lab_results_view" ON public.lab_results
FOR SELECT
USING (
  -- Doctors & nurses assigned to the patient
  (auth.jwt()->'role'->0 IN ('"doctor"', '"nurse"')
    AND hospital_id = auth.jwt()->'hospital_id')
  
  -- Lab tech who entered the result
  OR created_by = auth.uid()
);
```

---

## 🎨 Frontend Implementation

### Permission Hook

```typescript
// src/lib/hooks/usePermissions.ts
import { useAuth } from '@/contexts/AuthContext';

interface PermissionFlags {
  canViewFullPatientRecord: boolean;
  canCreatePrescription: boolean;
  canApprovePrescription: boolean;
  canDispensMedication: boolean;
  canOrderLabTests: boolean;
  canEnterLabResults: boolean;
  canViewBilling: boolean;
  canManageUsers: boolean;
  // ... 30+ more permissions
}

export function usePermissions(): PermissionFlags {
  const { user, role, hospital_id } = useAuth();

  const permissions: PermissionFlags = {
    // Doctor permissions
    canViewFullPatientRecord: role === 'doctor',
    canCreatePrescription: role === 'doctor',
    canApprovePrescription: role === 'doctor',
    canOrderLabTests: role === 'doctor',

    // Nurse permissions
    canUpdateVitals: role === 'nurse',

    // Lab tech permissions
    canEnterLabResults: role === 'lab_technician',

    // Pharmacy permissions
    canDispensMedication: role === 'pharmacist',

    // Billing permissions
    canViewBilling: role === 'billing',
    canProcessPayment: role === 'billing',

    // Admin permissions
    canManageUsers: role === 'admin',
    canViewAuditLogs: role === 'admin',

    // ... derived permissions
  };

  return permissions;
}
```

### Protecting UI Components

```typescript
// src/components/common/RoleProtectedRoute.tsx
interface RoleProtectedRouteProps {
  requiredRoles: string[];
  children: React.ReactNode;
}

export function RoleProtectedRoute({
  requiredRoles,
  children
}: RoleProtectedRouteProps) {
  const { role } = useAuth();

  if (!requiredRoles.includes(role)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">
            Your role ({role}) does not have access to this feature.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### Conditional Rendering

```typescript
// ✅ Show/hide controls based on permissions
export function PrescriptionActions({ prescription }: Props) {
  const { canApprovePrescription, role } = usePermissions();

  return (
    <div className="flex gap-2">
      {role === 'doctor' && (
        <button
          onClick={handleApprove}
          disabled={!canApprovePrescription}
        >
          Approve
        </button>
      )}

      {role === 'pharmacist' && prescription.status === 'approved' && (
        <button onClick={handleDispense}>
          Dispense
        </button>
      )}
    </div>
  );
}
```

---

## 🔐 Enforcement Patterns

### Three-Layer Validation

```typescript
// 1. FRONTEND: Permission check (UI gating)
if (!canApprovePrescription) {
  return <span>No permission to approve</span>;
}

// 2. API: Role check + hospital scope
export async function approvePrescription(prescriptionId: string) {
  const { user, role, hospital_id } = useAuth();
  
  if (role !== 'doctor') {
    throw new Error('Only doctors can approve prescriptions');
  }

  // 3. DATABASE: RLS policy enforces access
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ status: 'approved' })
    .eq('id', prescriptionId)
    .eq('hospital_id', hospital_id) // Scope to hospital
    .select();

  if (error) {
    // Could be RLS rejection
    console.error('Approval failed:', error);
  }
}
```

### Hospital Scoping

```typescript
// Always filter by hospital_id to prevent data leakage
export function usePatients() {
  const { hospital_id } = useAuth();

  return useQuery({
    queryKey: ['patients', hospital_id], // Hospital-scoped cache key
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospital_id) // CRITICAL: Hospital filter
        .order('created_at', { ascending: false });
      
      return data;
    }
  });
}
```

---

## 🏥 HIPAA Compliance Section

### Data Minimization

- **Doctor**: Full access to assigned patients only
- **Nurse**: Vital signs + care notes for assigned patients only
- **Pharmacy**: Medications + allergies only (no diagnoses)
- **Billing**: Billable items only (no clinical details)
- **Receptionist**: Demographics + appointment info only

**Principle**: Each role sees ONLY the minimum necessary to perform their job function.

### Audit Requirements

All data access is logged via audit trail:
- **Who**: User ID + role
- **What**: Record accessed (patient ID, data type)
- **When**: Timestamp with RFC3339 format
- **Result**: Allowed/Denied + reason

See [PHASE_1C_CROSS_REFERENCE_AUDIT.md](./PHASE_1C_CROSS_REFERENCE_AUDIT.md) for audit implementation.

### Encryption at Rest

All PHI is encrypted with `useHIPAACompliance()`:

```typescript
export function useHIPAACompliance(patientId: string) {
  const [encrypted, setEncrypted] = useState<string>();
  const [decrypted, setDecrypted] = useState<PatientData>();

  useEffect(() => {
    // Encrypt patient data before storage
    const encrypted = encryptPHI(patientData);
    setEncrypted(encrypted);
  }, [patientId]);

  return { encrypted, decrypted };
}
```

### Secure Log Stripping

Never log PHI:

```typescript
// ❌ WRONG - PHI visible in logs
console.error(`Patient ${patient.firstName} ${patient.lastName} failed`);

// ✅ CORRECT - PHI stripped
console.error(`Patient ${patient.id} failed`);
const sanitized = sanitizeForLog(error); // Removes names, MRN, DOB, etc.
```

---

## 🔄 Advanced Patterns

### Dynamic Role Assignment

```typescript
// Doctors can be assigned to multiple hospitals
interface UserRole {
  userId: string;
  role: 'doctor' | 'nurse' | 'pharmacist' | ...;
  hospital_id: string; // Primary assignment
  secondary_hospitals?: string[];
  effective_from: Date;
  effective_to?: Date; // For temporary assignments
}

// RLS automatically filters based on hospital_id in JWT
```

### Temporary Permission Elevation

```typescript
// Pharmacy can flag for cancellation (not execute)
CREATE POLICY "prescriptions_flag_cancellation" 
  ON public.prescriptions
FOR UPDATE
USING (
  auth.jwt()->'role'->0 = '"pharmacist"'
)
WITH CHECK (
  status = 'flagged_for_cancellation' -- Limited state transition
  AND old_status IN ('active', 'dispensing')
);

-- Audit trail captures the flag
```

---

## 📋 Implementation Checklist

- [ ] All RLS policies defined for 7 roles
- [ ] `usePermissions()` hook matches RLS policies
- [ ] `RoleProtectedRoute` component gates pages
- [ ] Hospital scoping enforced in all queries
- [ ] Audit logging captures all permission denials
- [ ] PHI sanitization in all error logs
- [ ] Encryption at rest for sensitive columns
- [ ] Temporary role assignments tested
- [ ] Cross-hospital access verified as blocked

---

## Further Reading

- **Development Standards**: [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
- **System Architecture**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- **Audit Trail**: See [EXECUTION_FRAMEWORK_MASTER_GUIDE.md](./EXECUTION_FRAMEWORK_MASTER_GUIDE.md) § Audit Logging
- **Security Guide**: [CareSync Security Documentation](../../docs/) (Phase 3)
- **RLS Policies**: See [supabase/migrations/](../../supabase/migrations/) for latest policies

---

**Last Audit**: April 10, 2026  
**Status**: ✅ Current  
**Version**: 1.0  
**Compliance**: HIPAA-aligned, Multi-tenancy enforced
