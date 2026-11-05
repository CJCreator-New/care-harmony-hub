// @ts-nocheck
/**
 * Correlation ID & Trace Context Management for CareSync
 * 
 * Manages request-scoped correlation IDs across:
 * - React components
 * - API calls (fetch/XHR)
 * - Span headers and attributes
 * - Server logs (for request tracing)
 * 
 * Correlation ID format: HOSP-{hospitalId}-{timestamp}-{randomId}
 * Enables end-to-end request tracing across frontend → backend layers
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceState?: string;
}

// Store for correlation ID and trace context (works in both browser and Node.js)
const correlationIdStorage = new Map<string, string>();
const traceContextStorage = new Map<string, TraceContext>();

let currentCorrelationId = '';
let currentTraceContext: TraceContext | null = null;

/**
 * Generate a unique correlation ID for request tracing
 * 
 * Format: hosp_{hospitalId}_{timestamp}_{random}
 */
export function generateCorrelationId(hospitalId?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = hospitalId ? `hosp_${hospitalId}` : 'trace';
  
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Set correlation ID for this context
 * Should be called at request entry point
 */
export function setCorrelationId(id: string, hospitalId?: string): string {
  currentCorrelationId = id || generateCorrelationId(hospitalId);
  
  // Also store in sessionStorage for browser persistence
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('correlationId', currentCorrelationId);
  }
  
  return currentCorrelationId;
}

/**
 * Get the current correlation ID
 * Creates new one if none exists
 */
export function getCorrelationId(hospitalId?: string): string {
  if (currentCorrelationId) {
    return currentCorrelationId;
  }

  // Try to retrieve from sessionStorage
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('correlationId');
    if (stored) {
      currentCorrelationId = stored;
      return stored;
    }
  }

  // Generate new
  return setCorrelationId('', hospitalId);
}

/**
 * Clear correlation ID (e.g., on logout)
 */
export function clearCorrelationId(): void {
  currentCorrelationId = '';
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('correlationId');
  }
}

/**
 * Set trace context (W3C Trace Context format)
 */
export function setTraceContext(context: Partial<TraceContext>): void {
  currentTraceContext = context as TraceContext;
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('traceContext', JSON.stringify(context));
  }
}

/**
 * Get current trace context
 */
export function getTraceContext(): Partial<TraceContext> | null {
  if (currentTraceContext) {
    return currentTraceContext;
  }

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('traceContext');
    if (stored) {
      try {
        currentTraceContext = JSON.parse(stored);
        return currentTraceContext;
      } catch (e) {
        console.warn('[CorrelationID] Failed to parse stored trace context');
      }
    }
  }

  return null;
}

/**
 * Extract correlation ID from HTTP headers
 * Useful for server-side functions processing requests
 */
export function extractCorrelationIdFromHeaders(headers: Record<string, string>): string {
  return (
    headers['x-correlation-id'] ||
    headers['correlation-id'] ||
    headers['x-request-id'] ||
    generateCorrelationId()
  );
}

/**
 * Create fetch wrapper that automatically injects correlation ID headers
 * 
 * @example
 * const response = await correlatedFetch('/api/create-prescription', {
 *   method: 'POST',
 *   body: JSON.stringify({ ... }),
 * });
 */
export async function correlatedFetch(
  url: string | Request,
  init?: RequestInit & { hospitalId?: string }
): Promise<Response> {
  const correlationId = getCorrelationId(init?.hospitalId);
  const traceContext = getTraceContext();

  // Clone init if provided
  const headers = {
    'x-correlation-id': correlationId,
    ...(traceContext && { 'x-trace-context': JSON.stringify(traceContext) }),
    ...init?.headers,
  };

  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * True when the request goes to the page's own origin. Correlation headers are
 * not CORS-safelisted, so adding them to a cross-origin request forces a
 * preflight that most third parties (and, until their allow-list is updated
 * and redeployed, the Supabase Edge Functions) reject (PERF-01).
 */
function isSameOriginRequest(url: string | URL | Request): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  try {
    const raw = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    return new URL(raw, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Add correlation ID to Fetch API before sending requests
 * Wrap a fetch explicitly (no global install; S0-02)
 *
 * Only same-origin requests are tagged; cross-origin requests (Supabase REST,
 * Auth, Edge Functions, RxNorm, ...) pass through untouched.
 */
export function injectCorrelationIdIntoFetch(
  originalFetch: typeof fetch
): typeof fetch {
  const wrapped = function (url: string | URL | Request, init?: RequestInit) {
    if (!isSameOriginRequest(url)) {
      return originalFetch(url, init);
    }

    const correlationId = getCorrelationId();
    const traceContext = getTraceContext();

    // Start from the Request's own headers when no init headers are given, so
    // fetch(new Request(...)) does not lose them.
    const baseHeaders =
      init?.headers ?? (typeof Request !== 'undefined' && url instanceof Request ? url.headers : undefined);
    const headers = new Headers(baseHeaders || {});
    headers.set('x-correlation-id', correlationId);

    if (traceContext) {
      headers.set('x-trace-context', JSON.stringify(traceContext));
    }

    return originalFetch(url, {
      ...init,
      headers,
    });
  };
  (wrapped as any).__correlationIdInterceptor = true;
  return wrapped as typeof fetch;
}

// S0-02 / PERF-01: there is deliberately no global `window.fetch` patch.
// Replacing fetch app-wide added non-safelisted headers to cross-origin
// Supabase calls and broke Edge Function preflights. Use `correlatedFetch` or
// `injectCorrelationIdIntoFetch(fetch)` explicitly for first-party requests.

/**
 * Extract trace context from HTTP headers (W3C Trace Context format)
 * 
 * @example
 * const context = parseTraceParent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
 */
export function parseTraceParent(header: string): TraceContext | null {
  // Format: version=00, traceId=4bf92f3577b34da6a3ce929d0e0e4736, parentId=00f067aa0ba902b7, traceFlags=01
  const parts = header.split('-');
  
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, traceFlags] = parts;

  if (version !== '00' || !traceId || !spanId || !traceFlags) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceFlags,
  };
}

/**
 * Generate W3C Trace Context traceparent header
 */
export function generateTraceparent(
  traceId: string,
  spanId: string,
  sampled: boolean = true
): string {
  const traceFlags = sampled ? '01' : '00';
  return `00-${traceId.padStart(32, '0')}-${spanId.padStart(16, '0')}-${traceFlags}`;
}

/**
 * Clinical context enrichment
 * Attach hospital, user, and role info to correlation ID for access control
 */
export interface ClinicalContext {
  hospitalId: string;
  userId: string;
  userRole: 'doctor' | 'nurse' | 'pharmacist' | 'lab_technician' | 'receptionist' | 'admin' | 'patient';
  patientId?: string;
}

export function deserializeCorrelationId(correlationId: string): {
  hospitalId?: string;
  timestamp?: number;
} | null {
  // Format: hosp_{hospitalId}_{timestamp}_{random}
  const parts = correlationId.split('_');
  
  if (parts[0] !== 'hosp' || parts.length < 3) {
    return null;
  }

  return {
    hospitalId: parts[1],
    timestamp: parseInt(parts[2], 36),
  };
}

/**
 * Create a clinical context object with correlation ID
 */
export function createClinicalContext(
  context: ClinicalContext
): { correlationId: string; context: ClinicalContext } {
  const correlationId = generateCorrelationId(context.hospitalId);
  setCorrelationId(correlationId, context.hospitalId);

  return {
    correlationId,
    context,
  };
}

/**
 * Log a clinical event with correlation ID context
 * Use for audit trail and observability
 */
export function logClinicalEvent(
  eventType: string,
  details: Record<string, any>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const correlationId = getCorrelationId();
  const traceContext = getTraceContext();

  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    correlationId,
    traceContext,
    ...details,
  };

  // Send to structured logging endpoint
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // Silently fail if logging endpoint unavailable
      console.debug(`[Clinical Event] ${eventType}:`, logEntry);
    });
  }
}

export default {
  generateCorrelationId,
  setCorrelationId,
  getCorrelationId,
  clearCorrelationId,
  setTraceContext,
  getTraceContext,
  extractCorrelationIdFromHeaders,
  correlatedFetch,
  injectCorrelationIdIntoFetch,
  parseTraceParent,
  generateTraceparent,
  createClinicalContext,
  logClinicalEvent,
};
