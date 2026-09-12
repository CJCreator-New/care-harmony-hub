/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * CareSync HIMS Deep Module
 * Single public entry point for critical lab alert lifecycle and durable escalation queue per ADR-0005.
 */

// Core Engine & Factory
export {
  CriticalLabEscalationEngine,
  createCriticalLabEscalationEngine,
  type CriticalLabEscalationDependencies,
} from './CriticalLabEscalationEngine';

// React Hook Adapter
export {
  useCriticalLabEscalation,
  type UseCriticalLabEscalationOptions,
  type UseCriticalLabEscalationReturn,
} from './useCriticalLabEscalation';

// Domain Types & Contracts
export * from './types';

// Boundary Ports
export * from './ports';

// Core Rules & Ladder Constants
export {
  ESCALATION_INTERVALS_MS,
  buildEscalationLadder,
  validateAcknowledgment,
  validateResolution,
} from './core/escalationLadder';

// Clinical Reference Ranges & Panic Threshold Evaluator
export * from './core/labPanels';

// Test Doubles / Adapters
export { InMemoryLabEscalationAdapter } from './adapters/InMemoryLabEscalationAdapter';

// Production Adapters
export { SupabaseLabEscalationAdapter } from './adapters/SupabaseLabEscalationAdapter';
