import { useAddToQueue, PriorityLevel } from '@/hooks/useQueue';
import { useCheckInAppointment } from '@/lib/hooks/appointments';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { toast } from 'sonner';

const toWorkflowPriority = (priority: string | undefined): 'low' | 'normal' | 'high' | 'urgent' => {
  switch (priority) {
    case 'low':
    case 'normal':
    case 'high':
    case 'urgent':
      return priority;
    case 'emergency':
      return 'urgent';
    default:
      return 'normal';
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
};

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
    try {
      if (appointmentId) {
        const result = await checkInAppointment.mutateAsync(appointmentId);
        const queueNumber = result.queue_number ?? null;

        await triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
          patientId: patient.id,
          priority: toWorkflowPriority((result.priority as string | undefined) || priority),
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
        priority: toWorkflowPriority(priority),
        data: {
          patientName: `${patient.first_name} ${patient.last_name}`,
          queueNumber: queueEntry.queue_number,
          isWalkIn,
          mrn: patient.mrn || undefined,
        },
      });

      return queueEntry.queue_number;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to check in patient: ${message}`);
      console.error('Unified check-in failed:', message, error);
      return null;
    }
  };

  return {
    checkIn,
    isPending: checkInAppointment.isPending || addToQueue.isPending,
  };
}

