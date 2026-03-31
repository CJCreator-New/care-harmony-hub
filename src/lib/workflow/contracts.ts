import { UserRole } from '@/types/auth';

export const WORKFLOW_EVENT_TYPES = {
  // Patient Journey Events
  PATIENT_CHECKED_IN: 'patient.checked_in',
  VITALS_RECORDED: 'vitals.recorded',
  PATIENT_READY_FOR_DOCTOR: 'patient.ready_for_doctor',
  CONSULTATION_STARTED: 'consultation.started',
  CONSULTATION_COMPLETED: 'consultation.completed',

  // Lab Events
  LAB_ORDER_CREATED: 'lab.order_created',
  LAB_SAMPLE_COLLECTED: 'lab.sample_collected',
  LAB_RESULTS_READY: 'lab.results_ready',
  LAB_CRITICAL_ALERT: 'lab.critical_alert',

  // Pharmacy Events
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_VERIFIED: 'prescription.verified',
  MEDICATION_DISPENSED: 'medication.dispensed',

  // Billing Events
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_RECEIVED: 'payment.received',

  // Administrative Events
  STAFF_INVITED: 'staff.invited',
  ROLE_ASSIGNED: 'role.assigned',
  ESCALATION_TRIGGERED: 'escalation.triggered',
} as const;

export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[keyof typeof WORKFLOW_EVENT_TYPES];
export type WorkflowPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WorkflowEvent {
  type: WorkflowEventType;
  sourceRole?: UserRole;
  patientId?: string;
  data: Record<string, unknown>;
  priority?: WorkflowPriority;
}

export interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'update_status' | 'escalate' | 'trigger_function';
  target_role?: string;
  target_user?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Phase 4: Audit Context Contract
 * Required for high-risk state mutations (prescription, discharge, status updates)
 * Enables forensic trail and compliance validation
 */
export interface AuditContext {
  action_type: string;
  performed_by: string;
  hospital_id: string;
  patient_id?: string;
  change_reason: string; // Required for high-risk actions
  resource_type: string; // workflow_event, prescription, discharge, etc.
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  idempotency_key?: string;
}

/**
 * High-risk action types that mandate audit context
 */
export const HIGH_RISK_ACTION_TYPES = new Set([
  'update_status',
  'trigger_function',
  'escalate',
] as const);

/**
 * Validate audit context for high-risk actions
 * Returns true if valid, throws error if missing required fields
 */
export const validateAuditContext = (
  actionType: string,
  auditContext?: Partial<AuditContext>
): auditContext is AuditContext => {
  if (!HIGH_RISK_ACTION_TYPES.has(actionType as any)) {
    return true; // Not a high-risk action, audit context optional
  }

  if (!auditContext) {
    throw new Error(
      `Audit context required for high-risk action '${actionType}'`
    );
  }

  if (!auditContext.change_reason || auditContext.change_reason.trim() === '') {
    throw new Error(
      `change_reason is required in audit context for action '${actionType}'`
    );
  }

  if (!auditContext.performed_by) {
    throw new Error(
      `performed_by is required in audit context for action '${actionType}'`
    );
  }

  if (!auditContext.hospital_id) {
    throw new Error(
      `hospital_id is required in audit context for action '${actionType}'`
    );
  }

  if (!auditContext.resource_type) {
    throw new Error(
      `resource_type is required in audit context for action '${actionType}'`
    );
  }

  return true;
};

/**
 * Sanitize change_reason for audit logs (strip PHI, sensitive data)
 */
export const sanitizeChangeReason = (reason: string): string => {
  if (!reason) return '';
  // Remove email addresses, phone numbers, MRN patterns
  return reason
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\bMRN\s*[\d\-]+\b/gi, '[MRN]')
    .trim();
};
