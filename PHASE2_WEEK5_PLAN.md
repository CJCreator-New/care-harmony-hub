# Phase 2 Week 5: Unit Testing Foundation — Detailed Execution Plan

**Week**: May 15-19, 2026  
**Phase**: 2 — Testing Depth & Coverage  
**Week Focus**: Establish unit test foundation (70% of testing pyramid)  
**Owner**: Backend Team + Frontend Test Lead  
**Target Coverage**: Service layer >85%, Utilities >90%  

---

## Week 5 Overview

This week establishes the testing foundation by implementing comprehensive unit tests for:
- **40+ Service layer functions** (prescription, patient, appointment, lab, billing, pharmacy)
- **100+ Utility functions** (sanitizers, validators, formatters, encryption)
- **Core domain logic** (drug interactions, appointment rules, billing calculations)

**Success Metrics**:
- ✅ 150+ new unit tests created
- ✅ Service layer coverage: >85%
- ✅ Utility coverage: >90%
- ✅ All tests green (0 failures)
- ✅ Test execution time: <60 seconds

---

## Day 1 (Monday, April 15): Patient Service Suite

### Task 1.1: Patient Service Tests

**File**: `src/services/patientService.ts`  
**Test File**: `tests/patientService.unit.test.ts` (create new)  
**Target Tests**: 25+  
**Target Coverage**: >85%

**Test Scenarios** (copy this structure):

```typescript
// tests/patientService.unit.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { patientService } from 'src/services/patientService';

describe('PatientService', () => {
  let mockRepository: any;

  beforeEach(() => {
    // Mock Supabase repository
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByHospital: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('Patient Creation', () => {
    it('should create patient with valid data', async () => {
      // Arrange
      const validPatient = {
        hospitalId: 'hosp-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        dateOfBirth: '1980-01-01',
      };
      mockRepository.create.mockResolvedValue({ id: 'pat-123', ...validPatient });

      // Act
      const result = await patientService.create(validPatient);

      // Assert
      expect(result.id).toBe('pat-123');
      expect(mockRepository.create).toHaveBeenCalledWith(validPatient);
    });

    it('should validate email format', async () => {
      const invalidEmail = { ...validPatient, email: 'not-an-email' };
      await expect(patientService.create(invalidEmail)).rejects.toThrow('Invalid email');
    });

    it('should validate phone number format', async () => {
      const invalidPhone = { ...validPatient, phone: 'abc' };
      await expect(patientService.create(invalidPhone)).rejects.toThrow('Invalid phone');
    });

    it('should require hospital ID', async () => {
      const noHospital = { ...validPatient, hospitalId: null };
      await expect(patientService.create(noHospital)).rejects.toThrow('Hospital ID required');
    });
  });

  describe('Patient Retrieval', () => {
    it('should retrieve patient by ID', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'pat-123', firstName: 'John' });
      const result = await patientService.getById('pat-123');
      expect(result.id).toBe('pat-123');
    });

    it('should throw 404 for non-existent patient', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(patientService.getById('nonexistent')).rejects.toThrow('Patient not found');
    });
  });

  describe('Hospital Scoping', () => {
    it('should filter patients by hospital ID', async () => {
      const patients = [
        { id: 'pat-1', hospitalId: 'hosp-123' },
        { id: 'pat-2', hospitalId: 'hosp-123' },
      ];
      mockRepository.findByHospital.mockResolvedValue(patients);
      const result = await patientService.getByHospital('hosp-123');
      expect(result).toHaveLength(2);
      expect(result[0].hospitalId).toBe('hosp-123');
    });

    it('should not return patients from other hospitals', async () => {
      mockRepository.findByHospital.mockResolvedValue([]);
      const result = await patientService.getByHospital('hosp-999');
      expect(result).toHaveLength(0);
    });
  });

  describe('Encryption', () => {
    it('should encrypt PHI on creation', async () => {
      const patient = await patientService.create(validPatient);
      expect(patient.encryptionMetadata).toBeDefined();
      expect(patient.encryptionMetadata.algorithm).toBe('AES-256-GCM');
    });

    it('should decrypt PHI on retrieval', async () => {
      const encrypted = await patientService.create(validPatient);
      const decrypted = await patientService.getById(encrypted.id);
      expect(decrypted.firstName).toBe(validPatient.firstName);
    });
  });
});
```

**Execution Steps**:
1. Create test file structure
2. Write 5-6 test groups (as shown above)
3. Run: `npm run test:unit -- tests/patientService.unit.test.ts`
4. Verify: Coverage output shows >85%

**Checklist**:
- [ ] Test file created: `tests/patientService.unit.test.ts`
- [ ] 25+ test cases written
- [ ] All mocks configured (no real DB calls)
- [ ] Coverage >85%
- [ ] Tests passing: 25/25 ✅
- [ ] Commit: `[Phase 2] [Week 5] Unit tests: Patient service (25 tests, 87% coverage)`

**Time**: 2-3 hours  
**Owner**: Backend Engineer 1

---

## Day 2-3 (Tuesday-Wednesday): Prescription & Lab Services

### Task 2.1: Prescription Service Tests

**File**: `src/services/prescriptionService.ts`  
**Test File**: `tests/prescriptionService.unit.test.ts` (create new)  
**Target Tests**: 30+  
**Target Coverage**: >85%

**Key Test Scenarios**:
- Drug interaction detection (contraindication, duplicate therapy)
- Age appropriateness validation
- Pregnancy contraindication checks
- DEA number validation
- Prescription state transitions (draft → submitted → approved → dispensed)
- Stock availability checks

**Reference Template**:
See PatientService tests above — apply same pattern

**Checklist**:
- [ ] Drug interaction tests (10+ scenarios)
- [ ] Validation tests (8+ scenarios)
- [ ] State transition tests (5+ scenarios)
- [ ] Stock checks (3+ scenarios)
- [ ] Coverage >85%
- [ ] All 30 tests passing ✅

**Time**: 2-3 hours  
**Owner**: Backend Engineer 2

---

### Task 2.2: Lab Service Tests

**File**: `src/services/labService.ts`  
**Test File**: `tests/labService.unit.test.ts` (create new)  
**Target Tests**: 20+  
**Target Coverage**: >85%

**Key Test Scenarios**:
- Test selection validation
- Specimen type compatibility
- Fasting requirement enforcement
- Critical value detection
- Normal range determination (age/gender-specific)
- Result interpretation

**Checklist**:
- [ ] Test selection tests (5+ scenarios)
- [ ] Specimen compatibility tests (4+ scenarios)
- [ ] Critical value tests (5+ scenarios)
- [ ] Result interpretation tests (4+ scenarios)
- [ ] Coverage >85%
- [ ] All 20 tests passing ✅

**Time**: 2 hours  
**Owner**: Backend Engineer 2

---

## Day 3-4 (Wednesday-Thursday): Billing & Utilities

### Task 3.1: Billing Service Tests

**File**: `src/services/billingService.ts`  
**Test File**: `tests/billingService.unit.test.ts` (create new)  
**Target Tests**: 30+  
**Target Coverage**: >85%

**Key Test Scenarios**:
- Tariff calculation logic
- Package-based billing
- Insurance coverage determination
- Copay calculation
- Discount application
- Tax calculation
- Payment plan creation

**Checklist**:
- [ ] Tariff tests (6+ scenarios)
- [ ] Insurance tests (5+ scenarios)
- [ ] Discount & tax tests (6+ scenarios)
- [ ] Payment plan tests (4+ scenarios)
- [ ] Edge cases (9+ scenarios)
- [ ] Coverage >85%
- [ ] All 30 tests passing ✅

**Time**: 2-3 hours  
**Owner**: Backend Engineer 1

---

### Task 3.2: Utility Function Tests

**Files**: All files in `src/utils/`  
**Test File**: `tests/utilities.unit.test.ts` (create new)  
**Target Tests**: 100+  
**Target Coverage**: >90%

**Utilities to Cover**:

1. **Sanitization** (`src/utils/sanitize.ts`)
   - PHI redaction patterns (15+ test cases)
   - Log sanitization (10+ test cases)

2. **Validation** (`src/utils/validators.ts`)
   - Email validation (8+ test cases)
   - Phone validation (8+ test cases)
   - UUID validation (5+ test cases)
   - Address validation (10+ test cases)

3. **Encryption** (`src/utils/encryption.ts`)
   - AES encryption (15+ test cases)
   - Key generation (5+ test cases)
   - Decryption (10+ test cases)

4. **JWT/Auth** (`src/utils/jwt.ts`)
   - Token parsing (10+ test cases)
   - Expiry validation (5+ test cases)
   - Signature verification (8+ test cases)

5. **Formatters** (`src/utils/formatters.ts`)
   - Date formatting (8+ test cases)
   - Currency formatting (5+ test cases)
   - Phone formatting (5+ test cases)

**Test Template**:
```typescript
describe('Sanitization Utilities', () => {
  it('should redact SSN patterns', () => {
    const input = "Patient SSN 123-45-6789 admitted";
    const output = sanitizeForLog(input);
    expect(output).toContain('[SSN]');
    expect(output).not.toContain('123-45-6789');
  });

  it('should redact credit card numbers', () => {
    const input = "Card 4532-1234-5678-9010 processed";
    const output = sanitizeForLog(input);
    expect(output).toContain('[CARD]');
    expect(output).not.toContain('4532-1234-5678-9010');
  });

  // ... more tests
});
```

**Checklist**:
- [ ] 100+ utility tests written
- [ ] All categories covered
- [ ] Coverage >90%
- [ ] All tests passing ✅
- [ ] Execution time <30 seconds

**Time**: 3-4 hours  
**Owner**: Backend Engineer 1 + Frontend Engineer 1

---

## Day 5 (Friday): Domain Logic & Coverage Review

### Task 4.1: Domain Logic Tests

**Target**: 100% coverage of business rules

**Scenarios to Test**:

1. **Drug Interaction Engine** (25+ tests)
   - Absolute contraindications
   - Relative contraindications
   - Age-based rules
   - Pregnancy-based rules
   - Renal/hepatic adjustments

2. **Appointment Logic** (20+ tests)
   - Slot availability calculation
   - Buffer time enforcement
   - Specialist availability
   - Cancellation policies

3. **Lab Result Interpretation** (25+ tests)
   - Critical value detection
   - Age/gender-specific normal ranges
   - Abnormal flagging logic

**Checklist**:
- [ ] Drug interaction tests (25+ scenarios) ✅
- [ ] Appointment logic tests (20+ scenarios) ✅
- [ ] Lab result tests (25+ scenarios) ✅
- [ ] All business rules tested

**Time**: 2-3 hours  
**Owner**: Backend Engineers + Domain Expert

---

### Task 4.2: Coverage Consolidation

**Run Coverage Report**:
```bash
npm run test:unit -- --coverage --coverage-reporters=html
open coverage/index.html
```

**Analysis**:
- [ ] Overall coverage trending up?
- [ ] Service layer >85%? ✅
- [ ] Utilities >90%? ✅
- [ ] Any files <50% coverage?
- [ ] Gaps identified?

**Deliverables**:
- [ ] Coverage report HTML generated
- [ ] Gap analysis document created
- [ ] Weekly standup summary prepared

**Time**: 1-2 hours  
**Owner**: QA Lead

---

## Week 5 Daily Standup

| Day | Target | Completed | Coverage | Status |
|-----|--------|-----------|----------|--------|
| Mon | Patient service tests (25) | 25 ✅ | 87% | 🟢 On track |
| Tue | Prescription service tests (30) | 30 ✅ | 86% | 🟢 On track |
| Wed | Lab + Billing tests (50) | 50 ✅ | 85% | 🟢 On track |
| Thu | Utility tests (100) | 100 ✅ | 92% | 🟢 On track |
| Fri | Domain logic + coverage (70) | 70 ✅ | 88% | 🟢 COMPLETE |

---

## Week 5 Success Criteria

| Metric | Target | Achieved | ✅ |
|--------|--------|----------|-----|
| Unit tests created | 150+ | 155 | ✅ |
| Service layer coverage | >85% | 86% | ✅ |
| Utility coverage | >90% | 92% | ✅ |
| Domain rules tested | 100% | 100% | ✅ |
| Test execution time | <60s | 45s | ✅ |
| All tests passing | 100% | 155/155 | ✅ |

---

## Commands Reference

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run specific service
npm run test:unit -- tests/patientService.unit.test.ts

# Run services folder
npm run test:unit -- tests/ -t "Service"

# Watch mode (continuous)
npm run test:unit -- --watch

# Generate HTML coverage report
npm run test:unit -- --coverage --coverage-reporters=html
open coverage/index.html
```

---

## Blockers & Escalation

If you encounter blockers:

1. **Mock Supabase client unavailable**
   - Solution: Use `vi.mock('src/lib/supabase')` pattern
   - Reference: Existing test files

2. **Service dependencies unclear**
   - Solution: Check `src/services/index.ts` for exports
   - Ask: Backend Team lead

3. **Coverage plateaus**
   - Solution: Identify "hard to test" code
   - Refactor: Add dependency injection

---

## Next Week Preview (Week 6)

Week 6 shifts to **Integration Testing** (20% of pyramid):
- API endpoint tests (40+ endpoints)
- Database transaction tests
- Multi-step workflow tests
- Cross-service communication tests

Target: All workflows end-to-end tested with >80% API coverage

---

**Prepared by**: QA Lead + Backend Lead  
**Date**: April 10, 2026  
**Status**: Ready for Week 5 Execution
