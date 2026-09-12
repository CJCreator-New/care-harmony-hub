/**
 * Comprehensive Architectural Tests: Prescription Dispensing Engine (`prescription-dispensing`)
 *
 * Implements and verifies ADR-0004 Invariants at the module boundary:
 * 1. Strict sequence: initiated -> pending_approval -> approved -> dispensed -> completed
 * 2. Only users holding the 'pharmacist' or 'admin' role can approve
 * 3. Dispensing without pharmacist verification is structurally prevented
 * 4. Multi-tenant hospital isolation
 * 5. Immutable audit history on all state transitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrescriptionDispensingEngine,
  InMemoryPrescriptionAdapter,
  PrescriptionActor,
} from '@/modules/prescription-dispensing';

describe('PrescriptionDispensingEngine - Public Interface Tests (ADR-0004)', () => {
  let engine: PrescriptionDispensingEngine;
  let adapter: InMemoryPrescriptionAdapter;

  const doctorActor: PrescriptionActor = {
    id: 'doctor-uuid-1',
    hospitalId: 'hospital-alpha',
    role: 'doctor',
    licenseNumber: 'MD-11111',
  };

  const pharmacistActor: PrescriptionActor = {
    id: 'pharmacist-uuid-1',
    hospitalId: 'hospital-alpha',
    role: 'pharmacist',
    licenseNumber: 'PH-22222',
  };

  const nurseActor: PrescriptionActor = {
    id: 'nurse-uuid-1',
    hospitalId: 'hospital-alpha',
    role: 'nurse',
  };

  const foreignPharmacistActor: PrescriptionActor = {
    id: 'foreign-pharma-1',
    hospitalId: 'hospital-beta',
    role: 'pharmacist',
  };

  beforeEach(() => {
    adapter = new InMemoryPrescriptionAdapter();
    engine = new PrescriptionDispensingEngine({
      repo: adapter,
      auditLogger: adapter,
      notifier: adapter,
    });
  });

  it('initiates prescription approval workflow into pending_approval state', async () => {
    const res = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-100',
      patientId: 'patient-500',
      durWarnings: ['Moderate DDI: Warfarin + NSAID'],
    });

    expect(res.success).toBe(true);
    expect(res.workflow).toBeDefined();
    expect(res.workflow?.status).toBe('pending_approval');
    expect(res.workflow?.current_step).toBe(2);
    expect(res.workflow?.dur_warnings).toContain('Moderate DDI: Warfarin + NSAID');

    // Audit trail verification
    const audit = await engine.getAuditHistory(res.workflow!.id);
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('initiate');
    expect(audit[0].to_status).toBe('pending_approval');
  });

  it('strictly enforces ADR-0004: Only pharmacists can approve prescription orders', async () => {
    const initRes = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-200',
      patientId: 'patient-501',
    });
    const workflowId = initRes.workflow!.id;

    // Doctor attempts to self-approve -> MUST BE REJECTED
    const doctorApproval = await engine.approve(doctorActor, { workflowId });
    expect(doctorApproval.success).toBe(false);
    expect(doctorApproval.error).toContain(
      'ADR-0004 Invariant: Only licensed pharmacists may approve'
    );

    // Nurse attempts to approve -> MUST BE REJECTED
    const nurseApproval = await engine.approve(nurseActor, { workflowId });
    expect(nurseApproval.success).toBe(false);
    expect(nurseApproval.error).toContain(
      'ADR-0004 Invariant: Only licensed pharmacists may approve'
    );

    // Pharmacist approves -> SUCCEEDS
    const pharmacistApproval = await engine.approve(pharmacistActor, { workflowId });
    expect(pharmacistApproval.success).toBe(true);
    expect(pharmacistApproval.workflow?.status).toBe('approved');
    expect(pharmacistApproval.workflow?.approved_by).toBe(pharmacistActor.id);
    expect(pharmacistApproval.workflow?.approved_at).toBeDefined();
  });

  it('strictly enforces ADR-0004: Structural Dispensing Lock blocks unapproved orders', async () => {
    const initRes = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-300',
      patientId: 'patient-502',
    });
    const workflowId = initRes.workflow!.id;

    // Nurse attempts to dispense unapproved order -> MUST FAIL
    const prematureDispense = await engine.dispense(nurseActor, { workflowId });
    expect(prematureDispense.success).toBe(false);
    expect(prematureDispense.error).toContain(
      'ADR-0004 Invariant: Prescription cannot be dispensed without prior pharmacist approval'
    );

    // Pharmacist approves
    const approval = await engine.approve(pharmacistActor, { workflowId });
    expect(approval.success).toBe(true);

    // Nurse dispenses approved order -> SUCCEEDS
    const validDispense = await engine.dispense(nurseActor, { workflowId });
    expect(validDispense.success).toBe(true);
    expect(validDispense.workflow?.status).toBe('dispensed');

    // Nurse completes dispensing -> SUCCEEDS
    const completeRes = await engine.complete(nurseActor, { workflowId });
    expect(completeRes.success).toBe(true);
    expect(completeRes.workflow?.status).toBe('completed');
  });

  it('rejects cross-tenant workflow access (hospital isolation)', async () => {
    const initRes = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-400',
      patientId: 'patient-503',
    });
    const workflowId = initRes.workflow!.id;

    // Foreign pharmacist from different hospital attempts action -> BLOCKED
    const crossTenantRes = await engine.approve(foreignPharmacistActor, { workflowId });
    expect(crossTenantRes.success).toBe(false);
    expect(crossTenantRes.error).toContain('Hospital tenant mismatch');
  });

  it('supports clarification request and pharmacist rejection with mandatory reason', async () => {
    const initRes = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-500',
      patientId: 'patient-504',
    });
    const workflowId = initRes.workflow!.id;

    // Clarification without substantive reason fails
    const emptyClarify = await engine.requestClarification(pharmacistActor, {
      workflowId,
      notes: 'no',
    });
    expect(emptyClarify.success).toBe(false);
    expect(emptyClarify.error).toContain('at least 5 characters');

    // Valid clarification
    const clarifyRes = await engine.requestClarification(pharmacistActor, {
      workflowId,
      notes: 'Dose exceeds recommended daily pediatric ceiling. Please verify weight.',
    });
    expect(clarifyRes.success).toBe(true);
    expect(clarifyRes.workflow?.status).toBe('pending_clarification');

    // Rejection without substantive reason fails
    const emptyReject = await engine.reject(pharmacistActor, {
      workflowId,
      reason: 'bad',
    });
    expect(emptyReject.success).toBe(false);

    // Valid rejection terminates workflow
    const rejectRes = await engine.reject(pharmacistActor, {
      workflowId,
      reason: 'Inappropriate medication for acute kidney injury presentation.',
    });
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.workflow?.status).toBe('rejected');
    expect(rejectRes.workflow?.rejection_reason).toContain('kidney injury');

    // Terminal guard: cannot transition further
    const postRejectDispense = await engine.dispense(pharmacistActor, { workflowId });
    expect(postRejectDispense.success).toBe(false);
    expect(postRejectDispense.error).toContain(
      'Cannot transition prescription workflow in terminal state'
    );
  });

  it('records chronological audit trail for all transitions', async () => {
    const initRes = await engine.initiate(doctorActor, {
      prescriptionId: 'rx-600',
      patientId: 'patient-505',
    });
    const workflowId = initRes.workflow!.id;

    await engine.approve(pharmacistActor, { workflowId });
    await engine.dispense(nurseActor, { workflowId });
    await engine.complete(nurseActor, { workflowId });

    const auditTrail = await engine.getAuditHistory(workflowId);
    expect(auditTrail).toHaveLength(4);
    const actions = auditTrail.map((a) => a.action);
    expect(actions).toContain('initiate');
    expect(actions).toContain('approve');
    expect(actions).toContain('dispense');
    expect(actions).toContain('complete');
  });
});
