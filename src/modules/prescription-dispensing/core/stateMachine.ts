/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * Core State Machine & Validation Engine
 *
 * Implements ADR-0004 Invariants:
 * 1. Strict sequence: initiated -> pending_approval -> approved -> dispensed -> completed
 * 2. Only users holding the 'pharmacist' or 'admin' role can transition to 'approved'
 * 3. Dispensing without prior pharmacist verification is structurally prevented
 * 4. Multi-tenant hospital isolation
 */

import {
  PrescriptionActor,
  PrescriptionWorkflow,
  PrescriptionWorkflowAction,
  PrescriptionWorkflowStatus,
} from '../types';

export interface TransitionValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly nextStatus?: PrescriptionWorkflowStatus;
  readonly nextStep?: number;
}

export function validatePrescriptionTransition(
  workflow: PrescriptionWorkflow,
  actor: PrescriptionActor,
  action: PrescriptionWorkflowAction,
  options?: {
    expectedStatus?: PrescriptionWorkflowStatus;
    reason?: string;
    notes?: string;
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
    workflow.status === 'rejected' ||
    workflow.status === 'cancelled'
  ) {
    return {
      valid: false,
      error: `Cannot transition prescription workflow in terminal state: ${workflow.status}`,
    };
  }

  // 3. Optimistic Concurrency Guard
  if (options?.expectedStatus && workflow.status !== options.expectedStatus) {
    return {
      valid: false,
      error: `Concurrency conflict: Expected status "${options.expectedStatus}", but workflow is at "${workflow.status}"`,
    };
  }

  const role = actor.role.toLowerCase().trim();
  const isPharmacist = role === 'pharmacist' || role === 'admin';
  const isClinicalStaff = isPharmacist || role === 'doctor' || role === 'nurse';

  switch (action) {
    case 'review': {
      if (!isPharmacist) {
        return {
          valid: false,
          error: 'Only pharmacists or administrators may perform prescription review',
        };
      }
      if (workflow.status !== 'initiated' && workflow.status !== 'pending_clarification') {
        return {
          valid: false,
          error: `Cannot review prescription with status "${workflow.status}". Expected "initiated" or "pending_clarification".`,
        };
      }
      return {
        valid: true,
        nextStatus: 'pending_approval',
        nextStep: 2,
      };
    }

    case 'approve': {
      // Non-negotiable ADR-0004 Invariant
      if (!isPharmacist) {
        return {
          valid: false,
          error: 'ADR-0004 Invariant: Only licensed pharmacists may approve prescription orders.',
        };
      }
      if (workflow.status !== 'pending_approval' && workflow.status !== 'pending_clarification') {
        return {
          valid: false,
          error: `Cannot approve prescription with status "${workflow.status}". Must be in "pending_approval" or "pending_clarification".`,
        };
      }
      return {
        valid: true,
        nextStatus: 'approved',
        nextStep: 3,
      };
    }

    case 'reject': {
      if (!isPharmacist) {
        return {
          valid: false,
          error: 'Only pharmacists or administrators may reject prescription orders',
        };
      }
      if (!options?.reason || options.reason.trim().length < 5) {
        return {
          valid: false,
          error: 'A substantive rejection reason (at least 5 characters) is required',
        };
      }
      return {
        valid: true,
        nextStatus: 'rejected',
        nextStep: workflow.current_step,
      };
    }

    case 'clarify': {
      if (!isPharmacist) {
        return {
          valid: false,
          error: 'Only pharmacists or administrators may request clinical clarification',
        };
      }
      const clarificationNotes = options?.notes || options?.reason;
      if (!clarificationNotes || clarificationNotes.trim().length < 5) {
        return {
          valid: false,
          error: 'Substantive clarification notes (at least 5 characters) are required',
        };
      }
      return {
        valid: true,
        nextStatus: 'pending_clarification',
        nextStep: 2,
      };
    }

    case 'dispense': {
      if (!isClinicalStaff) {
        return {
          valid: false,
          error:
            'Only clinical staff (pharmacist, nurse, or admin) may record medication dispensing',
        };
      }

      // Non-negotiable ADR-0004 Invariant: Structural Dispensing Lock
      if (workflow.status !== 'approved' && workflow.status !== 'partially_dispensed') {
        return {
          valid: false,
          error: `ADR-0004 Invariant: Prescription cannot be dispensed without prior pharmacist approval. Current status is "${workflow.status}".`,
        };
      }

      return {
        valid: true,
        nextStatus: 'dispensed',
        nextStep: 4,
      };
    }

    case 'partially_dispense': {
      if (!isClinicalStaff) {
        return {
          valid: false,
          error:
            'Only clinical staff (pharmacist, nurse, or admin) may record medication dispensing',
        };
      }

      if (workflow.status !== 'approved' && workflow.status !== 'partially_dispensed') {
        return {
          valid: false,
          error: `ADR-0004 Invariant: Prescription cannot be partially dispensed without prior pharmacist approval. Current status is "${workflow.status}".`,
        };
      }

      return {
        valid: true,
        nextStatus: 'partially_dispensed',
        nextStep: 4,
      };
    }

    case 'complete': {
      if (!isClinicalStaff) {
        return {
          valid: false,
          error: 'Only clinical staff may mark dispensing completed',
        };
      }
      if (workflow.status !== 'dispensed' && workflow.status !== 'partially_dispensed') {
        return {
          valid: false,
          error: `Cannot complete workflow with status "${workflow.status}". Must be in "dispensed" or "partially_dispensed" state.`,
        };
      }
      return {
        valid: true,
        nextStatus: 'completed',
        nextStep: 5,
      };
    }

    case 'cancel': {
      if (!isClinicalStaff) {
        return {
          valid: false,
          error:
            'Only authorized clinical staff or administrators may cancel prescription workflows',
        };
      }
      if (!options?.reason || options.reason.trim().length < 5) {
        return {
          valid: false,
          error: 'A substantive cancellation reason (at least 5 characters) is required',
        };
      }
      return {
        valid: true,
        nextStatus: 'cancelled',
        nextStep: workflow.current_step,
      };
    }

    default:
      return {
        valid: false,
        error: `Unrecognized prescription workflow action: "${action}"`,
      };
  }
}
