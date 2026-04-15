# Pharmacy Codebase Exploration Report
**Date**: April 15, 2026  
**Project**: CareSync HIMS - Pharmacy Domain Testing Analysis

---

## 1. Pharmacy Service Code Files

### Primary Service Locations

#### Frontend/Hooks Layer
- **Location**: `src/hooks/usePharmacistOperations.ts`
- **Purpose**: React hooks for pharmacist operations
- **Key Exports**:
  - `usePharmacistDashboard()` - Dashboard data aggregation
  - `usePharmacistPrescriptions()` - Prescription workflow management
  - `usePharmacistVerification()` - Prescription verification
  - `usePharmacistDispensing()` - Dispensing operations
  - `usePharmacistInventory()` - Inventory management
  - `usePharmacistClinicalSupport()` - Drug interaction/allergy checks
  - `usePharmacistCounseling()` - Patient counseling operations

#### Service Layer
- **Location**: `src/utils/pharmacistOperationsService.ts`
- **Purpose**: Core pharmacy operations business logic
- **Key Methods** (20+ methods):
  - `receivePrescription()` - Incoming prescription registration
  - `verifyPrescription()` - Comprehensive prescription validation
  - `fillPrescription()` - Prescription fulfillment
  - `rejectPrescription()` - Rejection with reason codes
  - `processDispensing()` - Dispensing record creation
  - `verifyDispensing()` - Quality verification
  - `generateLabel()` - Pharmacy label generation
  - `checkDrugInteractions()` - Drug-drug interaction checking
  - `checkAllergies()` - Patient allergy verification
  - `verifyDosage()` - Age/weight/organ function adjusted dosing
  - `getInventory()` - Inventory listing (hospital-scoped)
  - `updateInventory()` - Stock level updates
  - `requestReorder()` - Reorder request initiation
  - `getInventoryAlerts()` - Low stock/expiry alerts

#### Microservice / Sync Layer
- **Location**: `services/pharmacy-service/src/sync/`
- **Key Files**:
  - `PharmacySyncService.ts` - Main sync orchestration (prescriptions, medications, inventory, orders)
  - `ConflictResolutionService.ts` - Bi-directional sync conflict resolution
  - `DataValidationService.ts` - Pharmacy data validation rules
  - `KafkaEventListener.ts` - Real-time event streaming
  - `PharmacyDataSynchronization.ts` - Sync state management

#### RBAC/Authorization Layer
- **Location**: `src/utils/pharmacistRBACManager.ts`
- **Purpose**: Role-based access control for pharmacists
- **15 Granular Permissions**:
  - Prescription: RECEIVE, VERIFY, FILL, REJECT
  - Dispensing: PROCESS, VERIFY, LABEL_GENERATE
  - Inventory: VIEW, UPDATE, REORDER
  - Clinical: INTERACTION_CHECK, ALLERGY_CHECK, DOSAGE_VERIFY
  - Support: PATIENT_COUNSEL, METRICS_VIEW

### Type Definitions
- **Location**: `src/types/pharmacist.ts` and `src/types/pharmacy.ts`
- **Key Interfaces**:
  - `Prescription` - Prescription state with 9 status values
  - `PrescriptionVerification` - Multi-check verification result
  - `InteractionCheck` - Drug interaction analysis
  - `AllergyCheck` - Patient allergy validation
  - `DosageVerification` - Age/weight/organ-adjusted dosing
  - `DispensingRecord` - Dispensing fulfillment log
  - `InventoryItem` - Medication inventory entry
  - `InventoryReorderRequest` - Reorder request
  - `PatientCounseling` - Counseling session record
  - `PharmacyMetrics` - Performance analytics
  - `PharmacistDashboard` - Aggregated dashboard view

---

## 2. Existing Pharmacy Test Files

### Current Test Coverage (Placeholder Level)
**Location**: `src/test/pharmacist-rbac.test.ts`

**Status**: ⚠️ **PLACEHOLDER TESTS ONLY** - All tests return `expect(true).toBe(true)`

**Existing Test Stubs** (10 tests):
```
✓ pharmacist can view prescriptions
✓ pharmacist can dispense medications
✓ pharmacist can manage inventory
✓ pharmacist can check drug interactions
✓ pharmacist cannot prescribe medications
✓ pharmacist can counsel patients
✓ pharmacist can process refill requests
✓ pharmacist cannot access admin panel
✓ pharmacist can view medication history
✓ pharmacist can manage stock levels
```

### Related Test Infrastructure
- **Test Setup**: `src/test/setup.ts` - Global test configuration
- **Test Utilities**: `src/test/test-utils.tsx` - Custom render with providers
- **Test Mocks**: `src/test/mocks/` - Mock implementations
- **Clinical Validation Tests**: `src/test/utils/clinicalValidation.test.ts` - Blood pressure, heart rate, temperature, respiratory validation patterns
- **Integration Tests**: `src/test/integration/` - Auth, signup, account setup patterns

### Test Coverage Gaps
| Domain | Existing | Needed |
|--------|----------|--------|
| PharmacistOperationsService | 0% | 100% |
| PharmacySyncService | 0% | 100% |
| Prescription lifecycle | 0% | 100% |
| Inventory management | 0% | 100% |
| Clinical validations | ~5% (vital signs only) | 100% |
| Permission checks | 0% | 100% |
| Error scenarios | 0% | 100% |

---

## 3. Test Framework Setup & Test Patterns

### Framework Configuration

**Vitest Config**: `vitest.config.ts`
```typescript
- Environment: jsdom
- Globals: true (describe, it, expect available globally)
- Setup Files: ./src/test/setup.ts
- Test Timeout: 15,000ms
- Coverage Provider: v8
- Excluded: services/**, *.spec.ts
```

**Test Commands**:
```bash
npm run test           # Watch mode
npm run test:unit     # Run unit tests in src/test
npm run test:ui       # Vitest UI dashboard
npm run test:coverage # Generate coverage report
npm run test:integration  # Integration tests only
```

### Mocking Patterns Used

#### 1. Global Mocks (setup.ts)
```typescript
// Sonner toast notifications
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}))

// Crypto module (for PHI encryption)
vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue(...),
  createCipherGCM: vi.fn()...
}))
```

#### 2. Service Mocking Pattern
```typescript
// Mock PharmacistRBACManager for permission testing
const mockRBACManager = {
  canReceivePrescription: vi.fn(() => true),
  canFillPrescription: vi.fn(() => true),
  canUpdateInventory: vi.fn(() => true),
  // ... other permission methods
}

// Mock PharmacistOperationsService
const mockOpsService = {
  receivePrescription: vi.fn(() => mockPrescription),
  fillPrescription: vi.fn(() => filledPrescription),
  verifyPrescription: vi.fn(() => verificationResult),
}
```

#### 3. Provider Wrapper Pattern (test-utils.tsx)
```typescript
// Custom render with all necessary providers
const AllTheProviders = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <TooltipProvider>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export const render = (ui, options) => 
  rtlRender(ui, { wrapper: AllTheProviders, ...options })
```

#### 4. React Hook Testing Pattern
```typescript
import { renderHook, act } from '@testing-library/react'

// Example for usePharmacistPrescriptions
const { result } = renderHook(
  () => usePharmacistPrescriptions(mockRBACManager, 'pharmacist-1'),
  { wrapper: AllTheProviders }
)

// Act on hook
act(() => {
  result.current.receivePrescription(prescriptionData)
})

// Assert hook state
expect(result.current.prescriptions).toHaveLength(1)
expect(result.current.loading).toBe(false)
```

### Assertion Patterns

**State Management Assertions**:
```typescript
expect(state.prescriptions).toEqual([...])
expect(state.loading).toBe(false)
expect(state.error).toBeNull()
```

**Permission-based Assertions**:
```typescript
expect(() => operationsService.fillPrescription('rx-1'))
  .rejects.toThrow('Insufficient permissions to fill prescription')
```

**Audit Logging Assertions**:
```typescript
expect(logAudit).toHaveBeenCalledWith({
  hospital_id: 'hospital-1',
  user_id: 'pharmacist-1',
  action_type: 'fill_prescription',
  entity_type: 'prescription',
  entity_id: 'rx-123'
})
```

**Data Validation Assertions**:
```typescript
const result = clinicalValidation.verifyDosage('Amoxicillin', '500mg', 4)
expect(result.isAppropriate).toBe(true)
expect(result.issues).toEqual([])
```

### Setup/Teardown Patterns

**beforeEach Pattern**:
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  // Reset state
  queryClient.clear()
})

afterEach(() => {
  // Cleanup
  vi.resetAllMocks()
})
```

---

## 4. Key Pharmacy Business Logic Areas

### 1. Prescription Management Workflow
**Status**: High-priority for testing

**Operations**:
- Receive prescription from doctor (create prescription record)
- Verify prescription (checksystems for interactions, allergies, dosage, formulary compliance)
- Fill prescription (reserve inventory, generate dispensing record)
- Reject prescription (with rejection reason codes)
- Cancel prescription
- Process refill requests

**Business Rules to Test**:
- Prescription expiry validation (24-72 hours from creation)
- Duplicate therapy detection (patient shouldn't have 2 of same drug class)
- Prescription status transitions (valid state machine)
- Refill counting and limits (max refills constraint)
- Controlled substance flagging

**Edge Cases**:
- Expired prescriptions (should reject)
- Invalid dosage for patient age (pediatric dosing rules)
- Missing patient ID or medication ID
- Refills exhausted
- Medication on formulary exclusion list

### 2. Clinical Decision Support System
**Status**: Critical - prevents medication errors

**Three Core Checks**:

**A. Drug-Drug Interaction Checking**
- Severity levels: CRITICAL, MAJOR, MODERATE, MINOR, NONE
- Check against patient's current medications
- Evidence levels: A (strongest) to D (weakest)
- Management recommendations (e.g., "avoid combination", "adjust dose", "monitor")

**Business Rules**:
- Contraindicated (severity=CRITICAL) → MUST reject or override with pharmacist approval
- Major (severity=MAJOR) → warn and require acknowledgment
- Moderate/Minor → informational warnings

**Test Scenarios**:
- Stat interaction (e.g., duplicative beta-blockers)
- Serious drug combo (e.g., NSAIDs + ACE inhibitors + diuretics)
- No interactions found (clean medications list)

**B. Allergy Verification**
- Patient drug allergies vs. new prescription
- Cross-reaction detection (e.g., PCN allergy → cephalosporin caution)
- Severity levels: CRITICAL, MAJOR, MODERATE, MINOR, NONE

**Business Rules**:
- CRITICAL allergy → automatically reject prescription
- MAJOR allergy → warn pharmacist
- Ingredient-level matching (not just brand names)

**C. Dosage Verification**
- Age-based dosing tables (pediatric/geriatric)
- Weight-based adjustments (kg calculations)
- Renal function adjustments (GFR cutoffs)
- Hepatic function adjustments
- Special populations (pregnancy, lactation)

**Business Rules**:
- Pediatric dosing: Must use mg/kg calculations with max dose caps
- Renal impairment: Reduce dose if GFR < 30 mL/min
- Elderly: Often require dose reduction
- No dose outside 50%-200% of standard range without override

### 3. Inventory Management
**Status**: High-priority for test coverage

**Operations**:
- Track inventory by batch (medication_id + batch_number = unique)
- Monitor quantity_on_hand vs. quantity_reserved
- Track expiration dates (flag items expiring <30 days)
- Generate reorder requests (when quantity falls below reorder_level)
- Process inventory movements (dispensing reduces on_hand)

**Business Rules**:
- Quantity cannot go negative
- Cannot dispense more than available (on_hand - reserved)
- Reorder quantity = reorder_quantity defined in master data
- Expired items automatically flagged (status = 'expired')
- Alert thresholds: Low stock (<10), Critical (<5), Expiring soon (<30 days)

**Edge Cases**:
- Batch number conflicts
- Partial quantity dispensing
- Multiple concurrent reservations
- Expired items still in stock
- Unit cost/selling price changes

### 4. Dispensing Workflow
**Status**: High-priority - patient safety critical

**Operations**:
- Create dispensing record from filled prescription
- Generate pharmacy label (medication name, dosage, instructions, warnings)
- Perform quality check (verify label, medication, quantity)
- Provide patient counseling documentation
- Mark as verified/completed

**Business Rules**:
- Cannot dispense without verified prescription
- Label must include: medication, dosage, quantity, route, frequency, warnings, pharmacy name, pharmacist signature
- Counseling required for new medications
- Quality checklist must pass before dispensing
- DEA-controlled substances require special documentation

**Edge Cases**:
- Label generation failures
- Partial dispensing (partial fulfillment)
- Quality check failures (reprint label)
- Patient refusal/rescheduling
- Medication substitution (generic for brand)

### 5. Multi-Database Synchronization
**Status**: Medium-priority for integration testing

**Sync Operations**:
- Full sync (all prescriptions, medications, inventory, orders)
- Incremental sync (only changes since last sync)
- Specific entity sync (by ID list)
- Conflict detection (main DB vs. pharmacy microservice DB)
- Conflict resolution (main-wins, micro-wins, manual merge)

**Business Rules**:
- Timestamp comparison (updated_at field)
- Hospital scoping (hospital_id in all records)
- Status hierarchy (some statuses trump others in conflicts)
- Audit trail of all sync events

---

## 5. Recommended Test Structure for Pharmacy Domain Logic

### Directory Organization
```
src/
├── test/
│   ├── setup.ts                          # Global test config
│   ├── test-utils.tsx                    # Custom render, providers
│   ├── mocks/
│   │   ├── pharmacy/
│   │   │   ├── prescription.ts           # Prescription fixtures
│   │   │   ├── inventory.ts              # Inventory fixtures
│   │   │   ├── operations.ts             # Mock PharmacistOperationsService
│   │   │   └── rbac.ts                   # Mock RBAC Manager
│   │   └── clinical/
│   │       ├── interactions.ts           # Drug interaction database
│   │       ├── allergies.ts              # Allergy data
│   │       └── dosing.ts                 # Dosing tables
│   │
│   ├── unit/
│   │   ├── services/
│   │   │   ├── pharmacistOperationsService.test.ts
│   │   │   │   ├── Prescription Management Suite
│   │   │   │   ├── Clinical Decision Support Suite
│   │   │   │   ├── Inventory Management Suite
│   │   │   │   ├── Dispensing Operations Suite
│   │   │   │   └── Error Handling & Permissions Suite
│   │   │   ├── pharmacistRBACManager.test.ts
│   │   │   └── clinicalValidation.test.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── usePharmacistOperations.test.ts
│   │   │   ├── usePharmacistVerification.test.ts
│   │   │   ├── usePharmacistDispensing.test.ts
│   │   │   └── usePharmacistInventory.test.ts
│   │   │
│   │   └── utils/
│   │       ├── pharmacyValidators.test.ts
│   │       └── pharmacyCalculations.test.ts
│   │
│   ├── integration/
│   │   ├── pharmacy/
│   │   │   ├── prescription-lifecycle.test.tsx
│   │   │   ├── inventory-sync.test.ts
│   │   │   ├── clinical-decision-flow.test.tsx
│   │   │   ├── dispensing-completion.test.tsx
│   │   │   └── permission-checks.test.tsx
│   │   │
│   │   └── workflows/
│   │       ├── complete-prescription-flow.test.tsx
│   │       ├── pharmacy-to-patient.test.tsx
│   │       └── inventory-reorder-flow.test.tsx
│   │
│   └── e2e/ (Playwright)
│       ├── pharmacy-workflows.spec.ts
│       └── pharmacist-role.spec.ts
```

### Unit Test Template for Services

```typescript
// services/pharmacistOperationsService.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PharmacistOperationsService } from '@/utils/pharmacistOperationsService'
import { PharmacistRBACManager } from '@/utils/pharmacistRBACManager'
import { mockPrescription, mockInventory } from '@/test/mocks/pharmacy'
import { logAudit } from '@/utils/auditLogQueue'

vi.mock('@/utils/auditLogQueue')

describe('PharmacistOperationsService', () => {
  let service: PharmacistOperationsService
  let mockRBACManager: Partial<PharmacistRBACManager>
  const pharmacistId = 'pharm-123'
  const hospitalId = 'hosp-456'

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockRBACManager = {
      canReceivePrescription: vi.fn(() => true),
      canVerifyPrescription: vi.fn(() => true),
      canFillPrescription: vi.fn(() => true),
      // ... other permissions
    }

    service = new PharmacistOperationsService(
      mockRBACManager as PharmacistRBACManager,
      pharmacistId,
      hospitalId
    )
  })

  describe('Prescription Reception', () => {
    it('should receive valid prescription and create record', async () => {
      const rxData = {
        patientId: 'pat-1',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        quantity: 10,
      }

      const result = await service.receivePrescription(rxData)

      expect(result.status).toBe('received')
      expect(result.id).toBeDefined()
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'receive_prescription',
          user_id: pharmacistId,
        })
      )
    })

    it('should reject prescription if permission denied', async () => {
      ;(mockRBACManager.canReceivePrescription as any).mockReturnValue(false)

      await expect(
        service.receivePrescription({ patientId: 'pat-1' })
      ).rejects.toThrow('Insufficient permissions to receive prescription')
    })
  })

  describe('Prescription Verification', () => {
    it('should detect drug-drug interactions', async () => {
      const result = await service.verifyPrescription('rx-1', 'pat-1')

      expect(result.drugInteractionCheck).toBeDefined()
      expect(result.isValid).toBeDefined()
    })

    it('should detect critical allergies', async () => {
      const result = await service.verifyPrescription('rx-1', 'pat-1')

      expect(result.allergyCheck).toBeDefined()
      if (result.allergyCheck.hasAllergies) {
        expect(result.isValid).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle missing prescription data gracefully', async () => {
      await expect(
        service.receivePrescription({})
      ).rejects.toThrow()
    })

    it('should sanitize patient data before logging', async () => {
      // Ensure no PHI leaks in logs
      await service.receivePrescription(mockPrescription)
      
      expect(logAudit).toHaveBeenCalled()
      const auditCall = (logAudit as any).mock.calls[0][0]
      expect(auditCall).not.toContain('patientId') // PHI not in audit
    })
  })
})
```

### Hook Test Template

```typescript
// hooks/usePharmacistPrescriptions.test.ts

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePharmacistPrescriptions } from '@/hooks/usePharmacistOperations'
import { PharmacistRBACManager } from '@/utils/pharmacistRBACManager'
import { AllTheProviders } from '@/test/test-utils'

describe('usePharmacistPrescriptions', () => {
  it('should receive and manage prescriptions', async () => {
    const mockRBACManager = {} as PharmacistRBACManager
    
    const { result } = renderHook(
      () => usePharmacistPrescriptions(mockRBACManager, 'pharm-1'),
      { wrapper: AllTheProviders }
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.prescriptions).toEqual([])

    // Add prescription
    act(() => {
      result.current.receivePrescription({ 
        patientId: 'pat-1', 
        medicationName: 'Aspirin',
      })
    })

    await waitFor(() => {
      expect(result.current.prescriptions).toHaveLength(1)
    })
  })

  it('should handle async errors', async () => {
    // Test error state management
  })
})
```

### Test Fixtures/Mocks Structure

```typescript
// mocks/pharmacy/prescription.ts

export const mockPrescription = {
  id: 'rx-test-123',
  patientId: 'pat-test-456',
  patientName: 'John Doe',
  prescriberId: 'doc-test-789',
  prescriberName: 'Dr. Smith',
  medicationName: 'Amoxicillin',
  dosage: '500mg',
  quantity: 10,
  route: 'oral',
  frequency: 'every 8 hours',
  duration: '10 days',
  refillsRemaining: 0,
  prescriptionDate: new Date('2026-04-15'),
  expiryDate: new Date('2026-04-20'),
  status: 'received',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockPrescriptionVerification = {
  id: 'verify-123',
  prescriptionId: 'rx-123',
  isValid: true,
  issues: [],
  drugInteractionCheck: { hasInteractions: false, interactions: [] },
  allergyCheck: { hasAllergies: false, allergies: [] },
  dosageVerification: { isAppropriate: true, issues: [] },
}

export const mockInvalidPrescription = {
  ...mockPrescription,
  expiryDate: new Date('2026-04-01'), // Already expired
}
```

### Test Categories & Checklist

**Unit Tests (PharmacistOperationsService)**
- [ ] Prescription receive/reject with state validation
- [ ] Drug-drug interaction detection (5+ combination scenarios)
- [ ] Allergy checking with cross-reaction logic
- [ ] Dosage verification for pediatric/geriatric patients
- [ ] Inventory operations (view, update, reorder)
- [ ] Dispensing workflow (process, verify, label)
- [ ] Permission checks (positive & negative)
- [ ] Audit logging integration
- [ ] Error handling (null values, invalid IDs, concurrency)
- [ ] Boundary conditions (negative quantities, extreme ages)

**Hook Tests (React Hooks)**
- [ ] State management (loading, error, data)
- [ ] Async operations (receive, fill, reject)
- [ ] Permission handling
- [ ] Error state recovery
- [ ] Cleanup on unmount

**Integration Tests (Multi-layer flows)**
- [ ] Complete prescription lifecycle (receive → verify → fill → dispense)
- [ ] Inventory sync and conflict resolution
- [ ] Clinical decision flow with user interaction
- [ ] Permission-based UI rendering
- [ ] Audit trail for sensitive operations
- [ ] Hospital-scoped data isolation

**Edge Cases & Error Scenarios**
- [ ] Expired prescriptions
- [ ] Controlled substance handling
- [ ] Duplicate therapy detection
- [ ] Concurrent dispensing
- [ ] Network/sync failures
- [ ] PHI sanitization in logs

---

## Summary & Next Steps

### Test Coverage Vision
```
Phase 1 (Unit): PharmacistOperationsService (20 test suites, ~200 tests)
Phase 2 (Unit): Hooks & Components (~50 tests)
Phase 3 (Integration): Workflows & Sync (10 test scenarios, ~100 tests)
Phase 4 (E2E): Playwright full flow validation
```

### Critical Paths to Test First
1. **Prescription verification** (clinical safety - CRITICAL)
2. **Drug interaction checking** (regulatory requirement)
3. **Inventory management** (prevents stock-outs)
4. **Dispensing operations** (patient safety)
5. **Permission checks** (security)

### Mocking Strategy
- **RBAC**: Always mock `PharmacistRBACManager` for permission testing
- **Services**: Mock external services; test core `PharmacistOperationsService` deeply
- **Audit Logging**: Mock `logAudit()` to verify clinical actions are tracked
- **Fixtures**: Use centralized mocks in `/test/mocks/pharmacy/` directory

### Key Testing Patterns
- Use `vi.clearAllMocks()` between tests to prevent state leakage
- Test both permission-allowed AND permission-denied paths
- Verify audit logs for sensitive operations
- Use `waitFor()` for async state assertions
- Sanitize/validate no PHI appears in logs or error messages
