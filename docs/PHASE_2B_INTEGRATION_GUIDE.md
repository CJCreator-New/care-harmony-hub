# Phase 2B: Non-Breaking Audit Integration Guide

**Status:** Implementation Ready  
**Date:** March 13, 2026  
**Version:** 1.0

## Overview

Phase 2B implements immutable audit logging for prescription amendments without changing existing APIs or workflows. The amendment pattern uses Supabase RPC functions and triggers from Phase 2A, adding frontend components and real-time alerts while maintaining backward compatibility.

### Key Principles

✅ **No API Changes** — Amendment via RPC function (`amend_prescription_dosage`), not new endpoint  
✅ **No Schema Changes** — Phase 2A migrations provide all required tables/triggers  
✅ **Backend-Only Logging** — Triggers create audit records automatically  
✅ **Existing Workflows Unaffected** — Amendment is optional flow; prescription creation/approval unchanged  
✅ **Tests Don't Break** — New tests for amendment, old tests still pass  
✅ **RLS Enforced** — Hospital_id scoping on all queries  

---

## Deliverables

### 1. Frontend Hooks

#### `src/hooks/useForensicQueries.ts`
Immutable queries for amendment chains:
- `usePrescriptionAmendmentChain(prescriptionId)` — Full amendment history
- `useInvoiceAuditTrail(invoiceId)` — Billing history
- `useLabResultAmendmentHistory(labResultId)` — Lab corrections
- `useAuditQuery(options)` — Filtered audit queries
- `useAuditAnomalies(hoursSince)` — Detect potential bypasses
- `useRefreshAmendmentChain()` — Manually invalidate queries

**Type:** TanStack Query hooks (read-only, hospital-scoped)

#### `src/hooks/useAmendmentAlert.ts`
Real-time notifications for pharmacist:
- `useAmendmentAlert(options)` — Subscribe to amendment alerts
- Payload: `"Dr. Smith amended Rx #123 (500mg→250mg). Reason: C. difficile risk"`
- Features: Toast notifications, acknowledgment, dismiss
- Uses Supabase Realtime channel: `amendment_alerts_${hospitalId}`

**Type:** Hook with Realtime subscription + state management

### 2. Frontend Components

#### `src/components/audit/AmendmentModal.tsx`
Doctor amendment form:
- **Trigger:** "Edit" button on pending prescription
- **Fields:**
  - Medication selector (if prescription has multiple items)
  - Current dosage (read-only)
  - Corrected dosage (required)
  - Quantity (optional)
  - Change reason (dropdown: "Drug interaction", "Renal function", etc.)
  - Clinical justification (textarea, required for audit trail)
- **Action:** Calls `amend_prescription_dosage(p_prescription_id, p_old_dosage, p_new_dosage, ...)`
- **Success:** Toast with amendment_id + forensic timeline auto-refreshes
- **States:** Loading, validation errors, RPC errors

#### `src/components/audit/ForensicTimeline.tsx`
Immutable amendment chain viewer:
- **Query:** `usePrescriptionAmendmentChain(prescriptionId)`
- **Columns:**
  - Sequence number (immutable order)
  - Date/Time (UTC, formatted)
  - Action (badge colored: CREATE=green, APPROVE=blue, AMEND=yellow, REVERSAL=red)
  - Actor role (doctor, pharmacist, nurse)
  - Actor email (sanitized)
  - Changes (dosage before→after, quantity before→after)
  - Reason (short text)
- **Expandable Details:** Clinical justification, full before/after state, audit_id
- **Filters:** By role (doctor, pharmacist, nurse, etc.), date range (if needed)
- **Export:** CSV download for compliance officer review
- **Role-Based Visibility:**
  - Doctor: Can see own amendments only (if `showOwnOnly=true`)
  - Pharmacist: Sees all amendments (for review/validation)
  - Admin/Compliance: Sees full trail with actor context
- **RLS:** Query respects hospital_id, user roles

### 3. Test Suite

#### `src/hooks/__tests__/useAmendmentPhase2B.test.ts`
Comprehensive Vitest suite:
1. **Amendment queries** — Fetch chain, handle errors, respect filters
2. **RLS isolation** — Hospital_id scoping, immutability
3. **Amendment RPC** — Parameters, error handling, no original modification
4. **Real-time alerts** — Subscription, alert handling, acknowledgment
5. **Full workflow** — CREATE → APPROVE → AMEND → Alert → Timeline
6. **Edge cases** — Null quantities, frequency changes, concurrent amendments
7. **No breaking changes** — Existing prescription tests still pass

**Run:** `npm run test:unit -- --grep "Phase 2B"`

---

## Integration Steps

### Step 1: Verify Phase 2A Migrations

Ensure Phase 2A SQL migrations are deployed:

```bash
# Check deployed migrations
npm run migrate:status

# Expected tables:
✅ audit_log
✅ prescription_audit
✅ invoice_adjustment_audit
✅ lab_result_audit

# Expected RPC functions:
✅ amend_prescription_dosage()
✅ get_prescription_amendment_chain()
✅ create_invoice_adjustment()
✅ get_invoice_audit_trail()
```

### Step 2: Add Amendment Button to Prescription Viewer

In `src/pages/Pharmacy/PrescriptionDetail.tsx` (or similar):

```typescript
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { useState } from 'react';

export function PrescriptionDetail({ prescriptionId }: { prescriptionId: string }) {
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const { data: prescription } = usePrescription(prescriptionId);

  return (
    <div>
      {/* Existing prescription display */}
      <PrescriptionHeader prescription={prescription} />
      <PrescriptionItems items={prescription?.items} />

      {/* NEW: Amendment button (for doctors only) */}
      {hasRole('doctor') && prescription?.status === 'approved' && (
        <Button
          variant="secondary"
          onClick={() => setAmendmentOpen(true)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Dosage (Amendment)
        </Button>
      )}

      {/* Amendment Modal */}
      <AmendmentModal
        isOpen={amendmentOpen}
        onClose={() => setAmendmentOpen(false)}
        prescriptionId={prescriptionId}
        items={prescription?.items}
        patientName={prescription?.patient?.first_name}
        onAmendmentSuccess={() => {
          setAmendmentOpen(false);
          // Timeline auto-refreshes via query invalidation
        }}
      />

      {/* NEW: Forensic Timeline */}
      <ForensicTimeline prescriptionId={prescriptionId} />
    </div>
  );
}
```

### Step 3: Add Real-Time Alert Badge to Pharmacist Dashboard

In `src/pages/Pharmacy/PharmacistDashboard.tsx`:

```typescript
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export function PharmacistDashboard() {
  const { unreviewedAlerts } = useAmendmentAlert({
    enabled: profile?.primary_role === 'pharmacist',
    showToasts: true,
  });

  return (
    <div>
      {/* Existing dashboard */}

      {/* NEW: Amendment alerts badge */}
      <div className="flex items-center gap-2">
        <span>Pending Reviews:</span>
        {unreviewedAlerts.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {unreviewedAlerts.length} Amendment Alert
            {unreviewedAlerts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Upcoming: Alert list with review action */}
    </div>
  );
}
```

### Step 4: Add Forensic Timeline to Compliance Dashboard

In `src/pages/Admin/ComplianceDashboard.tsx` or similar:

```typescript
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { usePatient } from '@/hooks/usePatients';

export function PrescriptionForensicView({
  prescriptionId,
}: {
  prescriptionId: string;
}) {
  return (
    <div className="space-y-6">
      <h2>Audit Trail & Amendment Chain</h2>

      {/* Forensic timeline with export */}
      <ForensicTimeline prescriptionId={prescriptionId} showOwnOnly={false} />

      {/* Compliance notes */}
      <div className="p-4 bg-blue-50 rounded border">
        <p className="text-sm text-blue-900">
          ✅ Immutable forensic record. All amendments traced to actor with justification.
          CSV export contains full chain for regulatory requests.
        </p>
      </div>
    </div>
  );
}
```

### Step 5: Hook Up Real-Time Notifications in Root Layout

In `src/App.tsx` or `src/components/layout/RootLayout.tsx`:

```typescript
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

export function App() {
  // Enable real-time amendment alerts for pharmacists
  useAmendmentAlert({
    enabled: true, // Respects hospital & role internally
    showToasts: true,
  });

  return (
    <div>
      {/* Existing layout */}
    </div>
  );
}
```

---

## Data Flow Diagrams

### Amendment Workflow
```
Doctor Views Prescription (approved)
         ↓
   Click "Edit Dosage" button
         ↓
   Amendment Modal opens
         ↓
   Enter: corrected dosage, quantity (?), reason, justification
         ↓
   Click "Submit Amendment"
         ↓
   Calls RPC: amend_prescription_dosage()
         ↓
   RPC creates audit_log entry (action_type='AMEND', amends_audit_id=<original_create_id>)
         ↓
   Toast: "Amendment submitted (ID: amendment_456)"
         ↓
   ForensicTimeline auto-refreshes (query invalidation)
         ↓
   Pharmacist receives Realtime alert
         ↓
   Pharmacist views amendment in timeline + reviews dosage change
```

### Real-Time Alert Flow
```
Doctor submissions amendment
         ↓
   Trigger: update trigger on prescriptions table fires
         ↓
   Trigger: Inserts into audit_log with amendment details
         ↓
   Trigger: Publishes to Supabase Realtime channel
         ↓
   Frontend subscribed to `amendment_alerts_<hospital_id>`
         ↓
   useAmendmentAlert hook receives notification
         ↓
   Toast fires: "Dr. Smith amended Rx #123..."
         ↓
   Pharmacist sees badge + unreviewed alert count
         ↓
   Pharmacist clicks notification → navigates to prescription
         ↓
   Sees full ForensicTimeline with new amendment entry
```

---

## Testing Checklist

### Unit Tests (Vitest)
- ✅ `useForensicQueries` hooks fetch and filter correctly
- ✅ `useAmendmentAlert` handles notifications (mock Realtime)
- ✅ Amendment form validation (dosage, reason, justification required)
- ✅ RPC error handling (network failures, validation errors)
- ✅ RLS enforcement (hospital_id filtering)

### Integration Tests
- ✅ Amendment modal → RPC call → audit_log entry
- ✅ ForensicTimeline queries amendment chain after amendment
- ✅ Real-time alert fires when amendment created
- ✅ Amendment doesn't modify original prescription
- ✅ Multiple amendments linked correctly (amends_audit_id chain)

### E2E Tests (Playwright)
```bash
npm run test:e2e:suite -- --grep "amendment"
# Tests:
# [DOCTOR] Create prescription
# [PHARMACIST] Approve prescription
# [DOCTOR] Amend dosage with reason + justification
# [PHARMACIST] Receive real-time alert
# [ADMIN] View forensic timeline + export CSV
# [DOCTOR] Cannot amend prescription in 'pending' status
```

### Regression Tests
```bash
npm run test:unit -- --grep "prescription"
# Ensure existing prescription tests (CREATE, APPROVE, DISPENSE) still pass
# No breaking changes to existing APIs
```

---

## API Reference

### RPC Function: `amend_prescription_dosage()`

**Signature:**
```sql
CREATE OR REPLACE FUNCTION amend_prescription_dosage(
  p_prescription_id UUID,
  p_item_id UUID,
  p_old_dosage TEXT,
  p_new_dosage TEXT,
  p_old_quantity INT DEFAULT NULL,
  p_new_quantity INT DEFAULT NULL,
  p_amendment_reason TEXT,
  p_amendment_justification TEXT,
  p_amending_doctor_id UUID
) RETURNS UUID AS $$
```

**Returns:** `amendment_audit_id` (UUID of new audit record)

**Errors:**
- `INVALID_DOSAGE_FORMAT` — Dosage doesn't match expected pattern
- `UNAUTHORIZED` — Only doctor or admin can amend
- `PRESCRIPTION_NOT_FOUND` — Invalid prescription_id
- `PRESCRIPTION_IMMUTABLE` — Cannot amend cancelled/dispensed prescriptions

### Hook: `usePrescriptionAmendmentChain(prescriptionId)`

**Returns:**
```typescript
interface PrescriptionAmendmentRecord {
  sequence_number: number;
  audit_id: string;
  event_time: string; // ISO 8601 UTC
  actor_email: string;
  actor_role: string;
  action_type: string; // 'CREATE', 'APPROVE', 'AMEND', etc.
  dosage_before: string | null;
  dosage_after: string | null;
  quantity_before: number | null;
  quantity_after: number | null;
  frequency_before: string | null;
  frequency_after: string | null;
  change_reason: string;
  amendment_justification: string | null;
}
```

---

## Compliance Notes

### HIPAA
- Amendment audit trail captures who changed what when
- Change reason + justification for non-repudiation
- Immutable records prevent evidence tampering

### Medical Board
- Doctor must document clinical reason for amendment
- Pharmacist review (future: signature step)
- Complete amendment chain visible for investigation

### Financial
- Amendment pattern applicable to invoices/discounts
- Uses same `create_invoice_adjustment()` function
- Original invoice unchanged; adjustment record tracks changes

---

## Known Limitations (Phase 2B)

- Cryptographic signatures not implemented (Phase 3)
- Realtime alert payload template is plain text (no rich notifications yet)
- No mandatory pharmacist sign-off on amendments (Phase 2C)
- Amendment frequency: Limited to clinical staff (no self-service UI)

---

## Rollback Instructions

### If Amendment Queries Fail
1. Verify Phase 2A migrations deployed
2. Check RLS policies on audit_log table
3. Restart Supabase client (clear query cache):
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['prescription_amendment_chain'] });
   ```

### If Realtime Alerts Not Working
1. Verify Supabase Realtime enabled in project
2. Check browser console for subscription errors
3. Verify prescription table has `amendment_reason` field populated by trigger

### If Amendment Modal Crashes
1. Verify prescription.items populated correctly
2. Check form validation logic
3. Verify RPC function `amend_prescription_dosage` exists in database

---

## Next Steps (Phase 2C)

- [ ] Mandatory pharmacist sign-off on amendments
- [ ] Cryptographic hash chain for high-assurance trails
- [ ] Anomaly detection dashboard (find unusual amendments)
- [ ] Automated alerts for high-risk dosage changes (>25% reduction)
- [ ] Audit export for HIPAA disclosure requests
