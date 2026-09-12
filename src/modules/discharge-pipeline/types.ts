/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Domain Types & Contracts
 * Compliant with ADR-0003 (Sequential Multi-Role Discharge Pipeline)
 */

export type DischargeWorkflowStep =
  'doctor' | 'pharmacist' | 'billing' | 'nurse' | 'completed' | 'completed_ama' | 'cancelled';

export type DischargeWorkflowStatus =
  'draft' | 'in_progress' | 'completed' | 'completed_ama' | 'cancelled';

export type DischargeWorkflowQueueStep = Extract<
  DischargeWorkflowStep,
  'doctor' | 'pharmacist' | 'billing' | 'nurse'
>;
export type DischargeQueueStep = DischargeWorkflowQueueStep;

export type DischargeWorkflowAction =
  'initiate' | 'approve' | 'reject' | 'cancel' | 'discharge_ama';

export type DischargeRejectionType = 'administrative' | 'clinical';

export type InFlightOrderAction = 'cancel' | 'await' | 'outpatient_followup';

export interface InFlightOrderReconciliation {
  readonly orderId: string;
  readonly orderType: 'lab' | 'medication';
  readonly action: InFlightOrderAction;
  readonly notes?: string;
}

export type DischargeMedicationFulfillmentType = 'in_house' | 'external';

export interface DischargeActor {
  readonly id: string;
  readonly role: string;
  readonly hospitalId: string;
  readonly name?: string;
}

export interface DischargeWorkflow {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  initiated_by: string;
  current_step: DischargeWorkflowStep;
  status: DischargeWorkflowStatus;
  last_action_by: string | null;
  last_action_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DischargeWorkflowAuditEntry {
  id: string;
  workflow_id: string;
  hospital_id: string;
  patient_id: string;
  actor_id: string;
  actor_role: string;
  transition_action: DischargeWorkflowAction;
  from_step: string | null;
  to_step: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InitiateWorkflowParams {
  patientId: string;
  consultationId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionStepParams {
  workflowId: string;
  expectedCurrentStep?: DischargeWorkflowStep;
  reason?: string;
  rejectionType?: DischargeRejectionType;
  metadata?: Record<string, unknown>;
}

export interface DischargeTransitionResult {
  readonly success: boolean;
  readonly workflow?: DischargeWorkflow;
  readonly previousStep?: DischargeWorkflowStep;
  readonly nextStep?: DischargeWorkflowStep;
  readonly error?: string;
}
