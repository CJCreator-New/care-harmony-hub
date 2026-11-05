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

// Patient context loading (fail-closed)
export {
  usePatientClinicalContext,
  type UsePatientClinicalContextOptions,
  type UsePatientClinicalContextReturn,
} from './usePatientClinicalContext';

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
  SupabaseActivityLogAuditAdapter,
  SupabaseAuditLoggerAdapter,
  loadPatientClinicalRecord,
  writeIntakeToPatientRecord,
  type LoadedPatientRecord,
} from './adapters/SupabaseAdapters';

// Mapping from application records to engine inputs
export {
  toOrderItems,
  parseDoseMg,
  parseDosesPerDay,
  inferRoute,
  normalizeAllergyList,
  medicationsFromRecord,
  ageFromDateOfBirth,
  mapGender,
  findingKey,
  type PrescriptionRowLike,
} from './core/orderIntent';
export { CONTEXT_INCOMPLETE_CODE, ALLERGY_STATUS_UNKNOWN_CODE } from './core/contextIntegrity';
export {
  buildPrescriptionSafetyColumns,
  priorOverridesForFindings,
  overrideSummary,
  SAFETY_RECORD_SCHEMA,
  type PersistedSafetyFinding,
  type PrescriptionSafetyColumns,
} from './core/safetyRecord';
export {
  mergeIntakeIntoPatientRecord,
  type IntakeClinicalText,
  type PatientRecordPatch,
} from './core/intakeRecord';

// Core Rules & Taxonomies
export { ALLERGEN_CLASS_MAP, normalizeAllergyTerm } from './core/allergyEngine';
export {
  AAP_DOSING_RULES,
  type AAPDosingRule,
  evaluatePediatricDosing,
  getDosesPerDay,
} from './core/pediatricEngine';
export { CRITICAL_PAIRS, type CriticalPairDefinition } from './core/ddiEngine';
export { ROUTE_RESTRICTIONS, TERATOGENIC_DRUGS } from './core/clinicalInvariants';
