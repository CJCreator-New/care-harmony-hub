/**
 * The single error-tracking facade for the client. `initSentry()` is the only
 * place that calls `Sentry.init`. Every event, breadcrumb and extra value is
 * scrubbed before it leaves the browser:
 *   - breadcrumbs: console crumbs dropped; URL query strings and request bodies removed
 *   - events: user reduced to id/role/hospital_id (no e-mail, no IP); `extra`, `contexts`,
 *     request query strings and free-text messages run through the shared redactor
 *   - `sendDefaultPii` is false
 */
import * as Sentry from '@sentry/react';
import { redactForLog, scrubLogString, createLogger } from '@/utils/logger';

const log = createLogger('sentry');

function stripQuery(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/** Exported for tests. Drops console crumbs and strips query strings and bodies from request crumbs. */
export function scrubBreadcrumb(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (crumb.category === 'console') return null;
  if (crumb.category === 'ui.input') return null;

  const data = (crumb.data ?? {}) as Record<string, unknown>;
  if (crumb.category === 'fetch' || crumb.category === 'xhr' || crumb.category === 'http') {
    // PostgREST query strings carry patient names in `or=(first_name.ilike...)`. Drop them.
    delete data.body;
    delete data.request_body;
    delete data.response_body;
    if (typeof data.url === 'string') data.url = stripQuery(data.url);
    if (typeof data.to === 'string') data.to = stripQuery(data.to);
    if (typeof data.from === 'string') data.from = stripQuery(data.from);
  }

  return {
    ...crumb,
    message: typeof crumb.message === 'string' ? scrubLogString(crumb.message) : crumb.message,
    data: redactForLog(data) as Record<string, unknown>,
  };
}

/** Exported for tests. Keeps only user id, role and hospital; scrubs extra, contexts, messages and URLs. */
export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.user) {
    const u = event.user as Record<string, unknown>;
    event.user = {
      id: u.id as string | undefined,
      role: u.role as string | undefined,
      hospital_id: u.hospital_id as string | undefined,
    };
  }
  if (event.extra) event.extra = redactForLog(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = redactForLog(event.contexts) as typeof event.contexts;
  if (event.message) event.message = scrubLogString(event.message);
  if (event.request) {
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url) as string;
    delete event.request.data;
  }
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = scrubLogString(v.value);
  });
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Sentry.Breadcrumb => b !== null);
  }
  return event;
}

export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,

      tracesSampleRate: 0.2,
      integrations: [
        Sentry.browserTracingIntegration({
          // Option is accepted at runtime but missing from the installed SDK's types.
          ...(({
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/.*\.supabase\.co/,
              /^https:\/\/.*\.sentry\.io/,
            ],
          }) as any),
        }),
      ],

      // Session replay is not registered, so these rates have no effect. Kept at 0 to be explicit.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,

      beforeBreadcrumb(crumb) {
        return scrubBreadcrumb(crumb);
      },

      beforeSend(event) {
        const scrubbed = scrubEvent(event);
        scrubbed.tags = {
          ...scrubbed.tags,
          healthcare_app: 'caresync-hms',
          hipaa_compliant: 'true',
        };
        return scrubbed;
      },

      beforeSendTransaction(event) {
        if (event.spans) {
          event.spans = event.spans.filter((span) => {
            const end = (span as any).endTimestamp ?? (span as any).timestamp ?? 0;
            const start = (span as any).startTimestamp ?? (span as any).start_timestamp ?? 0;
            return end - start > 0.1;
          });
        }
        return event;
      },
    });

    Sentry.setContext('application', {
      name: 'AROCORD-HIMS',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
    });
    Sentry.setTag('application', 'caresync-hms');
  }
};

export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, {
    extra: redactForLog(context) as Record<string, unknown> | undefined,
    tags: {
      error_type: 'application_error',
      healthcare_context: String(context?.healthcareContext || 'general'),
    },
  });
};

/**
 * Capture with the options shape used by the former errorTracking facade:
 * `context` (operation name), `severity`, `attributes`, `fingerprint`.
 */
export const captureException = (
  error: unknown,
  options: {
    context?: string;
    severity?: Sentry.SeverityLevel;
    attributes?: Record<string, unknown>;
    fingerprint?: string[];
  } = {}
) => {
  const err = error instanceof Error ? error : new Error(scrubLogString(String(error)));
  Sentry.captureException(err, {
    level: options.severity ?? 'error',
    fingerprint: options.fingerprint,
    extra: redactForLog(options.attributes) as Record<string, unknown> | undefined,
    tags: { error_type: 'application_error', operation: options.context ?? 'unknown' },
  });
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) => {
  Sentry.captureMessage(scrubLogString(message), {
    level,
    extra: redactForLog(context) as Record<string, unknown> | undefined,
    tags: {
      message_type: 'application_message',
      healthcare_context: String(context?.healthcareContext || 'general'),
    },
  });
};

/** Set the Sentry user by ID, role and hospital only. E-mail is never sent. */
export const setUser = (user: { id: string; role?: string; hospitalId?: string }) => {
  Sentry.setUser({
    id: user.id,
    role: user.role,
    hospital_id: user.hospitalId,
  });
  Sentry.setContext('healthcare_user', {
    role: user.role,
    hospital_id: user.hospitalId,
  });
};

export const clearUser = () => {
  Sentry.setUser(null);
  Sentry.setContext('healthcare_user', null);
};

export const captureClinicalError = (
  error: Error,
  context: {
    patientId?: string;
    operation: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    phiInvolved?: boolean;
    [key: string]: any;
  }
) => {
  Sentry.captureException(error, {
    level: context.severity === 'critical' ? 'fatal' : 'error',
    extra: redactForLog(context) as Record<string, unknown>,
    tags: {
      error_type: 'clinical_error',
      operation: context.operation,
      severity: context.severity || 'medium',
      phi_involved: String(context.phiInvolved ?? false),
      healthcare_context: 'clinical_workflow',
    },
  });
};

export const startPerformanceTransaction = (name: string, op: string) => {
  log.debug('Performance transaction started', { name, op });
  return null;
};

export const trackAIOperation = (
  operation: string | Record<string, any>,
  metrics?: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
    success: boolean;
    provider: string;
  }
) => {
  const opName = typeof operation === 'string' ? operation : (operation as any).operation || 'unknown';
  const m = typeof operation === 'string' ? metrics! : (operation as any);
  Sentry.captureMessage(`AI Operation: ${opName}`, {
    level: 'info',
    extra: redactForLog(m) as Record<string, unknown>,
    tags: {
      operation_type: 'ai_operation',
      ai_provider: m?.provider || 'unknown',
      success: String(m?.success ?? true),
      healthcare_context: 'ai_integration',
    },
  });
};

export const trackDatabaseOperation = (
  operation: string,
  metrics: {
    duration: number;
    table: string;
    recordsAffected?: number;
    success: boolean;
  }
) => {
  if (metrics.duration > 1000) {
    Sentry.captureMessage(`Slow Database Operation: ${operation}`, {
      level: 'warning',
      extra: redactForLog(metrics) as Record<string, unknown>,
      tags: {
        operation_type: 'database_operation',
        table: metrics.table,
        slow_query: 'true',
        healthcare_context: 'database_performance',
      },
    });
  }
};
