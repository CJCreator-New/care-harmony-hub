import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, ShieldAlert } from 'lucide-react';
import { useDischargeWorkflow, DischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';
import { InitiateDischargeModal } from './InitiateDischargeModal';
import { DischargeResubmissionModal } from './DischargeResubmissionModal';
import { toast } from 'sonner';

export function DoctorDischargeQueue() {
  const [initiateModalOpen, setInitiateModalOpen] = useState(false);
  const [resubmissionModalOpen, setResubmissionModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DischargeWorkflow | null>(null);

  const {
    myQueue,
    isLoadingQueue,
    initiateDischarge,
    dischargeAMA,
    approveStep,
    cancelWorkflow,
    isMutating,
  } = useDischargeWorkflow(undefined, 'doctor');

  const handleOpenRemediate = (workflow: DischargeWorkflow) => {
    setSelectedWorkflow(workflow);
    setResubmissionModalOpen(true);
  };

  const handleInitiateDischarge = async (data: {
    patientId: string;
    consultationId?: string;
    isAMA: boolean;
    metadata: Record<string, unknown>;
  }) => {
    if (data.isAMA) {
      // Direct AMA fast-track
      const draft = await initiateDischarge({
        patientId: data.patientId,
        consultationId: data.consultationId,
        metadata: data.metadata,
      });
      const workflowId = (draft as any)?.id || (draft as any)?.data?.id;
      if (workflowId) {
        await dischargeAMA({
          workflowId,
          reason: 'Against Medical Advice discharge requested by patient with verified capacity.',
          metadata: data.metadata,
        });
        toast.success('Against Medical Advice (AMA) discharge executed successfully.');
      }
    } else {
      await initiateDischarge({
        patientId: data.patientId,
        consultationId: data.consultationId,
        metadata: data.metadata,
      });
      toast.success('Discharge workflow initiated and forwarded to Pharmacy.');
    }
    setInitiateModalOpen(false);
  };

  const handleResubmitWorkflow = async (workflowId: string, metadata: Record<string, unknown>) => {
    // When doctor resubmits a returned case, advance it back to pharmacy
    await approveStep({
      workflowId,
      metadata,
    });
    setResubmissionModalOpen(false);
    setSelectedWorkflow(null);
    toast.success('Workflow remediated and resubmitted to Pharmacy.');
  };

  const handleCancelWorkflow = async (workflowId: string, reason: string) => {
    await cancelWorkflow({
      workflowId,
    });
    setResubmissionModalOpen(false);
    setSelectedWorkflow(null);
    toast.info('Discharge workflow cancelled.');
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Inpatient Clinical Discharge Initiation</CardTitle>
              <CardDescription>
                Select an admitted patient, prepare the clinical summary, and launch the sequential
                multi-disciplinary clearance chain.
              </CardDescription>
            </div>
            <Button onClick={() => setInitiateModalOpen(true)} className="h-9 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              New Discharge Order
            </Button>
          </div>
        </CardHeader>
      </Card>

      <DischargeQueueSection
        title="Returned to Doctor (Remediation Required)"
        description="Discharge workflows returned by pharmacy, billing, or nursing requiring clinical adjustment."
        workflows={myQueue}
        isLoading={isLoadingQueue}
        approveLabel="Remediate & Resubmit"
        emptyLabel="No discharge workflows are currently waiting on doctor action."
        onOpenModal={handleOpenRemediate}
        modalButtonLabel="Review & Remediate"
        isMutating={isMutating}
      />

      {/* Initiation Modal */}
      <InitiateDischargeModal
        open={initiateModalOpen}
        onOpenChange={setInitiateModalOpen}
        onInitiate={handleInitiateDischarge}
        isLoading={isMutating}
      />

      {/* Resubmission Modal */}
      <DischargeResubmissionModal
        open={resubmissionModalOpen}
        onOpenChange={setResubmissionModalOpen}
        workflow={selectedWorkflow}
        onResubmit={handleResubmitWorkflow}
        onCancel={handleCancelWorkflow}
        isLoading={isMutating}
      />
    </div>
  );
}
