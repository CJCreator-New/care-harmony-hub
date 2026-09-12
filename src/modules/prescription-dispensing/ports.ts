/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * Boundary Ports (Inversion of Control)
 * Decouples state machines from database persistence and real-time transports.
 */

import {
  PrescriptionWorkflow,
  PrescriptionWorkflowAuditEntry,
  PrescriptionWorkflowStatus,
} from './types';

export interface IPrescriptionDispensingRepository {
  /** Fetch a specific prescription workflow by its UUID */
  getById(id: string): Promise<PrescriptionWorkflow | null>;

  /** Fetch workflow state by associated prescription UUID */
  getByPrescriptionId(prescriptionId: string): Promise<PrescriptionWorkflow | null>;

  /** Fetch queue of workflows filtered by hospital and optional status */
  getQueue(
    hospitalId: string,
    status?: PrescriptionWorkflowStatus
  ): Promise<readonly PrescriptionWorkflow[]>;

  /** Persist a new or modified prescription workflow atomically */
  save(workflow: PrescriptionWorkflow): Promise<PrescriptionWorkflow>;

  /** Fetch chronological audit history */
  getAuditHistory(workflowId: string): Promise<readonly PrescriptionWorkflowAuditEntry[]>;
}

export interface IPrescriptionDispensingAuditLogger {
  /** Append an immutable audit record for every workflow transition */
  logTransition(entry: Omit<PrescriptionWorkflowAuditEntry, 'id' | 'created_at'>): Promise<void>;
}

export interface IPrescriptionDispensingNotifier {
  /** Dispatch notifications to pharmacy queues or real-time topics */
  notifyTransition(
    hospitalId: string,
    workflow: PrescriptionWorkflow,
    fromStatus: PrescriptionWorkflowStatus | null,
    toStatus: PrescriptionWorkflowStatus
  ): Promise<void>;
}
