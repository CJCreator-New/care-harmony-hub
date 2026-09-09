/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * CareSync HIMS Deep Module
 * Single public entry point for patient discharge orchestration,
 * sequential role enforcement (doctor -> pharmacist -> billing -> nurse),
 * optimistic concurrency guarantees, and audit history.
 */

// Core Headless Engine & Factory
export {
  DischargePipelineEngine,
  createDischargePipelineEngine,
  type DischargePipelineEngineDependencies,
} from './DischargePipelineEngine';

// React Hook Presentation Seam
export {
  useDischargePipeline,
  type WorkflowAction,
  type WorkflowActionPayload,
  type UseDischargePipelineOptions,
} from './useDischargePipeline';

// Core State Machine Invariants
export {
  STEP_ROLE_MAP,
  NEXT_STEP,
  PREVIOUS_STEP,
  getRoleStep,
  isActorAuthorizedForStep,
  validateStepTransition,
  type TransitionValidationResult,
} from './core/stateMachine';

// Domain Types & Contracts
export * from './types';

// Boundary Ports
export * from './ports';

// Test Doubles & Adapters
export { InMemoryDischargeAdapter } from './adapters/InMemoryDischargeAdapter';
export { SupabaseDischargeAdapter } from './adapters/SupabaseDischargeAdapter';
