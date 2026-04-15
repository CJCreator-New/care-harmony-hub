/**
 * Audit Log Sanitization Policy
 * 
 * Ensures audit_logs table records never contain unredacted PHI.
 * Sanitizes reason, details, and other free-text fields.
 */

import { sanitizeLogMessage, sanitizeObjectForLog } from './sanitizeLog.ts';

export interface AuditLogEntry {
  action_type: string;
  resource_type: string;
  resource_id?: string;
  performed_by?: string;
  hospital_id?: string;
  details?: Record<string, unknown>;
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Sanitize an audit log entry before insertion into audit_logs table
 * 
 * This function redacts any free-text fields that might contain PHI:
 * - reason: Clinical notes or patient-related reasons
 * - notes: Unstructured text
 * - details: Can contain arbitrary data including clinical info
 * - metadata: Additional context that might include PHI
 */
export function sanitizeAuditLogEntry(entry: AuditLogEntry): AuditLogEntry {
  const sanitized: AuditLogEntry = { ...entry };

  // Sanitize free-text fields
  if (sanitized.reason) {
    sanitized.reason = sanitizeLogMessage(sanitized.reason);
  }

  if (sanitized.notes) {
    sanitized.notes = sanitizeLogMessage(sanitized.notes);
  }

  // Sanitize details object - redact high-risk fields
  if (sanitized.details) {
    sanitized.details = sanitizeDetailsObject(sanitized.details);
  }

  // Sanitize metadata similarly
  if (sanitized.metadata) {
    sanitized.metadata = sanitizeDetailsObject(sanitized.metadata);
  }

  return sanitized;
}

/**
 * Sanitize a details/metadata object by redacting high-risk field values
 */
function sanitizeDetailsObject(obj: Record<string, unknown>): Record<string, unknown> {
  const highRiskValueFields = [
    'reason', 'notes', 'chief_complaint', 'diagnosis', 'treatment_plan',
    'medication', 'medication_name', 'prescription', 'symptoms',
    'clinical_notes', 'patient_notes', 'doctor_notes', 'immunization_notes'
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (highRiskValueFields.some(field => key.toLowerCase().includes(field))) {
      // Redact values of high-risk fields
      if (typeof value === 'string') {
        sanitized[key] = sanitizeLogMessage(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[REDACTED_COMPLEX]';
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'string') {
      // Apply general sanitization to all string values
      sanitized[key] = sanitizeLogMessage(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create a safe audit log entry that is PHI-compliant
 * 
 * @example
 * ```typescript
 * const entry = createAuditLog({
 *   action_type: 'prescription_approved',
 *   resource_type: 'prescription',
 *   resource_id: prescriptionId,
 *   performed_by: userId,
 *   hospital_id: hospitalId,
 *   reason: 'Reviewed and approved based on DUR check results', // Will be sanitized
 * });
 * 
 * await supabase.from('audit_logs').insert(entry);
 * ```
 */
export function createAuditLog(entry: AuditLogEntry): AuditLogEntry {
  return {
    ...sanitizeAuditLogEntry(entry),
    timestamp: entry.timestamp || new Date().toISOString(),
  };
}

/**
 * Build safe audit log details for common clinical workflow actions
 */
export const auditLogTemplates = {
  prescriptionApproval: (prescriptionId: string, status: string, durWarnings: string[] = []) => ({
    previous_status: 'pending_approval',
    new_status: status,
    prescription_id: prescriptionId, // Only the ID, not patient data
    dur_check_passed: durWarnings.length === 0,
    warning_count: durWarnings.length,
    // Don't include actual medication names or patient info
  }),

  labResultProcess: (labOrderId: string, action: string) => ({
    lab_order_id: labOrderId, // Only the ID
    action: action, // e.g., 'reviewed', 'approved'
    // Don't include test names or patient names
  }),

  patientEncounter: (encounterId: string, encounterType: string) => ({
    encounter_id: encounterId, // Only the ID
    encounter_type: encounterType, // e.g., 'consultation', 'follow-up'
    // Keep it generic, no clinical details
  }),

  disclosureLog: (targetUserId: string, purposeOfUse: string) => ({
    target_user_id: targetUserId,
    purpose_of_use: purposeOfUse, // e.g., 'treatment', 'billing', 'research'
    // No patient-specific data
  }),
};
