/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * CareSync HIMS Deep Module
 * Single public entry point for prescription approval workflow state orchestration,
 * pharmacist role gating, and dispensing safety locks per ADR-0004.
 */

// Core Engine & Factory
export {
  PrescriptionDispensingEngine,
  createPrescriptionDispensingEngine,
  type PrescriptionDispensingDependencies,
} from './PrescriptionDispensingEngine';

// React Hook Adapter
export {
  usePrescriptionDispensing,
  type UsePrescriptionDispensingOptions,
  type UsePrescriptionDispensingReturn,
} from './usePrescriptionDispensing';

// Domain Types & Contracts
export * from './types';

// Boundary Ports
export * from './ports';

// Test Doubles / Adapters
export { InMemoryPrescriptionAdapter } from './adapters/InMemoryPrescriptionAdapter';

// Production Adapters
export { SupabasePrescriptionAdapter } from './adapters/SupabasePrescriptionAdapter';
