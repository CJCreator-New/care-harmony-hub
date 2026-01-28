import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,

      // Performance monitoring
      tracesSampleRate: 0.2, // Increased for better visibility
      integrations: [
        new BrowserTracing({
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.supabase\.co/,
            /^https:\/\/.*\.sentry\.io/,
          ],
        }),
        // Note: Replay integration may not be available in this Sentry version
        // Commenting out for now to avoid build errors
        // new Sentry.Replay({
        //   maskAllText: true, // HIPAA compliance - mask all text
        //   blockAllMedia: true, // Block images/videos for privacy
        // }),
      ],

      // Session replay for error debugging
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Healthcare-specific error filtering
      beforeSend(event, hint) {
        // Log error for internal monitoring
        console.error('Error captured by Sentry:', {
          error: hint.originalException || hint.syntheticException,
          user: event.user,
          tags: event.tags,
        });

        // Filter out non-critical errors in development
        if (import.meta.env.DEV && event.level === 'warning') {
          return null;
        }

        // Add healthcare context
        if (event.tags) {
          event.tags.healthcare_app = 'caresync-hms';
          event.tags.hipaa_compliant = 'true';
        }

        return event;
      },

      // Performance monitoring
      beforeSendTransaction(event) {
        // Filter out very fast transactions
        if (event.spans) {
          event.spans = event.spans.filter(span => {
            return span.endTimestamp - span.startTimestamp > 0.1; // > 100ms
          });
        }
        return event;
      },
    });

    // Set application context
    Sentry.setContext('application', {
      name: 'CareSync HMS',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
      healthcare_compliant: true,
    });

    // Set initial tags
    Sentry.setTag('application', 'caresync-hms');
    Sentry.setTag('healthcare', 'true');
    Sentry.setTag('hipaa_compliant', 'true');
  }
};

export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      error_type: 'application_error',
      healthcare_context: context?.healthcareContext || 'general',
    },
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) => {
  Sentry.captureMessage(message, level, {
    extra: context,
    tags: {
      message_type: 'application_message',
      healthcare_context: context?.healthcareContext || 'general',
    },
  });
};

export const setUser = (user: { id: string; email?: string; role?: string; hospitalId?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    hospital_id: user.hospitalId,
  });

  // Set user context for healthcare operations
  Sentry.setContext('healthcare_user', {
    role: user.role,
    hospital_id: user.hospitalId,
    hipaa_authorized: true,
  });
};

export const clearUser = () => {
  Sentry.setUser(null);
  Sentry.setContext('healthcare_user', null);
};

// Healthcare-specific error tracking
export const captureClinicalError = (error: Error, context: {
  patientId?: string;
  operation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  phiInvolved: boolean;
}) => {
  Sentry.captureException(error, {
    level: context.severity === 'critical' ? 'fatal' : 'error',
    extra: context,
    tags: {
      error_type: 'clinical_error',
      operation: context.operation,
      severity: context.severity,
      phi_involved: context.phiInvolved,
      healthcare_context: 'clinical_workflow',
    },
  });
};

// Performance monitoring - using Sentry's built-in tracing
export const startPerformanceTransaction = (name: string, op: string) => {
  // Sentry automatically handles performance monitoring with BrowserTracing
  console.log(`Starting performance monitoring for ${name} (${op})`);
  return null;
};

// AI operation tracking
export const trackAIOperation = (operation: string, metrics: {
  duration: number;
  tokensUsed?: number;
  cost?: number;
  success: boolean;
  provider: string;
}) => {
  Sentry.captureMessage(`AI Operation: ${operation}`, 'info', {
    extra: metrics,
    tags: {
      operation_type: 'ai_operation',
      ai_provider: metrics.provider,
      success: metrics.success,
      healthcare_context: 'ai_integration',
    },
  });
};

// Database operation monitoring
export const trackDatabaseOperation = (operation: string, metrics: {
  duration: number;
  table: string;
  recordsAffected?: number;
  success: boolean;
}) => {
  if (metrics.duration > 1000) { // Log slow queries > 1 second
    Sentry.captureMessage(`Slow Database Operation: ${operation}`, 'warning', {
      extra: metrics,
      tags: {
        operation_type: 'database_operation',
        table: metrics.table,
        slow_query: 'true',
        healthcare_context: 'database_performance',
      },
    });
  }
};
