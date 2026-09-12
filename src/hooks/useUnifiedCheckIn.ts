import { useAddToQueue, PriorityLevel } from '@/hooks/useQueue';
import { useCheckInAppointment } from '@/lib/hooks/appointments';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { supabase } from '@/integrations/supabase/client';
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
  isolationRequired?: boolean;
  notes?: string;
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
    isolationRequired = false,
    notes,
  }: UnifiedCheckInInput): Promise<number | null> => {
    try {
      const effectivePriority: PriorityLevel =
        isolationRequired && (priority === 'normal' || priority === 'low') ? 'urgent' : priority;
      const isolationTag = isolationRequired ? '[ISOLATION REQUIRED] ' : '';
      const finalNotes =
        isolationTag +
        (notes || (isolationRequired ? 'Acute contagious symptoms flagged at intake' : ''));

      if (appointmentId) {
        const result = await checkInAppointment.mutateAsync(appointmentId);
        const queueNumber = result.queue_number ?? null;
        const rawPriority = (result.priority as string | undefined) || effectivePriority;
        const resolvedPriority =
          isolationRequired && (rawPriority === 'normal' || rawPriority === 'low')
            ? 'urgent'
            : rawPriority;

        if (isolationRequired) {
          await supabase
            .from('patient_queue')
            .update({
              priority: resolvedPriority as PriorityLevel,
              notes: finalNotes,
            })
            .eq('appointment_id', appointmentId)
            .eq('patient_id', patient.id);
        }

        await triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
          patientId: patient.id,
          priority: toWorkflowPriority(resolvedPriority),
          data: {
            patientName: `${patient.first_name} ${patient.last_name}`,
            queueNumber: result.queue_number || 0,
            appointmentId,
            mrn: patient.mrn || undefined,
            isolationRequired,
          },
        });

        return queueNumber;
      }

      const queueEntry = await addToQueue.mutateAsync({
        patientId: patient.id,
        priority: effectivePriority,
        notes: finalNotes,
      });

      await triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
        patientId: patient.id,
        priority: toWorkflowPriority(effectivePriority),
        data: {
          patientName: `${patient.first_name} ${patient.last_name}`,
          queueNumber: queueEntry.queue_number,
          isWalkIn,
          mrn: patient.mrn || undefined,
          isolationRequired,
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
