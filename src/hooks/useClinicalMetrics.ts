/**
 * useClinicalMetrics Hook
 * 
 * Provides convenient access to OpenTelemetry instrumentation for React components.
 * Automatically handles telemetry API initialization and provides typed interfaces
 * for common clinical workflows (prescription, lab, appointment, vital signs).
 * 
 * Phase 3B: Observability Integration
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTracer,
  getMeter,
  createClinicalSpan,
  createAPISpan,
  recordClinicalMetric,
  recordEvent,
} from '@/utils/telemetry';
import {
  getCorrelationId,
  getTraceContext,
  logClinicalEvent,
} from '@/utils/correlationId';
import {
  captureException,
  captureMessage,
} from '@/utils/errorTracking';

interface ClinicalMetricsOptions {
  workflowType?: 'prescription' | 'lab' | 'appointment' | 'vital' | 'consultation' | 'billing';
  operationName: string;
  attributes?: Record<string, string | number | boolean>;
}

interface MetricRecordOptions {
  metricName: string;
  value: number;
  attributes?: Record<string, string | number | boolean>;
  unit?: string;
}

export function useClinicalMetrics() {
  const { hospital, profile, primaryRole } = useAuth();

  /**
   * Create a span for a clinical operation (prescription, lab order, etc.)
   * Automatically injects correlation ID and trace context
   */
  const recordOperation = useCallback(
    async <T,>(
      options: ClinicalMetricsOptions,
      operation: () => Promise<T>
    ): Promise<T> => {
      const startTime = performance.now();
      const correlationId = getCorrelationId(hospital?.id);
      const traceContext = getTraceContext();

      const span = createClinicalSpan(options.operationName, {
        'workflow.type': options.workflowType || 'unknown',
        'hospital.id': hospital?.id || 'unknown',
        'user.role': primaryRole || 'unknown',
        'user.id': profile?.id || 'unknown',
        'correlation.id': correlationId,
        ...options.attributes,
      });

      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        // Record latency metric
        recordClinicalMetric(`${options.operationName}_latency`, duration, {
          'workflow.type': options.workflowType || 'unknown',
          'hospital.id': hospital?.id || 'unknown',
          'status': 'success',
          ...options.attributes,
        });

        // Log clinical event
        logClinicalEvent(`${options.workflowType || 'operation'}.completed`, {
          operation: options.operationName,
          duration,
          attributes: options.attributes,
        }, 'info');

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Record error metric
        recordClinicalMetric(`${options.operationName}_latency`, duration, {
          'workflow.type': options.workflowType || 'unknown',
          'hospital.id': hospital?.id || 'unknown',
          'status': 'error',
          ...options.attributes,
        });

        // Log error event and capture to error tracking
        logClinicalEvent(`${options.workflowType || 'operation'}.failed`, {
          operation: options.operationName,
          error: error instanceof Error ? error.message : String(error),
          duration,
        }, 'error');

        captureException(error instanceof Error ? error : new Error(String(error)), {
          'workflow.type': options.workflowType,
          'operation.name': options.operationName,
          'correlation.id': correlationId,
          'hospital.id': hospital?.id,
          ...options.attributes,
        });

        throw error;
      }
    },
    [hospital?.id, profile?.id, primaryRole]
  );

  /**
   * Record a metric with optional unit and attributes
   */
  const recordMetric = useCallback(
    (options: MetricRecordOptions) => {
      recordClinicalMetric(options.metricName, options.value, {
        'hospital.id': hospital?.id || 'unknown',
        'user.role': primaryRole || 'unknown',
        ...options.attributes,
      });
    },
    [hospital?.id, primaryRole]
  );

  /**
   * Record a custom event (e.g., "prescription_approved", "lab_critical_value_detected")
   */
  const recordCustomEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      recordEvent(eventName, {
        'hospital.id': hospital?.id || 'unknown',
        'user.role': primaryRole || 'unknown',
        'user.id': profile?.id || 'unknown',
        'correlation.id': getCorrelationId(hospital?.id),
        ...properties,
      });
    },
    [hospital?.id, profile?.id, primaryRole]
  );

  /**
   * Manually log an error with context
   */
  const recordError = useCallback(
    (error: Error | string, context?: Record<string, any>, level: 'error' | 'warning' = 'error') => {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      
      captureException(errorObj, {
        'hospital.id': hospital?.id,
        'user.role': primaryRole,
        'correlation.id': getCorrelationId(hospital?.id),
        ...context,
      });

      logClinicalEvent('error.recorded', {
        error: errorObj.message,
        level,
        ...context,
      }, level);
    },
    [hospital?.id, primaryRole]
  );

  /**
   * Get current correlation ID for propagation to external services
   */
  const getCorrelation = useCallback(() => ({
    id: getCorrelationId(hospital?.id),
    context: getTraceContext(),
    hospitalId: hospital?.id,
    userId: profile?.id,
    userRole: primaryRole,
  }), [hospital?.id, profile?.id, primaryRole]);

  return {
    recordOperation,
    recordMetric,
    recordCustomEvent,
    recordError,
    getCorrelation,
    tracer: getTracer('clinical-operations'),
    meter: getMeter('clinical-metrics'),
  };
}

/**
 * Hook variant: Wrap async operation with timing + error handling
 * Use this for simple operations that don't need detailed span info
 * 
 * Example:
 * ```tsx
 * const { withTiming } = useClinicalMetrics();
 * const prescriptions = await withTiming(
 *   'fetch_prescriptions',
 *   () => fetchPrescriptionsAPI()
 * );
 * ```
 */
export function useTimedOperation() {
  const { recordOperation, recordError } = useClinicalMetrics();
  const { hospital } = useAuth();

  const withTiming = useCallback(
    async <T,>(operationName: string, fn: () => Promise<T>): Promise<T> => {
      try {
        return await recordOperation(
          {
            operationName,
            workflowType: 'unknown',
          },
          fn
        );
      } catch (error) {
        recordError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    [recordOperation, recordError]
  );

  return { withTiming };
}
