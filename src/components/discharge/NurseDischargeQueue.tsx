import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';

export function NurseDischargeQueue() {
  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'nurse',
  );

  return (
    <DischargeQueueSection
      title="Nursing Discharge Checklist Queue"
      description="Complete physical discharge checklist and close the discharge workflow."
      workflows={myQueue}
      isLoading={isLoadingQueue}
      approveLabel="Complete Physical Discharge"
      emptyLabel="No discharge workflows are waiting on nursing."
      onApprove={(workflowId) => approveStep({ workflowId })}
      onReject={(workflowId, reason) => rejectStep({ workflowId, reason })}
      isMutating={isMutating}
    />
  );
}
