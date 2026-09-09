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
  if (step === 'completed' || step === 'cancelled') return false;
  const allowed = STEP_ROLE_MAP[step as DischargeQueueStep];
  return allowed ? allowed.includes(actorRole.toLowerCase().trim()) : false;
}

export interface TransitionValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly nextStep?: DischargeWorkflowStep;
  readonly nextStatus?: DischargeWorkflow['status'];
}

export function validateStepTransition(
  workflow: DischargeWorkflow,
  actor: DischargeActor,
  action: DischargeWorkflowAction,
  options?: {
    expectedCurrentStep?: DischargeWorkflowStep;
    reason?: string;
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
  if (workflow.status === 'completed' || workflow.status === 'cancelled') {
    return {
      valid: false,
      error: `Cannot transition discharge workflow in terminal state: ${workflow.status}`,
    };
  }

  // 3. Optimistic Concurrency Guard
  if (options?.expectedCurrentStep && workflow.current_step !== options.expectedCurrentStep) {
    return {
      valid: false,
      error: `Concurrency conflict: Expected step "${options.expectedCurrentStep}", but workflow is at "${workflow.current_step}"`,
    };
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
        nextStatus: 'in_progress',
      };
    }

    case 'approve': {
      const currentStep = workflow.current_step as DischargeQueueStep;
      if (!isActorAuthorizedForStep(actor.role, currentStep)) {
        const allowedRoles = STEP_ROLE_MAP[currentStep] || [];
        return {
          valid: false,
          error: `Role "${actor.role}" is not authorized to approve step "${currentStep}". Allowed roles: ${allowedRoles.join(', ')}`,
        };
      }

      const next = NEXT_STEP[currentStep];
      const nextStatus = next === 'completed' ? 'completed' : 'in_progress';
      return {
        valid: true,
        nextStep: next,
        nextStatus,
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

      const prevStep = PREVIOUS_STEP[currentStep];
      return {
        valid: true,
        nextStep: prevStep,
        nextStatus: 'in_progress',
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
