/**
 * The single client-side logger for CareSync HIMS.
 *
 * Every client log line, breadcrumb and telemetry event goes through this module.
 * Nothing it emits contains PHI or contact data:
 *   - structured context is passed through `redactForLog` (key-based, recursive)
 *   - free text is passed through `scrubLogString` (e-mail, phone, SSN, card, MRN, DOB patterns)
 *
 * Sinks
 *   - development: browser console, redacted
 *   - production: Sentry breadcrumbs (scrubbed by `beforeBreadcrumb` in lib/monitoring/sentry.ts).
 *     The former `fetch('/api/logs')` batch was removed: nginx served the SPA for that path,
 *     so those logs were always dropped.
 *
 * Edge functions use the mirror helper `supabase/functions/_shared/sanitizeLog.ts`.
 * `REDACTED_KEY_WORDS` must stay identical there; a parity test enforces it.
 */
import { addBreadcrumb } from '@sentry/react';

/** Words that mark an object key as PHI or contact data. Keep in sync with the edge helper. */
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
const MAX_STRING_LENGTH = 2000;
/** Upper bound on the in-memory buffer read by `getLogs`; oldest entries are dropped first. */
const MAX_BUFFERED_ENTRIES = 500;

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
export function scrubLogString(value: string): string {
  return value
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
 * Error objects are reduced to name and scrubbed message (no stack, no extra fields).
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return scrubLogString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (depth >= MAX_DEPTH) return '[truncated]';

  if (value instanceof Error) {
    return { name: value.name, message: scrubLogString(value.message) };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED_VALUE : redactForLog(inner, depth + 1);
    }
    return out;
  }

  return undefined;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type EventType =
  | 'prescription_created'
  | 'prescription_amended'
  | 'lab_ordered'
  | 'lab_critical_alert'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'patient_registered'
  | 'medication_conflict'
  | 'lab_delay'
  | 'performance_degradation'
  | 'auth_failed'
  | 'access_denied'
  | 'data_mutation'
  | 'unknown';

export interface LifecycleEventDetails {
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  hospital_id?: string;
  timestamp: string;
  status: 'success' | 'failure';
  [key: string]: any;
}

export interface PerformanceEventDetails {
  operation: string;
  duration_ms: number;
  success: boolean;
  resource_type?: string;
  query_type?: string;
  [key: string]: any;
}

export interface SafetyEventDetails {
  event_type: string;
  reason: string;
  actor_id: string;
  actor_role: string;
  hospital_id?: string;
  impact_level: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlation_id: string;
  hospital_id?: string;
  user_id?: string;
  user_role?: string;
  entity_type?: string;
  entity_id?: string;
  event_type?: EventType;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    name?: string;
  };
}

export interface LoggerMetadata {
  module?: string;
  version?: string;
  environment?: string;
}

class Logger {
  private correlationId: string;
  private hospitalId?: string;
  private userId?: string;
  private userRole?: string;
  private context: Record<string, string>;
  private buffer: StructuredLog[] = [];

  constructor(context: string, metadata?: LoggerMetadata) {
    this.correlationId = newId();
    this.context = { context, ...(metadata as Record<string, string>) };
  }

  /** Set user context for correlation. IDs and role only; never names or e-mail. */
  setUserContext(userId: string, role: string, hospitalId?: string) {
    this.userId = userId;
    this.userRole = role;
    this.hospitalId = hospitalId;
  }

  /** Clear the in-memory buffer of emitted entries. */
  clearLogs() {
    this.buffer = [];
  }

  /**
   * Return buffered entries (already redacted when they were emitted), optionally filtered by level.
   * The buffer is a compatibility aid for tests and diagnostics; it is not a sink.
   */
  getLogs(level?: LogLevel): StructuredLog[] {
    const entries = level ? this.buffer.filter((e) => e.level === level) : this.buffer;
    return entries.slice();
  }

  /** Create a new correlation ID for tracing */
  newCorrelationId() {
    this.correlationId = newId();
    return this.correlationId;
  }

  debug(message: string, extra?: Record<string, unknown>) {
    this.emit('debug', message, extra);
  }

  info(message: string, extra?: Record<string, unknown>) {
    this.emit('info', message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>) {
    this.emit('warn', message, extra);
  }

  error(message: string, error?: unknown, extra?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? { message: scrubLogString(error.message), name: error.name }
        : error !== undefined
          ? { message: scrubLogString(String(error)) }
          : undefined;
    this.emit('error', message, extra, errorInfo);
  }

  /** Lifecycle event (prescription created, lab ordered, etc.). Patient fields are always redacted. */
  logLifecycleEvent(eventType: EventType, details: LifecycleEventDetails) {
    this.emitEntry({
      timestamp: new Date().toISOString(),
      level: details.status === 'success' ? 'info' : 'warn',
      message: `Lifecycle event: ${eventType}`,
      correlation_id: this.correlationId,
      hospital_id: details.hospital_id || this.hospitalId,
      user_id: details.actor_id,
      user_role: details.actor_role,
      entity_type: details.entity_type,
      entity_id: details.entity_id,
      event_type: eventType,
      context: { ...this.context, ...(redactForLog(details) as Record<string, unknown>) },
    });
  }

  /** Performance event (query latency, cache hits, etc.) */
  logPerformanceEvent(details: PerformanceEventDetails) {
    const level: LogLevel =
      details.duration_ms > 1000 ? 'warn' : details.duration_ms > 500 ? 'info' : 'debug';

    this.emitEntry({
      timestamp: new Date().toISOString(),
      level,
      message: `Performance: ${details.operation} took ${details.duration_ms.toFixed(2)}ms`,
      correlation_id: this.correlationId,
      hospital_id: this.hospitalId,
      user_id: this.userId,
      user_role: this.userRole,
      context: { ...this.context, ...(redactForLog(details) as Record<string, unknown>) },
    });
  }

  /** Safety/security event (medication conflicts, lab delays, etc.) */
  logSafetyEvent(details: SafetyEventDetails) {
    this.emitEntry({
      timestamp: new Date().toISOString(),
      level: details.impact_level === 'high' ? 'error' : 'warn',
      message: `Safety event: ${details.event_type} - ${scrubLogString(details.reason)}`,
      correlation_id: this.correlationId,
      hospital_id: details.hospital_id || this.hospitalId,
      user_id: details.actor_id,
      user_role: details.actor_role,
      context: { ...this.context, ...(redactForLog(details) as Record<string, unknown>) },
    });
  }

  private emit(
    level: LogLevel,
    message: string,
    extra?: Record<string, unknown>,
    error?: StructuredLog['error']
  ) {
    this.emitEntry({
      timestamp: new Date().toISOString(),
      level,
      message: scrubLogString(message),
      correlation_id: this.correlationId,
      hospital_id: this.hospitalId,
      user_id: this.userId,
      user_role: this.userRole,
      context: {
        ...this.context,
        ...(redactForLog(extra) as Record<string, unknown> | undefined),
      },
      error,
    });
  }

  private emitEntry(entry: StructuredLog) {
    // Defence in depth: the entry is redacted once more before it leaves this module.
    const safe = redactForLog(entry) as StructuredLog;

    this.buffer.push(safe);
    if (this.buffer.length > MAX_BUFFERED_ENTRIES) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFERED_ENTRIES);
    }

    if (import.meta.env.DEV && typeof console !== 'undefined') {
      const method =
        safe.level === 'error' ? console.error : safe.level === 'warn' ? console.warn : console.log;
      method(JSON.stringify(safe, null, 2));
    }

    if (import.meta.env.PROD) {
      try {
        addBreadcrumb({
          category: 'app.log',
          level: safe.level === 'warn' ? 'warning' : safe.level,
          message: safe.message,
          data: { ...safe.context, correlation_id: safe.correlation_id, error: safe.error },
        });
      } catch {
        // Logging must never throw into the app.
      }
    }
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new logger instance.
 * @param context Identifies the caller, e.g. 'appointment-hook'. Keep it PHI-free.
 */
export function createLogger(context: string, metadata?: LoggerMetadata): Logger {
  return new Logger(context, metadata);
}

/**
 * Mask a single value that may be PHI. Returns '[REDACTED]' for identifiers,
 * e-mail addresses, phone numbers and name-shaped strings; otherwise the value unchanged.
 */
export function maskPHI(value: string | number | undefined): string {
  if (!value) return '';

  const strValue = String(value);

  if (/^\d{4,}$/.test(strValue) || /^[A-Z]{2,}\d{4,}$/.test(strValue)) {
    return '[REDACTED]';
  }
  if (/@/.test(strValue)) {
    return '[REDACTED]';
  }
  if (/^\d{7,}$/.test(strValue.replace(/[-\s]/g, ''))) {
    return '[REDACTED]';
  }
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(strValue) && strValue.length > 5 && strValue.length < 50) {
    return '[REDACTED]';
  }

  return strValue;
}

/**
 * Serialise any value for a log line with PHI redaction applied.
 * Objects go through `redactForLog`; strings through `maskPHI`.
 */
export function sanitizeForLog(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'object') {
    try {
      return JSON.stringify(redactForLog(value));
    } catch {
      return '[UNABLE_TO_SANITIZE]';
    }
  }

  return maskPHI(String(value));
}
