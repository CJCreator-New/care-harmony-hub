/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * Domain Types & Contracts
 *
 * Implements ADR-0004 Invariants:
 * 1. Sequential lifecycle: initiated -> pending_approval -> approved -> dispensed -> completed
 * 2. Strict Pharmacist Role Gating: Only pharmacists may transition orders to approved
 * 3. Dispensing Lock: Direct dispensation from initiated/pending_approval is structurally forbidden
 */

export type PrescriptionWorkflowStatus =
  | 'initiated'
  | 'pending_approval'
  | 'pending_clarification'
  | 'approved'
  | 'partially_dispensed'
  | 'dispensed'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PrescriptionWorkflowAction =
  | 'initiate'
  | 'review'
  | 'approve'
  | 'reject'
  | 'clarify'
  | 'dispense'
  | 'partially_dispense'
  | 'complete'
  | 'cancel';

export interface PrescriptionActor {
  readonly id: string;
  readonly hospitalId: string;
  readonly role: string;
  readonly licenseNumber?: string;
}

export interface PrescriptionWorkflow {
  readonly id: string;
  readonly hospital_id: string;
  readonly prescription_id: string;
  readonly patient_id: string;
  readonly initiated_by: string;
  readonly status: PrescriptionWorkflowStatus;
  readonly current_step: number;
  readonly approved_by?: string | null;
  readonly approved_at?: string | null;
  readonly rejection_reason?: string | null;
  readonly rejected_at?: string | null;
  readonly dur_check_passed?: boolean | null;
  readonly dur_warnings?: readonly string[] | null;
  readonly clarification_notes?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PrescriptionWorkflowAuditEntry {
  readonly id: string;
  readonly workflow_id: string;
  readonly hospital_id: string;
  readonly prescription_id: string;
  readonly patient_id: string;
  readonly actor_id: string;
  readonly actor_role: string;
  readonly action: PrescriptionWorkflowAction;
  readonly from_status: PrescriptionWorkflowStatus | null;
  readonly to_status: PrescriptionWorkflowStatus;
  readonly reason?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly created_at: string;
}

export interface InitiatePrescriptionWorkflowParams {
  readonly prescriptionId: string;
  readonly patientId: string;
  readonly durWarnings?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface TransitionPrescriptionStepParams {
  readonly workflowId: string;
  readonly expectedStatus?: PrescriptionWorkflowStatus;
  readonly reason?: string;
  readonly notes?: string;
  readonly durWarnings?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface PrescriptionTransitionResult {
  readonly success: boolean;
  readonly workflow?: PrescriptionWorkflow;
  readonly error?: string;
  readonly previousStatus?: PrescriptionWorkflowStatus;
  readonly nextStatus?: PrescriptionWorkflowStatus;
  readonly durWarnings?: readonly string[];
}
