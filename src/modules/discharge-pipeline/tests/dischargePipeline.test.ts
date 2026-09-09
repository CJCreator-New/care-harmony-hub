/**
 * Deep Module Test Suite: `discharge-pipeline`
 *
 * Rules Enforced:
 * 1. Imports ONLY through the public root entry point `../index`.
 * 2. Uses `@total-typescript/shoehorn`'s `cast()` for type safety.
 * 3. Validates ADR-0003 sequential workflow invariants, role permissions,
 *    rejection rollbacks, tenant isolation, and audit logging.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { cast } from '@total-typescript/shoehorn';
import {
  createDischargePipelineEngine,
  InMemoryDischargeAdapter,
  STEP_ROLE_MAP,
  NEXT_STEP,
  PREVIOUS_STEP,
  getRoleStep,
  type DischargeActor,
  type DischargeWorkflow,
} from '../index';

describe('DischargePipelineEngine (ADR-0003 Sequential Multi-Role Pipeline)', () => {
  let adapter: InMemoryDischargeAdapter;
  let engine: ReturnType<typeof createDischargePipelineEngine>;

  const doctorActor: DischargeActor = {
    id: 'doc-001',
    role: 'doctor',
    hospitalId: 'hosp-metro',
    name: 'Dr. Gregory House',
  };

  const pharmacistActor: DischargeActor = {
    id: 'pharm-001',
    role: 'pharmacist',
    hospitalId: 'hosp-metro',
    name: 'PharmD Wilson',
  };

  const billingActor: DischargeActor = {
    id: 'bill-001',
    role: 'receptionist',
    hospitalId: 'hosp-metro',
    name: 'Cuddy Cashier',
  };

  const nurseActor: DischargeActor = {
    id: 'nurse-001',
    role: 'nurse',
    hospitalId: 'hosp-metro',
    name: 'Nurse Brenda',
  };

  const intruderActor: DischargeActor = {
    id: 'intruder-001',
    role: 'doctor',
    hospitalId: 'hosp-other',
    name: 'Dr. Rogue',
  };

  beforeEach(() => {
    adapter = new InMemoryDischargeAdapter();
    engine = createDischargePipelineEngine({
      repo: adapter,
      auditLogger: adapter,
      notifier: adapter,
    });
  });

  describe('Sequential Happy Path (Doctor -> Pharmacist -> Billing -> Nurse -> Completed)', () => {
    it('advances a patient release through all 4 disciplines in strict sequential order', async () => {
      // 1. Doctor initiates
      const initResult = await engine.initiate(doctorActor, {
        patientId: 'pat-12345',
        consultationId: 'con-67890',
        metadata: { clinicalDischargeSummary: 'Patient hemodynamically stable' },
      });

      expect(initResult.success).toBe(true);
      expect(initResult.workflow?.current_step).toBe('pharmacist');
      expect(initResult.workflow?.status).toBe('in_progress');
      const workflowId = initResult.workflow!.id;

      // 2. Pharmacist reconciles medications & approves
      const pharmResult = await engine.approve(pharmacistActor, {
        workflowId,
        expectedCurrentStep: 'pharmacist',
        metadata: { medReconciliationCompleted: true },
      });

      expect(pharmResult.success).toBe(true);
      expect(pharmResult.workflow?.current_step).toBe('billing');
      expect(pharmResult.workflow?.status).toBe('in_progress');

      // 3. Billing collects copay & approves
      const billingResult = await engine.approve(billingActor, {
        workflowId,
        expectedCurrentStep: 'billing',
        metadata: { invoiceSettled: true },
      });

      expect(billingResult.success).toBe(true);
      expect(billingResult.workflow?.current_step).toBe('nurse');
      expect(billingResult.workflow?.status).toBe('in_progress');

      // 4. Nurse conducts final discharge education & releases patient
      const nurseResult = await engine.approve(nurseActor, {
        workflowId,
        expectedCurrentStep: 'nurse',
        metadata: { physicalAssessmentComplete: true },
      });

      expect(nurseResult.success).toBe(true);
      expect(nurseResult.workflow?.current_step).toBe('completed');
      expect(nurseResult.workflow?.status).toBe('completed');

      // Verify audit trail captures all 4 transitions in chronological order
      const auditTrail = await engine.getAuditTrail(workflowId);
      expect(auditTrail.length).toBe(4);
      expect(auditTrail[0].transition_action).toBe('approve');
      expect(auditTrail[0].to_step).toBe('completed');
      expect(auditTrail[3].transition_action).toBe('initiate');
    });
  });

  describe('Discipline Role Authorization Invariants', () => {
    it('rejects an action if the actor role does not match the active step', async () => {
      const initResult = await engine.initiate(doctorActor, {
        patientId: 'pat-12345',
      });
      const workflowId = initResult.workflow!.id;

      // Current step is 'pharmacist'. Doctor attempts to approve pharmacist step:
      const illegalDoctorApprove = await engine.approve(doctorActor, {
        workflowId,
      });

      expect(illegalDoctorApprove.success).toBe(false);
      expect(illegalDoctorApprove.error).toMatch(
        /Role "doctor" is not authorized to approve step "pharmacist"/
      );

      // Current step is still 'pharmacist'. Nurse attempts to approve:
      const illegalNurseApprove = await engine.approve(nurseActor, {
        workflowId,
      });

      expect(illegalNurseApprove.success).toBe(false);
      expect(illegalNurseApprove.error).toMatch(
        /Role "nurse" is not authorized to approve step "pharmacist"/
      );

      // Workflow state remains intact at 'pharmacist'
      const current = await engine.getWorkflow(workflowId);
      expect(current?.current_step).toBe('pharmacist');
    });

    it('rejects non-clinical role from initiating a discharge', async () => {
      const illegalInit = await engine.initiate(nurseActor, {
        patientId: 'pat-999',
      });

      expect(illegalInit.success).toBe(false);
      expect(illegalInit.error).toMatch(/Only doctors or hospital administrators can initiate/);
    });
  });

  describe('Rejection Rollback & Reason Enforcement', () => {
    it('rolls back from Pharmacist to Doctor when a substantive reason is provided', async () => {
      const initResult = await engine.initiate(doctorActor, {
        patientId: 'pat-12345',
      });
      const workflowId = initResult.workflow!.id;

      // Rejection with too short a reason (< 5 chars) is rejected
      const shortReasonResult = await engine.reject(pharmacistActor, {
        workflowId,
        reason: 'bad',
      });
      expect(shortReasonResult.success).toBe(false);
      expect(shortReasonResult.error).toMatch(
        /substantive rejection reason of at least 5 characters/
      );

      // Rejection with valid reason rolls back to 'doctor'
      const rejectResult = await engine.reject(pharmacistActor, {
        workflowId,
        reason:
          'Unresolved drug-drug interaction between Warfarin and Aspirin requires physician review',
      });

      expect(rejectResult.success).toBe(true);
      expect(rejectResult.workflow?.current_step).toBe('doctor');
      expect(rejectResult.workflow?.rejection_reason).toMatch(/Unresolved drug-drug interaction/);
    });

    it('rolls back from Billing to Pharmacist upon billing rejection', async () => {
      const initResult = await engine.initiate(doctorActor, { patientId: 'pat-12345' });
      const workflowId = initResult.workflow!.id;

      await engine.approve(pharmacistActor, { workflowId });

      // Current step is 'billing'. Billing rejects back to 'pharmacist':
      const billingReject = await engine.reject(billingActor, {
        workflowId,
        reason: 'Missing pharmacy insurance pre-authorization code',
      });

      expect(billingReject.success).toBe(true);
      expect(billingReject.workflow?.current_step).toBe('pharmacist');
      expect(billingReject.workflow?.rejection_reason).toBe(
        'Missing pharmacy insurance pre-authorization code'
      );
    });
  });

  describe('Tenant Isolation & Concurrency Guards', () => {
    it('blocks actors from other hospital tenants (Cross-Hospital BOLA Prevention)', async () => {
      const initResult = await engine.initiate(doctorActor, { patientId: 'pat-12345' });
      const workflowId = initResult.workflow!.id;

      // Doctor from different hospital attempts to approve:
      const crossTenantResult = await engine.approve(intruderActor, { workflowId });

      expect(crossTenantResult.success).toBe(false);
      expect(crossTenantResult.error).toMatch(/Hospital tenant mismatch/);
    });

    it('detects optimistic concurrency conflicts when expectedCurrentStep does not match', async () => {
      const initResult = await engine.initiate(doctorActor, { patientId: 'pat-12345' });
      const workflowId = initResult.workflow!.id;

      // Pharmacist approves, advancing to 'billing'
      await engine.approve(pharmacistActor, { workflowId });

      // Stale client attempts to approve 'pharmacist' step again:
      const staleApproval = await engine.approve(pharmacistActor, {
        workflowId,
        expectedCurrentStep: 'pharmacist',
      });

      expect(staleApproval.success).toBe(false);
      expect(staleApproval.error).toMatch(
        /Concurrency conflict: Expected step "pharmacist", but workflow is at "billing"/
      );
    });
  });

  describe('State Machine Constants & Helper Invariants', () => {
    it('correctly maps roles to discipline queue steps', () => {
      expect(getRoleStep('doctor')).toBe('doctor');
      expect(getRoleStep('pharmacist')).toBe('pharmacist');
      expect(getRoleStep('receptionist')).toBe('billing');
      expect(getRoleStep('admin')).toBe('billing');
      expect(getRoleStep('nurse')).toBe('nurse');
      expect(getRoleStep('patient')).toBeNull();
      expect(getRoleStep(null)).toBeNull();
    });

    it('enforces strict static transition tables', () => {
      expect(NEXT_STEP.doctor).toBe('pharmacist');
      expect(NEXT_STEP.pharmacist).toBe('billing');
      expect(NEXT_STEP.billing).toBe('nurse');
      expect(NEXT_STEP.nurse).toBe('completed');

      expect(PREVIOUS_STEP.pharmacist).toBe('doctor');
      expect(PREVIOUS_STEP.billing).toBe('pharmacist');
      expect(PREVIOUS_STEP.nurse).toBe('billing');
    });
  });
});
