/**
 * CareSync Phase 2A: Audit Logging Type Definitions & Integration Guide
 *
 * This file provides TypeScript types and usage patterns for integrating
 * audit logging into CareSync frontend/backend code.
 *
 * Usage:
 *   1. Import types from this file
 *   2. Use `auditLog()` function when creating clinical/financial mutations
 *   3. Use `amendmentLog()` for corrections (amendments, not overwrites)
 *   4. Query forensic functions via Supabase RPC
 */

// ============================================================================
// 1. AUDIT LOG TYPES
// ============================================================================

/** High-risk actions requiring immutable audit trails */
export enum AuditActionType {
  // Prescription workflow
  PRESCRIPTION_CREATE = 'PRESCRIPTION_CREATE',
  PRESCRIPTION_VERIFY = 'PRESCRIPTION_VERIFY',
  PRESCRIPTION_APPROVE = 'PRESCRIPTION_APPROVE',
  PRESCRIPTION_REJECT = 'PRESCRIPTION_REJECT',
  PRESCRIPTION_DISPENSE = 'PRESCRIPTION_DISPENSE',
  PRESCRIPTION_AMEND = 'PRESCRIPTION_AMEND',
  PRESCRIPTION_REVERSAL = 'PRESCRIPTION_REVERSAL',
  PRESCRIPTION_HOLD = 'PRESCRIPTION_HOLD',
  PRESCRIPTION_CANCEL = 'PRESCRIPTION_CANCEL',

  // Discharge workflow
  DISCHARGE_INITIATE = 'DISCHARGE_INITIATE',
  DISCHARGE_REVIEW = 'DISCHARGE_REVIEW',
  DISCHARGE_SIGN = 'DISCHARGE_SIGN',
  DISCHARGE_FINAL_BILL = 'DISCHARGE_FINAL_BILL',
  DISCHARGE_CLOSE = 'DISCHARGE_CLOSE',

  // Billing workflow
  INVOICE_CHARGE_CREATED = 'INVOICE_CHARGE_CREATED',
  INVOICE_PAYMENT_RECEIVED = 'INVOICE_PAYMENT_RECEIVED',
  INVOICE_ADJUSTMENT = 'INVOICE_ADJUSTMENT',
  INVOICE_DISCOUNT_APPLIED = 'INVOICE_DISCOUNT_APPLIED',
  INVOICE_REVERSAL = 'INVOICE_REVERSAL',
  INVOICE_WRITE_OFF = 'INVOICE_WRITE_OFF',
  INVOICE_RECONCILED = 'INVOICE_RECONCILED',

  // Lab workflow
  LAB_CREATED = 'LAB_CREATED',
  LAB_VERIFIED = 'LAB_VERIFIED',
  LAB_AMENDED = 'LAB_AMENDED',
  LAB_CORRECTED = 'LAB_CORRECTED',
  LAB_INVALIDATED = 'LAB_INVALIDATED',
}

/** Actor roles within CareSync */
export enum ActorRole {
  DOCTOR = 'doctor',
  PHARMACIST = 'pharmacist',
  NURSE = 'nurse',
  LAB_TECHNICIAN = 'lab_technician',
  PATHOLOGIST = 'pathologist',
  BILLING = 'billing',
  ACCOUNTANT = 'accountant',
  RECEPTIONIST = 'receptionist',
  ADMIN = 'admin',
  COMPLIANCE = 'compliance',
}

/** Entity types being audited */
export enum EntityType {
  PRESCRIPTION = 'prescription',
  INVOICE = 'invoice',
  LAB_RESULT = 'lab_result',
  DISCHARGE = 'discharge',
  PATIENT_CONSENT = 'patient_consent',
  USER_ACCESS = 'user_access',
}

/** Audit log entry structure (immutable) */
export interface AuditLogEntry {
  audit_id: string;
  event_time: string;
  hospital_id: string;
  actor_user_id: string;
  actor_role: ActorRole;
  actor_email: string;
  action_type: string;
  entity_type: EntityType;
  entity_id: string;
  patient_id?: string;
  consultation_id?: string;
  change_reason: string;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  source_ip: string;
  session_id: string;
  amends_audit_id?: string;
  hash_chain?: string;
  immutable_lock: boolean;
}

/** Amendment record structure */
export interface AmendmentRecord extends AuditLogEntry {
  amends_audit_id: string;
  amendment_justification: string;
}

// ============================================================================
// 2. AUDIT LOGGING API
// ============================================================================

export interface AuditLogParams {
  entityType: EntityType;
  entityId: string;
  actionType: AuditActionType;
  patientId?: string;
  consultationId?: string;
  changeReason: string;
  beforeState?: Record<string, any>;
  afterState: Record<string, any>;
  sourceIp?: string;
  sessionId?: string;
}

export interface AmendmentLogParams {
  originalAuditId: string;
  entityType: EntityType;
  entityId: string;
  actionType: AuditActionType;
  patientId?: string;
  changeReason: string;
  amendmentJustification: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  sourceIp?: string;
}

// ============================================================================
// 3. FORENSIC QUERY TYPES
// ============================================================================

export interface PrescriptionAmendmentChain {
  sequence_number: number;
  audit_id: string;
  event_time: string;
  actor_email: string;
  action_type: string;
  dosage_before: string | null;
  dosage_after: string | null;
  change_reason: string;
  amendment_justification: string | null;
}

export interface InvoiceAuditTrail {
  sequence_number: number;
  event_time: string;
  actor_email: string;
  action_type: string;
  amount_change: number | null;
  total_before: number | null;
  total_after: number | null;
  reason: string;
}

export interface LabResultHistory {
  sequence_number: number;
  event_time: string;
  actor_role: string;
  action_type: string;
  result_value_before: string | null;
  result_value_after: string | null;
  reason: string;
}

export interface AuditAnomaly {
  anomaly_type: string;
  count: number;
  description: string;
  example_entity_id: string;
}
