/**
 * Correlation ID module.
 *
 * S0-02 / PERF-01: no global fetch interceptor is installed any more (it broke
 * browser calls to Edge Functions). Correlation IDs are still generated and can
 * be attached explicitly with `correlatedFetch` from '@/utils/correlationId'.
 */

import { getCorrelationId } from '@/utils/correlationId';

/** Kept for bootstrap compatibility; intentionally installs nothing. */
export function setupRequestInterceptors(): void {
  // no-op: see module comment
}

export function getTraceId(): string {
  return getCorrelationId();
}
