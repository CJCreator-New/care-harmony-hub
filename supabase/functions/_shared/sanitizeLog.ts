/**
 * Sanitize log messages for Deno Edge Functions (Supabase)
 *
 * Removes PHI (Personally Identifiable Health Information):
 * - SSN (XXX-XX-XXXX)
 * - Credit cards (16-digit)
 * - Email addresses
 * - Phone numbers
 *
 * HIPAA Compliance: Ensures no sensitive patient data in logs
 */

export function sanitizeLogMessage(message: unknown): string {
  // Ensure message is a string
  const msg = typeof message === 'string' ? message : String(message || '');

  // Remove potential PHI from log messages
  return msg
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]') // Phone
    .substring(0, 5000); // Limit log message length
}

export const sanitizeForLog = sanitizeLogMessage;
