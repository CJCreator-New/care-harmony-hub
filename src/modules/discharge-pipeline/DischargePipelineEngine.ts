/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Headless Core Engine: `DischargePipelineEngine`
 *
 * Orchestrates pure state transitions against repository and audit logger ports.
 * Testable with 100% in-memory doubles without network or React dependencies.
 */

import {
  DischargeActor,
  DischargeQueueStep,
  DischargeTransitionResult,
  DischargeWorkflow,
  DischargeWorkflowAuditEntry,
  DischargeWorkflowStep,
  InitiateWorkflowParams,
  TransitionStepParams,
} from './types';
import { IDischargeAuditLogger, IDischargeNotifier, IDischargeRepository } from './ports';
import { validateStepTransition } from './core/stateMachine';

export interface DischargePipelineEngineDependencies {
  readonly repo: IDischargeRepository;
  readonly auditLogger: IDischargeAuditLogger;
  readonly notifier?: IDischargeNotifier;
}

export class DischargePipelineEngine {
  constructor(private readonly deps: DischargePipelineEngineDependencies) {}

  /**
   * Initiates a new discharge workflow for a patient.
   * Only doctors or admins may initiate.
   */
  async initiate(
    actor: DischargeActor,
    params: InitiateWorkflowParams
  ): Promise<DischargeTransitionResult> {
    if (!params.patientId) {
      return { success: false, error: 'Patient ID is required to initiate discharge.' };
    }

    const now = new Date().toISOString();
    const draftWorkflow: DischargeWorkflow = {
      id: `dwf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      hospital_id: actor.hospitalId,
      patient_id: params.patientId,
      consultation_id: params.consultationId ?? null,
      initiated_by: actor.id,
      current_step: 'doctor',
      status: 'draft',
      last_action_by: null,
      last_action_at: null,
      rejection_reason: null,
      metadata: params.metadata ?? {},
      created_at: now,
      updated_at: now,
    };

    const validation = validateStepTransition(draftWorkflow, actor, 'initiate');
    if (!validation.valid || !validation.nextStep || !validation.nextStatus) {
      return { success: false, error: validation.error ?? 'Initiation validation failed' };
    }

    const activeWorkflow: DischargeWorkflow = {
      ...draftWorkflow,
      current_step: validation.nextStep,
      status: validation.nextStatus,
      last_action_by: actor.id,
      last_action_at: now,
      updated_at: now,
    };

    const saved = await this.deps.repo.save(activeWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      transition_action: 'initiate',
      from_step: 'doctor',
      to_step: validation.nextStep,
      reason: null,
      metadata: params.metadata ?? {},
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(
        saved.hospital_id,
        saved,
        'doctor',
        validation.nextStep
      );
    }

    return {
      success: true,
      workflow: saved,
      previousStep: 'doctor',
      nextStep: validation.nextStep,
    };
  }

  /**
   * Approves the current discipline step and advances to the next step.
   */
  async approve(
    actor: DischargeActor,
    params: TransitionStepParams
  ): Promise<DischargeTransitionResult> {
    const workflow = await this.deps.repo.getById(params.workflowId);
    if (!workflow) {
      return { success: false, error: `Discharge workflow not found: ${params.workflowId}` };
    }

    const validation = validateStepTransition(workflow, actor, 'approve', {
      expectedCurrentStep: params.expectedCurrentStep,
    });

    if (!validation.valid || !validation.nextStep || !validation.nextStatus) {
      return { success: false, error: validation.error ?? 'Approval validation failed' };
    }

    const now = new Date().toISOString();
    const previousStep = workflow.current_step;
    const updatedWorkflow: DischargeWorkflow = {
      ...workflow,
      current_step: validation.nextStep,
      status: validation.nextStatus,
      last_action_by: actor.id,
      last_action_at: now,
      rejection_reason: null,
      metadata: { ...workflow.metadata, ...(params.metadata ?? {}) },
      updated_at: now,
    };

    const saved = await this.deps.repo.save(updatedWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      transition_action: 'approve',
      from_step: previousStep,
      to_step: validation.nextStep,
      reason: null,
      metadata: params.metadata ?? {},
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(
        saved.hospital_id,
        saved,
        previousStep,
        validation.nextStep
      );
    }

    return {
      success: true,
      workflow: saved,
      previousStep,
      nextStep: validation.nextStep,
    };
  }

  /**
   * Rejects the current discipline step and rolls back to the preceding step.
   * Requires a substantive reason (>= 5 chars).
   */
  async reject(
    actor: DischargeActor,
    params: Required<Pick<TransitionStepParams, 'reason'>> & TransitionStepParams
  ): Promise<DischargeTransitionResult> {
    const workflow = await this.deps.repo.getById(params.workflowId);
    if (!workflow) {
      return { success: false, error: `Discharge workflow not found: ${params.workflowId}` };
    }

    const validation = validateStepTransition(workflow, actor, 'reject', {
      expectedCurrentStep: params.expectedCurrentStep,
      reason: params.reason,
      rejectionType: params.rejectionType,
    });

    if (!validation.valid || !validation.nextStep || !validation.nextStatus) {
      return { success: false, error: validation.error ?? 'Rejection validation failed' };
    }

    const now = new Date().toISOString();
    const previousStep = workflow.current_step;
    const rolledBackWorkflow: DischargeWorkflow = {
      ...workflow,
      current_step: validation.nextStep,
      status: validation.nextStatus,
      last_action_by: actor.id,
      last_action_at: now,
      rejection_reason: params.reason.trim(),
      metadata: {
        ...workflow.metadata,
        ...(params.metadata ?? {}),
        ...(params.rejectionType ? { rejectionType: params.rejectionType } : {}),
      },
      updated_at: now,
    };

    const saved = await this.deps.repo.save(rolledBackWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      transition_action: 'reject',
      from_step: previousStep,
      to_step: validation.nextStep,
      reason: params.reason.trim(),
      metadata: {
        ...(params.metadata ?? {}),
        ...(params.rejectionType ? { rejectionType: params.rejectionType } : {}),
      },
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(
        saved.hospital_id,
        saved,
        previousStep,
        validation.nextStep
      );
    }

    return {
      success: true,
      workflow: saved,
      previousStep,
      nextStep: validation.nextStep,
    };
  }

  /**
   * Fast-tracks a discharge Against Medical Advice (AMA).
   * Authorized for attending physicians and administrators.
   * Requires clinical rationale (>= 5 chars) and signed waiver metadata.
   */
  async dischargeAMA(
    actor: DischargeActor,
    params: Required<Pick<TransitionStepParams, 'reason'>> & TransitionStepParams
  ): Promise<DischargeTransitionResult> {
    const workflow = await this.deps.repo.getById(params.workflowId);
    if (!workflow) {
      return { success: false, error: `Discharge workflow not found: ${params.workflowId}` };
    }

    const validation = validateStepTransition(workflow, actor, 'discharge_ama', {
      expectedCurrentStep: params.expectedCurrentStep,
      reason: params.reason,
    });

    if (!validation.valid || !validation.nextStep || !validation.nextStatus) {
      return { success: false, error: validation.error ?? 'AMA discharge validation failed' };
    }

    const now = new Date().toISOString();
    const previousStep = workflow.current_step;
    const amaWorkflow: DischargeWorkflow = {
      ...workflow,
      current_step: validation.nextStep,
      status: validation.nextStatus,
      last_action_by: actor.id,
      last_action_at: now,
      rejection_reason: params.reason.trim(),
      metadata: {
        ...workflow.metadata,
        ...(params.metadata ?? {}),
        discharge_type: 'ama',
        ama_rationale: params.reason.trim(),
        ama_timestamp: now,
      },
      updated_at: now,
    };

    const saved = await this.deps.repo.save(amaWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      transition_action: 'discharge_ama',
      from_step: previousStep,
      to_step: validation.nextStep,
      reason: params.reason.trim(),
      metadata: {
        ...(params.metadata ?? {}),
        discharge_type: 'ama',
      },
    });

    if (this.deps.notifier) {
      await this.deps.notifier.notifyTransition(
        saved.hospital_id,
        saved,
        previousStep,
        validation.nextStep
      );
    }

    return {
      success: true,
      workflow: saved,
      previousStep,
      nextStep: validation.nextStep,
    };
  }

  /**
   * Cancels a discharge workflow in progress.
   */
  async cancel(
    actor: DischargeActor,
    params: TransitionStepParams
  ): Promise<DischargeTransitionResult> {
    const workflow = await this.deps.repo.getById(params.workflowId);
    if (!workflow) {
      return { success: false, error: `Discharge workflow not found: ${params.workflowId}` };
    }

    const validation = validateStepTransition(workflow, actor, 'cancel', {
      expectedCurrentStep: params.expectedCurrentStep,
      reason: params.reason,
    });

    if (!validation.valid || !validation.nextStep || !validation.nextStatus) {
      return { success: false, error: validation.error ?? 'Cancellation validation failed' };
    }

    const now = new Date().toISOString();
    const previousStep = workflow.current_step;
    const cancelledWorkflow: DischargeWorkflow = {
      ...workflow,
      current_step: 'cancelled',
      status: 'cancelled',
      last_action_by: actor.id,
      last_action_at: now,
      rejection_reason: params.reason?.trim() ?? 'Cancelled by clinician',
      metadata: { ...workflow.metadata, ...(params.metadata ?? {}) },
      updated_at: now,
    };

    const saved = await this.deps.repo.save(cancelledWorkflow);

    await this.deps.auditLogger.logTransition({
      workflow_id: saved.id,
      hospital_id: saved.hospital_id,
      patient_id: saved.patient_id,
      actor_id: actor.id,
      actor_role: actor.role,
      transition_action: 'cancel',
      from_step: previousStep,
      to_step: 'cancelled',
      reason: params.reason?.trim() ?? null,
      metadata: params.metadata ?? {},
    });

    return {
      success: true,
      workflow: saved,
      previousStep,
      nextStep: 'cancelled',
    };
  }

  async getWorkflow(workflowId: string): Promise<DischargeWorkflow | null> {
    return this.deps.repo.getById(workflowId);
  }

  async getAuditTrail(workflowId: string): Promise<readonly DischargeWorkflowAuditEntry[]> {
    return this.deps.repo.getAuditHistory(workflowId);
  }

  async getQueueForStep(
    hospitalId: string,
    step: DischargeQueueStep
  ): Promise<readonly DischargeWorkflow[]> {
    return this.deps.repo.getQueueForStep(hospitalId, step);
  }
}

export function createDischargePipelineEngine(
  deps: DischargePipelineEngineDependencies
): DischargePipelineEngine {
  return new DischargePipelineEngine(deps);
}
