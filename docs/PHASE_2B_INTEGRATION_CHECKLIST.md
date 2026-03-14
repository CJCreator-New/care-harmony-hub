# Phase 2B: Quick Reference Implementation Checklist

**File:** [docs/PHASE_2B_INTEGRATION_CHECKLIST.md](docs/PHASE_2B_INTEGRATION_CHECKLIST.md)

## 5-Minute Overview

### What We're Integrating
- ✅ **AmendmentModal.tsx** — Doctor can amend prescription dosage with audit trail
- ✅ **ForensicTimeline.tsx** — Read-only timeline showing all amendments
- ✅ **AuditLogViewer.tsx** — Admin audit dashboard (bonus)
- ✅ **useAmendmentAlert.ts** — Real-time notification hook (new)

### Why No Database Changes?
Phase 2A already created:
- `audit_events` table (forensic log)
- `amend_prescription_dosage()` RPC function
- Encryption metadata for PHI

### What Changes?
**UI Only:**
- Add "Amend" button to prescription cards (doctors only)
- Add "Audit Timeline" tab to prescription details
- Add real-time amendment alerts

---

## Integration Checklist (Copy-Paste Ready)

### Task 1: Hook Setup (10 min)

**File:** `src/App.tsx`

```diff
  const AppContent = () => {
    usePerformanceMonitoring();
+   useAmendmentAlert(); // <-- ADD THIS LINE
    return <AppRoutes />;
  };
```

**File:** `src/hooks/useAmendmentAlert.ts` (CREATE NEW)

Copy from: **[docs/PHASE_2B_INTEGRATION_PLAN.md#step-1](docs/PHASE_2B_INTEGRATION_PLAN.md#step-1)**

Paste entire `useAmendmentAlert()` function code.

**Verification:**
```bash
npm run dev
# Check: No console errors on app start
# Check: No "useAmendmentAlert is not defined" error
```

---

### Task 2: Pharmacist Queue Amendment Button (15 min)

**File:** `src/components/pharmacist/PrescriptionQueue.tsx`

**Step A - Add Imports:**
```diff
+ import { AmendmentModal } from '@/components/audit/AmendmentModal';
+ import { Edit } from 'lucide-react';
```

**Step B - Add State:**
```typescript
// Inside PrescriptionQueue component, after existing state:
const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
const [selectedForAmendment, setSelectedForAmendment] = useState<Prescription | null>(null);
const { primaryRole } = useAuth(); // Already exists, just use it
```

**Step C - Find & Replace Button:**

FIND THIS:
```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={() => setSelectedPrescription(p)}
>
  Details
</Button>
```

REPLACE WITH:
```tsx
<div className="flex gap-2">
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setSelectedPrescription(p)}
  >
    Details
  </Button>
  {primaryRole === 'doctor' && (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        setSelectedForAmendment(p);
        setAmendmentModalOpen(true);
      }}
    >
      <Edit className="h-3 w-3 mr-1" />
      Amend
    </Button>
  )}
</div>
```

**Step D - Add Modal JSX:**

At end of return (before closing `</div>`):
```tsx
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
  onAmendmentSuccess={() => {
    toast.success('Amendment submitted for audit');
    setAmendmentModalOpen(false);
    setSelectedForAmendment(null);
  }}
/>
```

**Verification:**
```bash
npm run dev
# Check: "Amend" button appears next to "Details" (doctor role only)
# Check: Click button → modal opens
# Check: Modal shows prescription items & form fields
# Check: No TypeScript errors
```

---

### Task 3: Prescription Detail Timeline (15 min)

**File:** `src/pages/patient/PatientPrescriptionsPage.tsx`

**Step A - Add Imports:**
```diff
+ import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
+ import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Step B - Find Where Prescription Medications Display**

Look for the section showing prescription items (medication name, dosage, etc).

**Step C - Wrap in Tabs:**

Replace this:
```tsx
{/* Medication items section */}
<div className="space-y-3">
  {rx.items?.map(item => (
    // ... medication display
  ))}
</div>
```

With this:
```tsx
<Tabs defaultValue="details" className="mt-6">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="timeline">Audit Timeline</TabsTrigger>
  </TabsList>

  <TabsContent value="details" className="space-y-3">
    {rx.items?.map(item => (
      // ... KEEP YOUR EXISTING MEDICATION DISPLAY CODE
    ))}
  </TabsContent>

  <TabsContent value="timeline">
    {selectedPrescription && (
      <ForensicTimeline 
        prescriptionId={selectedPrescription.id}
        showOwnOnly={primaryRole === 'doctor'}
      />
    )}
  </TabsContent>
</Tabs>
```

**Verification:**
```bash
npm run dev
# Check: Prescription detail shows "Details" and "Audit Timeline" tabs
# Check: Click "Audit Timeline" tab → ForensicTimeline component loads
# Check: Timeline shows amendments (if any exist)
# Check: No errors in console
```

---

### Task 4: Dispensing Workstation Timeline (10 min)

**File:** `src/components/pharmacy/DispensingWorkstation.tsx`

**Step A - Add Import:**
```diff
+ import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
```

**Step B - Find Verification Section**

Look for where the component shows "Verify Prescription Details", "Check Interactions", etc.

**Step C - Add Timeline Card:**

After the last verification check, add:
```tsx
{/* Amendment History - Phase 2B */}
{prescription && (
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader>
      <CardTitle className="text-sm flex items-center gap-2">
        <History className="h-4 w-4" />
        Amendment Timeline
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

**Verification:**
```bash
npm run dev
# Check: DispensingWorkstation shows amendment timeline
# Check: Timeline appears after drug interaction checks
# Check: Format matches other cards in workstation
# Check: No styling issues (consistent colors)
```

---

## Validation Tests (Before Commit)

### Test 1: Doctor Amendment Workflow
```
1. Login as doctor
2. Go to /pharmacy
3. Find a prescription
4. Click "Amend" button
5. Fill form:
   - Select item to amend
   - Enter corrected dosage
   - Enter reason
   - Enter justification
6. Click submit
□ Success toast appears
□ Modal closes
□ Timeline shows new amendment (refresh page)
□ No PHI in browser console
```

### Test 2: Timeline Display
```
1. Login as any role
2. Go to /patient/prescriptions
3. Click on any prescription
4. Click "Audit Timeline" tab
□ Timeline loads
□ Shows CREATE event
□ Shows any AMEND events
□ Timestamps are readable
□ Dotor names display
□ No empty fields
```

### Test 3: Permission Checks
```
1. Login as pharmacist
2. Open prescription
□ NO "Amend" button visible
3. Login as doctor
4. Open same prescription
□ "Amend" button IS visible
```

### Test 4: Error Handling
```
1. Doctor tries to amend without entering reason
□ Toast error: "Change reason is required"
□ Form does NOT submit
2. Doctor tries to amend without justification
□ Toast error: "Amendment justification is required"
□ Form does NOT submit
```

---

## File-by-File Changes Summary

| File | Change | Lines | Difficulty |
|------|--------|-------|------------|
| `src/App.tsx` | Add hook call | 1 | ⭐ Easy |
| `src/hooks/useAmendmentAlert.ts` | Create new | 50 | ⭐ Easy |
| `src/components/pharmacist/PrescriptionQueue.tsx` | Add button + modal | 40 | ⭐⭐ Medium |
| `src/pages/patient/PatientPrescriptionsPage.tsx` | Add tabs + timeline | 30 | ⭐⭐ Medium |
| `src/components/pharmacy/DispensingWorkstation.tsx` | Add timeline card | 15 | ⭐ Easy |
| **Total** | | ~136 | **~2 hours** |

---

## Common Mistakes (Avoid These!)

### ❌ Mistake 1: Forgot to import AmendmentModal
```tsx
// ERROR: Module not found
// FIX: Check import path is correct
import { AmendmentModal } from '@/components/audit/AmendmentModal';
```

### ❌ Mistake 2: Amendment button shows for all roles
```tsx
// ERROR: All users see "Amend" button
// FIX: Check role guard
if (primaryRole === 'doctor') {  // <-- REQUIRED
  return <Button>Amend</Button>;
}
```

### ❌ Mistake 3: Timeline doesn't refresh after amendment
```tsx
// ERROR: Submit amendment, timeline still shows old data
// FIX: Call refresh function in onSuccess callback
onAmendmentSuccess={() => {
  refreshPrescriptionChain(prescriptionId);  // <-- REQUIRED
}
```

### ❌ Mistake 4: PHI appears in console logs
```tsx
// ERROR: Error logs contain patient names
// FIX: Use sanitizeForLog
console.error('Failed:', sanitizeForLog(error.message));
```

### ❌ Mistake 5: Tab styling doesn't match page
```tsx
// ERROR: Timeline tab looks different from Details tab
// FIX: Use same component library (Tabs from @/components/ui/tabs)
```

---

## Rollback (If Needed)

One-liner to disable all features:

```bash
# Comment out 3 files and app reverts to pre-Phase 2B
# No DB changes needed

# 1. Comment in App.tsx
useAmendmentAlert();  →  // useAmendmentAlert();

# 2. Delete <AmendmentModal /> from PrescriptionQueue.tsx
# 3. Delete <Tabs> wrapper from PatientPrescriptionsPage.tsx
# 4. Delete timeline card from DispensingWorkstation.tsx

npm run dev
# ✓ App works without amendments
```

---

## Success Criteria

- [ ] Doctor can amend prescription dosage
- [ ] Amendment creates audit record
- [ ] Timeline shows all amendments
- [ ] Pharmacist can see amendments before dispensing
- [ ] No permission bypass (pharmacist cannot amend)
- [ ] No PHI leaked in audit logs
- [ ] No breaking changes to existing workflow
- [ ] E2E tests pass (smoke tests)
- [ ] Page performance < 2s load time
- [ ] Responsive on mobile (tabs work)

---

## Support

**File any blockers in:**
- GitHub Issues (with `phase-2b` label)
- Slack: #engineering-integration
- Code Review: Link to PHASE_2B_INTEGRATION_PLAN.md for full context

**Know Issues:**
- See Troubleshooting section in [PHASE_2B_INTEGRATION_PLAN.md](docs/PHASE_2B_INTEGRATION_PLAN.md#part-4-common-issues--troubleshooting)

---

**Integration Time Estimate:** 2-3 hours  
**Testing Time Estimate:** 1-2 hours  
**Total:** ~4 hours for complete Phase 2B  

**Ready?** ✅ All components exist and tested. Let's integrate!
