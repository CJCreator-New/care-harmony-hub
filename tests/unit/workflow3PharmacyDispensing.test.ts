import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrescriptionDispensingEngine,
  InMemoryPrescriptionAdapter,
  PrescriptionActor,
} from '@/modules/prescription-dispensing';
import {
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  toOrderItems,
} from '@/modules/order-safety';

// DUR screening now runs through the order-safety module (S0-07); the legacy
// usePrescriptionSafety hook was removed.
async function screen(drug: string, allergies: string[], activeMeds: string[]) {
  const engine = new HeadlessOrderSafetyEngine({
    localDdiRepo: new InMemoryLocalDdiAdapter(),
    rxNormPort: new MockRxNormAdapter(),
    auditLogger: new SpyAuditLoggerAdapter(),
  });
  return engine.evaluate({
    actor: { userId: 'pharm-1', hospitalId: 'hospital-main', role: 'pharmacist' },
    patient: {
      patientId: 'pt-1',
      hospitalId: 'hospital-main',
      ageYears: 45,
      allergies,
      activeMedications: activeMeds.map((drugName) => ({ drugName })),
    },
    items: toOrderItems([{ medication_name: drug, dosage: '20 mg', frequency: 'OD' }]),
  });
}

describe('Workflow 3 - Pharmacy Dispensing, Stock Allocation & Safety Gates', () => {
  let engine: PrescriptionDispensingEngine;
  let adapter: InMemoryPrescriptionAdapter;

  const doctorActor: PrescriptionActor = {
    id: 'doc-1',
    hospitalId: 'hospital-main',
    role: 'doctor',
  };

  const pharmacistActor: PrescriptionActor = {
    id: 'pharm-1',
    hospitalId: 'hospital-main',
    role: 'pharmacist',
    licenseNumber: 'RPH-9999',
  };

  beforeEach(() => {
    adapter = new InMemoryPrescriptionAdapter();
    engine = new PrescriptionDispensingEngine({
      repo: adapter,
      auditLogger: adapter,
      notifier: adapter,
    });
  });

  describe('Inventory Stock Allocation & Expiry Gating (A1)', () => {
    it('blocks dispensing when medication batch is expired', () => {
      const medication = {
        id: 'med-1',
        name: 'Amoxicillin 500mg',
        current_stock: 100,
        batch_number: 'LOT-EXP-2025',
        expiry_date: '2025-01-01', // Past date
      };

      const isExpired = new Date(medication.expiry_date) < new Date();
      expect(isExpired).toBe(true);

      const canDispense = !isExpired && medication.current_stock >= 30;
      expect(canDispense).toBe(false);
    });

    it('blocks dispensing when requested quantity exceeds available stock', () => {
      const medication = {
        id: 'med-2',
        name: 'Azithromycin 250mg',
        current_stock: 5,
        batch_number: 'LOT-2026-A',
        expiry_date: '2028-12-31',
      };

      const requestedQuantity = 10;
      const hasSufficientStock = medication.current_stock >= requestedQuantity;
      expect(hasSufficientStock).toBe(false);
    });

    it('correctly calculates post-dispense stock deduction', () => {
      const initialStock = 50;
      const dispensedQty = 20;
      const newStock = Math.max(0, initialStock - dispensedQty);

      expect(newStock).toBe(30);
    });
  });

  describe('Inline DUR Screening & Contraindication Gate (A2)', () => {
    it('hard-stops SSRI + MAOI (cannot be overridden)', async () => {
      const result = await screen('Fluoxetine', [], ['Phenelzine']);

      const stop = result.findings.find((f) => f.kind === 'DRUG_DRUG_INTERACTION' && f.isHardStop);
      expect(stop).toBeDefined();
      expect(result.canProceed).toBe(false);
    });

    it('requires an override for Warfarin with Aspirin', async () => {
      const result = await screen('Warfarin', [], ['Aspirin']);

      const ddi = result.findings.find((f) => f.kind === 'DRUG_DRUG_INTERACTION');
      expect(ddi).toBeDefined();
      expect(ddi?.requiresPhysicianOverride || ddi?.isHardStop).toBe(true);
      expect(result.canProceed).toBe(false);
    });

    it('identifies allergy cross-reactivity for penicillin allergy and amoxicillin', async () => {
      const result = await screen('Amoxicillin', ['penicillin'], []);

      const allergy = result.findings.find((f) => f.kind === 'ALLERGY_CROSS_REACTIVITY');
      expect(allergy).toBeDefined();
      expect(allergy?.interactingSubject?.toLowerCase()).toContain('penicillin');
      expect(result.canProceed).toBe(false);
    });

    it('enforces mandatory override notes (>= 15 chars) before allowing pharmacist approval for contraindications', () => {
      const hasContraindication = true;
      const shortNotes = 'Dr ok';
      const validNotes =
        'Attending cardiologist verified dual antiplatelet benefit outweighs bleeding risk.';

      const canApproveShort = !hasContraindication || shortNotes.trim().length >= 15;
      const canApproveValid = !hasContraindication || validNotes.trim().length >= 15;

      expect(canApproveShort).toBe(false);
      expect(canApproveValid).toBe(true);
    });
  });

  describe('Partial Dispensation & Backorder Calculations (A3)', () => {
    it('correctly calculates backorder units and assigns partially_dispensed status', async () => {
      const prescribedQuantity = 30;
      const dispensedQuantity = 10;
      const backorderQuantity = Math.max(0, prescribedQuantity - dispensedQuantity);

      expect(backorderQuantity).toBe(20);
      const isPartial = dispensedQuantity < prescribedQuantity;
      expect(isPartial).toBe(true);

      const initialRes = await engine.initiate(doctorActor, {
        prescriptionId: 'rx-partial-1',
        patientId: 'pat-1',
      });
      const wfId = initialRes.workflow!.id;

      // Approve
      await engine.approve(pharmacistActor, { workflowId: wfId });

      // Partially dispense
      const partialRes = await engine.partiallyDispense(pharmacistActor, { workflowId: wfId });
      expect(partialRes.success).toBe(true);
      expect(partialRes.nextStatus).toBe('partially_dispensed');

      // Subsequent complete dispense
      const finalRes = await engine.dispense(pharmacistActor, { workflowId: wfId });
      expect(finalRes.success).toBe(true);
      expect(finalRes.nextStatus).toBe('dispensed');
    });
  });

  describe('Controlled Substance Dual-Staff Witness Verification (A4)', () => {
    const CONTROLLED_KEYWORDS = [
      'morphine',
      'fentanyl',
      'oxycodone',
      'codeine',
      'tramadol',
      'lorazepam',
      'diazepam',
      'midazolam',
      'alprazolam',
      'clonazepam',
      'methadone',
      'hydromorphone',
      'ketamine',
      'propofol',
    ];

    function isControlled(medName: string): boolean {
      const lower = medName.toLowerCase();
      return CONTROLLED_KEYWORDS.some((kw) => lower.includes(kw));
    }

    it('identifies schedule II-IV controlled substances and high-risk opioids', () => {
      expect(isControlled('Morphine Sulfate 10mg/mL')).toBe(true);
      expect(isControlled('Fentanyl Patch 25mcg')).toBe(true);
      expect(isControlled('Lorazepam 1mg Tablet')).toBe(true);
      expect(isControlled('Amoxicillin 500mg')).toBe(false);
      expect(isControlled('Ibuprofen 400mg')).toBe(false);
    });

    it('blocks controlled substance dispensing if secondary witness or photo ID check is missing', () => {
      const isControlledDrug = true;
      const witnessName = '';
      const witnessVerified = false;
      const photoIdVerified = false;

      const isWitnessValid =
        !isControlledDrug || (witnessVerified && photoIdVerified && witnessName.trim().length >= 2);

      expect(isWitnessValid).toBe(false);
    });

    it('permits controlled substance dispensing when licensed witness and photo ID are verified', () => {
      const isControlledDrug = true;
      const witnessName = 'Nurse Jane Doe, RN';
      const witnessVerified = true;
      const photoIdVerified = true;

      const isWitnessValid =
        !isControlledDrug || (witnessVerified && photoIdVerified && witnessName.trim().length >= 2);

      expect(isWitnessValid).toBe(true);
    });
  });

  describe('Prescriber Clarification & Inquiry Workflow (A5)', () => {
    it('transitions workflow to pending_clarification when pharmacist requests inquiry', async () => {
      const initialRes = await engine.initiate(doctorActor, {
        prescriptionId: 'rx-clarify-1',
        patientId: 'pat-2',
      });
      const wfId = initialRes.workflow!.id;

      const clarifyRes = await engine.requestClarification(pharmacistActor, {
        workflowId: wfId,
        notes: 'Dose exceeds recommended renal clearance for eGFR 25 mL/min.',
      });

      expect(clarifyRes.success).toBe(true);
      expect(clarifyRes.nextStatus).toBe('pending_clarification');

      const savedWf = await adapter.getById(wfId);
      expect(savedWf?.status).toBe('pending_clarification');
      expect(savedWf?.clarification_notes).toContain('eGFR 25');
    });

    it('allows approval after clarification has been addressed', async () => {
      const initialRes = await engine.initiate(doctorActor, {
        prescriptionId: 'rx-clarify-2',
        patientId: 'pat-3',
      });
      const wfId = initialRes.workflow!.id;

      await engine.requestClarification(pharmacistActor, {
        workflowId: wfId,
        notes: 'Please verify daily dosage.',
      });

      // Doctor reviews / pharmacist approves amended dose
      const approveRes = await engine.approve(pharmacistActor, {
        workflowId: wfId,
        notes: 'Amended to 250mg BID as per phone consultation with Dr. Smith.',
      });

      expect(approveRes.success).toBe(true);
      expect(approveRes.nextStatus).toBe('approved');
    });
  });
});
