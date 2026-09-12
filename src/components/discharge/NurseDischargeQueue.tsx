import { useState } from 'react';
import { useDischargeWorkflow, DischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';
import { NursingDischargeChecklistModal } from './NursingDischargeChecklistModal';
import { toast } from 'sonner';

export function NurseDischargeQueue() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DischargeWorkflow | null>(null);

  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'nurse'
  );

  const handleOpenModal = (workflow: DischargeWorkflow) => {
    setSelectedWorkflow(workflow);
    setModalOpen(true);
  };

  const handleApproveDischarge = async (workflowId: string, metadata: Record<string, unknown>) => {
    await approveStep({
      workflowId,
      metadata,
    });
    setModalOpen(false);
    setSelectedWorkflow(null);
    toast.success(
      'Patient physical discharge completed! Bed scheduled for housekeeping sanitization.'
    );
  };

  const handleRejectDeterioration = async (
    workflowId: string,
    reason: string,
    rejectionType: 'clinical' | 'administrative'
  ) => {
    await rejectStep({
      workflowId,
      reason,
      rejectionType,
    });
    setModalOpen(false);
    setSelectedWorkflow(null);
    toast.error(
      'Discharge aborted due to clinical deterioration. Case returned directly to Doctor.'
    );
  };

  return (
    <>
      <DischargeQueueSection
        title="Nursing Physical Discharge Checklist Queue"
        description="Verify line/catheter removal, vital sign stability, patient teach-back education, and transportation handover."
        workflows={myQueue}
        isLoading={isLoadingQueue}
        approveLabel="Verify Checklist & Finalize Discharge"
        emptyLabel="No discharge workflows are currently waiting on nursing."
        onOpenModal={handleOpenModal}
        modalButtonLabel="Review Safety Checklist & Exit"
        isMutating={isMutating}
      />

      <NursingDischargeChecklistModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflow={selectedWorkflow}
        onApprove={handleApproveDischarge}
        onReject={handleRejectDeterioration}
        isLoading={isMutating}
      />
    </>
  );
}
