/**
 * Application Bootstrap Orchestrator
 * Initializes the client observability path in a fixed order.
 *
 * Sentry is NOT initialised here: `initSentry()` in src/lib/monitoring/sentry.ts runs
 * synchronously from main.tsx before the first render and is the only `Sentry.init`.
 */

import { setupTelemetry, teardownTelemetry, TelemetryConfig } from './telemetry';
import { setupRequestInterceptors, getTraceId } from './correlation-id';
import { setupLogger, LoggerConfig } from './logger';
import { setupMetrics } from './metrics';

export interface BootstrapConfig {
  telemetry: TelemetryConfig;
  logger: LoggerConfig;
}

/**
 * Initialize application in strict order:
 * 1. Logger (needed for diagnostics in other modules)
 * 2. Telemetry (routed through the logger)
 * 3. Metrics
 * 4. Request interceptors (trace all requests)
 */
export function bootstrap(config: BootstrapConfig): {
  getLogger: () => ReturnType<typeof setupLogger>;
  getTraceId: () => string;
  shutdown: () => Promise<void>;
} {
  const logger = setupLogger(config.logger);

  setupTelemetry(config.telemetry);
  logger.info('Telemetry initialized', {
    serviceName: config.telemetry.serviceName,
    environment: config.telemetry.environment,
  });

  setupMetrics();
  logger.info('Metrics initialized');

  setupRequestInterceptors();
  logger.info('Request interceptors registered', {
    traceId: getTraceId(),
  });

  logger.info('Application bootstrap complete');

  return {
    getLogger: () => logger,
    getTraceId,
    shutdown: teardownTelemetry,
  };
}

export { setupTelemetry, teardownTelemetry };
export { setupRequestInterceptors, getTraceId };
export { setupLogger };
export { setupMetrics };
