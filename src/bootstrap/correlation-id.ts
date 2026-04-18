/**
 * Correlation ID & Request Interceptor Module
 * Handles request correlation and tracing setup
 */

import { registerFetchInterceptor, getCorrelationId } from '@/utils/correlationId';

export function setupRequestInterceptors(): void {
  registerFetchInterceptor();
}

export function getTraceId(): string {
  return getCorrelationId();
}
