/**
 * Backward compatibility adapter for `useDischargeWorkflow`.
 *
 * CareSync HIMS: Deep Module Facade
 * Delegates directly to the canonical deep module `@/modules/discharge-pipeline`.
 */

export {
  useDischargePipeline as useDischargeWorkflow,
  type DischargeWorkflowStep,
  type DischargeWorkflowStatus,
  type DischargeWorkflowQueueStep,
  type DischargeWorkflow,
  type DischargeWorkflowAuditEntry,
  type WorkflowAction,
  type WorkflowActionPayload,
  type UseDischargePipelineOptions,
} from '@/modules/discharge-pipeline';
