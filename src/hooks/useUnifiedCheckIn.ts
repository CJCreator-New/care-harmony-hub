import { useAddToQueue, PriorityLevel } from '@/hooks/useQueue';
import { useCheckInAppointment } from '@/hooks/useAppointments';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';

interface UnifiedCheckInInput {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn?: string | null;
  };
  appointmentId?: string;
  priority?: PriorityLevel;
  isWalkIn?: boolean;
}

export function useUnifiedCheckIn() {
  const checkInAppointment = useCheckInAppointment();
  const addToQueue = useAddToQueue();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  const checkIn = async ({
    patient,
    appointmentId,
    priority = 'normal',
    isWalkIn = false,
  }: UnifiedCheckInInput): Promise<number | null> => {
    if (appointmentId) {
      const result = await checkInAppointment.mutateAsync(appointmentId);
      const queueNumber = result.queue_number ?? null;

      await triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
        patientId: patient.id,
        priority: ((result.priority as string) || priority) as any,
        data: {
          patientName: `${patient.first_name} ${patient.last_name}`,
          queueNumber: result.queue_number || 0,
          appointmentId,
          mrn: patient.mrn || undefined,
        },
      });

      return queueNumber;
    }

    const queueEntry = await addToQueue.mutateAsync({
      patientId: patient.id,
      priority,
    });

    await triggerWorkflow({
      type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
      patientId: patient.id,
      priority: priority as any,
      data: {
        patientName: `${patient.first_name} ${patient.last_name}`,
        queueNumber: queueEntry.queue_number,
        isWalkIn,
        mrn: patient.mrn || undefined,
      },
    });

    return queueEntry.queue_number;
  };

  return {
    checkIn,
    isPending: checkInAppointment.isPending || addToQueue.isPending,
  };
}

