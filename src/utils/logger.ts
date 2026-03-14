/**
 * Structured Logging System
 * JSON logging with correlation IDs, PHI masking, and lifecycle events
 * HIPAA-compliant: No patient names, UHIDs, diagnoses in logs
 */

// Simple UUID v4 generator without external dependency
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private correlationId: string;
  private hospitalId?: string;
  private userId?: string;
  private userRole?: string;
  private context: Record<string, string>;

  constructor(
    context: string,
    metadata?: {
      module?: string;
      version?: string;
      environment?: string;
    }
  ) {
    this.correlationId = generateUUID();
    this.context = {
      context,
      ...metadata,
    };
  }

  /**
   * Set user context for correlation
   */
  setUserContext(userId: string, role: string, hospitalId?: string) {
    this.userId = userId;
    this.userRole = role;
    this.hospitalId = hospitalId;
  }

  /**
   * Create a new correlation ID for tracing
   */
  newCorrelationId() {
    this.correlationId = generateUUID();
    return this.correlationId;
  }

  /**
   * Log generic message
   */
  private log(level: LogLevel, message: string, extra?: Record<string, any>) {
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlation_id: this.correlationId,
      hospital_id: this.hospitalId,
      user_id: this.userId,
      user_role: this.userRole,
      context: { ...this.context, ...extra },
    };

    this.emitLog(logEntry);
  }

  debug(message: string, extra?: Record<string, any>) {
    this.log('debug', message, extra);
  }

  info(message: string, extra?: Record<string, any>) {
    this.log('info', message, extra);
  }

  warn(message: string, extra?: Record<string, any>) {
    this.log('warn', message, extra);
  }

  error(message: string, error?: Error, extra?: Record<string, any>) {
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      correlation_id: this.correlationId,
      hospital_id: this.hospitalId,
      user_id: this.userId,
      user_role: this.userRole,
      context: { ...this.context, ...extra },
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    this.emitLog(logEntry);
  }

  /**
   * Log lifecycle event (prescription created, lab ordered, etc.)
   */
  logLifecycleEvent(
    eventType: EventType,
    details: LifecycleEventDetails
  ) {
    const sanitized = this.sanitizeLifecycleDetails(details);
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level: details.status === 'success' ? 'info' : 'warn',
      message: `Lifecycle event: ${eventType}`,
      correlation_id: this.correlationId,
      hospital_id: sanitized.hospital_id || this.hospitalId,
      user_id: sanitized.actor_id,
      user_role: sanitized.actor_role,
      entity_type: sanitized.entity_type,
      entity_id: sanitized.entity_id,
      event_type: eventType,
      context: {
        ...this.context,
        ...sanitized,
      },
    };

    this.emitLog(logEntry);
  }

  /**
   * Log performance event (query latency, cache hits, etc.)
   */
  logPerformanceEvent(details: PerformanceEventDetails) {
    const level =
      details.duration_ms > 1000
        ? 'warn'
        : details.duration_ms > 500
          ? 'info'
          : 'debug';

    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message: `Performance: ${details.operation} took ${details.duration_ms.toFixed(2)}ms`,
      correlation_id: this.correlationId,
      hospital_id: this.hospitalId,
      user_id: this.userId,
      user_role: this.userRole,
      context: {
        ...this.context,
        operation: details.operation,
        duration_ms: details.duration_ms,
        success: details.success,
        ...details,
      },
    };

    this.emitLog(logEntry);
  }

  /**
   * Log safety/security event (medication conflicts, lab delays, etc.)
   */
  logSafetyEvent(details: SafetyEventDetails) {
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level: details.impact_level === 'high' ? 'error' : 'warn',
      message: `Safety event: ${details.event_type} - ${details.reason}`,
      correlation_id: this.correlationId,
      hospital_id: details.hospital_id || this.hospitalId,
      user_id: details.actor_id,
      user_role: details.actor_role,
      context: {
        ...this.context,
        ...details,
      },
    };

    this.emitLog(logEntry);
  }

  /**
   * Sanitize lifecycle event details to remove PHI
   */
  private sanitizeLifecycleDetails(
    details: LifecycleEventDetails
  ): LifecycleEventDetails {
    return {
      ...details,
      // Mask any potential PHI fields
      entity_id: this.maskPHI(details.entity_id),
      patient_name: '[REDACTED]',
      patient_uhid: '[REDACTED]',
      diagnosis: '[REDACTED]',
      medication_name: '[REDACTED]',
    };
  }

  /**
   * Mask PHI in log output
   * @param value String that might contain PHI
   * @returns Masked value if it looks like PHI, otherwise original
   */
  maskPHI(value: string | number | undefined): string {
    if (!value) return '';

    const strValue = String(value);

    // Mask UHIDs (typically numeric or alphanumeric patterns)
    if (/^\d{4,}$/.test(strValue) || /^[A-Z]{2,}\d{4,}$/.test(strValue)) {
      return '[UHID_REDACTED]';
    }

    // Mask email-like patterns (patient contact info)
    if (/@/.test(strValue)) {
      return '[EMAIL_REDACTED]';
    }

    // Mask phone numbers
    if (/^\d{7,}$/.test(strValue.replace(/[-\s]/g, ''))) {
      return '[PHONE_REDACTED]';
    }

    return strValue;
  }

  /**
   * Internal method to emit logs to console/server
   * In production, integrate with log aggregation service
   */
  private emitLog(logEntry: StructuredLog) {
    // In development, log to console
    if (import.meta.env.DEV) {
      const level = logEntry.level;
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      if (typeof console !== 'undefined') {
        const fn = console[consoleMethod as keyof typeof console] as any;
        if (typeof fn === 'function') {
          fn(JSON.stringify(logEntry, null, 2));
        }
      }
    }

    // In production, send to log aggregation endpoint
    if (import.meta.env.PROD) {
      // Queue for batch sending
      this.queueLog(logEntry);
    }
  }

  /**
   * Queue logs for batch sending to server
   */
  private logQueue: StructuredLog[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private queueLog(entry: StructuredLog) {
    this.logQueue.push(entry);

    // Flush every 10 logs or 5 seconds
    if (this.logQueue.length >= 10) {
      this.flushLogs();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushLogs(), 5000);
    }
  }

  private async flushLogs() {
    if (this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      // Send to logging endpoint
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
      }).catch(() => {
        // Silently fail if logging endpoint is unavailable
        // Don't crash the app for logging failures
      });
    } catch (error) {
      // Ignore logging failures
    }
  }
}

/**
 * Create a new logger instance
 * @param context String identifying the context (e.g., 'prescription-service', 'appointment-hook')
 * @param metadata Optional metadata to include in all logs from this logger
 */
export function createLogger(
  context: string,
  metadata?: {
    module?: string;
    version?: string;
    environment?: string;
  }
): Logger {
  return new Logger(context, metadata);
}

/**
 * Utility function to mask PHI in any value
 * @param value The value to mask
 * @returns Masked value if PHI detected, otherwise original
 */
export function maskPHI(value: string | number | undefined): string {
  if (!value) return '';

  const strValue = String(value);

  // Patient identifiers
  if (/^\d{4,}$/.test(strValue) || /^[A-Z]{2,}\d{4,}$/.test(strValue)) {
    return '[REDACTED]';
  }

  // Email
  if (/@/.test(strValue)) {
    return '[REDACTED]';
  }

  // Phone
  if (/^\d{7,}$/.test(strValue.replace(/[-\s]/g, ''))) {
    return '[REDACTED]';
  }

  // Common patient name patterns
  if (
    /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(strValue) &&
    strValue.length > 5 &&
    strValue.length < 50
  ) {
    return '[REDACTED]';
  }

  return strValue;
}

/**
 * Utility to safely log a message without PHI exposure
 */
export function sanitizeForLog(value: any): string {
  if (!value) return '';

  if (typeof value === 'object') {
    // Remove known PHI fields from objects
    const { patient_name, patient_uhid, diagnosis, medication_name, email, phone, ...safe } =
      value;
    return JSON.stringify(safe);
  }

  return maskPHI(String(value));
}
