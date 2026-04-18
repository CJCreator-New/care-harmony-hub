# Tier 5.4 — Accessibility Audit & Implementation

**Status:** In Progress  
**Effort:** 12 hours total  
**Phase:** 1 of 3 (Execution)  
**Date Started:** April 18, 2026

---

## Overview

Tier 5.4 implements WCAG 2.1 AAA compliance for CareSync HIMS across 4 dimensions:
1. **ARIA Labels** — Form fields, buttons, interactive controls
2. **Keyboard Navigation** — Tab order, focus management, skip links
3. **Screen Reader Testing** — Live regions, semantic HTML, text alternatives
4. **Clinical Context** — Color-blind safe indicators, glove-operable UI, high-contrast modes

**Strategic Priority:** Accessibility provides the foundation for all other Tier 5 UX work (PWA, patient portal, mobile).

---

## Audit Findings Summary

### Current State: 58% accessibility coverage
- ✅ 221 ARIA attributes already in use
- ✅ SkipNavigation component exists (but not integrated)
- ✅ LiveRegion, useFocusTrap hooks implemented
- ⚠️ 30% of forms missing label associations
- ❌ Status indicators rely on color alone (colorblind risk)
- ❌ Table headers missing `scope="col"` & `aria-sort`
- ❌ No live announcements for real-time queue updates

### Critical Clinical Gaps (Patient Safety)
| Issue | Component | Impact | Priority |
|-------|-----------|--------|----------|
| **Color-only critical warnings** | Lab Results, Vitals, Drug Interactions | Colorblind users miss critical info | 🔴 HIGH |
| **Bare form inputs** | VitalSignsForm, RecordVitalsModal | Mobile/gloved data entry fails | 🔴 HIGH |
| **Missing real-time announcements** | Queue status, workflow transitions | Screen reader misses updates | 🟡 MED |
| **Form error not linked to inputs** | All forms | Screen reader doesn't announce errors | 🟡 MED |
| **Table accessibility** | Appointment/Patient/Queue tables | Sortable columns not announced | 🟡 MED |

---

## Implementation Roadmap

### Phase 1: High-Priority Clinical Fixes (4 hours)
**Objective:** Fix colorblind/low-vision issues in critical paths

#### 1.1: Color-Independent Status Indicators (2h)
**Files to Update:**
- `src/components/vitals/VitalsTrendChart.tsx` — Add text badges (Normal/Abnormal/Critical)
- `src/components/labs/LabResults.tsx` — Red results need aria-label + Badge
- `src/components/prescription/DrugInteractionWarning.tsx` — Icon + text, not color alone
- `src/dashboard/WorkflowPerformanceMonitor.tsx` — Compliance indicators with text
- `src/components/dashboard/RoleHandoffStatusPanel.tsx` — Status badges with text

**Pattern to implement:**
```typescript
// ❌ BEFORE: Color only
<div className="text-red-500">Critical</div>

// ✅ AFTER: Color + text + ARIA
<Badge variant="destructive" className="flex items-center gap-2">
  <AlertCircle className="w-4 h-4" />
  <span>Critical Result</span>
</Badge>
```

**Action Items:**
- [ ] Add text labels to all red/green/yellow indicators
- [ ] Ensure badge text is always present (not just tooltip)
- [ ] Add `aria-label` to visual-only icons

#### 1.2: Form Input Accessibility (1.5h)
**Files to Update:**
- `src/components/nurse/VitalSignsForm.tsx` — HR, BP, Temp inputs
- `src/components/nurse/RecordVitalsModal.tsx` — Modal input fields
- `src/pages/billing/BillingPage.tsx` — Search inputs
- `src/components/laboratory/EnhancedLabOrderForm.tsx` — Test order inputs

**Pattern:**
```typescript
// ✅ GOOD: Explicit label + ARIA
<div>
  <Label htmlFor="systolic_bp">Systolic Blood Pressure (mmHg)</Label>
  <Input
    id="systolic_bp"
    type="number"
    aria-label="Systolic Blood Pressure in millimeters of mercury"
    aria-required="true"
    placeholder="e.g., 120"
  />
</div>
```

**Action Items:**
- [ ] Add `htmlFor` to all `<Label>` components
- [ ] Add descriptive `aria-label` to all inputs lacking labels
- [ ] Set `aria-required="true"` on required fields

#### 1.3: Live Region Integration (0.5h)
**Files to Update:**
- `src/components/nurse/NursePatientQueue.tsx` — Patient called announcements
- `src/components/dashboard/PatientQueue.tsx` — Status transitions
- `src/pages/appointments/AppointmentsPage.tsx` — Appointment changes

**Pattern:**
```typescript
// ✅ Announce status changes
const [liveMessage, setLiveMessage] = useState('');

const handleStatusChange = (patient, newStatus) => {
  // Announce to screen reader
  setLiveMessage(`Patient ${patient.name} status changed to ${newStatus}`);
  // ... update UI
};

return (
  <>
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {liveMessage}
    </div>
    {/* ... UI */}
  </>
);
```

---

### Phase 2: Form & Table Accessibility (4 hours)
**Objective:** Ensure all forms and data tables are screen-reader friendly

#### 2.1: Form Error Announcements (1.5h)
**Files to Update:**
- `src/components/nurse/VitalSignsForm.tsx`
- `src/components/prescription/EnhancedPrescriptionForm.tsx`
- `src/components/laboratory/EnhancedLabOrderForm.tsx`
- `src/components/billing/BillingEntryForm.tsx`

**Pattern:**
```typescript
const [errors, setErrors] = useState({});

return (
  <form>
    <div>
      <Label htmlFor="heart_rate">Heart Rate</Label>
      <Input
        id="heart_rate"
        aria-invalid={!!errors.heart_rate}
        aria-describedby={errors.heart_rate ? 'heart-rate-error' : undefined}
      />
      {errors.heart_rate && (
        <span id="heart-rate-error" role="alert" className="text-red-600">
          {errors.heart_rate}
        </span>
      )}
    </div>
  </form>
);
```

**Action Items:**
- [ ] Add `aria-invalid` to inputs with errors
- [ ] Add `aria-describedby` linking to error messages
- [ ] Add `role="alert"` to error containers
- [ ] Test with NVDA screen reader

#### 2.2: Table ARIA Attributes (1.5h)
**Files to Update:**
- `src/pages/appointments/AppointmentsPage.tsx` — Appointment table
- `src/components/nurse/NursePatientQueue.tsx` — Patient queue table
- `src/pages/patients/PatientListPage.tsx` — Patient list table
- `src/pages/pharmacy/PharmacyQueue.tsx` — Prescription queue table

**Pattern:**
```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Patient Name</TableHead>
      <TableHead scope="col" aria-sort="none">
        Appointment Time
      </TableHead>
      <TableHead scope="col">Status</TableHead>
    </TableRow>
  </TableHeader>
  {/* ... */}
</Table>
```

**Action Items:**
- [ ] Add `scope="col"` to all table headers
- [ ] Add `aria-sort="none|ascending|descending"` to sortable headers
- [ ] Add live region announcement when sorted/filtered

#### 2.3: Skip Navigation Integration (1h)
**Files to Update:**
- `src/App.tsx` — Import and render SkipNavigation
- `src/layouts/MainLayout.tsx` — Add `id="main-content"` to main element
- All pages — Ensure main content is within `<main id="main-content">`

**Pattern:**
```typescript
// In App.tsx
import { SkipNavigation } from '@/components/accessibility/SkipNavigation';

export function App() {
  return (
    <>
      <SkipNavigation />
      <Header />
      <main id="main-content">
        {/* Routes */}
      </main>
      <Footer />
    </>
  );
}
```

**Action Items:**
- [ ] Integrate SkipNavigation at top level
- [ ] Verify all pages have `<main id="main-content">`
- [ ] Test skip link with Tab key

---

### Phase 3: Keyboard Navigation & Validation (4 hours)
**Objective:** Ensure all features work with keyboard-only + screen reader testing

#### 3.1: Modal Focus Management (1h)
**Files to Update:**
- `src/components/nurse/RecordVitalsModal.tsx` — Initial focus on first input
- `src/components/discharge/DischargeWorkflowCard.tsx` — Modal workflows
- All dialog components using Radix UI

**Radix UI has built-in focus trap, but ensure:**
- [ ] Initial focus set to first input/interactive element
- [ ] Escape key closes modal (already built in)
- [ ] Focus returns to trigger button after close
- [ ] Test with Tab/Shift+Tab navigation

#### 3.2: Interactive Control Keyboard Support (1.5h)
**Files to Update:**
- `src/components/workflows/DisclosureSection.tsx` — Expand/collapse with Space/Enter
- `src/components/modals/DrugInteractionModal.tsx` — Keyboard navigation
- All custom buttons/toggles not using native elements

**Pattern:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
};

return (
  <div
    role="button"
    tabIndex={0}
    onKeyDown={handleKeyDown}
    onClick={handleClick}
  >
    {/* */}
  </div>
);
```

**Action Items:**
- [ ] Ensure all clickable elements have keyboard handlers (Enter, Space)
- [ ] Verify Tab order is logical (left-to-right, top-to-bottom)
- [ ] Use `tabIndex={0}` only when necessary
- [ ] Test with keyboard-only navigation

#### 3.3: Screen Reader Testing (1.5h)
**Testing Checklist:**
- [ ] Install NVDA (Windows) or JAWS trial
- [ ] Test critical workflows:
  - Patient record creation (nurse entry form)
  - Lab result review (colorblind scenario)
  - Prescription approval (drug interaction check)
  - Vitals entry (gloved use scenario)
- [ ] Verify announcements:
  - Form labels read correctly
  - Errors announced immediately
  - Status changes announced in real-time
  - Table headers and data announced together
- [ ] Document findings in accessibility report

---

## Implementation Checklist

### Phase 1: Critical Clinical (4h)
- [ ] **VitalsTrendChart** — Add text badges for normal/abnormal/critical
- [ ] **LabResults** — Add aria-label to critical result indicators
- [ ] **DrugInteractionWarning** — Icon + text, not color alone
- [ ] **WorkflowPerformanceMonitor** — Compliance indicators with text
- [ ] **RoleHandoffStatusPanel** — Status badges with text
- [ ] **VitalSignsForm** — Add aria-label to HR, BP, Temp inputs
- [ ] **RecordVitalsModal** — Add aria-required, link error messages
- [ ] **BillingPage** — Add aria-label to search inputs
- [ ] **EnhancedLabOrderForm** — Add form field labels
- [ ] **NursePatientQueue** — Announce patient status transitions
- [ ] **PatientQueue** — Add live region for queue updates
- [ ] **AppointmentsPage** — Queue announcements

### Phase 2: Forms & Tables (4h)
- [ ] **All forms** — Add aria-invalid + aria-describedby pattern
- [ ] **AppointmentsPage** — Add scope="col" + aria-sort to table
- [ ] **NursePatientQueue** — Table ARIA attributes
- [ ] **PatientListPage** — Table ARIA attributes
- [ ] **PharmacyQueue** — Table ARIA attributes
- [ ] **App.tsx** — Integrate SkipNavigation
- [ ] **MainLayout** — Add id="main-content"
- [ ] **All pages** — Verify <main> wrapper

### Phase 3: Keyboard & Testing (4h)
- [ ] **RecordVitalsModal** — Focus management
- [ ] **DischargeWorkflowCard** — Modal initial focus
- [ ] **DisclosureSection** — Space/Enter keyboard support
- [ ] **DrugInteractionModal** — Tab navigation
- [ ] All custom buttons — Add keyboard handlers
- [ ] **Tab order** — Audit left-to-right, top-to-bottom flow
- [ ] **Screen reader test** — NVDA testing on critical paths
- [ ] **Accessibility report** — Document findings

---

## Testing & Validation

### Unit Tests
```bash
npm run test:accessibility
# Runs: jest-axe on all components + WCAG compliance checks
```

### E2E Tests
```bash
npm run test:e2e -- tests/e2e/accessibility-wcag-audit.spec.ts
# Tests: 12 critical workflows with accessibility assertions
```

### Manual Testing (NVDA on Windows)
```bash
# 1. Download NVDA: https://www.nvaccess.org/download/
# 2. Start NVDA (Ctrl+Alt+N)
# 3. Open app: npm run dev
# 4. Test workflows:
#    - Tab through patient creation form (should read labels)
#    - Check lab results with critical values (should announce)
#    - Change prescription status (should announce via live region)
#    - Navigate appointment table (should read headers + data)
```

---

## Success Criteria

- ✅ All form inputs have `aria-label` or linked `<label>`
- ✅ All tables have `scope="col"` and `aria-sort`
- ✅ All status indicators have text + color
- ✅ All forms have error announcements with `aria-invalid`
- ✅ All modals have focus management
- ✅ All interactive elements support keyboard (Tab, Enter, Space, Escape)
- ✅ SkipNavigation integrated and functional
- ✅ All critical workflows pass WCAG 2.1 AAA tests
- ✅ NVDA screen reader testing passes on critical paths
- ✅ npm run test:accessibility returns 0 failures

---

## Known Issues & Deferred

**Future Work (Post-Tier 5.4):**
- [ ] Color-blind mode toggle (CSS filter for Deuteranopia/Protanopia)
- [ ] High-contrast mode for night-shift users
- [ ] Voice command support (prescription entry via speech)
- [ ] Braille display integration research

---

## Dependencies

- Tier 4 complete ✅
- jest-axe testing library (already installed)
- NVDA screen reader for manual testing
- Radix UI (provides built-in accessibility foundations)

---

## Time Tracking

| Phase | Hours | Status |
|-------|-------|--------|
| 1: Critical Clinical | 4h | Not Started |
| 2: Forms & Tables | 4h | Not Started |
| 3: Keyboard & Testing | 4h | Not Started |
| **Total** | **12h** | **0% Complete** |

---

## Next Steps

1. ✅ Complete Phase 1 (4 hours) — Critical clinical accessibility
2. → Start Phase 2 (4 hours) — Forms and table improvements
3. → Phase 3 (4 hours) — Keyboard navigation and screen reader validation
4. → Commit and merge to main
5. → Begin Tier 5.1 (PWA offline mode)
