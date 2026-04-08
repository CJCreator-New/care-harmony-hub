/**
 * Break-Glass Override System
 * Phase 4: Emergency override patterns with mandatory reason capture for clinical safety gates
 *
 * Pattern: Allow emergency overrides for critical situations (patient in distress, system outage)
 * Requirements:
 * - Mandatory override reason (HIPAA audit trail)
 * - Role-based authorization (only specific roles can approve)
 * - Emergency escalation markers
 * - Forensic logging of all overrides
 * - Auto-escalation to admin after 1 minute
 */

import { z } from 'zod';

/**
 * Break-glass override reason validation
 * Ensures change_reason is clinically appropriate and not generic
 */
export const BreakGlassReasonSchema = z.object({
  reason: z.string()
    .min(20, 'Override reason must be detailed (min 20 characters)')
    .max(500, 'Override reason must be concise (max 500 characters)')
    .refine(
      (reason) => !reason.match(/^(test|test123|asdf|qwerty|12345)/i),
      'Override reason must not be placeholder or test text'
    ),
  emergency_level: z.enum(['critical', 'urgent', 'time_sensitive'], {
    description: 'Urgency level of override'
  }),
  approved_by_role: z.enum(['emergency_physician', 'icu_nurse', 'head_pharmacist', 'admin'], {
    description: 'Only these roles can approve break-glass'
  }),
  related_patient_id: z.string().uuid(),
  override_type: z.enum([
    'emergency_medication_dispense',
    'critical_discharge',
    'lab_override_critical_value',
    'system_unavailable_workaround',
    'clinical_judgment_override'
  ]),
});

export type BreakGlassOverride = z.infer<typeof BreakGlassReasonSchema>;

/**
 * Validates break-glass override request
 * @throws Error if override reason is invalid or insufficient
 */
export function validateBreakGlassOverride(override: Partial<BreakGlassOverride>): BreakGlassOverride {
  const result = BreakGlassReasonSchema.safeParse(override);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`)
      .join('; ');
    throw new Error(`Break-glass override validation failed: ${message}`);
  }
  return result.data;
}

/**
 * Sanitize break-glass reason to strip PHI before audit logging
 * Removes email addresses, phone numbers, MRN patterns
 */
export function sanitizeBreakGlassReason(reason: string): string {
  let sanitized = reason;

  // Remove email addresses
  sanitized = sanitized.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]');

  // Remove phone numbers (US format and variants)
  sanitized = sanitized.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]');

  // Remove MRN patterns (typically 6-10 digit sequences)
  sanitized = sanitized.replace(/MRN[\s:]*(\d{6,10})/gi, 'MRN[REDACTED]');
  sanitized = sanitized.replace(/\b\d{6,10}\b/g, (match) => {
    // Only redact if looks like medical record number (not natural text numbers)
    return match.length >= 8 ? '[MRN]' : match;
  });

  // Remove names after "Dr." or "Patient:" patterns if looks suspicious
  sanitized = sanitized.replace(/(?:Dr\.|Patient:|Attending:)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g, '[STAFF_NAME]');

  return sanitized;
}

/**
 * Break-glass override audit event for forensic logging
 * Captures complete override context for compliance
 */
export interface BreakGlassAuditEvent {
  override_id: string;
  hospital_id: string;
  approved_by_user_id: string;
  approved_by_role: string;
  patient_id: string;
  override_type: string;
  emergency_level: string;
  reason_sanitized: string; // PHI-stripped reason
  reason_hash: string; // SHA-256 hash of full reason for verification
  resource_type: string; // 'patient', 'medication', 'lab_result', etc.
  action_performed: string; // What action was allowed by override
  escalated_to_admin: boolean;
  escalation_timestamp?: string;
  triggered_by_user_id: string;
  created_at: string;
  expires_at: string; // Auto-revoke after 1 hour
  status: 'active' | 'expired' | 'revoked';
}

/**
 * Role-based access control for break-glass approval
 * Determines if user's role can approve specific override types
 */
export function canApproveBreakGlass(
  userRole: string,
  overrideType: string
): { allowed: boolean; reason?: string } {
  const rolePermissions: Record<string, string[]> = {
    emergency_physician: [
      'emergency_medication_dispense',
      'critical_discharge',
      'lab_override_critical_value',
      'system_unavailable_workaround',
      'clinical_judgment_override'
    ],
    icu_nurse: [
      'emergency_medication_dispense',
      'lab_override_critical_value',
      'system_unavailable_workaround'
    ],
    head_pharmacist: [
      'emergency_medication_dispense',
      'system_unavailable_workaround'
    ],
    admin: [
      'emergency_medication_dispense',
      'critical_discharge',
      'lab_override_critical_value',
      'system_unavailable_workaround',
      'clinical_judgment_override'
    ]
  };

  const allowedTypes = rolePermissions[userRole] || [];

  if (!allowedTypes.includes(overrideType)) {
    return {
      allowed: false,
      reason: `Role '${userRole}' cannot approve '${overrideType}' override. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { allowed: true };
}

/**
 * Calculate break-glass override expiration (1 hour from now)
 */
export function calculateBreakGlassExpiration(nowMs: number = Date.now()): string {
  const oneHourMs = 60 * 60 * 1000;
  return new Date(nowMs + oneHourMs).toISOString();
}

/**
 * Determine if override needs auto-escalation to admin
 * Rule: If override active > 1 minute without completion, escalate
 */
export function shouldEscalateToAdmin(createdAt: string, completedAt?: string): boolean {
  const ONE_MINUTE_MS = 60 * 1000;
  const createTime = new Date(createdAt).getTime();
  const nowTime = completedAt ? new Date(completedAt).getTime() : Date.now();
  
  return (nowTime - createTime) > ONE_MINUTE_MS;
}

/**
 * Generate SHA-256 hash of override reason for verification
 * Used to verify reason wasn't modified after approval
 */
export async function hashBreakGlassReason(reason: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(reason);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if break-glass override is expired
 */
export function isBreakGlassExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Get remaining time for active break-glass override
 */
export function getBreakGlassRemainingTime(expiresAt: string): number {
  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, msRemaining);
}
