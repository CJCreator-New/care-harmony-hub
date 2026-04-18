/**
 * Telemetry Initialization Module
 * Handles OpenTelemetry and observability setup
 */

import { initializeTelemetry, shutdownTelemetry } from '@/utils/telemetry';

export interface TelemetryConfig {
  serviceName: string;
  applicationVersion: string;
  environment: 'development' | 'staging' | 'production';
  otlpEndpoint: string;
}

export function setupTelemetry(config: TelemetryConfig): void {
  initializeTelemetry({
    serviceName: config.serviceName,
    applicationVersion: config.applicationVersion,
    otlpEndpoint: config.otlpEndpoint,
    environment: config.environment,
    version: config.applicationVersion,
  });
}

export function teardownTelemetry(): Promise<void> {
  return shutdownTelemetry().catch((err) => console.error('[Telemetry Shutdown]', err));
}
