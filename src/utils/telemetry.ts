/**
 * Client-Side Telemetry for CareSync HIMS
 * 
 * Lightweight observability module for:
 * - Correlation ID tracking across API calls
 * - Console logging with structured output
 * - Performance metrics (stub for future OpenTelemetry integration)
 * 
 * Note: Full OpenTelemetry distributed tracing will be implemented
 * in a future phase once dependency versions are properly aligned.
 */

import { getTraceContext, setTraceContext, getCorrelationId } from './correlationId';

export interface TelemetryConfig {
  serviceName: string;
  version: string;
  applicationVersion: string;
  hospitalId?: string;
  userId?: string;
  userRole?: string;
  otlpEndpoint?: string;
  environment?: 'development' | 'staging' | 'production';
  sampleRate?: number;
  debugLogging?: boolean;
}

interface Span {
  startTime: number;
  endTime?: number;
  name: string;
  attributes: Record<string, any>;
  status?: string;
  duration?: number;
}

let isInitialized = false;
const spans = new Map<string, Span>();
let telemetryConfig: TelemetryConfig | null = null;

/**
 * Initialize telemetry for client-side tracing
 */
export function initializeTelemetry(cfg: TelemetryConfig): void {
  if (isInitialized) return;
  isInitialized = true;

  telemetryConfig = {
    serviceName: cfg.serviceName || 'care-sync-frontend',
    version: cfg.version || '1.2.0',
    applicationVersion: cfg.applicationVersion || '1.2.0',
    otlpEndpoint: cfg.otlpEndpoint || process.env.VITE_OTLP_ENDPOINT || 'http://localhost:4317',
    environment: cfg.environment || (process.env.VITE_ENV as any) || 'development',
    sampleRate: cfg.sampleRate ?? (cfg.environment === 'production' ? 0.1 : 1.0),
    debugLogging: cfg.debugLogging ?? (cfg.environment === 'development'),
    ...cfg,
  };

  // Extract trace context from script tag if present
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  if (scriptTag) {
    const traceContext = scriptTag.getAttribute('data-trace-context');
    if (traceContext) {
      try {
        setTraceContext(JSON.parse(traceContext));
      } catch (e) {
        if (telemetryConfig.debugLogging) {
          console.warn('Failed to parse trace context from script tag');
        }
      }
    }
  }

  if (telemetryConfig.debugLogging) {
    console.log(
      `[Telemetry] Initialized ${telemetryConfig.serviceName} v${telemetryConfig.version} (${telemetryConfig.environment})`
    );
  }
}

/**
 * Get current tracer object (stub for future OpenTelemetry)
 */
export function getTracer(name: string = 'care-sync') {
  return {
    startSpan: (operationName: string, options?: any) => createSpan(operationName, options),
  };
}

/**
 * Get current meter object (stub for future OpenTelemetry)
 */
export function getMeter(name: string = 'care-sync') {
  return {
    createHistogram: (name: string) => ({
      record: (value: number, attributes?: any) => recordMetric(name, value, attributes),
    }),
  };
}

/**
 * Internal function to create a span for tracking operations
 */
function createSpan(name: string, options: any = {}) {
  const spanId = `span-${Date.now()}-${Math.random()}`;
  const span: Span = {
    startTime: Date.now(),
    name,
    attributes: {
      'span.kind': options.attributes?.['span.kind'] || 'internal',
      'correlation.id': getCorrelationId() || '',
      ...options.attributes,
    },
  };

  spans.set(spanId, span);

  return {
    spanId,
    setAttribute: (key: string, value: any) => {
      span.attributes[key] = value;
    },
    setStatus: (status: any) => {
      span.status = status.code;
    },
    recordException: (error: Error) => {
      span.attributes['error'] = true;
      span.attributes['error.message'] = error.message;
      span.attributes['error.stack'] = error.stack;
      if (telemetryConfig?.debugLogging) {
        console.error(`[Span ${span.name}] Error:`, error);
      }
    },
    spanContext: () => ({
      traceId: 'development-' + getCorrelationId(),
      spanId: spanId.substring(0, 16),
      traceFlags: 1,
    }),
    end: () => {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      
      if (telemetryConfig?.debugLogging) {
        console.log(`[Span] ${span.name}: ${span.duration}ms`, span.attributes);
      }

      // Clean up old spans after 5 minutes
      if (spans.size > 1000) {
        const now = Date.now();
        for (const [id, s] of spans.entries()) {
          if (s.endTime && now - s.endTime > 300000) {
            spans.delete(id);
          }
        }
      }
    },
  };
}

/**
 * Create a span for a clinical workflow operation
 */
export function createClinicalSpan(
  operationName: string,
  attributes: Record<string, any> = {}
) {
  const tracer = getTracer();
  return tracer.startSpan(operationName, {
    attributes: {
      'span.kind': 'internal',
      'clinical.operation': operationName,
      ...attributes,
    },
  });
}

/**
 * Create a span for an API call with correlation headers
 */
export function createAPISpan(
  endpoint: string,
  method: string = 'GET',
  attributes: Record<string, any> = {}
) {
  const tracer = getTracer();
  const span = tracer.startSpan(`api.${method.toLowerCase()}`, {
    attributes: {
      'span.kind': 'client',
      'http.method': method,
      'http.url': endpoint,
      ...attributes,
    },
  });

  const correlationId = getCorrelationId();
  return {
    span,
    headers: {
      'x-correlation-id': correlationId,
      'x-trace-context': JSON.stringify(getTraceContext()),
    },
  };
}

/**
 * Record a metric value
 */
function recordMetric(name: string, value: number, attributes: Record<string, any> = {}) {
  if (telemetryConfig?.debugLogging) {
    console.log(`[Metric] ${name}: ${value}`, attributes);
  }
}

/**
 * Record a clinical SLI (Service Level Indicator) metric
 */
export function recordClinicalMetric(
  metricName: string,
  value: number,
  attributes: Record<string, any> = {}
) {
  try {
    const meter = getMeter();
    const histogram = meter.createHistogram(metricName);
    histogram.record(value, attributes);
  } catch (e) {
    if (telemetryConfig?.debugLogging) {
      console.warn(`[Telemetry] Failed to record metric ${metricName}:`, e);
    }
  }
}

/**
 * Record event for observability dashboard
 */
export function recordEvent(
  eventName: string,
  properties: Record<string, any> = {}
) {
  const tracer = getTracer();
  const span = tracer.startSpan(eventName, {
    attributes: {
      'span.kind': 'event',
      ...properties,
    },
  });
  span.end();
}

/**
 * Gracefully shutdown telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  if (telemetryConfig?.debugLogging) {
    console.log('[Telemetry] Shutting down...');
  }
  spans.clear();
}

// Auto-initialize telemetry if in browser
if (typeof window !== 'undefined' && !isInitialized) {
  const autoInit = (window as any).__TELEMETRY_AUTO_INIT !== false;
  
  if (autoInit) {
    const cfg: TelemetryConfig = {
      serviceName: 'care-sync-frontend',
      version: '1.2.0',
      applicationVersion: (window as any).__APP_VERSION || '1.2.0',
      hospitalId: (window as any).__HOSPITAL_ID,
      userId: (window as any).__USER_ID,
      userRole: (window as any).__USER_ROLE,
      environment: (import.meta.env.VITE_ENV as any) || import.meta.env.MODE || 'development',
    };
    
    try {
      initializeTelemetry(cfg);
    } catch (e) {
      console.warn('[Telemetry] Failed to auto-initialize:', e);
    }
  }
}

export default {
  initializeTelemetry,
  getTracer,
  getMeter,
  createClinicalSpan,
  createAPISpan,
  recordClinicalMetric,
  recordEvent,
  shutdownTelemetry,
};
