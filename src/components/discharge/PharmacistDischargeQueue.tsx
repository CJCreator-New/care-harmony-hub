import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';

export function PharmacistDischargeQueue() {
  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'pharmacist',
  );

  return (
    <DischargeQueueSection
      title="Pharmacy Clearance Queue"
      description="Medication reconciliation clearance before billing can finalize discharge."
      workflows={myQueue}
      isLoading={isLoadingQueue}
      approveLabel="Approve Medication Reconciliation"
      emptyLabel="No discharge workflows are waiting on pharmacy."
      onApprove={(workflowId) => approveStep({ workflowId })}
      onReject={(workflowId, reason) => rejectStep({ workflowId, reason })}
      isMutating={isMutating}
    />
  );
}
