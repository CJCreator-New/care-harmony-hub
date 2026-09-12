/**
 * Backward compatibility facade for `usePrescriptionApprovalWorkflow`.
 *
 * CareSync HIMS: Deep Module Facade
 * Delegates directly to the canonical deep module `@/modules/prescription-dispensing`.
 */

export {
  usePrescriptionDispensing as usePrescriptionApprovalWorkflow,
  type PrescriptionWorkflow as WorkflowState,
  type PrescriptionWorkflowStatus,
  type PrescriptionWorkflowAction,
  type PrescriptionTransitionResult,
  type UsePrescriptionDispensingOptions,
  type UsePrescriptionDispensingReturn,
} from '@/modules/prescription-dispensing';
