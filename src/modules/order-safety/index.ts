/**
 * Unified Clinical Order Safety Engine (`OrderSafetyEngine`)
 *
 * CareSync HIMS Deep Module
 * Single public entry point for clinical order safety verification,
 * fail-closed CDS invariants, and prescribing decision support.
 */

// Core Engine & Factory
export {
  HeadlessOrderSafetyEngine,
  createOrderSafetyEngine,
  type OrderSafetyEngineDependencies,
} from './OrderSafetyEngine';

// React Hook Adapter
export {
  useOrderSafety,
  type UseOrderSafetyOptions,
  type UseOrderSafetyReturn,
} from './useOrderSafety';

// Domain Types & Contracts
export * from './types';

// Boundary Ports
export * from './ports';

// Test Doubles / Adapters
export {
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
} from './adapters/InMemoryAdapters';

// Production Adapters
export {
  SupabaseLocalDdiAdapter,
  HttpRxNormAdapter,
  SupabaseAuditLoggerAdapter,
} from './adapters/SupabaseAdapters';

// Core Rules & Taxonomies
export { ALLERGEN_CLASS_MAP, normalizeAllergyTerm } from './core/allergyEngine';
export { AAP_DOSING_RULES, type AAPDosingRule } from './core/pediatricEngine';
export { CRITICAL_PAIRS, type CriticalPairDefinition } from './core/ddiEngine';
export { ROUTE_RESTRICTIONS, TERATOGENIC_DRUGS } from './core/clinicalInvariants';
