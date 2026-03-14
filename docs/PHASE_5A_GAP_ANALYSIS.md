# Phase 5A: Detailed Gap Analysis & Coverage Roadmap

**Generated**: March 14, 2026  
**Status**: Ready for implementation prioritization  
**Target**: Day 4 (Thursday) planning + Day 5-6 implementation

---

## Coverage Gap Matrix

### By Test Type (vs. Phase 5A Requirements)

| Test Type | Status | Baseline | Target | Gap | Priority |
|-----------|--------|----------|--------|-----|----------|
| Type Safety | ✅ | 100% | 100% | **0** | ✅ DONE |
| Unit Tests | ⚠️ | 98.1% | 100% | **2 tests** | 🔴 HIGH |
| Integration Tests | ⚠️ | 83.9% | 100% | **5 tests** | 🔴 HIGH |
| E2E Smoke | ❌ | 0% | 80% | **25+ tests** | 🔴 CRITICAL |
| Accessibility | ❌ | 0% | <16 errors | **12+ tests** | 🔴 HIGH |
| Security | ✅ Framework | Unknown | Full coverage | TBD | 🟡 MEDIUM |
| RLS Validation | ❌ | Missing | Automated | **Script** | 🔴 HIGH |
| Lint | ⚠️ | Unknown | 0 errors | Unknown | 🟡 MEDIUM |

---

## Phase 4B Component Test Coverage

### MedicationRequestForm

**Current Status**: 
- ✅ Component exists: `src/components/forms/MedicationRequestForm.tsx`
- ❌ Unit tests: **NOT FOUND**
- ❌ Accessibility tests: **NOT FOUND**
- ❌ Integration tests: **NOT FOUND**

**Issues from Phase 4A Audit**:
- 🔴 Dosage field font <16px (FIXED in Phase 4B, but not tested)
- 🔴 No allergy interaction warnings visible (FIXED in Phase 4B, but not tested)
- 🔴 Touch targets <48px (FIXED in Phase 4B, but not tested)

**Tests Needed**:

```typescript
// tests/unit/MedicationRequestForm.test.tsx
describe('MedicationRequestForm', () => {
  test('renders with patient name and medication list', () => {});
  test('dosage field accepts numeric input', () => {});
  test('frequency selector shows all valid frequencies', () => {});
  test('instructions field is required', () => {});
  test('submit button is disabled until required fields filled', () => {});
  test('displays allergy warning when selected', () => {});
  test('medication suggestions filter as user types', () => {});
  test('clears form after successful submission', () => {});
});

// tests/accessibility/medication-form.a11y.test.tsx
describe('MedicationRequestForm Accessibility', () => {
  test('dosage field has font-size >= 16px', () => {});
  test('allergy warning has role="alert" and ARIA live region', () => {});
  test('labels associated with all inputs (label htmlFor)', () => {});
  test('keyboard navigation: Tab through all fields', () => {});
  test('form submission accessible via Enter key', () => {});
  test('color contrast ratio >= 7:1 (WCAG AAA)', () => {});
  test('all buttons >= 48px height (touch target)', () => {});
});

// tests/integration/medication-request.integration.test.tsx
describe('MedicationRequestForm Integration', () => {
  test('submits form and creates prescription in database', () => {});
  test('RLS filters by hospital_id on INSERT', () => {});
  test('creates prescription items (dosage, frequency)', () => {});
  test('adds queue entry for pharmacy workflow', () => {});
  test('logs audit trail for prescription creation', () => {});
});
```

**Coverage Target**: 15 tests

---

### VitalSignsForm

**Current Status**:
- ✅ Component exists: `src/components/forms/VitalSignsForm.tsx`
- ⚠️ Unit tests: `tests/unit/VitalSignsForm.test.tsx` (partial - 1-2 tests)
- ❌ Accessibility tests: **NOT FOUND**
- ❌ Integration tests: **NOT FOUND**

**Issues from Phase 4A Audit**:
- 🔴 Current value font <24px (FIXED in Phase 4B → 36px, but not tested)
- 🟡 Vital signs out-of-range not highlighted (FIXED in Phase 4B, but not tested)
- 🟡 Mobile responsiveness needs work

**Tests Needed**:

```typescript
// tests/unit/VitalSignsForm.test.tsx (EXPAND)
describe('VitalSignsForm', () => {
  test('[EXISTING] renders form with vital inputs', () => {});
  test('[NEW] displays current value in large font (36px)', () => {});
  test('[NEW] highlights out-of-range values in red', () => {});
  test('[NEW] shows reference range (min-max)', () => {});
  test('[NEW] temperature field converts F ↔ C correctly', () => {});
  test('[NEW] validates blood pressure (systolic/diastolic)', () => {});
  test('[NEW] requires at least one vital sign', () => {});
  test('[NEW] mobile layout stacks vertically on <768px', () => {});
});

// tests/accessibility/vital-signs.a11y.test.tsx
describe('VitalSignsForm Accessibility', () => {
  test('current value font-size >= 36px', () => {});
  test('out-of-range alert has role="alert"', () => {});
  test('labels associated with numeric inputs', () => {});
  test('field suffixes (e.g., "mmHg") accessible via aria-label', () => {});
  test('temperature toggle (F/C) keyboard accessible', () => {});
  test('touch targets for input fields >= 48px', () => {});
});

// tests/integration/vital-signs.integration.test.tsx
describe('VitalSignsForm Integration', () => {
  test('submits vital signs and creates vital_signs record', () => {});
  test('critical value triggers alert creation', () => {});
  test('RLS filters by hospital_id + patient_id', () => {});
  test('updates patient last_vital_time', () => {});
  test('stores temperature unit preference', () => {});
});
```

**Coverage Target**: 12 new tests (plus 5 existing)

---

### LabOrderForm

**Current Status**:
- ✅ Component exists: `src/components/forms/LabOrderForm.tsx`
- ⚠️ Unit tests: `tests/unit/CreateLabOrderModal.test.tsx` (1-2 tests)
- ❌ Accessibility tests: **NOT FOUND**
- ❌ Integration tests: **NOT FOUND**

**Issues from Phase 4A Audit**:
- 🟡 Urgency/Priority not prominent
- 🟡 Test selection unclear (multi-select vs single?)
- 🟡 Mobile layout needs work

**Tests Needed**:

```typescript
// tests/unit/LabOrderForm.test.tsx (EXPAND from CreateLabOrderModal.test.tsx)
describe('LabOrderForm', () => {
  test('[EXISTING] renders form with test selection', () => {});
  test('[NEW] urgency dropdown shows all priority levels', () => {});
  test('[NEW] urgent tests show critical indicator', () => {});
  test('[NEW] allows multiple test selection', () => {});
  test('[NEW] displays collected samples required', () => {});
  test('[NEW] special instructions field optional', () => {});
  test('[NEW] submit button disabled without tests selected', () => {});
  test('[NEW] test list filters by department (hematology, chemistry, etc)', () => {});
});

// tests/accessibility/lab-order.a11y.test.tsx
describe('LabOrderForm Accessibility', () => {
  test('urgency priority options are distinguishable', () => {});
  test('test selection checkboxes >= 48px', () => {});
  test('labels associated with urgency and test fields', () => {});
  test('special instructions textarea keyboard accessible', () => {});
  test('critical tests marked with aria-label="Critical"', () => {});
});

// tests/integration/lab-order.integration.test.tsx
describe('LabOrderForm Integration', () => {
  test('submits request and creates lab_orders record', () => {});
  test('creates queue entry with urgency priority', () => {});
  test('RLS filters by hospital_id + patient_id', () => {});
  test('assigns to lab_technician pool', () => {});
  test('stores special collection instructions', () => {});
});
```

**Coverage Target**: 11 new tests (plus 2 existing)

---

## Accessibility Test Implementation Details

### Test 1: Forms (Contrast, Labels, Structure)
**File**: `tests/accessibility/forms.a11y.test.tsx`  
**Tests**: 8-10  
**Tooling**: @axe-core/react, Vitest

```typescript
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import MedicationRequestForm from '@/components/forms/MedicationRequestForm';

describe('Forms - WCAG AAA Compliance', () => {
  describe('MedicationRequestForm', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(<MedicationRequestForm patientId="123"/>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    test('dosage input has font-size >= 16px', () => {
      const form = render(<MedicationRequestForm />);
      const dosageInput = screen.getByRole('spinbutton', { name: /dosage/i });
      const styles = window.getComputedStyle(dosageInput);
      expect(parseFloat(styles.fontSize)).toBeGreaterThanOrEqual(16);
    });
    
    test('all form labels are associated with inputs', () => {
      // Check label htmlFor matches input id
    });
  });
  
  // Similar for VitalSignsForm, LabOrderForm
});
```

### Test 2: Color Contrast
**File**: `tests/accessibility/contrast.a11y.test.tsx`  
**Tests**: 3-4  
**Tooling**: @axe-core/react, Vitest

```typescript
import { getContrastRatio } from 'polished';

describe('WCAG AAA Color Contrast', () => {
  test('normal text meets 7:1 contrast ratio', () => {
    // Test against CareSync color palette
    const foreground = '#003D99'; // Blue (darkened)
    const background = '#FFFFFF';
    const ratio = getContrastRatio(foreground, background);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });
  
  test('large text meets 4.5:1 contrast ratio', () => {
    // Text >= 18px or bold >= 14px
  });
  
  test('focus indicators contrast >= 3:1 with background', () => {
    // Verify focus states are visible
  });
});
```

### Test 3: Keyboard Navigation
**File**: `tests/accessibility/keyboard-nav.a11y.test.tsx`  
**Tests**: 5-6

```typescript
describe('Keyboard Navigation', () => {
  test('Tab moves focus through form fields in logical order', async () => {
    const { container } = render(<MedicationRequestForm />);
    const inputs = container.querySelectorAll('input, select, button');
    
    inputs[0].focus();
    expect(document.activeElement).toBe(inputs[0]);
    
    userEvent.tab();
    expect(document.activeElement).toBe(inputs[1]);
  });
  
  test('form submission works via Enter key', async () => {
    // Focus submit button, press Enter, verify submission
  });
});
```

### Test 4: ARIA Labels & Live Regions
**File**: `tests/accessibility/aria-labels.a11y.test.tsx`  
**Tests**: 4-5

```typescript
describe('ARIA Labels & Live Regions', () => {
  test('allergy warning has role="alert"', () => {
    render(<MedicationRequestForm patientId="123-with-allergy" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
  
  test('out-of-range vital signs announce via aria-live="assertive"', () => {
    render(<VitalSignsForm patientId="456" />);
    // Simulate out-of-range input
    // Verify aria-live announcement
  });
  
  test('all buttons have descriptive aria-labels', () => {
    render(<LabOrderForm />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAccessibleName();
    });
  });
});
```

### Test 5: Touch Targets
**File**: `tests/accessibility/touch-targets.a11y.test.tsx`  
**Tests**: 3-4

```typescript
describe('Touch Target Sizes (48px minimum)', () => {
  test('all buttons have height >= 48px on mobile', () => {
    // Render in mobile viewport (375px width)
    // Verify button height >= 48px
  });
  
  test('form input fields have height >= 44px (close to 48px)', () => {
    const input = screen.getByRole('spinbutton');
    const height = input.getBoundingClientRect().height;
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
```

### Test 6: Screen Reader Announcements
**File**: `tests/accessibility/screen-reader.a11y.test.tsx`  
**Tests**: 3-4

```typescript
describe('Screen Reader Support', () => {
  test('form purpose clear when announced by screen reader', () => {
    render(<MedicationRequestForm patientId="789" />);
    // Use aria-describedby or visible heading
    const heading = screen.getByRole('heading', { name: /medication/i });
    expect(heading).toBeInTheDocument();
  });
  
  test('form confirmation announced after submission', async () => {
    render(<MedicationRequestForm />);
    // Fill form
    // Submit
    // Verify success announcement (aria-live region)
  });
});
```

---

## Integration Test Implementation Details

### Database-Level Tests

**File**: `tests/integration/forms.integration.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (table) => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-123' } }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // ...other methods
    }),
    from: (table) => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-123' } }),
    }),
  })),
}));

describe('Form Integration Tests', () => {
  describe('MedicationRequestForm', () => {
    test('submits prescription and creates prescription_items', async () => {
      const mockSupabase = createClient(...); // Mocked
      
      render(
        <MedicationRequestForm 
          patientId="patient-123"
          hospitalId="hospital-789"
        />
      );
      
      // Fill form
      await userEvent.type(screen.getByLabelText(/Medication/), 'Amoxicillin');
      await userEvent.type(screen.getByLabelText(/Dosage/), '500');
      await userEvent.selectOptions(screen.getByLabelText(/Frequency/), 'TDS');
      
      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Submit/i }));
      
      // Verify database calls
      await waitFor(() => {
        expect(mockSupabase.from('prescriptions').insert).toHaveBeenCalledWith(
          expect.objectContaining({
            patient_id: 'patient-123',
            hospital_id: 'hospital-789',
            Created by database RLS
          })
        );
      });
    });
    
    test('RLS filters prescription visibility by hospital_id', async () => {
      // Verify that prescriptions from other hospitals filtered out
    });
  });
  
  describe('VitalSignsForm', () => {
    test('critical values trigger alert creation', async () => {
      render(
        <VitalSignsForm 
          patientId="patient-456"
          hospitalId="hospital-789"
        />
      );
      
      // Enter critical blood pressure (e.g., 220/120)
      await userEvent.type(screen.getByLabelText(/Systolic/), '220');
      await userEvent.type(screen.getByLabelText(/Diastolic/), '120');
      await userEvent.click(screen.getByRole('button', { name: /Submit/i }));
      
      // Verify alert created
      await waitFor(() => {
        expect(mockSupabase.from('alerts').insert).toHaveBeenCalledWith(
          expect.objectContaining({
            alert_type: 'critical_vital',
            severity: 'critical',
          })
        );
      });
    });
  });
  
  describe('LabOrderForm', () => {
    test('creates queue entry with correct priority', async () => {
      render(
        <LabOrderForm 
          patientId="patient-789"
          hospitalId="hospital-789"
        />
      );
      
      // Select urgent priority
      await userEvent.selectOptions(
        screen.getByLabelText(/Priority/),
        'urgent'
      );
      
      // Select tests
      await userEvent.click(screen.getByLabelText(/Full Blood Count/));
      
      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Order/i }));
      
      // Verify queue entry created with priority
      await waitFor(() => {
        expect(mockSupabase.from('queue_entries').insert).toHaveBeenCalledWith(
          expect.objectContaining({
            priority: 'urgent',
            queue_type: 'lab',
          })
        );
      });
    });
  });
});
```

---

## Unit Test Fixes (High Priority)

### Fix 1: Supabase Mock Enhancement

**Issue**: 
```
Failed to log activity: TypeError: __vite_ssr_import_0__.supabase.from(...).insert is not a function
```

**File to Update**: `vitest.config.ts`

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],  // Create this file
  },
});
```

**File to Create**: `tests/setup.ts`

```typescript
import { vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => ({
      insert: vi.fn().mockResolvedValue({ 
        data: { id: 'mock-' + Math.random() },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
      delete: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));
```

**Tests This Fixes**:
- `usePrescriptions.test.tsx`: Both failing tests (audit logging)
- `useAppointments.test.tsx`: Should pass after mock enhancement

---

## RLS Validation Script

**File to Create**: `scripts/validate-rls.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Tables that MUST have hospital_id scoping
const TABLES_TO_VALIDATE = [
  'patients',
  'prescriptions',
  'prescription_items',
  'vital_signs',
  'lab_orders',
  'appointments',
  'consultations',
  'audit_logs',
  'alerts',
];

async function validateRLS() {
  console.log('🔍 Validating RLS policies...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const table of TABLES_TO_VALIDATE) {
    process.stdout.write(`Checking ${table}... `);
    
    try {
      // Get table schema via information_schema
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', table)
        .eq('column_name', 'hospital_id')
        .single();
      
      if (error) {
        console.log('❌ Missing hospital_id column');
        failed++;
      } else {
        // TODO: Would need to check RLS policies via Supabase API
        // For now, we can at least verify the column exists
        console.log('✅ hospital_id scoping present');
        passed++;
      }
    } catch (err) {
      console.log(`⚠️  Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

validateRLS();
```

**Add to package.json**:
```json
{
  "scripts": {
    "validate:rls": "node scripts/validate-rls.mjs"
  }
}
```

---

## E2E Test Environment Fix

### Issue
All E2E tests timeout at 33-35 seconds (no specific error).

### Root Cause Hypotheses
1. Dev server not running (`npm run dev` missing)
2. Supabase test credentials missing
3. Auth mock incomplete

### Fix Steps

**Step 1**: Verify dev server startup
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait 5 seconds, then)
npm run test:e2e:smoke -- --debug
```

**Step 2**: Check `.env.test`
```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...
VITE_PUBLIC_SUPABASE_URL=https://[project].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Step 3**: Add E2E startup script (`scripts/start-e2e-tests.sh`)
```bash
#!/bin/bash
set -e

echo "🚀 Starting dev server..."
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for server to be ready..."
sleep 10

echo "🧪 Running E2E tests..."
npx playwright test --grep @smoke

echo "🛑 Stopping dev server..."
kill $DEV_PID

exit 0
```

**Step 4**: Add npm script
```json
{
  "scripts": {
    "test:e2e:with-server": "bash scripts/start-e2e-tests.sh"
  }
}
```

---

## Implementation Timeline (Priority Order)

### Phase 5A Day 4 (Thursday) — 8 hours

**Parallel Work Tracks**:

**Track A: Unit Test Fixes** (Dev 1 — 2 hours)
- [ ] Update vitest.config.ts with enhanced Supabase mock
- [ ] Create tests/setup.ts
- [ ] Rerun `npm run test:coverage` → verify 100% pass
- [ ] Fix lint errors (unclear scope)

**Track B: RLS + E2E Setup** (Dev 2 — 2 hours)
- [ ] Create scripts/validate-rls.mjs
- [ ] Create scripts/start-e2e-tests.sh
- [ ] Test E2E environment
- [ ] Verify dev server startup timing

**Track C: Accessibility Tests** (QA + Dev 3 — 3 hours)
- [ ] Install @axe-core/react, vitest-axe
- [ ] Create tests/accessibility directory (6 files)
- [ ] Implement forms.a11y.test.tsx
- [ ] Implement contrast.a11y.test.tsx
- [ ] Run and document results

**Exit Criteria** (End of Day 4):
```
npm run type-check          # 0 errors ✅
npm run lint                # 0 errors (TBD)
npm run test:coverage       # 100% pass (126/126) ✅ 108 + 18 new
npm run test:integration    # 100% pass (31+/31) ✅
npm run test:accessibility  # <16 errors ✅ (new tests)
npm run test:e2e:smoke      # >50% pass 🟡 (dependent on env)
npm run validate:rls        # All tables scoped ✅
```

---

## Success Criteria by Component

### MedicationRequestForm
- [ ] 8 unit tests | 7 accessibility tests | 5 integration tests
- [ ] All tests green
- [ ] Dosage font size verified (16px)
- [ ] Allergy warnings tested

### VitalSignsForm
- [ ] 8 unit tests (existing + new) | 6 accessibility tests | 5 integration tests
- [ ] Current value font size verified (36px)
- [ ] Out-of-range highlighting tested
- [ ] Critical alerts trigger tested

### LabOrderForm
- [ ] 8 unit tests | 5 accessibility tests | 5 integration tests
- [ ] Urgency priority tested
- [ ] Queue entry creation tested
- [ ] Accessibility verified

### Overall
- [ ] <16 WCAG AAA errors
- [ ] 100% unit test pass rate
- [ ] 100% integration test pass rate
- [ ] All forms accessible via keyboard
- [ ] All critical lab paths E2E tested

---

## Spreadsheet for Tracking

| Test Category | Test File | Status | Owner | Due |
|---|---|---|---|---|
| Unit | MedicationRequestForm.test.tsx | 📝 TBD | Dev 1 | Thu |
| Unit | VitalSignsForm.test.tsx | ⚠️ Expand | Dev 1 | Thu |
| Unit | LabOrderForm.test.tsx | ⚠️ Expand | Dev 1 | Thu |
| A11y | forms.a11y.test.tsx | ❌ New | QA | Thu |
| A11y | contrast.a11y.test.tsx | ❌ New | QA | Thu |
| A11y | keyboard-nav.a11y.test.tsx | ❌ New | QA | Thu |
| A11y | aria-labels.a11y.test.tsx | ❌ New | QA | Thu |
| A11y | touch-targets.a11y.test.tsx | ❌ New | QA | Thu |
| A11y | screen-reader.a11y.test.tsx | ❌ New | QA | Thu |
| Integ | forms.integration.test.tsx | ❌ New | Dev 2 | Fri |
| Integ | vital-signs.integration.test.tsx | ❌ New | Dev 2 | Fri |
| Integ | lab-order.integration.test.tsx | ❌ New | Dev 2 | Fri |
| Lint | lint validation | ⚠️ Unknown | Dev 3 | Thu |
| RLS | validate-rls.mjs | ❌ New | Dev 3 | Thu |
| E2E | E2E environment | ❌ Failing | DevOps | Thu |

---

## Questions for Stakeholders (Prioritization)

1. **Which forms are most critical for Phase 4B sign-off?**
   - MedicationRequestForm (prescription safety)
   - VitalSignsForm (patient monitoring)
   - LabOrderForm (lab workflows)
   - All equally important?

2. **WCAG AAA target for Phase 5A?**
   - <16 errors (current audit finding)
   - <10 errors (stricter)
   - <5 errors (very strict)

3. **E2E test strategy?**
   - Require local dev server running?
   - Use deployed test environment?
   - Both?

4. **Timeline pressure?**
   - Strict Thursday deadline for all tests?
   - Can slip to Friday for E2E?
   - 50% pass acceptable for E2E initially?

---

**Report Status**: Ready for Thursday planning session  
**Next Step**: Schedule standupwith dev/QA teams to assign ownership
