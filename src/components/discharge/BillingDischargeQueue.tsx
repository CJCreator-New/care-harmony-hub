import { useState } from 'react';
import { useDischargeWorkflow, DischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';
import { FinancialClearanceModal } from './FinancialClearanceModal';
import { toast } from 'sonner';

export function BillingDischargeQueue() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DischargeWorkflow | null>(null);

  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'billing'
  );

  const handleOpenModal = (workflow: DischargeWorkflow) => {
    setSelectedWorkflow(workflow);
    setModalOpen(true);
  };

  const handleApproveBilling = async (workflowId: string, metadata: Record<string, unknown>) => {
    await approveStep({
      workflowId,
      metadata,
    });
    setModalOpen(false);
    setSelectedWorkflow(null);
    toast.success('Financial clearance approved! Forwarded to Nursing for physical discharge.');
  };

  const handleRejectBilling = async (
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
    toast.warning('Discharge workflow returned to Pharmacy.');
  };

  return (
    <>
      <DischargeQueueSection
        title="Billing Discharge Finalization Queue"
        description="Audit itemized inpatient stay charges, verify insurance copay, and settle patient balance prior to physical discharge."
        workflows={myQueue}
        isLoading={isLoadingQueue}
        approveLabel="Audit & Settle Account"
        emptyLabel="No discharge workflows are currently waiting on billing clearance."
        onOpenModal={handleOpenModal}
        modalButtonLabel="Audit & Finalize Bill"
        isMutating={isMutating}
      />

      <FinancialClearanceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflow={selectedWorkflow}
        onApprove={handleApproveBilling}
        onReject={handleRejectBilling}
        isLoading={isMutating}
      />
    </>
  );
}
