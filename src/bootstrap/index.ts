/**
 * Application Bootstrap Orchestrator
 * Initializes all services in correct sequence to prevent startup race conditions
 */

import { setupTelemetry, teardownTelemetry, TelemetryConfig } from './telemetry';
import { setupErrorTracking, ErrorTrackingConfig } from './error-tracking';
import { setupRequestInterceptors, getTraceId } from './correlation-id';
import { setupLogger, LoggerConfig } from './logger';
import { setupMetrics } from './metrics';

export interface BootstrapConfig {
  telemetry: TelemetryConfig;
  errorTracking: ErrorTrackingConfig;
  logger: LoggerConfig;
}

/**
 * Initialize application in strict order:
 * 1. Logger (needed for diagnostics in other modules)
 * 2. Telemetry (observability foundation)
 * 3. Error Tracking (catch startup errors)
 * 4. Metrics (performance tracking)
 * 5. Request Interceptors (trace all requests)
 */
export function bootstrap(config: BootstrapConfig): {
  getLogger: () => ReturnType<typeof setupLogger>;
  getTraceId: () => string;
  shutdown: () => Promise<void>;
} {
  // Step 1: Initialize logger first
  const logger = setupLogger(config.logger);

  // Step 2: Setup telemetry for observability
  setupTelemetry(config.telemetry);
  logger.info('✓ Telemetry initialized', {
    serviceName: config.telemetry.serviceName,
    environment: config.telemetry.environment,
  });

  // Step 3: Setup error tracking
  setupErrorTracking(config.errorTracking);
  logger.info('✓ Error tracking initialized', {
    environment: config.errorTracking.environment,
  });

  // Step 4: Initialize metrics
  setupMetrics();
  logger.info('✓ Metrics initialized');

  // Step 5: Register request interceptors
  setupRequestInterceptors();
  logger.info('✓ Request interceptors registered', {
    traceId: getTraceId(),
  });

  logger.info('🚀 Application bootstrap complete');

  return {
    getLogger: () => logger,
    getTraceId,
    shutdown: teardownTelemetry,
  };
}

export { setupTelemetry, teardownTelemetry };
export { setupErrorTracking };
export { setupRequestInterceptors, getTraceId };
export { setupLogger };
export { setupMetrics };
