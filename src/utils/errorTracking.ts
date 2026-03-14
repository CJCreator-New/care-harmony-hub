/**
 * Error Tracking with PHI Safety for CareSync HIMS
 * 
 * Integrates with Sentry/Glitchtip while ensuring:
 * - No PHI (patient names, UHIDs, diagnoses) in error logs
 * - Correlation IDs for request tracing
 * - Hospital-scoped error context
 * - Structured error categorization
 * 
 * Usage:
 * ```
 * import { initErrorTracking, captureException } from '@/utils/errorTracking';
 * 
 * // Initialize early in app
 * initErrorTracking();
 * 
 * // Capture exceptions safely
 * try {
 *   await createPrescription(...);
 * } catch (err) {
 *   captureException(err, {
 *     context: 'prescription.create',
 *     attributes: { prescriptionId: 'rx-123', severity: 'high' }
 *   });
 * }
 * ```
 */

import * as Sentry from '@sentry/react';
import { getCorrelationId } from './correlationId';

// Conditionally import BrowserTracing if available
let BrowserTracing: any = null;
try {
  const sentryTracing = require('@sentry/tracing');
  BrowserTracing = sentryTracing.BrowserTracing;
} catch (e) {
  // @sentry/tracing not available - that's ok, it's optional
}

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  /** Operation that failed (e.g., 'prescription.create') */
  context: string;

  /** Severity of the error */
  severity?: ErrorSeverity;

  /** Additional attributes (never PHI) */
  attributes?: Record<string, any>;

  /** User/hospital context */
  userContext?: {
    userId: string;
    hospitalId: string;
    userRole: string;
  };

  /** Fingerprint for grouping similar errors */
  fingerprint?: string[];
}

/**
 * Initialize Sentry with PHI sanitization
 */
export function initErrorTracking(
  options: {
    dsn?: string;
    environment?: 'development' | 'staging' | 'production';
    tracesSampleRate?: number;
    debug?: boolean;
  } = {}
): void {
  const {
    dsn = process.env.VITE_SENTRY_DSN,
    environment = (process.env.VITE_ENV as any) || 'development',
    tracesSampleRate = environment === 'production' ? 0.1 : 1.0,
    debug = environment === 'development',
  } = options;

  if (!dsn) {
    console.warn('[ErrorTracking] No Sentry DSN configured');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    debug,

    // Enable performance monitoring (conditionally if BrowserTracing is available)
    integrations: BrowserTracing ? [
      new BrowserTracing({
        // Performance monitoring of page load
        tracingOrigins: ['localhost', /^\//],
        shouldCreateSpanForRequest(url) {
          return !url.includes('/health') && !url.includes('/ready');
        },
      }),
    ] : [],

    // Sanitize data before sending
    beforeSend(event, hint) {
      return sanitizeEvent(event, hint);
    },

    // Sanitize breadcrumbs (request logs)
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },

    // Correlation ID for request tracing
    initialScope: {
      tags: {
        'correlation_id': getCorrelationId(),
      },
    },

    // Ignore expected errors
    ignoreErrors: [
      // Network timeouts (transient)
      'NetworkError: Network request failed',
      'AbortError',

      // Browser errors (user agent issues)
      'Unexpected token <',
      'Non-Error promise rejection',

      // 3rd party script errors
      'Plugin error',
      'Cannot read property',
    ],

    // Report only errors and warn level by default
    logLevel: debug ? 'debug' : 'error',
  });

  // Set up error handler for uncaught exceptions
  window.addEventListener('error', (event) => {
    // Skip if already captured by Sentry
    if (event.error && event.error.__sentry_captured__) {
      return;
    }

    captureException(event.error, {
      context: 'uncaught.exception',
      severity: 'error',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, {
      context: 'unhandled.promise_rejection',
      severity: 'error',
    });
  });
}

/**
 * Sanitize error event to remove PHI
 * 
 * Removes:
 * - Patient names, UHIDs, contact info (regex patterns)
 * - Diagnoses and medical conditions
 * - Prescription details
 * - Lab values
 */
function sanitizeEvent(
  event: Sentry.Event,
  hint: Sentry.EventHint
): Sentry.Event | null {
  if (!event) return event;

  // Sanitize exception message
  if (event.exception) {
    for (const exc of event.exception) {
      if (exc.value) {
        exc.value = sanitizeString(exc.value);
      }
      if (exc.stacktrace) {
        for (const frame of exc.stacktrace.frames) {
          if (frame.context_line) {
            frame.context_line = maskPHI(frame.context_line);
          }
        }
      }
    }
  }

  // Sanitize breadcrumbs
  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (breadcrumb.message) {
        breadcrumb.message = sanitizeString(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = sanitizeObject(breadcrumb.data);
      }
    }
  }

  // Sanitize request data
  if (event.request) {
    if (event.request.data && typeof event.request.data === 'string') {
      event.request.data = maskPHI(event.request.data);
    }
  }

  // Sanitize tags and contexts
  if (event.tags) {
    event.tags = sanitizeObject(event.tags);
  }

  if (event.contexts) {
    event.contexts = sanitizeObject(event.contexts);
  }

  return event;
}

/**
 * Sanitize breadcrumb (request log)
 */
function sanitizeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  // Skip health check and metrics endpoints
  if (
    breadcrumb.category === 'http' &&
    (breadcrumb.data?.url?.includes('/health') ||
      breadcrumb.data?.url?.includes('/ready') ||
      breadcrumb.data?.url?.includes('/metrics'))
  ) {
    return null;
  }

  // Sanitize request body
  if (breadcrumb.data?.request_body) {
    breadcrumb.data.request_body = maskPHI(
      typeof breadcrumb.data.request_body === 'string'
        ? breadcrumb.data.request_body
        : JSON.stringify(breadcrumb.data.request_body)
    );
  }

  // Sanitize response data
  if (breadcrumb.data?.response_body) {
    breadcrumb.data.response_body = maskPHI(
      typeof breadcrumb.data.response_body === 'string'
        ? breadcrumb.data.response_body
        : JSON.stringify(breadcrumb.data.response_body)
    );
  }

  return breadcrumb;
}

/**
 * Sanitize object, recursively removing PHI
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip suspicious keys
    if (isPHIKey(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string') {
      result[key] = maskPHI(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize string value, replacing PHI patterns
 */
function sanitizeString(str: string): string {
  return maskPHI(str);
}

/**
 * Check if key is likely PHI (patient, medical info)
 */
function isPHIKey(key: string): boolean {
  const phiPatterns = [
    /patient/i,
    /uhid/i,
    /medical/i,
    /prescription/i,
    /diagnosis/i,
    /disease/i,
    /condition/i,
    /medication/i,
    /drug/i,
    /phone/i,
    /email/i,
    /address/i,
    /ssn/i,
  ];

  return phiPatterns.some((pattern) => pattern.test(key));
}

/**
 * Mask PHI in string using regex patterns
 * 
 * Masks:
 * - Phone numbers: +91-98765-43210 → [PHONE]
 * - Email addresses: email@domain.com → [EMAIL]
 * - UHIDs: UH2024001001 → [UHID]
 * - Patient names (heuristic): CamelCase names → [NAME]
 */
function maskPHI(str: string): string {
  if (!str || typeof str !== 'string') return str;

  let masked = str;

  // Phone numbers (Indian format and international)
  masked = masked.replace(
    /(\+91)?[\s.-]?([0-9][\s.-]?){9}[0-9]/g,
    '[PHONE]'
  );

  // Email addresses
  masked = masked.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // UHIDs (pattern: UH or HOSP prefix + numeric)
  masked = masked.replace(/\b[A-Z]{2,4}\d{10,}\b/g, '[UHID]');

  // Potential patient names (heuristic: CamelCase followed by spaces)
  masked = masked.replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '[NAME]');

  // Medical diagnoses (common ICD patterns)
  masked = masked.replace(/\b[A-Z]\d{2}(\.\d{0,2})?\b/g, '[DIAGNOSIS]');

  // Prescription details (Rx numbers)
  masked = masked.replace(/\bRX[\d]{6,}\b/i, '[RX_ID]');

  // Lab values (numeric + unit patterns)
  masked = masked.replace(/\b\d+(\.\d+)?\s*(mg|ml|mg\/dl|U\/L|mmol\/L)\b/gi, '[LAB_VALUE]');

  return masked;
}

/**
 * Capture exception with proper context
 */
export function captureException(
  error: Error | unknown,
  context: ErrorContext
): string | null {
  try {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Create fingerprint for error grouping
    const fingerprint =
      context.fingerprint || [...new Set([context.context, errorObj.name])];

    // Sanitize error message
    errorObj.message = maskPHI(errorObj.message);

    // Set Sentry context
    Sentry.withScope((scope) => {
      scope.setTag('context', context.context);
      scope.setTag('severity', context.severity || 'error');

      // Add correlation ID for request tracing
      scope.setTag('correlation_id', getCorrelationId());

      // Add user context if provided
      if (context.userContext) {
        scope.setUser({
          id: context.userContext.userId,
          username: context.userContext.userRole,
        });
        scope.setContext('hospital', {
          hospital_id: context.userContext.hospitalId,
        });
      }

      // Add custom attributes
      if (context.attributes) {
        scope.setContext('attributes', context.attributes);
      }

      scope.setFingerprint(fingerprint);
      scope.setLevel(context.severity as Sentry.SeverityLevel);

      // Capture the exception
      return Sentry.captureException(errorObj);
    });

    return errorObj.message;
  } catch (e) {
    // Silently fail if error tracking fails
    console.warn('[ErrorTracking] Failed to capture exception:', e);
    return null;
  }
}

/**
 * Capture message (non-exception log)
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = 'info',
  context?: Omit<ErrorContext, 'severity'>
): void {
  Sentry.withScope((scope) => {
    if (context?.context) {
      scope.setTag('context', context.context);
    }
    scope.setTag('correlation_id', getCorrelationId());
    if (context?.attributes) {
      scope.setContext('attributes', context.attributes);
    }

    Sentry.captureMessage(maskPHI(message), level as Sentry.SeverityLevel);
  });
}

/**
 * Set user context for error tracking
 */
export function setErrorTrackingUser(context: {
  userId: string;
  hospitalId: string;
  userRole: string;
}): void {
  Sentry.setUser({
    id: context.userId,
    username: context.userRole,
  });

  Sentry.setContext('hospital', {
    hospital_id: context.hospitalId,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearErrorTrackingUser(): void {
  Sentry.setUser(null);
}

export default {
  initErrorTracking,
  captureException,
  captureMessage,
  setErrorTrackingUser,
  clearErrorTrackingUser,
};
