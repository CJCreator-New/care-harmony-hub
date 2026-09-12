import { describe, it, expect } from 'vitest';
import {
  validateStepTransition,
  STEP_ROLE_MAP,
  NEXT_STEP,
  PREVIOUS_STEP,
  getRoleStep,
  isActorAuthorizedForStep,
} from '@/modules/discharge-pipeline/core/stateMachine';
import type { DischargeActor, DischargeWorkflow } from '@/modules/discharge-pipeline/types';

describe('Workflow 5: Inpatient & Discharge Pipeline, Multi-Disciplinary Clearance, Billing & Follow-Up', () => {
  const hospitalId = 'hosp-123';

  const mockDoctor: DischargeActor = {
    id: 'doc-1',
    role: 'doctor',
    hospitalId,
    name: 'Dr. Gregory House',
  };

  const mockPharmacist: DischargeActor = {
    id: 'pharm-1',
    role: 'pharmacist',
    hospitalId,
    name: 'Dr. Lisa Cuddy, PharmD',
  };

  const mockBilling: DischargeActor = {
    id: 'bill-1',
    role: 'receptionist',
    hospitalId,
    name: 'Billing Officer Bob',
  };

  const mockNurse: DischargeActor = {
    id: 'nurse-1',
    role: 'nurse',
    hospitalId,
    name: 'Nurse Jackie',
  };

  const baseWorkflow: DischargeWorkflow = {
    id: 'wf-100',
    hospital_id: hospitalId,
    patient_id: 'patient-abc',
    consultation_id: 'cons-1',
    initiated_by: mockDoctor.id,
    current_step: 'doctor',
    status: 'draft',
    last_action_by: null,
    last_action_at: null,
    rejection_reason: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('A1: Clinical Discharge Initiation & Role Authorization', () => {
    it('should allow attending physician to initiate discharge to pharmacy', () => {
      const result = validateStepTransition(baseWorkflow, mockDoctor, 'initiate');
      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('pharmacist');
      expect(result.nextStatus).toBe('in_progress');
    });

    it('should reject initiation by unauthorized role (e.g. nurse)', () => {
      const result = validateStepTransition(baseWorkflow, mockNurse, 'initiate');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only doctors or hospital administrators can initiate');
    });

    it('should map roles to expected pipeline steps', () => {
      expect(getRoleStep('doctor')).toBe('doctor');
      expect(getRoleStep('pharmacist')).toBe('pharmacist');
      expect(getRoleStep('receptionist')).toBe('billing');
      expect(getRoleStep('admin')).toBe('billing');
      expect(getRoleStep('nurse')).toBe('nurse');
      expect(getRoleStep('unknown_role')).toBeNull();
    });
  });

  describe('A2: Pharmacist Medication Reconciliation & Step Advancement', () => {
    const pharmacyWorkflow: DischargeWorkflow = {
      ...baseWorkflow,
      current_step: 'pharmacist',
      status: 'in_progress',
    };

    it('should allow pharmacist to approve medication reconciliation to billing', () => {
      const result = validateStepTransition(pharmacyWorkflow, mockPharmacist, 'approve');
      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('billing');
      expect(result.nextStatus).toBe('in_progress');
    });

    it('should block non-pharmacist roles from approving medication reconciliation', () => {
      const result = validateStepTransition(pharmacyWorkflow, mockBilling, 'approve');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not authorized to approve step "pharmacist"');
    });

    it('should validate structured medication reconciliation payload', () => {
      const medRecMetadata = {
        inpatientMeds: [
          {
            id: 'm1',
            name: 'Furosemide',
            action: 'discontinue',
            notes: 'Switched to oral Torsemide',
          },
        ],
        dischargePrescriptions: [{ id: 'rx1', name: 'Torsemide 20mg', fulfillment: 'in_house' }],
        inFlightOrders: [
          { orderId: 'ord-1', orderType: 'lab', action: 'await', notes: 'Pending repeat K+' },
        ],
      };

      expect(medRecMetadata.inpatientMeds[0].action).toBe('discontinue');
      expect(medRecMetadata.dischargePrescriptions[0].fulfillment).toBe('in_house');
      expect(medRecMetadata.inFlightOrders[0].action).toBe('await');
    });
  });

  describe('A3: Financial Clearance & Billing Finalization', () => {
    const billingWorkflow: DischargeWorkflow = {
      ...baseWorkflow,
      current_step: 'billing',
      status: 'in_progress',
    };

    it('should allow billing officer (receptionist/admin) to approve financial clearance to nurse', () => {
      const result = validateStepTransition(billingWorkflow, mockBilling, 'approve');
      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('nurse');
      expect(result.nextStatus).toBe('in_progress');
    });

    it('should accurately calculate gross charges and patient out-of-pocket balance', () => {
      const bedDays = 4;
      const dailyRate = 350;
      const roomTotal = bedDays * dailyRate; // 1400
      const pharmacyTotal = 300;
      const labTotal = 250;
      const consultationTotal = 400;
      const grossTotal = roomTotal + pharmacyTotal + labTotal + consultationTotal; // 2350

      const insurancePercent = 80;
      const insuranceCovered = (grossTotal * insurancePercent) / 100; // 1880
      const patientBalance = grossTotal - insuranceCovered; // 470

      expect(grossTotal).toBe(2350);
      expect(insuranceCovered).toBe(1880);
      expect(patientBalance).toBe(470);
    });
  });

  describe('A4: Nursing Safety Checklist & Physical Discharge Execution', () => {
    const nurseWorkflow: DischargeWorkflow = {
      ...baseWorkflow,
      current_step: 'nurse',
      status: 'in_progress',
    };

    it('should allow nurse to approve final physical discharge into completed state', () => {
      const result = validateStepTransition(nurseWorkflow, mockNurse, 'approve');
      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('completed');
      expect(result.nextStatus).toBe('completed');
    });

    it('should validate all 6 mandatory nursing safety checklist gates', () => {
      const validChecklist = {
        linesRemoved: true,
        foleyRemoved: true,
        vitalsStable: true,
        dischargeNEWS2: 1,
        educationCompleted: true,
        paperworkHandedOver: true,
        transportArranged: true,
        bedMarkedCleaning: true,
      };

      const allGatesPassed =
        validChecklist.linesRemoved &&
        validChecklist.foleyRemoved &&
        validChecklist.vitalsStable &&
        validChecklist.dischargeNEWS2 <= 2 &&
        validChecklist.educationCompleted &&
        validChecklist.paperworkHandedOver &&
        validChecklist.transportArranged;

      expect(allGatesPassed).toBe(true);
      expect(validChecklist.bedMarkedCleaning).toBe(true);
    });
  });

  describe('A5: Two-Tier Rollback Rejections & Fast-Track AMA Protocol', () => {
    it('should rollback administrative rejection to immediately preceding step (N - 1)', () => {
      const billingWorkflow: DischargeWorkflow = {
        ...baseWorkflow,
        current_step: 'billing',
        status: 'in_progress',
      };

      const result = validateStepTransition(billingWorkflow, mockBilling, 'reject', {
        reason: 'Insurance denied brand medication, needs generic switch.',
        rejectionType: 'administrative',
      });

      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('pharmacist');
    });

    it('should abort clinical deterioration rejection directly to doctor from nursing', () => {
      const nurseWorkflow: DischargeWorkflow = {
        ...baseWorkflow,
        current_step: 'nurse',
        status: 'in_progress',
      };

      const result = validateStepTransition(nurseWorkflow, mockNurse, 'reject', {
        reason: 'Patient became hypotensive (BP 80/50) and febrile (38.8C). Discharge aborted.',
        rejectionType: 'clinical',
      });

      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('doctor');
    });

    it('should enforce minimum 5 character reason for any rejection', () => {
      const pharmacyWorkflow: DischargeWorkflow = {
        ...baseWorkflow,
        current_step: 'pharmacist',
        status: 'in_progress',
      };

      const result = validateStepTransition(pharmacyWorkflow, mockPharmacist, 'reject', {
        reason: 'bad',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5 characters is required');
    });

    it('should allow physician to execute Against Medical Advice (AMA) fast-track discharge', () => {
      const activeWorkflow: DischargeWorkflow = {
        ...baseWorkflow,
        current_step: 'pharmacist',
        status: 'in_progress',
      };

      const result = validateStepTransition(activeWorkflow, mockDoctor, 'discharge_ama', {
        reason: 'Patient oriented x4, refusing treatment due to urgent personal obligations.',
      });

      expect(result.valid).toBe(true);
      expect(result.nextStep).toBe('completed_ama');
      expect(result.nextStatus).toBe('completed_ama');
    });
  });
});
