import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';
import { DischargeQueueSection } from './DischargeQueueSection';

export function DoctorDischargeQueue() {
  const [patientId, setPatientId] = useState('');
  const [consultationId, setConsultationId] = useState('');
  const {
    myQueue,
    isLoadingQueue,
    initiateDischarge,
    cancelWorkflow,
    isMutating,
  } = useDischargeWorkflow(undefined, 'doctor');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Initiate Patient Discharge</CardTitle>
          <CardDescription>
            Doctor starts discharge, then the workflow moves to pharmacist medication reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="space-y-2">
            <Label htmlFor="discharge-patient-id">Patient ID</Label>
            <Input
              id="discharge-patient-id"
              placeholder="Patient UUID"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discharge-consultation-id">Consultation ID</Label>
            <Input
              id="discharge-consultation-id"
              placeholder="Consultation UUID (optional)"
              value={consultationId}
              onChange={(event) => setConsultationId(event.target.value)}
            />
          </div>
          <Button
            onClick={() =>
              void initiateDischarge({
                patientId,
                consultationId: consultationId || undefined,
              })
            }
            disabled={isMutating || !patientId.trim()}
          >
            Start Discharge
          </Button>
        </CardContent>
      </Card>

      <DischargeQueueSection
        title="Returned to Doctor"
        description="Discharge workflows returned by pharmacy for correction."
        workflows={myQueue}
        isLoading={isLoadingQueue}
        approveLabel="Cancel Workflow"
        emptyLabel="No discharge workflows are currently waiting on doctor action."
        onApprove={(workflowId) => cancelWorkflow({ workflowId })}
        isMutating={isMutating}
      />
    </div>
  );
}
