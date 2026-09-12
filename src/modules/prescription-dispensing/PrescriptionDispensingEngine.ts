/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * Headless Core Engine: `PrescriptionDispensingEngine`
 *
 * Orchestrates pure prescription workflow transitions against repository,
 * audit logger, and notifier ports.
 *
 * Implements ADR-0004 Invariants:
 * 1. Strict sequence: initiated -> pending_approval -> approved -> dispensed -> completed
 * 2. Only users holding the 'pharmacist' or 'admin' role can approve
 * 3. Dispensing without pharmacist approval is structurally prevented
 */

import {
  InitiatePrescriptionWorkflowParams,
  PrescriptionActor,
  PrescriptionTransitionResult,
  PrescriptionWorkflow,
  PrescriptionWorkflowAuditEntry,
  PrescriptionWorkflowStatus,
  TransitionPrescriptionStepParams,
} from './types';
import {
  IPrescriptionDispensingAuditLogger,
  IPrescriptionDispensingNotifier,
  IPrescriptionDispensingRepository,
} from './ports';
import { validatePrescriptionTransition } from './core/stateMachine';
import { SupabasePrescriptionAdapter } from './adapters/SupabasePrescriptionAdapter';

export interface PrescriptionDispensingDependencies {
  readonly repo: IPrescriptionDispensingRepository;
  readonly auditLogger: IPrescriptionDispensingAuditLogger;
  readonly notifier?: IPrescriptionDispensingNotifier;
}

export class PrescriptionDispensingEngine {
  constructor(private readonly deps: PrescriptionDispensingDependencies) {}

  /**
   * Initiates a new prescription approval workflow.
   */
  async initiate(
    actor: PrescriptionActor,
    params: InitiatePrescriptionWorkflowParams
  ): Promise<PrescriptionTransitionResult> {
    if (!params.prescriptionId || !params.patientId) {
      return {
        success: false,
        error: 'Prescription ID and Patient ID are required to initiate approval workflow.',
      };
    }

    const now = new Date().toISOString();
    const workflowId = `pwf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const newWorkflow: PrescriptionWorkflow = {
      id: workflowId,
      hospital_id: actor.hospitalId,
      prescription_id: params.prescriptionId,
      patient_id: params.patientId,
      initiated_by: actor.id,
      status: 'pending_approval', // Directly enters pharmacist review queue upon initiation
      current_step: 2,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      rejected_at: null,
      dur_check_passed: !params.durWarnings || params.durWarnings.length === 0,
      dur_warnings: params.durWarnings ?? [],
      clarification_notes: null,
      metadata: params.metadata ?? {},
      created_at: now,
      updated_at: now,
    };

    const saved = await this.deps.repo.save(newWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      prescription_id: saved.prescription_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      action: 'initiate',
      from_status: null,
      to_status: saved.status,
      reason: null,
      metadata: params.metadata ?? {},
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(saved.hospital_id, saved, null, saved.status);
    }

    return {
      success: true,
      workflow: saved,
      previousStatus: undefined,
      nextStatus: saved.status,
      durWarnings: saved.dur_warnings ?? undefined,
    };
  }

  /**
   * Advances workflow to pending_approval from initiated or clarification.
   */
  async review(
    actor: PrescriptionActor,
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'review', params);
  }

  /**
   * Approves prescription for dispensing.
   * Gated strictly on the pharmacist (or admin) role per ADR-0004.
   */
  async approve(
    actor: PrescriptionActor,
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'approve', params);
  }

  /**
   * Rejects prescription approval with mandatory reason (>= 5 chars).
   */
  async reject(
    actor: PrescriptionActor,
    params: Required<Pick<TransitionPrescriptionStepParams, 'reason'>> &
      TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'reject', params);
  }

  /**
   * Requests clinical clarification from prescriber.
   */
  async requestClarification(
    actor: PrescriptionActor,
    params: Required<Pick<TransitionPrescriptionStepParams, 'notes'>> &
      TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'clarify', params);
  }

  /**
   * Records medication dispensing.
   * ADR-0004 Structural Lock: Rejected if status is not 'approved'.
   */
  async dispense(
    actor: PrescriptionActor,
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'dispense', params);
  }

  /**
   * Records partial medication dispensing.
   * ADR-0004 Structural Lock: Rejected if status is not 'approved' or 'partially_dispensed'.
   */
  async partiallyDispense(
    actor: PrescriptionActor,
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'partially_dispense', params);
  }

  /**
   * Marks dispensing process completed.
   */
  async complete(
    actor: PrescriptionActor,
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'complete', params);
  }

  /**
   * Cancels a workflow in progress with mandatory reason.
   */
  async cancel(
    actor: PrescriptionActor,
    params: Required<Pick<TransitionPrescriptionStepParams, 'reason'>> &
      TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    return this.executeTransition(actor, 'cancel', params);
  }

  private async executeTransition(
    actor: PrescriptionActor,
    action:
      | 'review'
      | 'approve'
      | 'reject'
      | 'clarify'
      | 'dispense'
      | 'partially_dispense'
      | 'complete'
      | 'cancel',
    params: TransitionPrescriptionStepParams
  ): Promise<PrescriptionTransitionResult> {
    const workflow = await this.deps.repo.getById(params.workflowId);
    if (!workflow) {
      return {
        success: false,
        error: `Prescription workflow not found: ${params.workflowId}`,
      };
    }

    const validation = validatePrescriptionTransition(workflow, actor, action, {
      expectedStatus: params.expectedStatus,
      reason: params.reason,
      notes: params.notes,
    });

    if (!validation.valid || !validation.nextStatus || validation.nextStep === undefined) {
      return {
        success: false,
        error: validation.error ?? `Prescription transition "${action}" validation failed`,
      };
    }

    const now = new Date().toISOString();
    const previousStatus = workflow.status;

    let updatedWorkflow: PrescriptionWorkflow = {
      ...workflow,
      status: validation.nextStatus,
      current_step: validation.nextStep,
      updated_at: now,
    };

    if (action === 'approve') {
      updatedWorkflow = {
        ...updatedWorkflow,
        approved_by: actor.id,
        approved_at: now,
        dur_warnings: params.durWarnings ?? workflow.dur_warnings ?? [],
      };
    } else if (action === 'reject') {
      updatedWorkflow = {
        ...updatedWorkflow,
        rejection_reason: params.reason?.trim() ?? 'Rejected by pharmacist',
        rejected_at: now,
      };
    } else if (action === 'clarify') {
      updatedWorkflow = {
        ...updatedWorkflow,
        clarification_notes: (params.notes || params.reason)?.trim() ?? null,
      };
    } else if (action === 'cancel') {
      updatedWorkflow = {
        ...updatedWorkflow,
        rejection_reason: params.reason?.trim() ?? 'Cancelled by clinician',
      };
    }

    const saved = await this.deps.repo.save(updatedWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      prescription_id: saved.prescription_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      action,
      from_status: previousStatus,
      to_status: validation.nextStatus,
      reason: params.reason || params.notes || null,
      metadata: params.metadata ?? {},
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(
        saved.hospital_id,
        saved,
        previousStatus,
        validation.nextStatus
      );
    }

    return {
      success: true,
      workflow: saved,
      previousStatus,
      nextStatus: validation.nextStatus,
      durWarnings: saved.dur_warnings ?? undefined,
    };
  }

  async getWorkflow(id: string): Promise<PrescriptionWorkflow | null> {
    return this.deps.repo.getById(id);
  }

  async getWorkflowByPrescriptionId(prescriptionId: string): Promise<PrescriptionWorkflow | null> {
    return this.deps.repo.getByPrescriptionId(prescriptionId);
  }

  async getQueue(
    hospitalId: string,
    status?: PrescriptionWorkflowStatus
  ): Promise<readonly PrescriptionWorkflow[]> {
    return this.deps.repo.getQueue(hospitalId, status);
  }

  async getAuditHistory(workflowId: string): Promise<readonly PrescriptionWorkflowAuditEntry[]> {
    return this.deps.repo.getAuditHistory(workflowId);
  }
}

export function createPrescriptionDispensingEngine(
  dependencies?: Partial<PrescriptionDispensingDependencies>
): PrescriptionDispensingEngine {
  const defaultAdapter = new SupabasePrescriptionAdapter();
  return new PrescriptionDispensingEngine({
    repo: dependencies?.repo ?? defaultAdapter,
    auditLogger: dependencies?.auditLogger ?? defaultAdapter,
    notifier: dependencies?.notifier ?? defaultAdapter,
  });
}
