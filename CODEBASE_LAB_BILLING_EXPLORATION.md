# CareSync HIMS — Lab & Billing Operations Codebase Exploration
**Date:** April 15, 2026  
**Purpose:** Map service files, type definitions, business logic, and testing patterns for lab and billing domains

---

## TABLE OF CONTENTS
1. [Lab Operations](#lab-operations)
2. [Billing Operations](#billing-operations)
3. [Existing Tests](#existing-tests)
4. [React Components](#react-components)
5. [Testing Patterns & Recommendations](#testing-patterns--recommendations)

---

## LAB OPERATIONS

### 1. Service/Hook File Locations

#### Frontend Lab Domain
| Component | Location | Purpose |
|-----------|----------|---------|
| **Lab Hooks (Modern)** | `src/hooks/useLabOrders.ts` | React Query-based lab order CRUD, stats, real-time subscriptions |
| **Lab Operations Service** | `src/utils/labTechOperationsService.ts` | Core service class for specimen/test/result operations |
| **Lab Tech RBAC Manager** | `src/utils/labTechRBACManager.ts` | Role-based permission validation for lab tech actions |
| **Lab Critical Alerts Hook** | `src/hooks/useLabCriticalAlerts.ts` | Critical value alert subscriptions and acknowledgment |
| **Lab Tech Operations Hook** | `src/hooks/useLabTechOperations.ts` | Hook wrapper around LabTechOperationsService |
| **Lab Priority Utils** | `src/utils/labPriority.ts` | Priority calculation and routing logic |
| **Legacy Lab Hook (DEPRECATED)** | `src/hooks/useLaboratory.ts` | Old state-based hook; prefer useLabOrders for new code |

#### Backend/Microservice Lab Domain
| Component | Location | Purpose |
|-----------|----------|---------|
| **Lab Types (Backend)** | `services/laboratory-service/src/types/laboratory.ts` | Zod schemas for orders, results, specimens, critical values |
| **Lab Sync Service** | `services/laboratory-service/src/sync/LaboratorySyncService.ts` | Kafka event synchronization for lab events |
| **Kafka Event Listener** | `services/laboratory-service/src/sync/KafkaEventListener.ts` | Critical value notifications, CLIA compliance checks |

#### Database Schema
| Table | Location | Key Fields |
|-------|----------|-----------|
| `lab_orders` | `supabase/migrations/20260204000005_laboratory.sql` | id, patient_id, doctor_id, test_name, priority, status |
| `specimens` | Same migration | specimen_id, lab_order_id, collection_time, quality_assessment |
| `lab_results` | Same migration | lab_result_id, loinc_code, result_value, critical_flag |
| `critical_results` | Same migration | id, patient_id, severity, acknowledged_at |
| `critical_value_alerts` | Same migration | lab_result_id, notification_level, read_back_verified |

---

### 2. Type Definitions

#### Lab Result Types (`src/types/laboratory.ts`)
```typescript
interface LOINCCode {
  code: string;
  component: string;
  property?: string;
  critical_values?: { low?: string; high?: string; panic_low?: string; panic_high?: string };
  reference_range?: { male?: string; female?: string; pediatric?: string };
  units?: string;
  specimen_type?: string;
}

interface LabResult {
  id: string;
  lab_order_id: string;
  loinc_code?: string;
  result_value: string;
  result_numeric?: number;
  abnormal_flag?: 'H' | 'L' | 'HH' | 'LL' | 'A' | null;
  critical_flag: boolean;
  result_status: 'preliminary' | 'final' | 'corrected' | 'cancelled';
  verified_at?: string;
  performed_at: string;
}

interface EnhancedLabOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'collected' | 'processing' | 'completed' | 'cancelled';
  loinc_details?: LOINCCode;
  results?: LabResult[];
  critical_notifications?: CriticalValueNotification[];
}

interface CriticalValueNotification {
  id: string;
  lab_result_id: string;
  patient_id: string;
  critical_value: string;
  notification_level: 1 | 2 | 3; // 1=routine, 2=urgent, 3=critical
  notified_at: string;
  acknowledged_at?: string;
  read_back_verified: boolean;
  escalation_level: number;
}

interface SpecimenTracking {
  specimen_id: string;
  lab_order_id: string;
  collection_time: string;
  collected_by: string;
  specimen_type: string;
  quality_assessment: {
    adequate_volume: boolean;
    proper_labeling: boolean;
    integrity_maintained: boolean;
    temperature_controlled: boolean;
    rejection_reason?: string;
  };
  chain_of_custody: Array<{
    timestamp: string;
    handler: string;
    action: string;
    location: string;
  }>;
}
```

#### Lab Tech Types (`src/types/labtech.ts`)
```typescript
enum LabTechPermission {
  SPECIMEN_RECEIVE, SPECIMEN_PROCESS, SPECIMEN_REJECT,
  TEST_PERFORM, TEST_VERIFY, RESULT_REVIEW, RESULT_APPROVE,
  QC_PERFORM, QC_REVIEW, MAINTENANCE_LOG,
  ANALYZER_OPERATE, ANALYZER_CALIBRATE,
  METRICS_VIEW,
  RESULT_COMMUNICATE
}

interface Specimen {
  id: string;
  patientId: string;
  orderId: string;
  specimenType: string;
  collectionTime: Date;
  status: 'received' | 'processing' | 'tested' | 'reviewed' | 'approved' | 'rejected';
  rejectionReason?: string;
  receivedBy: string;
  processedBy?: string;
}

interface TestResult {
  id: string;
  testId: string;
  specimenId: string;
  testName: string;
  resultValue: string;
  resultUnit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  performedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}

interface CriticalResult {
  id: string;
  testId: string;
  specimenId: string;
  patientId: string;
  testName: string;
  resultValue: string;
  severity: 'critical' | 'panic';
  detectedAt: Date;
  acknowledged: boolean;
  notificationTime?: Date;
}

interface LabAlert {
  id: string;
  type: 'critical_result' | 'quality_failure' | 'analyzer_error' | 'specimen_issue' | 'maintenance_due';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface LabMetrics {
  testsProcessed: number;
  averageProcessingTime: number;
  qualityScore: number;
  errorRate: number;
  criticalResults: number;
  turnaroundTime: number;
  analyzerUptime: number;
  qcCompliance: number;
  specimenRejectionRate: number;
}
```

---

### 3. Key Business Logic

#### Lab Order Workflow
**File:** `src/hooks/useLabOrders.ts`

```
1. Doctor creates lab order (priority: routine/urgent/stat)
   → useCreateLabOrder mutation
   → Validates patient exists, doctor authorized
   → Creates lab_orders record with status='ordered'

2. Lab Tech receives order notification
   → useLabOrders query filters by hospital_id, status='ordered'
   → Lab tech collects specimen
   → Updates specimen_id, status='collected', collecion_time

3. Lab equipment processes specimen
   → Status transitions: collected → processing → completed
   → Results entered with abnormal_flag and critical_flag

4. Critical Value Detection Logic
   → If critical_flag=true OR result_value outside panic_range:
     - Create critical_results record with severity
     - Create CriticalValueNotification
     - Publish Kafka event for immediate alert
     - Notify doctor via in-app + SMS/phone

5. Doctor reviews & approves
   → Doctor acknowledges critical alert
   → Patient notified via portal
```

#### Specimen Chain of Custody
**File:** `src/types/laboratory.ts` → `SpecimenTracking`

- Track every handler/location change
- Requires documented `chain_of_custody` array
- Validated against collection standards (volume, labeling, integrity, temperature)
- Rejection reason must be logged if rejected

#### Critical Value Alert Flow
**File:** `services/laboratory-service/src/sync/KafkaEventListener.ts`

```typescript
// CLIA Compliance: Critical value alert within 5 minutes
1. Lab system detects critical value
   → forwardCriticalValueAlert(alert)
   → Send to doctor: immediate notification
   → publishCriticalValueNotification(notification)
   → escalation_level: 1 (immediate) → 2 (if not ack'd in 5min) → 3 (manager)

2. Doctor must acknowledge within SLO window
   → Audit trail: who ack'd, when, via which channel
   → Read-back verification: physician confirms understanding
```

#### Quality Control & Validation
**File:** `src/utils/labTechOperationsService.ts`

```typescript
// Specimen Validation Checks
- collectionStandards: boolean (collected per protocol)
- transportConditions: boolean (proper temperature, time)
- labelingAccuracy: boolean (matches order, legible)
- testRequirements: boolean (sufficient volume, correct tube)

// Result Verification
- QC runs must pass before releasing results
- Analyzer calibration status must be within SLO
- Delta checking: compare to previous patient results
```

---

### 4. Critical Paths to Test

| Path | Start | End | Dependencies | Critical? |
|------|-------|-----|--------------|-----------|
| **Lab Order Creation** | Doctor submits order | Order appears in lab queue | useLabOrders, permissions | **YES** |
| **Specimen Receipt & Validation** | Lab tech scans specimen | System marks collected with quality check | Specimen validation logic | **YES** |
| **Critical Value Alert** | Lab system detects critical result | Doctor receives notification & acknowledges | Kafka event pub/sub, SLO timer | **YES (CLIA)** |
| **Result Entry & Delta Checking** | Lab tech enters result value | System compares to historical, flags outliers | LOINC reference ranges | **YES** |
| **Specimen Rejection** | Lab tech rejects specimen (hemolyzed, etc.) | Doctor notified to recollect | Rejection reason validation | **YES** |
| **Priority Dispatch** | STAT order created | Lab tech sees in priority queue | Lab priority sorting | YES |
| **Analyzer Maintenance** | Maintenance scheduled | System blocks tests until complete | Analyzer status tracking | YES |
| **Chain of Custody** | Specimen created | Specimen archived | Handler tracking, audit trail | **YES (forensic)** |

---

## BILLING OPERATIONS

### 1. Service/Hook File Locations

#### Frontend Billing Domain
| Component | Location | Purpose |
|-----------|----------|---------|
| **Billing Hooks (React Query)** | `src/hooks/useBilling.ts` | Invoice CRUD, payment recording, real-time updates |
| **Billing Validation Hook** | `src/hooks/useBillingValidation.ts` | Form validation wrapper, calculation enforcement |
| **Billing Validator Utility** | `src/utils/billingValidator.ts` | Core logic: discount→tax→rounding, copay, insurance rules |
| **Insurance Claims Hook** | `src/hooks/useInsuranceClaims.ts` | Claim submission, status tracking, approval workflow |
| **Insurance Integration Service** | `src/services/insuranceIntegration.ts` | Eligibility verification, scheme definitions (CGHS, TPA, private) |
| **Payment Plans Hook** | `src/hooks/usePaymentPlans.ts` | Payment plan management for deferred payments |
| **Discharge Billing Queue** | `src/components/discharge/BillingDischargeQueue.ts` | Discharge workflow billing final step |

#### Backend/Supabase
| Component | Location | Purpose |
|-----------|----------|---------|
| **Insurance Integration Edge Fn** | `supabase/functions/insurance-integration/index.ts` | Call insurance provider APIs, verify eligibility |

#### Database Schema
| Table | Location | Key Fields |
|-------|----------|-----------|
| `invoices` | `supabase/migrations/202602*.sql` | id, hospital_id, patient_id, subtotal, tax, discount, total, status |
| `invoice_items` | Same migration | id, invoice_id, description, quantity, unit_price, item_type |
| `payments` | Same migration | id, invoice_id, amount, payment_method, payment_date |
| `insurance_claims` | Same migration | id, patient_id, invoice_id, claim_number, status, approval_status |
| `insurance_schemes` | Same migration | scheme_name (CGHS, ESIC, Ayushman Bharat), coverage_percent, copay |

---

### 2. Type Definitions

#### Billing Core Types (`src/utils/billingValidator.ts`)
```typescript
type ChargeType = 'service' | 'procedure' | 'medication' | 'diagnostic' | 'admission' | 'adjustment';
type InsuranceType = 'government' | 'private' | 'tpa' | 'self_pay' | 'mixed';
type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'cancelled';

interface ChargeLineItem {
  id: string;
  chargeType: ChargeType;
  description: string;
  rate: number; // Per unit tariff
  quantity: number;
  amount: number; // rate * quantity (NEVER user-input)
  taxable: boolean;
  createdAt: Date;
  createdBy: UUID;
}

interface BillingAdjustment {
  id: string;
  type: 'discount' | 'waiver' | 'reversal' | 'refund';
  reason: string;
  amount: number; // Always positive; applied as negative
  appliedTo: string; // Original charge line ID
  authorizedBy: UUID;
  createdAt: Date;
}

interface BillingInvoice {
  id: string;
  hospitalId: UUID;
  patientId: UUID;
  encounterId: UUID;
  chargeLines: ChargeLineItem[]; // Immutable once created
  adjustments: BillingAdjustment[]; // Append-only
  insurance: {
    type: InsuranceType;
    copay?: number;
    coveragePercent?: number; // 0-100
    preAuthNumber?: string;
  };
  calculatedAt: Date;
  invoicedAt?: Date;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
}
```

#### Invoice Hook Types (`src/hooks/useBilling.ts`)
```typescript
interface Invoice {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id?: string | null;
  appointment_id?: string | null;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  notes?: string | null;
  due_date?: string | null;
  patient?: { id: string; first_name: string; last_name: string; mrn: string };
  items?: InvoiceItem[];
  payments?: Payment[];
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: string;
  created_at: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string | null;
  payment_date?: string;
}
```

#### Insurance Claims Types (`src/hooks/useInsuranceClaims.ts`)
```typescript
interface InsuranceClaim {
  id: string;
  hospital_id: string;
  patient_id: string;
  invoice_id: string | null;
  claim_number: string;
  insurance_provider: string;
  policy_number: string | null;
  diagnosis_codes: string[] | null;
  procedure_codes: string[] | null;
  claim_amount: number;
  approved_amount: number | null;
  paid_amount: number | null;
  patient_responsibility: number | null;
  status: string; // 'submitted' | 'approved' | 'denied' | 'paid'
  submitted_at: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  denial_reason: string | null;
}
```

#### Insurance Scheme Types (`src/services/insuranceIntegration.ts`)
```typescript
type IndianInsuranceSchemeId = 'cghs' | 'esic' | 'ayushman_bharat' | 'private' | 'tpa';

interface InsuranceSchemeDefinition {
  id: IndianInsuranceSchemeId;
  name: string;
  coveragePercentage: number;
  maxCoverageAmount?: number;
  copayAmount: number;
  deductibleAmount: number;
  requiresPreAuth: boolean;
  eligibilityNotes: string[];
}

interface EligibilityResponse {
  eligible: boolean;
  coverage: number;
  copay: number;
  deductible: number;
  deductibleMet: number;
  message: string;
  scheme?: InsuranceSchemeDefinition | null;
  requiresPreAuth?: boolean;
}
```

---

### 3. Key Business Logic

#### Calculation Order (CRITICAL)
**File:** `src/utils/billingValidator.ts` → `calculateInvoiceTotal()`

```typescript
// MUST follow this order to prevent revenue loss:
1. Sum all charge_lines.amount
   subtotal = Σ(charges)

2. For each adjustment (discount, waiver):
   subtotal -= adjustment.amount
   (adjustments are append-only, immutable)

3. Calculate tax ONLY on adjusted amount:
   taxableAmount = subtotal
   tax = taxableAmount * TAX_RATE (GST in India)

4. Final rounding (UP for hospital safety):
   total = ROUNDUP(subtotal + tax, 2 rupees)

// NEVER: tax first, then discount
// (That would lose hospital revenue if discount calc'd wrong)
```

#### Co-pay Calculation by Insurance Type
**File:** `src/utils/billingValidator.ts` → `calculateCopay()`

```typescript
switch (insurance.type) {
  case 'government': // CGHS, ESIC
    return 0; // Govt bears cost
  
  case 'tpa': // Third-party admin
    return insurance.copay || 0; // Fixed copay per policy
  
  case 'private': // Private insurer
    if (insurance.coveragePercent !== undefined) {
      // Patient pays uncovered %
      return invoiceTotal * ((100 - insurance.coveragePercent) / 100);
    }
    return invoiceTotal; // Full patient liability if no coverage
  
  case 'self_pay':
    return invoiceTotal; // Patient pays all
  
  case 'mixed': // Multiple insurers
    return insurance.copay || invoiceTotal * 0.2; // Default 20%
}
```

#### Invoice Lifecycle
**File:** `src/pages/billing/BillingPage.tsx`

```
1. Receptionist creates invoice
   → Invoice status='draft'
   → Selects patient, encounter, service items
   → useBillingValidation validates charges
   → Applies insurance copay rules

2. Charges added to invoice
   → Each charge_line immutable once created
   → Adjustments tracked separately (append-only)
   → Duplicate billing detection triggered

3. Discount/adjustment applied
   → applyAdjustmentToInvoice() creates new adjustment record
   → Original charges unchanged
   → Audit trail: who authorized discount, amount, reason

4. Invoice finalized
   → Status='finalized'
   → Calculations locked
   → Discharge workflow can proceed

5. Payment recorded
   → useRecordPayment tracks payment_date, method, amount
   → If paid_amount >= total: status='paid'
   → If partial: status='partial'
   → Audit trail: payment proof attached
```

#### Insurance Claim Submission
**File:** `src/hooks/useInsuranceClaims.ts`

```
1. Claim created from finalized invoice
   → Collects diagnosis codes (ICD-10), procedure codes (CPT)
   → Insurance provider, policy number, claim amount

2. Pre-authorization (if required)
   → Uses insurance-integration edge function
   → Validates patient eligibility
   → Checks coverage limits, deductible status
   → Returns preAuthNumber if approved

3. Claim submitted
   → Sends to insurance provider (Ayushman Bharat, TPA, etc.)
   → Tracks submission_date, claim_number, status
   → Insurance provider returns status updates

4. Claim decision
   → Status: 'approved' → approved_amount set
   → Status: 'denied' → denial_reason captured
   → Status: 'partial' → approved_amount < claim_amount
   → Triggers patient billing update

5. Payment from insurance
   → Insurance pays hospital
   → Patient responsible for: (claim_amount - approved_amount) + copay
   → Generates patient statement / balance due
```

#### Revenue Leakage Prevention
**File:** `src/utils/billingValidator.ts` → `auditInvoiceForLeakage()`

```typescript
// Flags:
1. Zero-amount charges without written-off reason
2. Negative amounts without reversal paper trail
3. Duplicate charges (same charge type, amount within 1 hour)
4. Tax applied before discount (calculation order violation)
5. Missing co-pay for insured patients
6. Discount > reasonable % (e.g., >50% without manager approval)
7. Unauthorized user applied adjustment
8. Invoice status changed without proper gate (e.g., draft→paid skipping finalized)
```

---

### 4. Critical Paths to Test

| Path | Start | End | Risk Level | Dependencies |
|------|-------|-----|-----------|--------------|
| **Invoice Creation** | Receptionist opens billing page | Invoice drafted with charges | HIGH | useBilling, usePatients |
| **Calculation Order** | Charges added + discount applied | Total = (charges - discount) + tax | **CRITICAL** | billingValidator.calculateInvoiceTotal |
| **Co-pay Enforcement** | Insurance copay rule selected | Patient copay calculated correctly | **CRITICAL** | calculateCopay, insurance type |
| **Duplicate Detection** | Charge line created | System flags if duplicate within 1hr | HIGH | detectDuplicateCharge |
| **Adjustment Audit Trail** | Discount authorized | Adjustment record: reason, auth'd by, amount | HIGH | applyAdjustmentToInvoice, audit log |
| **Insurance Eligibility** | Patient insurance selected | Coverage %, copay, deductible returned | **CRITICAL** | insuranceIntegration, edge function |
| **Claim Submission** | Invoice finalized | Claim submitted to insurance provider | HIGH | useInsuranceClaims, Kafka async |
| **Negative Amount Guard** | Negative charge attempted | System rejects or requires reversal paper | **CRITICAL** | validateChargeLine |
| **Revenue Leakage Audit** | Invoice complete | auditInvoiceForLeakage returns all issues | HIGH | auditInvoiceForLeakage |
| **Tax Calculation** | Taxable charges finalized | Tax = taxable_amount * GST_RATE (India) | HIGH | calculateInvoiceTotal |

---

## EXISTING TESTS

### Lab Tests

#### E2E Tests (`tests/e2e/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `t92-lab-order-to-result.spec.ts` | Doctor orders → Lab tech enters result → Critical alert fires → Patient notified | ✅ Comprehensive |
| `t96-lab-critical-value-escalation.spec.ts` | Lab tech records critical result → Doctor acknowledges → Escalation workflow | ✅ Spec written |
| `t83-lab-order-flow.spec.ts` | Basic lab order creation and status transitions | ✅ Implemented |
| `t86-lab-insert-failure-recovery.spec.ts` | Specimen insertion failures + recovery logic | ⚠️ Partial |
| `laboratory.spec.ts` | Lab page rendering and basic navigation | ⚠️ Shallow |
| `labtech-workflow.spec.ts` | Lab tech UI interactions | ⚠️ Basic |

#### Integration Tests (`tests/integration/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `lab-workflow.test.ts` | Lab order → specimen → result flow | ⚠️ Mock-based |
| `lab-critical-alerts.test.ts` | Critical value alert generation + propagation | ⚠️ Incomplete |
| `lab-api.integration.test.ts` | API endpoints for lab orders, results | ✅ Good |
| `labAutoDispatch.test.ts` | Automatic lab tech assignment (priority-based) | ⚠️ Needs work |
| `CreateLabOrderModal.integration.test.tsx` | Component-level order creation | ✅ Solid |

#### Unit Tests (`tests/unit/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `useLaboratory.test.tsx` | LOINC search, lab results hook | ✅ Functional |
| `labStatusNormalization.test.ts` | Status enum normalization | ✅ Complete |

#### Form Validation Tests
| Test File | Coverage | Status |
|-----------|----------|--------|
| `labOrderFormValidation.test.ts` | Lab order form field validation | ⚠️ Basic |

---

### Billing Tests

#### E2E Tests (`tests/e2e/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `t94-billing-approval.spec.ts` | Invoice creation → Approval → Payment | ✅ Spec written |
| `billing.spec.ts` | Receptionist creates invoice, records payment | ⚠️ Basic |
| `billing-flow.spec.ts` | End-to-end billing lifecycle | ⚠️ Partial |

#### Integration Tests (`tests/integration/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `billing-lifecycle.test.ts` | Invoice create → charge lines → tax → payment | ⚠️ Mock-based |

#### Unit Tests & Hook Tests (`src/test/hooks/`)
| Test File | Coverage | Status |
|-----------|----------|--------|
| `useBilling.test.tsx` | useInvoices, useInvoiceStats, useRecordPayment hooks | ✅ Good foundation |
| `useBillingValidation.test.tsx` | Validator utility: calculation, copay, adjustments | ⚠️ Needs expansion |

---

### Test Framework & Infrastructure

**Framework:** Vitest + Playwright  
**Test Environment:** jsdom (unit), real browser (e2e)  
**React Testing Library:** Testing Library for component tests  
**Mocks:** Supabase mock client, Auth context mocks, fixtures

**Test Command Patterns:**
```bash
npm run test:unit           # Vitest unit tests
npm run test:integration    # Vitest integration tests
npm run test:e2e            # Playwright e2e tests (all projects)
npm run test:e2e:roles      # Playwright e2e tests (specific roles)
npm run test:e2e:full       # Playwright e2e tests (full suite)
npm run test:security       # Security-focused tests
npm run test:accessibility  # a11y tests (ARIA labels)
```

---

## REACT COMPONENTS

### Lab Components (`src/components/laboratory/` & `src/components/lab/`)

#### Form Components
| Component | Location | Purpose | Test Priority |
|-----------|----------|---------|---|
| `EnhancedLabOrderForm` | `src/components/laboratory/EnhancedLabOrderForm.tsx` | Doctor creates lab order (test selection, priority, clinical notes) | **HIGH** |
| `LabResultEntryModal` | `src/components/laboratory/LabResultEntryModal.tsx` | Lab tech enters result value, flags critical | **HIGH** |
| `SampleCollectionModal` | `src/components/laboratory/SampleCollectionModal.tsx` | Log specimen collection (type, volume, collector) | **HIGH** |
| `BarcodeSampleScanner` | `src/components/lab/BarcodeSampleScanner.tsx` | Scan specimen barcode for chain-of-custody | HIGH |

#### Display Components
| Component | Location | Purpose | Test Priority |
|-----------|----------|---------|---|
| `LabResultsViewer` | `src/components/doctor/LabResultsViewer.tsx` | Doctor views lab results with critical value highlights | **HIGH** |
| `CriticalResultNotification` | `src/components/laboratory/CriticalResultNotification.tsx` | Alert banner for critical values (CLIA-compliant) | **HIGH** |
| `CriticalValueAlert` | `src/components/lab/CriticalValueAlert.tsx` | Lab tech sees critical result alert | HIGH |
| `SampleTracking` | `src/components/lab/SampleTracking.tsx` | Display specimen chain-of-custody | HIGH |
| `LabTrendVisualization` | `src/components/laboratory/LabTrendVisualization.tsx` | Chart trending values over time | MEDIUM |
| `QCDashboard` | `src/components/lab/QCDashboard.tsx` | Quality control metrics and analyzer status | MEDIUM |
| `EquipmentManagement` | `src/components/lab/EquipmentManagement.tsx` | Analyzer maintenance scheduling | MEDIUM |

#### Queue Components
| Component | Location | Purpose | Test Priority |
|-----------|----------|---------|---|
| `EnhancedLabOrderQueue` | `src/components/lab/EnhancedLabOrderQueue.tsx` | Lab tech views pending orders sorted by priority | **HIGH** |
| `LabAutomationPanel` | `src/components/laboratory/LabAutomationPanel.tsx` | Auto-dispatch configuration panel | MEDIUM |

#### Pages
| Page | Location | Purpose | Test Priority |
|------|----------|---------|---|
| `LaboratoryPage` | `src/pages/laboratory/LaboratoryPage.tsx` | Main lab UI: order list, result entry, status filtering | **HIGH** |
| `LabAutomationPage` | `src/pages/lab/LabAutomationPage.tsx` | Lab automation dashboard: urgent samples, overdue, pending critical | HIGH |

---

### Billing Components (`src/components/billing/` & `src/components/patient/`)

#### Form Components
| Component | Location | Purpose | Test Priority |
|-----------|----------|---------|---|
| `CreateInvoiceModal` | `src/components/billing/CreateInvoiceModal.tsx` | Receptionist creates invoice (select patient, service items) | **HIGH** |
| `BillingDischargeQueue` | `src/components/discharge/BillingDischargeQueue.tsx` | Finalize invoice before patient discharge | HIGH |
| `InsurancePanel` | `src/components/receptionist/InsurancePanel.tsx` | Verify insurance, check copay, pre-auth | **HIGH** |
| `InsuranceVerificationCard` | `src/components/receptionist/InsuranceVerificationCard.tsx` | Display verification results (coverage %, copay) | HIGH |

#### Display Components
| Component | Location | Purpose | Test Priority |
|-----------|----------|---------|---|
| `PatientBilling` | `src/components/patient/PatientBilling.tsx` | Patient views invoices, payment history, claims | HIGH |
| `PatientBillingAccess` | `src/components/patient/PatientBillingAccess.tsx` | Patient billing preferences, payment methods | MEDIUM |
| `EnhancedBillingQueue` | `src/components/billing/EnhancedBillingQueue.tsx` | Billing staff review pending invoices | HIGH |

#### Pages
| Page | Location | Purpose | Test Priority |
|------|----------|---------|---|
| `BillingPage` | `src/pages/billing/BillingPage.tsx` | Main billing UI: invoice list, create, payments, claims | **HIGH** |

---

## TESTING PATTERNS & RECOMMENDATIONS

### Current Test Patterns

#### 1. Mock Setup Pattern
```typescript
// File: src/test/mocks/supabase.ts
const mockSupabaseClient = {
  from: (table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    // ... more methods
  })
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient
}));
```

#### 2. Hook Testing Pattern (React Query)
```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useInvoices', () => {
  it('fetches invoices by hospital', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext());
    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

#### 3. Component Testing Pattern
```typescript
test('lab order form submits with valid data', async () => {
  const { getByRole, getByLabelText } = render(<EnhancedLabOrderForm onSubmit={vi.fn()} />);
  
  await userEvent.type(getByLabelText('Test Name'), 'Blood Culture');
  await userEvent.selectOptions(getByLabelText('Priority'), 'stat');
  await userEvent.click(getByRole('button', { name: /submit/i }));
  
  expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
    test_name: 'Blood Culture',
    priority: 'stat'
  }));
});
```

#### 4. E2E Test Pattern (Playwright)
```typescript
test('doctor orders lab, lab tech enters critical result', async ({ page }) => {
  // Doctor creates order
  await loginAs(page, 'doctor');
  await page.goto('/laboratory');
  await page.click('[data-testid="new-lab-order"]');
  await page.fill('[data-testid="test-name"]', 'Potassium');
  await page.click('[data-testid="submit"]');
  
  // Lab tech marks critical
  await loginAs(page, 'lab_technician');
  await page.goto('/laboratory');
  await page.click('[data-testid="mark-critical"]');
  
  // Verify doctor notified
  await loginAs(page, 'doctor');
  await expect(page.locator('[data-testid="critical-alert"]')).toBeVisible();
});
```

---

### Gaps & Recommendations

#### Lab Testing Gaps
1. **NO TESTS FOR:** 
   - Specimen rejection workflow (capture reason, create new order)
   - Delta checking logic (compare to historical results)
   - Analyzer maintenance impact on test processing
   - Chain-of-custody audit trail validation
   - Priority auto-dispatch algorithm
   - CLIA SLO enforcement (5-minute critical alert)

2. **INCOMPLETE TESTS:**
   - Lab order cancellation + specimen handling
   - Multiple specimen types per order
   - LOINC code reference range validation
   - Lab tech permission checks (14 granular perms)
   - Quality control (QC result failures, impact on releases)

#### Billing Testing Gaps
1. **NO TESTS FOR:**
   - Calculation order enforcement (discount → tax → rounding)
   - Negative amount rejection
   - Duplicate billing detection
   - Revenue leakage audit
   - Insurance pre-authorization workflow
   - Refund + reversal edge cases
   - Discharge billing gate (finalization required)
   - Payment plan installment tracking
   - Co-pay validation for all insurance types (CGHS, TPA, Ayushman)

2. **INCOMPLETE TESTS:**
   - Tax calculation (GST India context)
   - Mixed insurance (multiple payers)
   - Claim denial + reversal
   - Insurance eligibility edge cases (deductible, max coverage)

---

### Recommended Test Plan

#### Priority 1: Critical Paths (MUST test)
Lab:
- [x] Lab order creation & visibility in queue
- [ ] Critical value alert within SLO (5 min)
- [ ] Specimen rejection + recollection trigger
- [ ] Chain-of-custody immutability

Billing:
- [ ] Calculation order: (charges - discount) + tax
- [ ] Negative amount rejection
- [ ] Copay enforcement by insurance type
- [ ] Duplicate charging detection

#### Priority 2: High Risk (SHOULD test)
Lab:
- [ ] Delta checking outlier detection
- [ ] Analyzer maintenance impact on processing
- [ ] Permission checks (14 roles)

Billing:
- [ ] Insurance eligibility verification
- [ ] Claim submission workflow
- [ ] Revenue leakage audit
- [ ] Discharge billing gate

#### Priority 3: Coverage (NICE to have)
Lab:
- [ ] Quality control result failures
- [ ] LOINC reference range validation

Billing:
- [ ] Payment plan installments
- [ ] Refund workflow
- [ ] Multiple insurance scenarios

---

## DATA STRUCTURES & RELATIONSHIPS

### Lab Workflow Data Model
```
lab_orders (1)
  ├── patient_id → patients
  ├── doctor_id → auth.users
  ├── status: ordered → collected → processing → completed
  └── priority: routine | urgent | stat
  
  └─→ specimens (N)
      ├── collection_time, collected_by
      ├── quality_assessment: { adequate_volume, labeling, integrity, temperature }
      ├── chain_of_custody: [{timestamp, handler, action, location}]
      └── status: received → processing → tested → reviewed → approved
      
      └─→ lab_results (N)
          ├── loinc_code → loinc_codes
          ├── result_value, abnormal_flag: H|L|HH|LL|A
          ├── critical_flag: boolean
          └── result_status: preliminary → final
          
          └─→ critical_results (if critical_flag=true)
              ├── severity: critical | panic
              ├── notification_level: 1|2|3
              ├── escalation_level: 1 (doc) → 2 (mgr) → 3 (hospital)
              └── read_back_verified: boolean
              
              └─→ critical_value_alerts (1)
                  ├── notified_at, acknowledged_at
                  ├── acknowledged_by → auth.users
                  └── audit_log entries
```

### Billing Workflow Data Model
```
invoices (1)
  ├── hospital_id, patient_id, encounter_id
  ├── status: draft → finalized → paid | cancelled
  ├── insurance: {type, copay, coverage%, preAuth}
  └── creation_time, invoiced_at, due_date
  
  ├─→ invoice_items (N)
  │   ├── description, quantity, unit_price
  │   ├── amount = quantity * unit_price
  │   ├── item_type: service|procedure|medication|diagnostic
  │   └── createdAt, createdBy (immutable)
  │
  ├─→ adjustments (N, append-only)
  │   ├── type: discount | waiver | reversal | refund
  │   ├── reason, amount, appliedBy, authorizedBy
  │   ├── audit_trail entry
  │   └── createdAt (monotonic)
  │
  ├─→ payments (N)
  │   ├── amount, payment_method, payment_date
  │   ├── reference_number, received_by
  │   └── audit_log entry
  │
  ├─→ insurance_claims (N)
  │   ├── insurance_provider, policy_number
  │   ├── diagnosis_codes[], procedure_codes[]
  │   ├── claim_amount, approved_amount, paid_amount
  │   ├── status: submitted | approved | denied | paid
  │   ├── submission_date, reviewed_at, paid_at
  │   └── denial_reason (if denied)
  │
  └─→ payment_plans (N, if installments)
      ├── installment_amount, due_date[], status
      └── payment_history per installment

  patients (1)
      └─→ insurance_schemes
          ├── scheme_name: CGHS|ESIC|Ayushman|Private|TPA
          ├── coverage_percent, copay, deductible
          └── preAuth_required: boolean
```

---

## SUMMARY TABLE: Critical Files to Test

| Domain | Service File | Test File | Priority |
|--------|--------------|-----------|----------|
| **Lab: Orders** | `src/hooks/useLabOrders.ts` | `tests/unit/useLabOrders.test.tsx` | **HIGH** |
| **Lab: Critical Alerts** | `src/hooks/useLabCriticalAlerts.ts` | `tests/integration/lab-critical-alerts.test.ts` (⚠️ Incomplete) | **HIGH** |
| **Lab: Specimen Tracking** | `src/types/laboratory.ts` (SpecimenTracking) | ❌ MISSING | **HIGH** |
| **Lab: Lab Tech Operations** | `src/utils/labTechOperationsService.ts` | ❌ MISSING | **HIGH** |
| **Billing: Validator** | `src/utils/billingValidator.ts` | `src/test/hooks/useBillingValidation.test.tsx` (⚠️ Incomplete) | **HIGH** |
| **Billing: Invoice CRUD** | `src/hooks/useBilling.ts` | `src/test/hooks/useBilling.test.tsx` (✅ Good) | HIGH |
| **Billing: Insurance Claims** | `src/hooks/useInsuranceClaims.ts` | ❌ MISSING | HIGH |
| **Billing: Copay Calc** | `src/utils/billingValidator.ts` → `calculateCopay()` | ❌ MISSING | **HIGH** |

---

## QUICK START TESTING COMMANDS

```bash
# Run all lab-related tests
npm run test:integration -- lab

# Run all billing-related tests
npm run test:integration -- billing

# Run e2e lab workflow
npm run test:e2e:roles -- tests/e2e/t92-lab-order-to-result.spec.ts

# Run e2e billing workflow
npm run test:e2e:roles -- tests/e2e/t94-billing-approval.spec.ts

# Run unit tests for hooks
npm run test:unit -- useBilling useLaboratory

# Run security tests (OWASP, PHI logging)
npm run test:security

# Run accessibility tests
npm run test:accessibility
```

---

## Next Steps
1. **Create missing test suites** for critical paths identified above
2. **Expand billing validator tests** with edge cases (negative amounts, duplicate detection)
3. **Add specimen rejection tests** for lab domain
4. **Implement revenue leakage audit tests** for billing
5. **Document test fixtures** for lab and billing test data
6. **Set up CI/CD gates** requiring 80%+ coverage for lab & billing modules

---

**End of Document**
