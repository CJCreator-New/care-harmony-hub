/**
 * Clinical telemetry facade. It has no transport of its own: spans, metrics and
 * events are written through the single client logger (`@/utils/logger`), so they
 * get the same PHI redaction and the same Sentry breadcrumb sink.
 *
 * Attributes are redacted by key (name, mrn, dob, medication, notes, ...) before
 * they are logged. Pass record IDs, never record contents.
 */
import { createLogger, redactForLog } from '@/utils/logger';

const log = createLogger('telemetry');

export interface TelemetryConfig {
  serviceName?: string;
  environment?: string;
  version?: string;
  applicationVersion?: string;
  otlpEndpoint?: string;
  debugLogging?: boolean;
}

export interface ClinicalSpan {
  setAttribute(key: string, value: unknown): void;
  setStatus(status: 'OK' | 'ERROR', message?: string): void;
  recordException(error: unknown): void;
  end(): void;
}

type Attributes = Record<string, unknown>;

function safeAttributes(attributes: Attributes = {}): Attributes {
  return (redactForLog(attributes) as Attributes) ?? {};
}

function createSpan(name: string, attributes: Attributes = {}): ClinicalSpan {
  const startedAt = Date.now();
  const attrs: Attributes = safeAttributes(attributes);
  let status: 'OK' | 'ERROR' | undefined;
  let ended = false;

  return {
    setAttribute(key, value) {
      attrs[key] = (redactForLog({ [key]: value }) as Attributes)[key];
    },
    setStatus(next, message) {
      status = next;
      if (message) attrs.status_message = redactForLog(message);
    },
    recordException(error) {
      status = 'ERROR';
      const message = error instanceof Error ? error.message : String(error);
      attrs.exception = redactForLog({ name: error instanceof Error ? error.name : 'Error', message });
    },
    end() {
      if (ended) return;
      ended = true;
      const duration_ms = Date.now() - startedAt;
      log.logPerformanceEvent({
        operation: name,
        duration_ms,
        success: status !== 'ERROR',
        ...attrs,
      });
    },
  };
}

export function initializeTelemetry(cfg: TelemetryConfig): void {
  log.info('Telemetry initialised', {
    service: cfg.serviceName,
    environment: cfg.environment,
    version: cfg.version ?? cfg.applicationVersion,
  });
}

export function getTracer(name: string = 'care-sync') {
  return {
    name,
    startSpan: (spanName: string, options?: { attributes?: Attributes }) =>
      createSpan(spanName, options?.attributes),
  };
}

export function getMeter(name: string = 'care-sync') {
  return { name };
}

export function createClinicalSpan(operationName: string, attributes: Attributes = {}): ClinicalSpan {
  return createSpan(operationName, attributes);
}

export function recordClinicalMetric(name: string, value: number, attributes: Attributes = {}): void {
  try {
    log.info('clinical metric', { metric: name, value, ...safeAttributes(attributes) });
  } catch {
    // Telemetry must never break a clinical workflow.
  }
}

export function recordEvent(eventName: string, attributes: Attributes = {}): void {
  log.info('clinical event', { event: eventName, ...safeAttributes(attributes) });
}

export async function shutdownTelemetry(): Promise<void> {
  // Nothing to flush: breadcrumbs are sent by Sentry itself.
}

export default {
  initializeTelemetry,
  getTracer,
  getMeter,
  createClinicalSpan,
  recordClinicalMetric,
  recordEvent,
  shutdownTelemetry,
};
