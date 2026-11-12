/**
 * PHI-safe logging for Deno Edge Functions (Supabase).
 *
 * This is the ONE redaction path for edge-function logs. Every log line that
 * carries structured data should go through `logEdge` (or be pre-processed with
 * `redactLogValue`). The key list below must stay identical to
 * `REDACTED_KEY_WORDS` in `src/utils/logger.ts`; `tests/telemetry/` enforces parity.
 *
 * Redaction rules
 * - Object keys are split into words (snake_case, kebab-case, dots, camelCase)
 *   and any key containing a sensitive word has its value replaced with
 *   `[redacted]`. `patient_name`, `firstName`, `dob`, `medication_name`,
 *   `clinical_notes`, `contact_email` are all redacted.
 * - String values are scrubbed for SSN, card numbers, e-mail addresses, phone
 *   numbers, MRN and DOB labels.
 * - Nested objects and arrays are walked (bounded depth). Error objects are
 *   reduced to their name and scrubbed message: stacks and raw error bodies are
 *   not logged.
 *
 * HIPAA: no patient names, MRNs, DOB, medication names, free-text notes,
 * contact details or record payloads may reach function logs through this module.
 */

/** Words that mark a key as holding PHI or contact data. Keep in sync with the client. */
export const REDACTED_KEY_WORDS: readonly string[] = [
  'name',
  'mrn',
  'uhid',
  'dob',
  'birth',
  'medication',
  'medications',
  'notes',
  'diagnosis',
  'diagnoses',
  'email',
  'phone',
  'mobile',
  'address',
  'ssn',
  'allergies',
  'allergy',
];

export const REDACTED_VALUE = '[redacted]';

const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 5000;

/** Split a key into lower-case words: `patientName`, `patient_name`, `patient-name` -> [patient, name]. */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[^A-Za-z0-9]+|_/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

export function isSensitiveKey(key: string): boolean {
  return keyWords(key).some((w) => REDACTED_KEY_WORDS.includes(w));
}

/**
 * Scrub free text. Replaces SSNs, card numbers, e-mail addresses, phone numbers,
 * MRN and DOB labels, and caps the length.
 */
export function sanitizeLogMessage(message: unknown): string {
  const msg = typeof message === 'string' ? message : String(message ?? '');

  return msg
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]')
    .replace(/\bMRN\s*[:#]?\s*[\w-]{4,12}\b/gi, '[MRN]')
    .replace(/\bDOB\s*[:#]?\s*[\d/-]{8,10}\b/gi, '[DOB]')
    .substring(0, MAX_STRING_LENGTH);
}

/**
 * Recursively redact a value for logging. Returns a new value; the input is not mutated.
 */
export function redactLogValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return sanitizeLogMessage(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (depth >= MAX_DEPTH) return '[truncated]';

  if (value instanceof Error) {
    return { name: value.name, message: sanitizeLogMessage(value.message) };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED_VALUE : redactLogValue(inner, depth + 1);
    }
    return out;
  }

  return undefined;
}

/**
 * Serialise a value for logging with the same redaction as `redactLogValue`.
 * Never throws.
 */
export function sanitizeObjectForLog(obj: unknown): string {
  try {
    return JSON.stringify(redactLogValue(obj)) ?? 'null';
  } catch {
    return '[UNABLE_TO_SANITIZE]';
  }
}

export const sanitizeForLog = sanitizeLogMessage;

export type EdgeLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * The single log sink for edge functions. Redacts `data` and writes one line
 * to the matching console method. `tag` is a short, PHI-free label such as
 * `critical-lab-check` or `Metric`.
 */
export function logEdge(level: EdgeLogLevel, tag: string, data?: unknown): void {
  const label = `[${sanitizeLogMessage(tag)}]`;
  const payload = data === undefined ? '' : ` ${sanitizeObjectForLog(data)}`;
  const line = `${label}${payload}`;
  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'debug':
      console.debug(line);
      break;
    default:
      console.info(line);
  }
}
