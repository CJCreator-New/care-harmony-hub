# Phase 2 Week 6: Integration Testing Plan
**Period:** April 22-26, 2026  
**Team:** Backend Team + QA Lead  
**Goal:** 50+ integration tests, 40+ API endpoints covered, 4 workflows validated

---

## 📋 Overview

**From Week 5:** 195 unit tests created, all service layers tested independently  
**Week 6 Goal:** Test APIs and workflows in integrated scenarios with real database interactions  
**Coverage Target:** 40+ endpoints with 3-5 tests each (120+ tests potential), prioritize 4 core workflows

**Testing Strategy:**
- Use `tests/integration/` folder structure
- Mock external services (Supabase RPC calls, notifications)
- Real database transactions (with rollback)
- Full request/response validation
- Hospital scoping + RLS enforcement verification

---

## 🗓️ Daily Schedule

### Monday (Apr 22): Patient API Integration Tests
**Focus:** Patient CRUD operations, hospital scoping, encryption validation  
**Time:** 8 hours  
**Target:** 15 tests

#### API Endpoints to Test:
```
POST   /api/patients                 - Create patient with encryption_metadata
GET    /api/patients                 - List patients (scoped by hospital)
GET    /api/patients/{id}            - Get single patient
PUT    /api/patients/{id}            - Update patient (prevent hospital_id change)
DELETE /api/patients/{id}            - Delete patient (soft/hard)
GET    /api/patients/search          - Search by name/phone/email (scoped)
POST   /api/patients/{id}/verify-mrn - Verify MRN generation
GET    /api/patients/{id}/history    - Audit log retrieval
```

#### Test Suite Template:
```typescript
describe('Patient API Integration', () => {
  let patientId: string;
  let hospitalId: string;

  beforeEach(async () => {
    // Setup: Create test hospital context
    hospitalId = await setupTestHospital();
    // Setup: Also create second hospital for cross-hospital tests
  });

  afterEach(async () => {
    // Cleanup: Rollback transactions
    await rollbackTestData();
  });

  describe('POST /api/patients - Create', () => {
    it('should create patient with encryption_metadata', async () => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${testToken}` },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '+1234567890',
          dateOfBirth: '1980-01-15',
          address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101' }
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeTruthy();
      expect(data.hospital_id).toBe(hospitalId);
      expect(data.encryption_metadata).toEqual({
        algorithm: 'AES-256-GCM',
        encrypted_fields: ['ssn', 'insurance_id'],
        created_at: expect.any(String)
      });
    });

    it('should enforce hospital_id from JWT context', async () => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${testTokenDifferentHospital}` },
        body: JSON.stringify({ firstName: 'Jane', lastName: 'Smith', ... })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.hospital_id).toBe(secondHospitalId);
      expect(data.hospital_id).not.toBe(hospitalId);
    });

    it('should reject patient with invalid email', async () => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${testToken}` },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'not-an-email',
          ...
        })
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.message).toMatch(/invalid email/i);
    });
  });

  describe('GET /api/patients - List & Search', () => {
    beforeEach(async () => {
      // Create 5 test patients
      patientId = await createTestPatient('John', 'Doe');
      await createTestPatient('Jane', 'Smith');
      await createTestPatient('Bob', 'Johnson');
    });

    it('should return patients scoped by hospital', async () => {
      const response = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });

      const data = await response.json();
      expect(data.patients.every(p => p.hospital_id === hospitalId)).toBe(true);
    });

    it('should paginate patient list', async () => {
      const response = await fetch('/api/patients?page=1&limit=2', {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });

      const data = await response.json();
      expect(data.patients).toHaveLength(2);
      expect(data.total).toBe(5);
      expect(data.page).toBe(1);
    });

    it('should search patients by name', async () => {
      const response = await fetch('/api/patients/search?q=John', {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });

      const data = await response.json();
      expect(data.patients.some(p => p.firstName === 'John')).toBe(true);
      expect(data.patients.every(p => p.hospital_id === hospitalId)).toBe(true);
    });
  });

  describe('Security - Cross-Hospital Access Prevention', () => {
    it('should prevent accessing patients from other hospitals', async () => {
      const patientFromHosp1 = await createTestPatient('John', 'Doe', hospitalId);
      
      const response = await fetch(`/api/patients/${patientFromHosp1}`, {
        headers: { 'Authorization': `Bearer ${testTokenDifferentHospital}` }
      });

      expect(response.status).toBe(403); // Forbidden
    });

    it('should enforce hospital_id in all list operations', async () => {
      const response = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });

      const data = await response.json();
      const hasOnlyCurrentHospital = data.patients.every(p => p.hospital_id === hospitalId);
      expect(hasOnlyCurrentHospital).toBe(true);
    });
  });
});
```

#### Success Criteria:
- ✅ All 8 endpoints tested
- ✅ Hospital scoping verified in each test
- ✅ Encryption metadata validated
- ✅ All 15 tests passing
- ✅ Cross-hospital access blocked in all cases

---

### Tuesday (Apr 23): Prescription API Integration Tests
**Focus:** Prescription ordering, approval workflow, DEA validation  
**Time:** 8 hours  
**Target:** 15 tests

#### API Endpoints to Test:
```
POST   /api/prescriptions            - Create prescription
GET    /api/prescriptions            - List (by status, patient, doctor)
PUT    /api/prescriptions/{id}       - Update prescription
POST   /api/prescriptions/{id}/approve - Approve (pharmacist role)
POST   /api/prescriptions/{id}/dispense - Dispense (pharmacy)
POST   /api/prescriptions/{id}/refill - Request refill
DELETE /api/prescriptions/{id}       - Cancel
GET    /api/prescriptions/{id}/interactions - Check drug interactions
```

#### Key Tests:
1. **Prescription Creation** (3 tests)
   - Valid prescription with all fields
   - Duplicate therapy detection
   - Invalid drug selection

2. **DEA Validation** (2 tests)
   - Controlled substance tracking
   - DEA number format validation

3. **Approval Workflow** (3 tests)
   - Only pharmacists can approve
   - Status transition from pending → approved
   - Timestamp recording

4. **Dispensing** (3 tests)
   - Mark items as dispensed
   - Track quantity dispensed
   - Prevent over-dispensing

5. **Security** (4 tests)
   - Cross-hospital access prevention
   - Role-based access (prescriber, pharmacist, patient)
   - RLS enforcement on all endpoints

---

### Wednesday (Apr 24): Lab API + Billing API Integration Tests
**Focus:** Lab orders, results, billing calculations  
**Time:** 8 hours  
**Target:** 20 tests (10 Lab + 10 Billing)

#### Lab API Endpoints (10 tests):
```
POST   /api/lab-orders               - Create lab order
GET    /api/lab-orders               - List orders
PUT    /api/lab-orders/{id}          - Update order status
POST   /api/lab-orders/{id}/results  - Submit results
GET    /api/lab-orders/{id}/results  - Retrieve results
POST   /api/lab-orders/{id}/critical-alert - Alert on critical values
```

#### Billing API Endpoints (10 tests):
```
POST   /api/invoices                 - Create invoice
GET    /api/invoices                 - List invoices
GET    /api/invoices/{id}            - Get invoice details
POST   /api/invoices/{id}/payment    - Record payment
POST   /api/invoices/{id}/send       - Email invoice
PUT    /api/invoices/{id}/status     - Update status
```

#### Key Tests for Lab:
1. Create lab order with specimen requirements
2. Track specimen collection status
3. Critical value alert triggering
4. Result reporting with normal ranges
5. Cross-hospital isolation

#### Key Tests for Billing:
1. Invoice calculation (tariff × quantity)
2. Insurance coverage deduction
3. Package pricing vs individual
4. Payment plan creation
5. Partial payment handling
6. Currency conversion
7. Audit trail for billing changes
8. Cross-hospital isolation
9. Discount application
10. Tax calculation

---

### Thursday (Apr 25): Workflow Integration Tests
**Focus:** End-to-end clinical workflows  
**Time:** 8 hours  
**Target:** 8+ tests (2 per workflow)

#### Workflow 1: Patient Registration → Appointment → Consultation
```
1. POST /api/patients (create patient)
2. POST /api/appointments (schedule appointment)
3. POST /api/consultations (start consultation)
4. PUT /api/consultations/{id} (complete consultation)
5. POST /api/invoices (generate bill)

Test Points:
- Data flows correctly between services
- Hospital context maintained throughout
- Encryption metadata preserved
- Audit trail complete
- No data leakage between hospitals
```

#### Workflow 2: Prescription Order → Approval → Dispensing
```
1. POST /api/prescriptions (doctor creates)
2. POST /api/prescriptions/{id}/approve (pharmacist approves)
3. POST /api/prescriptions/{id}/dispense (pharmacy staff dispenses)
4. POST /api/invoices (billing)
5. PATCH /api/inventory (stock update)

Test Points:
- Status transitions correct
- Role-based access enforced
- Inventory decremented
- Billing recorded
- DEA tracking accurate
```

#### Workflow 3: Lab Order → Processing → Results
```
1. POST /api/lab-orders (doctor orders)
2. PUT /api/lab-orders/{id} (specimen collected)
3. POST /api/lab-orders/{id}/results (results submitted)
4. POST /api/invoices (billing for tests)
5. PATCH /api/patients/{id}/vitals (if vital sign test)

Test Points:
- Specimen tracking working
- Results linked to order
- Billing captured
- Critical alerts triggered if needed
- Results visible to authorized roles
```

#### Workflow 4: Multi-step Billing with Insurance
```
1. POST /api/invoices (create invoice)
2. POST /api/insurance/verify (check coverage)
3. POST /api/invoices/{id}/payment (initial payment)
4. POST /api/invoices/{id}/payment (insurance payment)
5. POST /api/invoices/{id}/balance (finalize)

Test Points:
- Insurance calculations correct
- Copay enforced
- Balance tracking accurate
- Multiple payments aggregated
- Audit trail complete
```

---

### Friday (Apr 26): Transaction & Concurrency Tests + Review
**Focus:** Race conditions, transaction integrity, RLS enforcement  
**Time:** 8 hours  
**Target:** 8+ tests

#### Transaction Tests (4 tests):
1. **Concurrent Patient Updates** - Prevent write conflicts
2. **Double Dispensing Prevention** - Pharmacy staff race condition
3. **Payment Processing** - Concurrent payment submissions
4. **Inventory Deduction** - Race condition on stock updates

#### Concurrency Test Example:
```typescript
it('should prevent concurrent dispensing of same prescription', async () => {
  const prescriptionId = await createTestPrescription();
  
  // Simulate 2 pharmacists dispensing simultaneously
  const response1 = dispenseAsync(prescriptionId, 1, pharmacist1Token);
  const response2 = dispenseAsync(prescriptionId, 1, pharmacist2Token);
  
  const [result1, result2] = await Promise.all([response1, response2]);
  
  // One should succeed, one should fail with conflict
  expect(
    (result1.status === 200 && result2.status === 409) ||
    (result1.status === 409 && result2.status === 200)
  ).toBe(true);
});
```

#### RLS Enforcement Tests (4 tests):
1. **Hospital ID Filtering** - Verify WHERE hospital_id = X on all queries
2. **Role-Based Data Access** - Patient can't see other patients' data
3. **Multi-Hospital Isolation** - Cross-hospital data never leaks
4. **Audit Log Protection** - Only allow accessing own hospital's audit logs

---

## 📊 Test File Structure

```
tests/integration/
├── patient-api.integration.test.ts          (15 tests)
├── prescription-api.integration.test.ts     (15 tests)
├── lab-api.integration.test.ts              (10 tests)
├── billing-api.integration.test.ts          (10 tests)
├── workflows/
│   ├── registration-appointment.test.ts     (2 tests)
│   ├── prescription-dispensing.test.ts      (2 tests)
│   ├── lab-order-results.test.ts            (2 tests)
│   └── billing-insurance.test.ts            (2 tests)
├── concurrency/
│   ├── prescription-dispensing.test.ts      (2 tests)
│   ├── payment-processing.test.ts           (2 tests)
│   ├── inventory-deduction.test.ts          (2 tests)
│   └── patient-updates.test.ts              (2 tests)
└── rls-enforcement/
    ├── hospital-isolation.test.ts           (2 tests)
    ├── role-based-access.test.ts            (2 tests)
    └── audit-log-access.test.ts             (2 tests)
```

---

## 🛠️ Integration Test Setup Helpers

### Common Setup Functions:
```typescript
// tests/integration/helpers.ts

export async function setupTestHospital() {
  const response = await supabase
    .from('hospitals')
    .insert({ name: `Test Hospital ${Date.now()}` })
    .select()
    .single();
  return response.data.id;
}

export async function createTestPatient(
  firstName: string,
  lastName: string,
  hospitalId: string
) {
  const response = await supabase
    .from('patients')
    .insert({
      first_name: firstName,
      last_name: lastName,
      hospital_id: hospitalId,
      email: `${firstName}.${lastName}@test.com`,
      phone: '+12345678900'
    })
    .select()
    .single();
  return response.data.id;
}

export async function createTestToken(
  userId: string,
  role: string,
  hospitalId: string
) {
  // JWT with hospital_id claim
  return createJWT({
    sub: userId,
    role,
    hospital_id: hospitalId
  });
}

export async function rollbackTestData() {
  // Cleanup: Delete all test records
  // Runs in reverse dependency order
}

export function setupAPIMocking() {
  // Mock external services:
  // - Supabase RPC calls
  // - Email notifications
  // - SMS notifications
  // - Payment gateway
}
```

---

## ✅ Week 6 Success Criteria

```
PASSING METRICS:
✅ 50+ integration tests created
✅ All 40+ API endpoints tested (3-5 tests each)
✅ 4 major workflows end-to-end passing
✅ Hospital scoping enforced in 100% of tests
✅ RLS policies validated in concurrency tests
✅ All tests passing (0 failures)
✅ No cross-hospital data leakage detected
✅ Transaction integrity validated
✅ Test execution time: <120 seconds

FAILING METRICS (Rollback):
❌ Coverage <70% for any API
❌ >10% test failure rate
❌ Cross-hospital data access detected
❌ Race condition not handled
❌ RLS enforcement bypassed
```

---

## 📝 Execution Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- tests/integration/patient-api.integration.test.ts

# Run workflow tests only
npm run test:integration -- tests/integration/workflows/

# Run concurrency tests only
npm run test:integration -- tests/integration/concurrency/

# Generate coverage report
npm run test:integration -- --coverage

# Watch mode for development
npm run test:integration -- --watch
```

---

## 🔄 Daily Deliverables

| Day | Tests | File | Status |
|-----|-------|------|--------|
| Mon | 15 | patient-api.integration.test.ts | 📋 Plan |
| Tue | 15 | prescription-api.integration.test.ts | 📋 Plan |
| Wed | 20 | lab-api + billing-api tests | 📋 Plan |
| Thu | 8+ | workflow integration tests | 📋 Plan |
| Fri | 8+ | concurrency + RLS tests | 📋 Plan |
| **Total** | **50+** | **All files** | **📋 Plan** |

---

## 🚀 Next Steps After Week 6

**Week 7 (Apr 29-May 3):** E2E Testing
- Playwright browser automation
- Multi-role workflows through UI
- User journey testing
- Error recovery scenarios

**Week 8 (May 6-10):** Coverage Consolidation
- Gap analysis
- Ad-hoc testing for uncovered paths
- Performance validation
- Final 60%+ coverage push

---

## 📌 Notes

- Use `vi.mock('lib/supabase')` for external service mocking
- Real database connections for transaction testing (with rollback)
- Parallel test execution where possible
- Clear test naming: `should [action] when [condition]`
- Hospital scoping must be verified in every test
- Document any test dependencies or ordering requirements
