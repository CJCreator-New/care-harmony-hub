import { useState } from 'react';
import { useDischargeWorkflow, DischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';
import { MedicationReconciliationModal } from './MedicationReconciliationModal';
import { toast } from 'sonner';

export function PharmacistDischargeQueue() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DischargeWorkflow | null>(null);

  const { myQueue, isLoadingQueue, approveStep, rejectStep, isMutating } = useDischargeWorkflow(
    undefined,
    'pharmacist'
  );

  const handleOpenModal = (workflow: DischargeWorkflow) => {
    setSelectedWorkflow(workflow);
    setModalOpen(true);
  };

  const handleApproveReconciliation = async (
    workflowId: string,
    metadata: Record<string, unknown>
  ) => {
    await approveStep({
      workflowId,
      metadata,
    });
    setModalOpen(false);
    setSelectedWorkflow(null);
    toast.success('Medication reconciliation approved! Forwarded to Billing.');
  };

  const handleRejectReconciliation = async (
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
    toast.warning('Discharge workflow returned to Doctor for medication correction.');
  };

  return (
    <>
      <DischargeQueueSection
        title="Pharmacy Medication Reconciliation Queue"
        description="Review active inpatient MAR medications, take-home prescriptions, and in-flight orders before billing finalization."
        workflows={myQueue}
        isLoading={isLoadingQueue}
        approveLabel="Perform Medication Reconciliation"
        emptyLabel="No discharge workflows are currently waiting on pharmacy review."
        onOpenModal={handleOpenModal}
        modalButtonLabel="Reconcile Medications"
        isMutating={isMutating}
      />

      <MedicationReconciliationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflow={selectedWorkflow}
        onApprove={handleApproveReconciliation}
        onReject={handleRejectReconciliation}
        isLoading={isMutating}
      />
    </>
  );
}
