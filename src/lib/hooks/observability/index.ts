/**
 * Observability Hooks
 * 
 * Complete suite of hooks for audit logging, performance metrics, and health checks.
 * Enables end-to-end tracing and observability for Phase 4 optimization.
 * 
 * - useAuditLog: Clinical action logging (HIPAA Domain 7)
 * - usePerformanceMetrics: Performance measurement for load testing
 * - useHealthCheck: System readiness probes
 */

export {
  useAuditLog,
  AuditEventType,
  type AuditLogEntry,
} from './useAuditLog';

export {
  usePerformanceMetrics,
  useWebVitals,
  MetricCategory,
  type PerformanceMetric,
} from './usePerformanceMetrics';

export {
  useHealthCheck,
  HealthStatus,
  HealthStatusIndicator,
  validateHealthBeforeOperation,
  type ComponentHealth,
  type SystemHealth,
} from './useHealthCheck';
