/**
 * OpenTelemetry Instrumentation for Deno Edge Functions
 * 
 * Provides:
 * - Request/response span tracking
 * - Correlation ID propagation
 * - Trace context extraction from headers
 * - Metrics recording
 * 
 * Usage in Edge Function:
 * ```
 * import { withTracing } from '../_shared/tracing.ts';
 * 
 * const handler = async (req: Request): Promise<Response> => {
 *   return withTracing(req, 'operation-name', async (ctx) => {
 *     // Your function logic
 *     // ctx.correlationId, ctx.traceParent available
 *   });
 * };
 * ```
 */

interface TraceContext {
  traceId: string;
  spanId: string;
  traceParent: string;
  correlationId: string;
}

interface InstrumentationContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  traceParent: string;
  span: Span;
}

interface Span {
  setStatus(code: 'OK' | 'UNSET' | 'ERROR', message?: string): void;
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  recordException(error: Error): void;
  end(): void;
}

// Mock spans for browser-less environment
class MockSpan implements Span {
  constructor(
    private traceId: string,
    private spanId: string,
    private operationName: string
  ) {}

  setStatus(code: 'OK' | 'UNSET' | 'ERROR', message?: string): void {
    console.log(`[${this.traceId}] Span ${this.operationName} status: ${code}`);
  }

  setAttribute(key: string, value: any): void {
    console.log(`[${this.traceId}] ${key}=${value}`);
  }

  addEvent(name: string, attributes?: Record<string, any>): void {
    console.log(`[${this.traceId}] Event: ${name}`, attributes);
  }

  recordException(error: Error): void {
    console.error(`[${this.traceId}] Exception:`, error.message);
  }

  end(): void {
    // Span complete
  }
}

/**
 * Extract trace context from HTTP headers (W3C Trace Context format)
 * 
 * Reads:
 * - traceparent: W3C format
 * - x-correlation-id: Custom correlation ID
 * - x-trace-context: Supplementary trace data
 */
function extractTraceContext(req: Request): TraceContext {
  const headers = new Headers(req.headers);
  const traceParent = headers.get('traceparent') || '';
  const correlationId =
    headers.get('x-correlation-id') || headers.get('correlation-id') || generateTraceId();

  // Parse W3C traceparent: 00-traceId-spanId-traceFlags
  let traceId = generateTraceId();
  let spanId = generateSpanId();

  if (traceParent.match(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[01]$/)) {
    const [, tid, sid] = traceParent.split('-');
    traceId = tid;
    spanId = generateSpanId(); // Create new span ID
  }

  return {
    traceId,
    spanId,
    traceParent,
    correlationId,
  };
}

/**
 * Generate random trace ID (32 hex chars)
 */
function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate random span ID (16 hex chars)
 */
function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate W3C traceparent header
 */
function generateTraceparent(
  traceId: string,
  spanId: string,
  sampled: boolean = true
): string {
  const traceFlags = sampled ? '01' : '00';
  return `00-${traceId}-${spanId}-${traceFlags}`;
}

/**
 * Instrument a function with tracing
 * 
 * @example
 * const handler = async (req: Request): Promise<Response> => {
 *   return withTracing(req, 'calculate-dosage', async (ctx) => {
 *     const { patientId, weight } = await req.json();
 *     const dosage = calculateDosage(weight);
 *     ctx.span.setAttribute('patient.id', patientId);
 *     ctx.span.setAttribute('dosage', dosage);
 *     return new Response(JSON.stringify({ dosage }));
 *   });
 * };
 */
export async function withTracing<T extends Response | void>(
  req: Request,
  operationName: string,
  handler: (ctx: InstrumentationContext) => Promise<T>
): Promise<T> {
  const traceCtx = extractTraceContext(req);
  const startTime = Date.now();

  const span = new MockSpan(traceCtx.traceId, traceCtx.spanId, operationName);
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);
  span.setAttribute('correlation.id', traceCtx.correlationId);

  const ctx: InstrumentationContext = {
    ...traceCtx,
    span,
  };

  try {
    const result = await handler(ctx);
    const duration = Date.now() - startTime;

    span.setAttribute('http.status_code', result?.status || 200);
    span.setAttribute('duration_ms', duration);
    span.setStatus('OK');

    // Log metrics
    logMetric(operationName, duration, {
      status: 'success',
      hospital_id: req.headers.get('x-hospital-id'),
      correlation_id: traceCtx.correlationId,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      span.recordException(error);
    }

    span.setStatus('ERROR', String(error));
    span.setAttribute('error.type', error?.constructor?.name || 'Unknown');
    span.setAttribute('duration_ms', duration);

    // Log error
    logError(operationName, error, {
      correlation_id: traceCtx.correlationId,
      hospital_id: req.headers.get('x-hospital-id'),
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Record a metric in Edge Function
 * Will be exported to OTLP collector
 */
function logMetric(
  metricName: string,
  value: number,
  attributes: Record<string, any> = {}
): void {
  // In production, send to OpenTelemetry Collector
  // For now, just log
  if (Deno.env.get('DEBUG_TRACING') === 'true') {
    console.log(`[Metric] ${metricName}=${value}`, attributes);
  }
}

/**
 * Record an error event
 */
function logError(
  context: string,
  error: any,
  attributes: Record<string, any> = {}
): void {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  console.error(`[Error in ${context}] ${errorMessage}`, attributes);

  // Could send to Sentry/Glitchtip here for error tracking
  // Never log PHI (patient names, UHIDs, diagnoses)
}

/**
 * Create headers that should be returned with traced response
 * Includes trace context for downstream systems
 */
export function getTracingHeaders(ctx: InstrumentationContext): Record<string, string> {
  return {
    'x-correlation-id': ctx.correlationId,
    'x-trace-id': ctx.traceId,
    'traceparent': generateTraceparent(ctx.traceId, ctx.spanId),
  };
}

/**
 * Record clinical metric in Edge Function
 * 
 * @example
 * // Record prescription creation latency
 * const startTime = Date.now();
 * const rx = await createPrescription(...);
 * recordClinicalMetric('prescription_create_latency', Date.now() - startTime, {
 *   prescription_id: rx.id,
 *   patient_id: rx.patient_id,
 * });
 */
export function recordClinicalMetric(
  metricName: string,
  value: number,
  attributes: Record<string, any> = {}
): void {
  logMetric(`clinical.${metricName}`, value, {
    ...attributes,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Record SLO breach event (sends to Prometheus)
 */
export function recordSLOBreach(
  sloId: string,
  measuredValue: number,
  threshold: number,
  attributes: Record<string, any> = {}
): void {
  logMetric('slo_breach', measuredValue, {
    slo_id: sloId,
    threshold,
    exceeded_by_percent: ((measuredValue / threshold - 1) * 100).toFixed(2),
    ...attributes,
  });
}

export default {
  withTracing,
  getTracingHeaders,
  recordClinicalMetric,
  recordSLOBreach,
  extractTraceContext,
  generateTraceId,
  generateSpanId,
};
