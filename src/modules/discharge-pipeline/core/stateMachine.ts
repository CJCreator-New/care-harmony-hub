/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Core State Machine & Validation Engine
 *
 * Implements ADR-0003 Invariants:
 * 1. Sequential 4-stage pipeline: doctor -> pharmacist -> billing -> nurse -> completed
 * 2. Strict Role-to-Step mapping:
 *    - doctor: doctor (initiation)
 *    - pharmacist: pharmacist
 *    - billing: receptionist, admin
 *    - nurse: nurse
 * 3. Rejections roll back to immediately preceding discipline with mandatory reason (>= 5 chars)
 * 4. Optimistic concurrency locking (guards against double-approvals)
 * 5. Hospital tenant isolation
 */

import {
  DischargeActor,
  DischargeQueueStep,
  DischargeRejectionType,
  DischargeWorkflow,
  DischargeWorkflowAction,
  DischargeWorkflowStep,
} from '../types';

export const STEP_ROLE_MAP: Record<DischargeQueueStep, readonly string[]> = {
  doctor: ['doctor'],
  pharmacist: ['pharmacist'],
  billing: ['receptionist', 'admin'],
  nurse: ['nurse'],
} as const;

export const NEXT_STEP: Record<DischargeQueueStep, DischargeWorkflowStep> = {
  doctor: 'pharmacist',
  pharmacist: 'billing',
  billing: 'nurse',
  nurse: 'completed',
} as const;

export const PREVIOUS_STEP: Record<Exclude<DischargeQueueStep, 'doctor'>, DischargeQueueStep> = {
  pharmacist: 'doctor',
  billing: 'pharmacist',
  nurse: 'billing',
} as const;

export function getRoleStep(role: string | null | undefined): DischargeQueueStep | null {
  if (!role) return null;
  const normalized = role.toLowerCase().trim();
  if (normalized === 'doctor') return 'doctor';
  if (normalized === 'pharmacist') return 'pharmacist';
  if (normalized === 'nurse') return 'nurse';
  if (normalized === 'receptionist' || normalized === 'admin') return 'billing';
  return null;
}

export function isActorAuthorizedForStep(actorRole: string, step: DischargeWorkflowStep): boolean {
  if (step === 'completed' || step === 'completed_ama' || step === 'cancelled') return false;
  const allowed = STEP_ROLE_MAP[step as DischargeQueueStep];
  return allowed ? allowed.includes(actorRole.toLowerCase().trim()) : false;
}

export interface TransitionValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly nextStep?: DischargeWorkflowStep;
  readonly nextStatus?: DischargeWorkflow['status'];
  /** ADR-0014: the discipline actually clearing when acting during staging. */
  readonly actingStep?: DischargeQueueStep;
}

export function validateStepTransition(
  workflow: DischargeWorkflow,
  actor: DischargeActor,
  action: DischargeWorkflowAction,
  options?: {
    expectedCurrentStep?: DischargeWorkflowStep;
    reason?: string;
    rejectionType?: DischargeRejectionType;
  }
): TransitionValidationResult {
  // 1. Hospital Tenant Isolation
  if (workflow.hospital_id !== actor.hospitalId) {
    return {
      valid: false,
      error: `Hospital tenant mismatch: Actor hospital (${actor.hospitalId}) does not match workflow (${workflow.hospital_id})`,
    };
  }

  // 2. Terminal State Guard
  if (
    workflow.status === 'completed' ||
    workflow.status === 'completed_ama' ||
    workflow.status === 'cancelled'
  ) {
    return {
      valid: false,
      error: `Cannot transition discharge workflow in terminal state: ${workflow.status}`,
    };
  }

  // 3. Optimistic Concurrency Guard
  if (options?.expectedCurrentStep && workflow.current_step !== options.expectedCurrentStep) {
    // ADR-0014: during staging the other discipline may still be clearing in parallel.
    const stagingParallelClearance =
      workflow.status === 'staging' &&
      ((workflow.current_step === 'pharmacist' &&
        options.expectedCurrentStep === 'billing' &&
        !workflow.billing_cleared &&
        isActorAuthorizedForStep(actor.role, 'billing')) ||
        (workflow.current_step === 'billing' &&
          options.expectedCurrentStep === 'pharmacist' &&
          !workflow.pharmacy_cleared &&
          isActorAuthorizedForStep(actor.role, 'pharmacist')));

    if (!stagingParallelClearance) {
      return {
        valid: false,
        error: `Concurrency conflict: Expected step "${options.expectedCurrentStep}", but workflow is at "${workflow.current_step}"`,
      };
    }
  }

  // 4. Action Specific Validations
  switch (action) {
    case 'initiate': {
      if (workflow.current_step !== 'doctor') {
        return {
          valid: false,
          error: `Workflow cannot be initiated from step "${workflow.current_step}"`,
        };
      }
      if (actor.role !== 'doctor' && actor.role !== 'admin') {
        return {
          valid: false,
          error: `Only doctors or hospital administrators can initiate a discharge workflow`,
        };
      }
      return {
        valid: true,
        nextStep: 'pharmacist',
        nextStatus: 'staging',
      };
    }

    case 'approve': {
      // ADR-0014: while staging, the discipline that is not the parked step may
      // still record its clearance.
      const parallelStep: DischargeQueueStep | null =
        workflow.status === 'staging' &&
        workflow.current_step === 'pharmacist' &&
        !workflow.billing_cleared &&
        isActorAuthorizedForStep(actor.role, 'billing')
          ? 'billing'
          : workflow.status === 'staging' &&
              workflow.current_step === 'billing' &&
              !workflow.pharmacy_cleared &&
              isActorAuthorizedForStep(actor.role, 'pharmacist')
            ? 'pharmacist'
            : null;

      const currentStep = parallelStep ?? (workflow.current_step as DischargeQueueStep);
      if (!isActorAuthorizedForStep(actor.role, currentStep)) {
        const allowedRoles = STEP_ROLE_MAP[currentStep] || [];
        return {
          valid: false,
          error: `Role "${actor.role}" is not authorized to approve step "${currentStep}". Allowed roles: ${allowedRoles.join(', ')}`,
        };
      }

      // The workflow advances to nursing only when both clearances are recorded.
      if (currentStep === 'pharmacist') {
        return workflow.billing_cleared
          ? { valid: true, nextStep: 'nurse', nextStatus: 'in_progress', actingStep: currentStep }
          : { valid: true, nextStep: 'billing', nextStatus: 'staging', actingStep: currentStep };
      }

      if (currentStep === 'billing') {
        return workflow.pharmacy_cleared
          ? { valid: true, nextStep: 'nurse', nextStatus: 'in_progress', actingStep: currentStep }
          : { valid: true, nextStep: 'pharmacist', nextStatus: 'staging', actingStep: currentStep };
      }

      if (currentStep === 'nurse') {
        if (!workflow.doctor_signed || !workflow.pharmacy_cleared || !workflow.billing_cleared) {
          return {
            valid: false,
            error:
              'Discharge release locked: doctor signature, pharmacy clearance, and billing clearance are all required before nursing handover.',
          };
        }

        return {
          valid: true,
          nextStep: 'completed',
          nextStatus: 'completed',
          actingStep: currentStep,
        };
      }

      return {
        valid: true,
        nextStep: NEXT_STEP[currentStep],
        nextStatus: 'in_progress',
        actingStep: currentStep,
      };
    }

    case 'reject': {
      const currentStep = workflow.current_step as DischargeQueueStep;
      if (!isActorAuthorizedForStep(actor.role, currentStep)) {
        const allowedRoles = STEP_ROLE_MAP[currentStep] || [];
        return {
          valid: false,
          error: `Role "${actor.role}" is not authorized to reject step "${currentStep}". Allowed roles: ${allowedRoles.join(', ')}`,
        };
      }

      if (currentStep === 'doctor') {
        return {
          valid: false,
          error: 'Doctor initiation step cannot be rejected; cancel the workflow instead.',
        };
      }

      const reason = options?.reason?.trim();
      if (!reason || reason.length < 5) {
        return {
          valid: false,
          error:
            'A substantive rejection reason of at least 5 characters is required for rollback.',
        };
      }

      // Two-Tier Rollback (Q1):
      // Clinical rejection (e.g. vital instability, acute deterioration) aborts directly back to Step 1 (doctor).
      // Administrative rejection (default) rolls back to the immediately preceding discipline (N - 1).
      const prevStep =
        options?.rejectionType === 'clinical' ? 'doctor' : PREVIOUS_STEP[currentStep];

      return {
        valid: true,
        nextStep: prevStep,
        nextStatus: 'in_progress',
      };
    }

    case 'discharge_ama': {
      // Dedicated AMA Fast-Track (Q4):
      // Allows physician or admin to execute Against Medical Advice discharge directly.
      if (actor.role !== 'doctor' && actor.role !== 'admin') {
        return {
          valid: false,
          error:
            'Only an attending physician or hospital administrator can execute an Against Medical Advice (AMA) discharge.',
        };
      }

      const reason = options?.reason?.trim();
      if (!reason || reason.length < 5) {
        return {
          valid: false,
          error:
            'A substantive clinical rationale of at least 5 characters is required for Against Medical Advice (AMA) discharge.',
        };
      }

      return {
        valid: true,
        nextStep: 'completed_ama',
        nextStatus: 'completed_ama',
      };
    }

    case 'cancel': {
      const isInitiator = workflow.initiated_by === actor.id;
      const isAdmin = actor.role === 'admin';
      const isAttendingDoctor = actor.role === 'doctor';

      if (!isInitiator && !isAdmin && !isAttendingDoctor) {
        return {
          valid: false,
          error:
            'Only the initiating physician or an administrator can cancel this discharge workflow.',
        };
      }

      return {
        valid: true,
        nextStep: 'cancelled',
        nextStatus: 'cancelled',
      };
    }

    default:
      return { valid: false, error: `Unrecognized workflow action: ${action}` };
  }
}
