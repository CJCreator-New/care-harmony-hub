# Phase 2B Integration Plan: Amendment UI + Forensic Timeline

**Status:** Ready for Integration  
**Date:** March 13, 2026  
**Phase:** 2B (Amendment UI & Forensic Timeline)  
**Components:** AmendmentModal, ForensicTimeline, AuditLogViewer  
**Database Changes:** No breaking changes (Phase 2A already completed)

---

## Executive Summary

This document provides a **step-by-step integration guide** for Phase 2B components into the existing CareSync HIMS prescription workflow. The Amendment Modal and Forensic Timeline components are **already created and ready to integrate** into existing prescription detail pages.

### Key Points
- ✅ Phase 2A audit tables already exist
- ✅ `amend_prescription_dosage` RPC function ready
- ✅ ForensicTimeline and AmendmentModal components exist
- ✅ No breaking changes to existing APIs
- ✅ Backwards compatible with current prescription workflow

---

## Part 1: Architecture Overview

### Component Locations
```
src/components/audit/
├── AmendmentModal.tsx           # Doctor amendment form
├── ForensicTimeline.tsx         # Read-only amendment history
├── AuditLogViewer.tsx           # Admin audit dashboard
└── DataExportTool.tsx           # CSV/FHIR export

src/hooks/
├── useForensicQueries.ts        # usePrescriptionAmendmentChain
├── usePrescriptions.ts          # Existing prescription hook
└── useAudit.ts                  # HIPAA audit logging

src/pages/
├── PharmacyPage.tsx             # Pharmacy dashboard (main entry)
├── patient/PatientPrescriptionsPage.tsx  # Patient prescription view
└── consultations/ConsultationWorkflowPage.tsx  # Consultation prescriptions
```

### Integration Points
1. **Pharmacist/Doctor View** → AmendmentModal trigger + ForensicTimeline display
2. **App.tsx** → Wire up `useAmendmentAlert` hook
3. **Prescription Detail Card** → Add amendment button + timeline section
4. **Error Handling** → Reuse existing Sonner toast + sanitize patterns

---

## Part 2: Step-by-Step Integration

### STEP 1: Wire Up `useAmendmentAlert` Hook in App.tsx

**File:** [src/App.tsx](src/App.tsx)

**Location:** Inside `AppContent` component (after performance monitoring)

**Original Code (find this):**
```tsx
const AppContent = () => {
  // Monitor performance in production
  usePerformanceMonitoring();
  
  return <AppRoutes />;
};
```

**Replace With:**
```tsx
const AppContent = () => {
  // Monitor performance in production
  usePerformanceMonitoring();
  
  // Wire up amendment alerts for doctors & pharmacists
  // Listens for prescription amendment events in real-time
  // Shows toast notification if current user's prescription is amended
  useAmendmentAlert();
  
  return <AppRoutes />;
};
```

**Required Hook (add to src/hooks):**
Create [src/hooks/useAmendmentAlert.ts](src/hooks/useAmendmentAlert.ts):
```typescript
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Real-time listener for prescription amendments.
 * Notifies pharmacists/doctors if their prescription was amended.
 */
export function useAmendmentAlert() {
  const { profile, primaryRole } = useAuth();

  useEffect(() => {
    // Only listen if user is doctor or pharmacist
    if (!profile?.hospital_id || !['doctor', 'pharmacist'].includes(primaryRole || '')) {
      return;
    }

    // Subscribe to amendment audit events
    const channel = supabase.channel(`amendments:hospital:${profile.hospital_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_events',
          filter: `change_type=eq.AMENDMENT`,
        },
        (payload) => {
          // Parse amendment event
          const amendmentData = payload.new?.change_details || {};
          const originalActor = payload.new?.actor_id;
          
          // Only notify if amendment is to a prescription I created/verified
          if (primaryRole === 'doctor' && originalActor !== profile.user_id) {
            toast.warning('Prescription Amendment', {
              description: `Dosage amended for prescription ${amendmentData.prescription_id?.slice(0, 8)}`,
              action: {
                label: 'View Timeline',
                onClick: () => {
                  // User can navigate to view timeline
                  window.location.hash = `#/pharmacy?rx=${amendmentData.prescription_id}`;
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.hospital_id, profile?.user_id, primaryRole]);
}
```

**Checklist:**
- [ ] Added import statement at top of App.tsx
- [ ] Called `useAmendmentAlert()` inside AppContent
- [ ] Created `src/hooks/useAmendmentAlert.ts`
- [ ] Tested hook doesn't break app startup

---

### STEP 2: Add Amendment Modal to Pharmacist PrescriptionQueue

**File:** [src/components/pharmacist/PrescriptionQueue.tsx](src/components/pharmacist/PrescriptionQueue.tsx)

**Location:** After PrescriptionDispensingModal

**Step 2A - Add State & Imports:**
```tsx
// Add these imports at the top
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

// Inside PrescriptionQueue component state section
const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
const [selectedForAmendment, setSelectedForAmendment] = useState<Prescription | null>(null);
```

**Step 2B - Add Amendment Button to Details Card:**

Find the "Details" button in the prescription table:
```tsx
<!-- ORIGINAL -->
<Button 
  variant="outline" 
  size="sm"
  onClick={() => setSelectedPrescription(p)}
>
  Details
</Button>

<!-- REPLACE WITH -->
<div className="flex gap-2">
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setSelectedPrescription(p)}
  >
    Details
  </Button>
  {/* Show amendment button for doctors only */}
  {primaryRole === 'doctor' && (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        setSelectedForAmendment(p);
        setAmendmentModalOpen(true);
      }}
      className="gap-1"
    >
      <Edit className="h-3 w-3" />
      Amend
    </Button>
  )}
</div>
```

**Step 2C - Add Amendment Modal JSX:**

Add at bottom of PrescriptionQueue return (before closing `</div>`):
```tsx
{/* Amendment Modal - Phase 2B */}
<AmendmentModal
  isOpen={amendmentModalOpen}
  onClose={() => {
    setAmendmentModalOpen(false);
    setSelectedForAmendment(null);
  }}
  prescriptionId={selectedForAmendment?.id || ''}
  items={selectedForAmendment?.items || []}
  patientName={selectedForAmendment?.patient ? 
    `${selectedForAmendment.patient.first_name} ${selectedForAmendment.patient.last_name}` 
    : 'Patient'
  }
  onAmendmentSuccess={(amendmentId) => {
    toast.success('Amendment submitted for audit');
    // Refresh prescription list
    queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
  }}
/>
```

**Checklist:**
- [ ] Imported AmendmentModal component
- [ ] Added amendment modal state variables
- [ ] Added Edit button with proper role check
- [ ] Connected modal to button click
- [ ] Tested button appears only for doctors
- [ ] Verified modal opens with correct prescription data

---

### STEP 3: Add Forensic Timeline to Prescription Detail View

**File:** [src/pages/patient/PatientPrescriptionsPage.tsx](src/pages/patient/PatientPrescriptionsPage.tsx)

**Location:** Inside prescription detail card (below medication list)

**Step 3A - Add Imports:**
```tsx
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Step 3B - Add Timeline Tab:**

Find the prescription detail card showing medication items. After the medication items list, add a Tabs section:

```tsx
{/* Existing medication items already exist here */}

{/* BELOW the medications section, ADD THIS: */}
<Tabs defaultValue="details" className="mt-6">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="timeline">Audit Timeline</TabsTrigger>
  </TabsList>

  <TabsContent value="details" className="space-y-4">
    {/* Existing prescription details content */}
  </TabsContent>

  <TabsContent value="timeline" className="space-y-4">
    {/* Phase 2B: Forensic Timeline Shows All Amendments */}
    {selectedPrescription && (
      <ForensicTimeline 
        prescriptionId={selectedPrescription.id}
        showOwnOnly={primaryRole === 'doctor'}  // Doctors see only their amendments
      />
    )}
  </TabsContent>
</Tabs>
```

**Checklist:**
- [ ] Imported ForensicTimeline component
- [ ] Imported Tabs component
- [ ] Added timeline tab to prescription detail
- [ ] Timeline shows for all roles (but filters appropriately)
- [ ] Timeline refreshes when amendments are made

---

### STEP 4: Add Timeline to Pharmacist DispensingWorkstation

**File:** [src/components/pharmacy/DispensingWorkstation.tsx](src/components/pharmacy/DispensingWorkstation.tsx)

**Location:** Add as optional section in verification steps

**Step 4A - Add Import:**
```tsx
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
```

**Step 4B - Add Timeline Preview:**

In the verification section after drug interaction checks:
```tsx
{/* Existing verification content */}

{/* NEW: Show amendment history if prescription was amended */}
{prescription && (
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader>
      <CardTitle className="text-sm flex items-center gap-2">
        <History className="h-4 w-4" />
        Amendment History
        <Badge variant="outline">Phase 2B</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ForensicTimeline 
        prescriptionId={prescription.id}
        showOwnOnly={false}
      />
    </CardContent>
  </Card>
)}
```

**Checklist:**
- [ ] Timeline displays in DispensingWorkstation
- [ ] Shows amendments before dispensing
- [ ] Is clearly labeled as audit information

---

## Part 3: Testing Checklist

### Unit Tests

**File:** [tests/unit/amendments.test.ts](tests/unit/amendments.test.ts) (create if needed)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useForensicQueries } from '@/hooks/useForensicQueries';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

describe('Phase 2B: Amendment Features', () => {
  it('should fetch amendment chain correctly', async () => {
    const { result } = renderHook(() => 
      useForensicQueries().usePrescriptionAmendmentChain('test-rx-id')
    );
    // Test implementation
    expect(result.current).toBeDefined();
  });

  it('should handle amendment validation', () => {
    // Test dosage validation
    // Test reason validation
    // Test justification validation
  });

  it('should sanitize amendment justification before storage', () => {
    // Ensure no PHI in audit record
  });
});
```

### Integration Tests

**Scenario 1: Doctor Amends Prescription**
```
1. Doctor logs in
2. Opens pharmacist queue
3. Clicks "Amend" button on prescription
4. Fills amendment form:
   - Original: 500mg → Corrected: 250mg
   - Reason: "Dosage reduction"
   - Justification: "Patient has CKD Stage 2; Per renal function dosing guidelines"
5. Submits amendment
   → Verify: toast success
   → Verify: Audit event created in DB
   → Verify: Timeline updated
   → Verify: Pharmacist notified (if useAmendmentAlert enabled)
```

**Scenario 2: Pharmacist Views Timeline Before Dispensing**
```
1. Pharmacist opens prescription
2. Opens "Audit Timeline" tab
3. Sees amendment entry with:
   - Timestamp (UTC)
   - Doctor name
   - Original dosage
   - Amended dosage
   - Reason & justification
4. Closes timeline, proceeds to dispense
   → Verify: Timeline doesn't block workflow
```

**Scenario 3: Rollback Test**
```
1. Disable AmendmentModal import in PrescriptionQueue.tsx
2. Reload app
3. Verify pharmacy still works
4. Verify no amendment button appears
5. Re-enable import
   → Verify: App restarts successfully
```

### E2E Tests (Playwright)

**File:** [tests/e2e/amendments.spec.ts](tests/e2e/amendments.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phase 2B: Amendment Workflow', () => {
  test('doctor can amend prescription dosage', async ({ page, context }) => {
    // Login as doctor
    // Navigate to pharmacy
    // Find prescription
    // Click amend button
    // Fill form
    // Submit
    // Verify success toast
    // Verify audit record in database
  });

  test('timeline shows all amendments in order', async ({ page }) => {
    // Navigate to prescription detail
    // Open timeline tab
    // Verify amendments in chronological order
    // Verify all fields populated correctly
  });

  test('amendment blocks if form validation fails', async ({ page }) => {
    // Click amend button
    // Try submit without reason
    // Verify validation error toast
    // Verify form doesn't submit
  });
});
```

### Manual Testing Checklist

- [ ] **Amendment Form Validation**
  - [ ] Cannot submit without corrected dosage
  - [ ] Cannot submit without change reason
  - [ ] Cannot submit without justification
  - [ ] Character limits enforced (justification ≤ 500 chars)

- [ ] **Timeline Display**
  - [ ] Shows original CREATE event
  - [ ] Shows AMEND events in order
  - [ ] Timestamps are UTC and readable
  - [ ] Doctor names match audit records
  - [ ] Before/after values display correctly

- [ ] **Permission Checks**
  - [ ] Only doctors see "Amend" button
  - [ ] Pharmacists cannot amend
  - [ ] Patients cannot see timeline (sanitized)
  - [ ] Admin can see all amendments

- [ ] **Error Handling**
  - [ ] Network error → toast error
  - [ ] RPC failure → sanitized error message
  - [ ] Session timeout → auth redirect
  - [ ] No PHI in error logs

- [ ] **Performance**
  - [ ] Modal opens < 500ms
  - [ ] Timeline loads < 1s (< 50 amendments)
  - [ ] Pagination works if > 50 amendments

---

## Part 4: Common Issues & Troubleshooting

### Issue 1: "Amend" Button Not Appearing

**Symptoms:** Doctor logged in, button doesn't show on prescription

**Diagnosis:**
```typescript
// Check 1: Verify primaryRole is 'doctor'
console.log('Primary Role:', primaryRole);

// Check 2: Verify prescription has items
console.log('Prescription Items:', selectedPrescription?.items);

// Check 3: Verify button logic
if (primaryRole === 'doctor' && selectedPrescription) {
  // Button SHOULD show
}
```

**Fix:**
1. Ensure `useAuth()` is called in PrescriptionQueue
2. Verify role-based route protection is working
3. Check that prescription has `items` array populated
4. Verify import path: `import { AmendmentModal } from '@/components/audit/AmendmentModal'`

---

### Issue 2: Amendment Mutation Fails with "RPC not found"

**Symptoms:** Click amend, form submits, then error toast: "RPC failed"

**Diagnosis:**
```typescript
// This RPC should exist in supabase:
// See: supabase/migrations/PHASE_2A_*.sql
await supabase.rpc('amend_prescription_dosage', {
  p_prescription_id: prescriptionId,
  p_item_id: currentItem.id,
  // ... params
});
```

**Fix:**
1. Verify Phase 2A migrations were applied:
   ```bash
   supabase migration list
   # Should show amend_prescription_dosage function
   ```
2. If missing, run migrations:
   ```bash
   supabase migration up
   ```
3. Verify function exists in DB:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'amend_prescription_dosage';
   ```

---

### Issue 3: Timeline Empty / Not Refreshing

**Symptoms:** Timeline tab shows nothing after amendment

**Diagnosis:**
```typescript
// Verify hook is being called
const { amendments, isLoading } = usePrescriptionAmendmentChain(prescriptionId);

// Check if refreshPrescriptionChain was called
refreshPrescriptionChain(prescriptionId);
```

**Fix:**
1. Ensure `onAmendmentSuccess` callback calls `refreshPrescriptionChain`:
   ```typescript
   // Inside AmendmentModal.tsx
   useEffect(() => {
     refreshPrescriptionChain(prescriptionId);
   }, [prescriptionId]);
   ```
2. Verify Supabase real-time is enabled for audit_events table
3. Check browser console for query errors
4. Manual refresh: Press F5 to verify timeline loads on fresh page load

---

### Issue 4: PHI Leaking in Amendment Logs

**Symptoms:** Audit logs contain patient names, MRNs

**Diagnosis:**
```typescript
// Check sanitizeForLog is applied
console.error('Amendment failed:', sanitizeForLog(error.message));
// Should output: "Amendment__[MASKED]__"
```

**Fix:**
1. Review all error handling in AmendmentModal.tsx
2. Apply `sanitizeForLog()` to all error messages:
   ```typescript
   console.error('Amendment error:', sanitizeForLog(error.message));
   ```
3. Ensure amendment_justification field doesn't contain:
   - Patient names
   - MRNs
   - SSNs
   - Phone numbers
   - Email addresses

---

### Issue 5: Amendment Modal Doesn't Close After Submit

**Symptoms:** Submit amendment, see success toast, modal stays open

**Diagnosis:**
```typescript
// Verify mutation's onSuccess callback
onSuccess: (data) => {
  // Should call onClose()
  onClose();
}
```

**Fix:**
1. Check that `onSuccess` handler in AmendmentModal calls `onClose()`
2. Verify parent component passed `onClose` prop correctly
3. Check for mutation state conflicts:
   ```typescript
   if (amendmentMutation.isPending) {
     // Submit button should be disabled
   }
   ```

---

## Part 5: Rollback Procedure

If integration causes issues, **no database rollback needed** (Phase 2A already committed).

### UI Rollback Steps:

**Step 1: Remove Amendment Button**
```typescript
// In PrescriptionQueue.tsx, delete the Amend button:
// DELETE these lines:
{primaryRole === 'doctor' && (
  <Button ... onClick={() => setAmendmentModalOpen(true)}>
    Amend
  </Button>
)}
```

**Step 2: Remove Amendment Modal JSX**
```typescript
// In PrescriptionQueue.tsx, delete:
<AmendmentModal
  isOpen={amendmentModalOpen}
  onClose={...}
  ...
/>
```

**Step 3: Remove useAmendmentAlert from App.tsx**
```typescript
// In App.tsx, remove or comment out:
useAmendmentAlert();
```

**Step 4: Remove Timeline Tabs**
```typescript
// In PatientPrescriptionsPage.tsx, remove timeline tab
// Keep only existing details tab
```

**Step 5: Restart App**
```bash
npm run dev
# App should work without amendment features
```

**Verify Rollback:**
- [x] Pharmacy page loads
- [x] No amendment buttons visible
- [x] Prescriptions can still be dispensed
- [x] No errors in console

---

## Part 6: Code Snippets Summary

### Import Statements

```typescript
// AmendmentModal
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { useForensicQueries } from '@/hooks/useForensicQueries';

// ForensicTimeline
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';

// Alert Hook
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, History } from 'lucide-react';
```

### Error Handling Pattern

```typescript
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

// Safe error handling
const amendmentMutation = useMutation({
  mutationFn: async () => {
    try {
      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        // params
      });
      
      if (error) {
        // NEVER log raw error with PHI
        console.error('Amendment failed:', sanitizeForLog(error.message));
        throw new Error(error.message);
      }
      
      return data;
    } catch (err) {
      // Safe logging
      console.error('Amendment error:', sanitizeForLog(String(err)));
      throw err;
    }
  },
  onError: (error: Error) => {
    toast.error('Amendment failed', {
      description: error.message, // Already sanitized
    });
  },
});
```

### Refresh After Amendment

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// After amendment success
onAmendmentSuccess: (amendmentId) => {
  // Invalidate both prescriptions and amendment chain
  queryClient.invalidateQueries({ 
    queryKey: ['prescriptions'] 
  });
  queryClient.invalidateQueries({ 
    queryKey: ['amendment-chain', prescriptionId] 
  });
  
  // Refresh timeline if subscribed
  refreshPrescriptionChain(prescriptionId);
}
```

---

## Part 7: Verification Checklist - Final

Use this checklist to verify Phase 2B integration is complete:

### Completed Tasks
- [ ] `useAmendmentAlert` hook created and wired in App.tsx
- [ ] Amendment button added to PrescriptionQueue for doctors
- [ ] AmendmentModal component integrated
- [ ] ForensicTimeline added to prescription detail tabs
- [ ] ForensicTimeline added to DispensingWorkstation
- [ ] All imports verified (no 404 component errors)
- [ ] Error handling uses `sanitizeForLog` 
- [ ] Toast notifications configured
- [ ] Permission checks in place (doctor-only button)

### Testing Verification
- [ ] Unit tests written and passing
- [ ] Integration test scenarios created
- [ ] E2E smoke test: doctor can amend prescription
- [ ] E2E smoke test: timeline shows amendment
- [ ] Manual test: validation error handling
- [ ] Manual test: PHI not visible in timeline
- [ ] Manual test: pagination works for long timelines

### Production Readiness
- [ ] No console errors on page load
- [ ] No unused imports
- [ ] Component lazy loading not needed (small components)
- [ ] Real-time updates work (useAmendmentAlert)
- [ ] Mobile responsive (Tabs work on mobile)
- [ ] Accessibility: aria labels added
- [ ] Performance: modal loads < 500ms
- [ ] Documentation updated in code comments

### Rollback Verification
- [ ] Amendment feature can be disabled by removing 5 code blocks
- [ ] Database doesn't need rollback
- [ ] App works without amendments (legacy path)
- [ ] No breaking changes to existing prescriptions

---

## Next Steps

1. **Review this document** with team
2. **Assign integration tasks** to developers:
   - Dev 1: Steps 1-2 (Hook + PrescriptionQueue)
   - Dev 2: Step 3 (PatientPrescriptionsPage)
   - Dev 3: Step 4 (DispensingWorkstation)
3. **Create PR branches** for each step
4. **Run integration tests** in order
5. **Deploy to staging** with this checklist
6. **Get stakeholder sign-off** before production

---

## Appendix: FAQ

**Q: Do I need to run database migrations?**  
A: No. Phase 2A migrations are already complete. The `amend_prescription_dosage` RPC function exists.

**Q: Can amendments be undone?**  
A: Not via UI in Phase 2B. Amendment cascade is read-only. Reversals require explicit REVERSAL audit events (future phase).

**Q: Will this slow down prescription dispensing?**  
A: No. Amendment features are additive (buttons/tabs). Dispensing path is unchanged.

**Q: Can patients see amendment timeline?**  
A: No. Timeline is hidden for patient role. Only doctors & admins see it.

**Q: What if pharmacist needs to revert an amendment?**  
A: Pharmacist cannot amend. Only doctor can amend (correcting their own errors). Contact admin for reversals.

---

**Document Version:** 1.0  
**Last Updated:** March 13, 2026  
**Maintained By:** CareSync Development Team
