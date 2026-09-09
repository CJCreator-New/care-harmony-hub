/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Boundary Ports (Inversion of Control)
 * Decouples domain state machines from database persistence and real-time transports.
 */

import { DischargeQueueStep, DischargeWorkflow, DischargeWorkflowAuditEntry } from './types';

export interface IDischargeRepository {
  /** Fetch a specific discharge workflow by its UUID */
  getById(id: string): Promise<DischargeWorkflow | null>;

  /** Fetch full audit history for a workflow ordered chronologically */
  getAuditHistory(workflowId: string): Promise<readonly DischargeWorkflowAuditEntry[]>;

  /** Fetch active in-progress items waiting at a specific discipline queue */
  getQueueForStep(
    hospitalId: string,
    step: DischargeQueueStep
  ): Promise<readonly DischargeWorkflow[]>;

  /** Persist a new or modified discharge workflow atomically */
  save(workflow: DischargeWorkflow): Promise<DischargeWorkflow>;
}

export interface IDischargeAuditLogger {
  /** Append an immutable audit record for every workflow transition */
  logTransition(entry: Omit<DischargeWorkflowAuditEntry, 'id' | 'created_at'>): Promise<void>;
}

export interface IDischargeNotifier {
  /** Dispatch notifications to clinical queues or real-time topics */
  notifyTransition(
    hospitalId: string,
    workflow: DischargeWorkflow,
    fromStep: string | null,
    toStep: string
  ): Promise<void>;
}
