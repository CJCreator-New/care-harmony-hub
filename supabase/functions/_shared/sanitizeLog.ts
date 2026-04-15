/**
 * Sanitize log messages for Deno Edge Functions (Supabase)
 *
 * Removes PHI (Personally Identifiable Health Information):
 * - SSN (XXX-XX-XXXX)
 * - Credit cards (16-digit)
 * - Email addresses
 * - Phone numbers
 * - Medical Record Numbers (MRN)
 * - High-risk key names (patient_name, diagnosis, prescription, etc.)
 *
 * HIPAA Compliance: Ensures no sensitive patient data in logs
 */

export function sanitizeLogMessage(message: unknown): string {
  // Ensure message is a string
  const msg = typeof message === 'string' ? message : String(message || '');

  // Remove potential PHI from log messages
  return msg
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN: 123-45-6789
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card: 1234-5678-9012-3456
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email: name@domain
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]') // Phone: 555-123-4567
    .replace(/\bMRN\s*[:#]?\s*[\w\-]{4,12}\b/gi, '[MRN]') // Medical Record Number
    .replace(/\bDOB\s*[:#]?\s*[\d/\-]{8,10}\b/gi, '[DOB]') // Date of Birth
    .substring(0, 5000); // Limit log message length
}

/**
 * Sanitize objects for logging - masks high-risk field names
 * Returns a sanitized representation safe for logs
 */
export function sanitizeObjectForLog(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeLogMessage(String(obj));
  }

  const highRiskFields = [
    'patient_name', 'patientName',
    'first_name', 'lastName',
    'diagnosis', 'diagnoses',
    'prescription', 'medications', 'medication_name',
    'treatment_plan', 'clinical_notes', 'notes',
    'mrn', 'medical_record_number',
    'ssn', 'social_security_number',
    'insurance_number',
    'phone', 'phone_number',
    'address', 'email',
    'date_of_birth', 'dob',
    'blood_type', 'allergies',
    'chief_complaint', 'symptoms'
  ];

  try {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (highRiskFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED_PHI]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[REDACTED_COMPLEX]';
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeLogMessage(value);
      } else {
        sanitized[key] = value;
      }
    }
    return JSON.stringify(sanitized);
  } catch {
    return '[UNABLE_TO_SANITIZE]';
  }
}

export const sanitizeForLog = sanitizeLogMessage;
