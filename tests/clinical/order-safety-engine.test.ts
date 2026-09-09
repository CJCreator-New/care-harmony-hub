/**
 * Comprehensive Architectural Tests: Unified Clinical Order Safety Engine (`OrderSafetyEngine`)
 *
 * Verifies domain invariants at the module's public interface:
 * 1. Multi-Tenant Hospital Isolation
 * 2. Fail-Closed Clinical Decision Support (CDS)
 * 3. Allergy Class Cross-Reactivity
 * 4. AAP Pediatric Dosing Limits & Adult Ceiling Caps
 * 5. Drug-Drug Interaction Critical Pairs & Co-Ordering
 * 6. Authoritative Clearance Gate & Cryptographic Attestation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  ClinicalActor,
  PatientClinicalContext,
  OrderItemIntent,
  OrderSafetyRejectionError,
  TenantIsolationViolationError,
  CDSUnavailableFailClosedError,
} from '@/modules/order-safety';

describe('OrderSafetyEngine - Public Interface Tests', () => {
  let engine: HeadlessOrderSafetyEngine;
  let localDdiAdapter: InMemoryLocalDdiAdapter;
  let rxNormAdapter: MockRxNormAdapter;
  let auditLogger: SpyAuditLoggerAdapter;

  const mockDoctor: ClinicalActor = {
    userId: 'doctor-uuid-1',
    hospitalId: 'hospital-alpha',
    role: 'doctor',
    licenseNumber: 'MD-12345',
  };

  const mockPharmacist: ClinicalActor = {
    userId: 'pharmacist-uuid-1',
    hospitalId: 'hospital-alpha',
    role: 'pharmacist',
    licenseNumber: 'PH-98765',
  };

  const safeAdultPatient: PatientClinicalContext = {
    patientId: 'patient-uuid-1',
    hospitalId: 'hospital-alpha',
    ageYears: 35,
    gender: 'F',
    allergies: [],
    activeMedications: [],
  };

  beforeEach(() => {
    localDdiAdapter = new InMemoryLocalDdiAdapter();
    rxNormAdapter = new MockRxNormAdapter();
    auditLogger = new SpyAuditLoggerAdapter();

    engine = new HeadlessOrderSafetyEngine({
      localDdiRepo: localDdiAdapter,
      rxNormPort: rxNormAdapter,
      auditLogger,
    });
  });

  // ============================================================================
  // 1. Multi-Tenant Hospital Isolation Invariant
  // ============================================================================
  describe('Multi-Tenant Hospital Isolation', () => {
    it('blocks evaluation when actor hospital does not match patient hospital', async () => {
      const foreignPatient: PatientClinicalContext = {
        ...safeAdultPatient,
        hospitalId: 'hospital-bravo', // Cross-tenant discrepancy
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-1',
        drugName: 'Acetaminophen',
        doseMg: 500,
        route: 'PO',
        frequency: 'daily',
      };

      await expect(
        engine.evaluate({
          actor: mockDoctor,
          patient: foreignPatient,
          items: [item],
        })
      ).rejects.toThrow(TenantIsolationViolationError);
    });
  });

  // ============================================================================
  // 2. Safe Baseline Orders
  // ============================================================================
  describe('Safe Clinical Orders', () => {
    it('evaluates safe order as CLEARED and canProceed: true', async () => {
      const item: OrderItemIntent = {
        clientItemId: 'item-1',
        drugName: 'Acetaminophen',
        doseMg: 500,
        route: 'PO',
        frequency: 'q6h',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: safeAdultPatient,
        items: [item],
      });

      expect(assessment.verdict).toBe('CLEARED');
      expect(assessment.canProceed).toBe(true);
      expect(assessment.findings.length).toBe(0);
    });

    it('clears safe order and mints cryptographic receipt', async () => {
      const item: OrderItemIntent = {
        clientItemId: 'item-1',
        drugName: 'Acetaminophen',
        doseMg: 500,
        route: 'PO',
        frequency: 'q6h',
      };

      const receipt = await engine.clear({
        actor: mockDoctor,
        patient: safeAdultPatient,
        items: [item],
        action: 'DOCTOR_PRESCRIBE',
      });

      expect(receipt.status).toBe('CLEARED');
      expect(receipt.orderHash).toBeDefined();
      expect(receipt.signature).toContain('hmac_sig_');
      expect(receipt.clearedBy.userId).toBe(mockDoctor.userId);
      expect(auditLogger.loggedEvents.length).toBe(1);
      expect(auditLogger.loggedEvents[0].actionType).toBe('clinical_order_doctor_prescribe');
    });
  });

  // ============================================================================
  // 3. Allergy Cross-Reactivity Invariants
  // ============================================================================
  describe('Allergy Cross-Reactivity', () => {
    it('detects direct allergy conflict (Amoxicillin with Amoxicillin allergy)', async () => {
      const patient: PatientClinicalContext = {
        ...safeAdultPatient,
        allergies: ['Amoxicillin allergy'],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-amox',
        drugName: 'Amoxicillin 500mg',
        doseMg: 500,
        route: 'PO',
        frequency: 'BID',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient,
        items: [item],
      });

      expect(assessment.verdict).toBe('REQUIRES_OVERRIDE');
      expect(assessment.canProceed).toBe(false);
      expect(assessment.findings[0].kind).toBe('ALLERGY_CROSS_REACTIVITY');
      expect(assessment.findings[0].severity).toBe('CRITICAL');
      expect(assessment.findings[0].requiresPhysicianOverride).toBe(true);
    });

    it('detects class cross-reactivity (Augmentin with documented PCN allergy)', async () => {
      const patient: PatientClinicalContext = {
        ...safeAdultPatient,
        allergies: ['PCN hypersensitivity'], // Normalized to penicillin root
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-aug',
        drugName: 'Augmentin 875mg',
        doseMg: 875,
        route: 'PO',
        frequency: 'BID',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient,
        items: [item],
      });

      expect(assessment.verdict).toBe('REQUIRES_OVERRIDE');
      expect(assessment.findings.some((f) => f.kind === 'ALLERGY_CROSS_REACTIVITY')).toBe(true);
    });
  });

  // ============================================================================
  // 4. AAP Pediatric Dosing & Adult Ceiling Invariants
  // ============================================================================
  describe('AAP Pediatric Dosing Engine', () => {
    const pediatricPatient: PatientClinicalContext = {
      patientId: 'pediatric-child-1',
      hospitalId: 'hospital-alpha',
      ageYears: 5,
      weightKg: 20, // 20kg child
      allergies: [],
    };

    it('caps pediatric dose at standard adult maximum single dose', async () => {
      // 40kg adolescent calculated at 45 mg/kg for Amoxicillin would be 1800mg/dose, but adult cap is 1000mg
      const adolescent: PatientClinicalContext = {
        patientId: 'teen-1',
        hospitalId: 'hospital-alpha',
        ageYears: 13,
        weightKg: 40,
        allergies: [],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-amox-cap',
        drugName: 'Amoxicillin',
        doseMg: 1000,
        route: 'PO',
        frequency: 'BID',
        isHighDoseProtocol: true,
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: adolescent,
        items: [item],
      });

      const analysis = assessment.pediatricAnalyses['item-amox-cap'];
      expect(analysis).toBeDefined();
      expect(analysis.adultCeilingSingleDoseMg).toBe(1000);
      expect(analysis.adjustmentsApplied.some((a) => a.includes('capped at adult maximum'))).toBe(
        true
      );
    });

    it('flags >110% AAP safe daily ceiling as REQUIRES_OVERRIDE', async () => {
      // 10kg child, Amoxicillin max safe daily is 90 mg/kg/day = 900 mg/day
      // Prescribing 550 mg BID = 1100 mg/day (>110% of 900 = >990 mg)
      const infant: PatientClinicalContext = {
        patientId: 'infant-1',
        hospitalId: 'hospital-alpha',
        ageYears: 2,
        weightKg: 10,
        allergies: [],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-over-110',
        drugName: 'Amoxicillin',
        doseMg: 550,
        route: 'PO',
        frequency: 'BID',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: infant,
        items: [item],
      });

      expect(assessment.verdict).toBe('REQUIRES_OVERRIDE');
      expect(assessment.findings.some((f) => f.code.includes('PEDIATRIC_OVERDOSE_OVERRIDE'))).toBe(
        true
      );
    });

    it('triggers HARD_STOP when prescribed dose exceeds 200% AAP ceiling', async () => {
      // 10kg child, max safe daily 90 mg/kg/day = 900 mg/day
      // Prescribing 1000 mg BID = 2000 mg/day (>200% of 900 mg = >1800 mg)
      const infant: PatientClinicalContext = {
        patientId: 'infant-1',
        hospitalId: 'hospital-alpha',
        ageYears: 2,
        weightKg: 10,
        allergies: [],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-over-200',
        drugName: 'Amoxicillin',
        doseMg: 1000,
        route: 'PO',
        frequency: 'BID',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: infant,
        items: [item],
      });

      expect(assessment.verdict).toBe('HARD_STOP');
      expect(assessment.canProceed).toBe(false);
      expect(assessment.findings.some((f) => f.isHardStop)).toBe(true);

      // Verify that clear() strictly blocks this HARD_STOP even if override is attempted
      await expect(
        engine.clear({
          actor: mockDoctor,
          patient: infant,
          items: [item],
          overrides: [
            {
              findingCode: assessment.findings[0].code,
              overrideReason: 'Attempting to override toxic pediatric dose',
              authorizedDoctorId: mockDoctor.userId,
            },
          ],
          action: 'DOCTOR_PRESCRIBE',
        })
      ).rejects.toThrow(OrderSafetyRejectionError);
    });
  });

  // ============================================================================
  // 5. Drug-Drug Interactions & Physiological Invariants
  // ============================================================================
  describe('Drug-Drug Interactions & Physiological Invariants', () => {
    it('blocks Sildenafil + Nitroglycerin as unbypassable HARD_STOP', async () => {
      const patient: PatientClinicalContext = {
        ...safeAdultPatient,
        activeMedications: [{ drugName: 'Nitroglycerin sublingual' }],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-viagra',
        drugName: 'Sildenafil 50mg',
        doseMg: 50,
        route: 'PO',
        frequency: 'PRN',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient,
        items: [item],
      });

      expect(assessment.verdict).toBe('HARD_STOP');
      expect(
        assessment.findings.some((f) => f.isHardStop && f.title.includes('Lethal Hypotension'))
      ).toBe(true);
    });

    it('detects interaction between multiple drugs within the same new draft order', async () => {
      const item1: OrderItemIntent = {
        clientItemId: 'item-1',
        drugName: 'Fluoxetine',
        doseMg: 20,
        route: 'PO',
        frequency: 'daily',
      };
      const item2: OrderItemIntent = {
        clientItemId: 'item-2',
        drugName: 'Phenelzine',
        doseMg: 15,
        route: 'PO',
        frequency: 'TID',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: safeAdultPatient,
        items: [item1, item2],
      });

      expect(assessment.verdict).toBe('HARD_STOP');
      expect(assessment.findings.some((f) => f.title.includes('Fatal Serotonin Syndrome'))).toBe(
        true
      );
    });

    it('blocks Category X teratogen (Isotretinoin) in pregnant patient as HARD_STOP', async () => {
      const pregnantPatient: PatientClinicalContext = {
        ...safeAdultPatient,
        isPregnant: true,
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-accutane',
        drugName: 'Isotretinoin 20mg',
        doseMg: 20,
        route: 'PO',
        frequency: 'daily',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: pregnantPatient,
        items: [item],
      });

      expect(assessment.verdict).toBe('HARD_STOP');
      expect(assessment.findings.some((f) => f.kind === 'PREGNANCY_CONTRAINDICATION')).toBe(true);
    });

    it('blocks fatal route: Potassium via rapid IV push', async () => {
      const item: OrderItemIntent = {
        clientItemId: 'item-kcl',
        drugName: 'Potassium Chloride',
        doseMg: 20,
        route: 'IV', // Not 'IV (slow)'
        frequency: 'once',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: safeAdultPatient,
        items: [item],
      });

      expect(assessment.verdict).toBe('HARD_STOP');
      expect(
        assessment.findings.some((f) => f.kind === 'ROUTE_INCOMPATIBILITY' && f.isHardStop)
      ).toBe(true);
    });
  });

  // ============================================================================
  // 6. Fail-Closed CDS Invariants
  // ============================================================================
  describe('Fail-Closed CDS Service Degradation', () => {
    it('triggers INCOMPLETE_CDS when external RxNorm API times out or degrades', async () => {
      rxNormAdapter.shouldSimulateTimeout = true;

      const patientWithMed: PatientClinicalContext = {
        ...safeAdultPatient,
        activeMedications: [{ drugName: 'Simvastatin', drugRxcui: '36567' }],
      };

      const item: OrderItemIntent = {
        clientItemId: 'item-amiodarone',
        drugName: 'Amiodarone',
        drugRxcui: '703',
        doseMg: 200,
        route: 'PO',
        frequency: 'daily',
      };

      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: patientWithMed,
        items: [item],
      });

      expect(assessment.verdict).toBe('INCOMPLETE_CDS');
      expect(assessment.canProceed).toBe(false);
      expect(assessment.findings.some((f) => f.kind === 'UPSTREAM_CDS_DEGRADATION')).toBe(true);

      // Fail-closed gate blocks clear() without override
      await expect(
        engine.clear({
          actor: mockDoctor,
          patient: patientWithMed,
          items: [item],
          action: 'DOCTOR_PRESCRIBE',
        })
      ).rejects.toThrow(CDSUnavailableFailClosedError);
    });
  });

  // ============================================================================
  // 7. Clinical Override Validation Invariants
  // ============================================================================
  describe('Clinical Override Enforcement', () => {
    const patientWithWarfarin: PatientClinicalContext = {
      ...safeAdultPatient,
      activeMedications: [{ drugName: 'Warfarin' }],
    };

    const nsaidItem: OrderItemIntent = {
      clientItemId: 'item-ibuprofen',
      drugName: 'Ibuprofen 400mg',
      doseMg: 400,
      route: 'PO',
      frequency: 'TID',
    };

    it('rejects clearance if override rationale is shorter than 10 characters', async () => {
      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: patientWithWarfarin,
        items: [nsaidItem],
      });

      const findingCode = assessment.findings[0].code;

      await expect(
        engine.clear({
          actor: mockDoctor,
          patient: patientWithWarfarin,
          items: [nsaidItem],
          overrides: [
            {
              findingCode,
              overrideReason: 'Short', // Less than 10 characters
              authorizedDoctorId: mockDoctor.userId,
            },
          ],
          action: 'DOCTOR_PRESCRIBE',
        })
      ).rejects.toThrow(OrderSafetyRejectionError);
    });

    it('successfully clears order when valid clinical override is documented by Doctor', async () => {
      const assessment = await engine.evaluate({
        actor: mockDoctor,
        patient: patientWithWarfarin,
        items: [nsaidItem],
      });

      const findingCode = assessment.findings[0].code;

      const receipt = await engine.clear({
        actor: mockDoctor,
        patient: patientWithWarfarin,
        items: [nsaidItem],
        overrides: [
          {
            findingCode,
            overrideReason: 'Short-term acute pain control under close inpatient INR monitoring.',
            authorizedDoctorId: mockDoctor.userId,
          },
        ],
        action: 'DOCTOR_PRESCRIBE',
      });

      expect(receipt.status).toBe('CLEARED');
      expect(receipt.overridesApplied.length).toBe(1);
      expect(auditLogger.loggedEvents.length).toBe(1);
      expect(auditLogger.loggedEvents[0].details.overridesCount).toBe(1);
    });
  });
});
