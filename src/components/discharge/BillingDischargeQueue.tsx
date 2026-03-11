import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';

export function BillingDischargeQueue() {
  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'billing',
  );

  return (
    <DischargeQueueSection
      title="Billing Finalization Queue"
      description="Finalize the discharge invoice before the patient moves to nursing checkout."
      workflows={myQueue}
      isLoading={isLoadingQueue}
      approveLabel="Finalize Invoice"
      emptyLabel="No discharge workflows are waiting on billing."
      onApprove={(workflowId) => approveStep({ workflowId })}
      onReject={(workflowId, reason) => rejectStep({ workflowId, reason })}
      isMutating={isMutating}
    />
  );
}
