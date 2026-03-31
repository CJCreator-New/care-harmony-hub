/**
 * Sentry Integration with PHI Masking
 * Enhanced error tracking for clinical workflows
 * All patient data is sanitized before sending to Sentry
 */

import * as Sentry from '@sentry/react';
import { createLogger } from '@/utils/logger';
import { maskPHI } from '@/utils/logger';

const logger = createLogger('sentry-integration', { module: 'observability' });

export interface ErrorContextDetails {
  userId?: string;
  userRole?: string;
  hospitalId?: string;
  entityType?: string;
  entityId?: string;
  operationType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  [key: string]: any;
}

/**
 * Initialize Sentry with HIPAA-compliant settings
 * @param dsn Sentry DSN
 * @param environment Environment (development, staging, production)
 */
export function initializeSentry(
  dsn?: string,
  environment: string = import.meta.env.MODE
): void {
  // Only initialize in production or if DSN is explicitly provided
  if (!dsn && import.meta.env.PROD) {
    dsn = import.meta.env.VITE_SENTRY_DSN;
  }

  if (!dsn) {
    logger.debug('Sentry initialization skipped - no DSN provided');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 0.2,

      // Session replay configuration  
      replaysSessionSampleRate: environment === 'production' ? 0.05 : 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Event filtering and sanitization
      beforeSend(event, hint) {
        // Sanitize all data before sending
        const sanitized = sanitizeEvent(event as Sentry.ErrorEvent);

        // Filter out low-severity events in production
        if (
          environment === 'production' &&
          sanitized.level === 'warning' &&
          !isHealthcareRelevant(hint.originalException || hint.syntheticException)
        ) {
          return null;
        }

        // Log locally
        if (import.meta.env.DEV) {
          logger.info('Error captured by Sentry', {
            message: sanitized.message,
            level: sanitized.level,
            tags: sanitized.tags,
          });
        }

        return sanitized;
      },

      // Transaction filtering
      beforeSendTransaction(transaction) {
        // Filter out very fast transactions
        const duration =
          (transaction.timestamp || 0) -
          (transaction.start_timestamp || 0);

        if (duration < 0.1) {
          return null; // Skip sub-100ms transactions
        }

        return transaction;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        // Network errors that are not critical
        /DeadlineExceededError/i,
        /NetworkError/i,
        /TypeError: Failed to fetch/i,
      ],

      // Attach stack traces to all messages
      attachStacktrace: true,

      // Maximum breadcrumbs
      maxBreadcrumbs: 50,

      // Deny URLs to ignore
      denyUrls: [/google-analytics\.com/, /ga\.js/],
    });

    // Set initial application context
    Sentry.setContext('application', {
      name: 'CareSync HMS',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment,
      healthcare_system: true,
    });

    // Set healthcare-specific tags
    Sentry.setTag('application', 'caresync-hms');
    Sentry.setTag('healthcare', 'true');
    Sentry.setTag('hipaa_compliant', 'true');
    Sentry.setTag('phi_safeguarded', 'true');

    logger.info('Sentry initialized successfully', {
      environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 0.2,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Capture an exception with healthcare context
 * @param error The error to capture
 * @param context Additional sanitized context
 */
export function captureException(
  error: Error,
  context?: ErrorContextDetails
): string | undefined {
  try {
    const sanitized = sanitizeContext(context || {});

    return Sentry.captureException(error, {
      contexts: {
        healthcare: {
          user_id: sanitized.userId,
          user_role: sanitized.userRole,
          hospital_id: sanitized.hospitalId,
          entity_type: sanitized.entityType,
          severity: sanitized.severity,
        },
      },
      tags: {
        error_source: sanitized.operationType || 'unknown',
        healthcare_context: 'true',
        severity: sanitized.severity || 'medium',
      },
      level: mapSeverityToLevel(sanitized.severity),
    });
  } catch (sentryError) {
    logger.error('Failed to capture exception in Sentry', sentryError instanceof Error ? sentryError : new Error('Unknown error'));
    return undefined;
  }
}

/**
 * Capture a message with context
 * @param message Message to capture
 * @param level Log level
 * @param context Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: ErrorContextDetails
): string | undefined {
  try {
    const sanitized = sanitizeContext(context || {});

    return Sentry.captureMessage(message, {
      level,
      contexts: {
        healthcare: {
          user_id: sanitized.userId,
          user_role: sanitized.userRole,
          hospital_id: sanitized.hospitalId,
        },
      },
      tags: {
        message_type: 'application_message',
        healthcare_context: 'true',
      },
    });
  } catch (sentryError) {
    logger.error('Failed to capture message in Sentry', sentryError instanceof Error ? sentryError : new Error('Unknown error'));
    return undefined;
  }
}

/**
 * Set user context for error tracking
 * Important: Do NOT include patient names, UHIDs, or any PHI
 * @param userId Unique user identifier (UUID, not UHID)
 * @param role User role (doctor, nurse, etc.)
 * @param hospitalId Hospital identifier
 */
export function setUserContext(
  userId: string,
  role: string,
  hospitalId?: string
): void {
  try {
    Sentry.setUser({
      id: maskPHI(userId),
      username: role,
      ip_address: 'unknown', // Don't capture IP for privacy
    });

    Sentry.setContext('user', {
      user_id: maskPHI(userId),
      user_role: role,
      hospital_id: hospitalId ? maskPHI(hospitalId) : undefined,
      authenticated: true,
    });
  } catch (error) {
    logger.debug('Failed to set user context in Sentry', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  try {
    Sentry.setUser(null);
    Sentry.setContext('user', null);
  } catch (error) {
    logger.debug('Failed to clear user context in Sentry');
  }
}

/**
 * Sanitize event to remove any PHI
 * @internal
 */
function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.message) {
    event.message = sanitizeString(event.message);
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exc) => ({
      ...exc,
      value: sanitizeString(exc.value || ''),
      stacktrace: sanitizeStacktrace(exc.stacktrace),
    }));
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => ({
      ...bc,
      message: bc.message ? sanitizeString(bc.message) : undefined,
      data: bc.data ? sanitizeObject(bc.data) : undefined,
    }));
  }

  if (event.request?.url) {
    event.request.url = sanitizeString(event.request.url);
  }

  return event;
}

/**
 * Sanitize context object
 * @internal
 */
function sanitizeContext(context: ErrorContextDetails): ErrorContextDetails {
  return {
    userId: context.userId ? maskPHI(context.userId) : undefined,
    userRole: context.userRole,
    hospitalId: context.hospitalId ? maskPHI(context.hospitalId) : undefined,
    entityType: context.entityType,
    entityId: context.entityId ? maskPHI(context.entityId) : undefined,
    operationType: context.operationType,
    severity: context.severity,
  };
}

/**
 * Sanitize a string value
 * @internal
 */
function sanitizeString(value: string): string {
  if (!value) return '';

  // Remove potential PHI patterns
  let sanitized = value;

  // UHID pattern (numerical or alphanumeric)
  sanitized = sanitized.replace(/\b\d{4,}\b/g, '[REDACTED]');

  // Phone numbers
  sanitized = sanitized.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED]');

  // Email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED]');

  // Medical terms in patient context
  if (sanitized.match(/diagnosis|symptom|medication|drug|allergy/i)) {
    sanitized = sanitized.replace(
      /\b(?:diagnosis|symptom|medication|drug|allergy).*$/i,
      '[CLINICAL_DATA_REDACTED]'
    );
  }

  return sanitized;
}

/**
 * Sanitize an object recursively
 * @internal
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip PHI-likely keys
    if (
      key.toLowerCase().includes('patient') ||
      key.toLowerCase().includes('uhid') ||
      key.toLowerCase().includes('name') ||
      key.toLowerCase().includes('diagnosis') ||
      key.toLowerCase().includes('medication')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize stack trace
 * @internal
 */
function sanitizeStacktrace(stacktrace: any): any {
  if (!stacktrace || !stacktrace.frames) {
    return stacktrace;
  }

  return {
    ...stacktrace,
    frames: stacktrace.frames.map((frame: any) => ({
      ...frame,
      function: frame.function ? sanitizeString(frame.function) : undefined,
      filename: frame.filename ? sanitizeString(frame.filename) : undefined,
    })),
  };
}

/**
 * Check if error is healthcare-relevant (should always be sent)
 * @internal
 */
function isHealthcareRelevant(error: any): boolean {
  if (!error) return false;

  const message = String(error.message || error).toLowerCase();
  const healthcareKeywords = [
    'prescription',
    'medication',
    'patient',
    'clinical',
    'diagnosis',
    'lab',
    'appointment',
    'vital',
    'supabase',
    'database',
    'rls',
  ];

  return healthcareKeywords.some((keyword) => message.includes(keyword));
}

/**
 * Map error severity to Sentry level
 * @internal
 */
function mapSeverityToLevel(
  severity?: string
): Sentry.SeverityLevel {
  switch (severity) {
    case 'critical':
      return 'fatal';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Add breadcrumb for tracking user actions
 * @param category Breadcrumb category
 * @param message Breadcrumb message
 * @param data Additional data (PHI-safe)
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
): void {
  try {
    const sanitized = data ? sanitizeObject(data) : undefined;

    Sentry.captureMessage(message, 'debug');
    Sentry.addBreadcrumb({
      category,
      message,
      level: 'info',
      data: sanitized,
    });
  } catch (error) {
    logger.debug('Failed to add breadcrumb');
  }
}

/**
 * Create a Sentry transaction for performance monitoring
 * @param name Transaction name
 * @param op Transaction operation
 */
export function startTransaction(name: string, op: string) {
  // Stub for future Sentry transaction API
  return {
    finish: () => {},
    setStatus: () => {},
    setTag: () => {},
  };
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
};
