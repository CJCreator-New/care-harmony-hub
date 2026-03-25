import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';
import { devLog, sanitizeLogMessage } from '@/utils/sanitize';
import { sendNotification } from '@/services/notificationAdapter';

// Add new workflow event types
export const WORKFLOW_EVENT_TYPES = {
  // Patient Journey Events
  PATIENT_CHECKED_IN: 'patient.checked_in',
  VITALS_RECORDED: 'vitals.recorded',
  PATIENT_READY_FOR_DOCTOR: 'patient.ready_for_doctor',
  CONSULTATION_STARTED: 'consultation.started',
  CONSULTATION_COMPLETED: 'consultation.completed',
  
  // Lab Events
  LAB_ORDER_CREATED: 'lab.order_created',
  LAB_SAMPLE_COLLECTED: 'lab.sample_collected',
  LAB_RESULTS_READY: 'lab.results_ready',
  LAB_CRITICAL_ALERT: 'lab.critical_alert',
  
  // Pharmacy Events
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_VERIFIED: 'prescription.verified',
  MEDICATION_DISPENSED: 'medication.dispensed',
  
  // Billing Events
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_RECEIVED: 'payment.received',
  
  // Administrative Events
  STAFF_INVITED: 'staff.invited',
  ROLE_ASSIGNED: 'role.assigned',
  ESCALATION_TRIGGERED: 'escalation.triggered',
} as const;

export interface WorkflowEvent {
  type: string;
  sourceRole?: UserRole;
  patientId?: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'update_status' | 'escalate' | 'trigger_function';
  target_role?: string;
  target_user?: string;
  message?: string;
  metadata?: Record<string, any>;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
};

export function useWorkflowOrchestrator() {
  const { hospital, profile, primaryRole } = useAuth();
  const queryClient = useQueryClient();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const triggerWorkflow = async (event: WorkflowEvent) => {
    if (!hospital?.id) {
      console.error('Hospital ID missing for workflow trigger');
      return;
    }

    let eventRecordId: string | null = null;

    try {
      devLog(`Triggering workflow: ${event.type} for hospital ${hospital.id}`);

      // 1. Log the event for audit purposes
      const { data: eventRecord, error: eventError } = await (supabase as any)
        .from('workflow_events')
        .insert({
          hospital_id: hospital.id,
          event_type: event.type,
          patient_id: event.patientId,
          source_user: profile?.user_id,
          source_role: event.sourceRole || (primaryRole as any),
          payload: event.data,
          priority: event.priority || 'normal'
        })
        .select()
        .single();

      if (eventError) throw eventError;
      eventRecordId = (eventRecord as any).id;

      // 2. Fetch active rules for this event type
      const { data: rules, error: rulesError } = await (supabase as any)
        .from('workflow_rules')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('trigger_event', event.type)
        .eq('active', true);

      if (rulesError) throw rulesError;

      if (!rules || rules.length === 0) {
        devLog(`No active rules found for event: ${event.type}`);
        return;
      }

      // 3. Execute actions for each rule
      for (const rule of rules as any[]) {
        const cooldownMinutes = typeof rule.cooldown_minutes === 'number' ? rule.cooldown_minutes : 0;
        if (cooldownMinutes > 0 && rule.last_triggered) {
          const cooldownStartedAt = new Date(Date.now() - cooldownMinutes * 60 * 1000);
          if (new Date(rule.last_triggered) >= cooldownStartedAt) {
            devLog(`Skipping rule ${rule.name} due to cooldown (${cooldownMinutes}m)`);
            continue;
          }
        }

        devLog(`Executing rule: ${rule.name}`);
        const actions = rule.actions as WorkflowAction[];
        
        if (actions && Array.isArray(actions)) {
          await executeWorkflowActions(actions, event);
        }

        // Update last triggered
        await (supabase as any)
          .from('workflow_rules')
          .update({ last_triggered: new Date().toISOString() })
          .eq('id', rule.id);
      }

      // 4. Mark event as processed
      await (supabase as any)
        .from('workflow_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', (eventRecord as any).id);

      // 5. Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-events'] });

    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Workflow orchestration failed:', sanitizeLogMessage(message), error);
      if (eventRecordId) {
        await supabase
          .from('workflow_events')
          .update({ processing_error: message })
          .eq('id', eventRecordId);
      }
      toast.error(`Workflow error: ${message}`);
    }
  };

  const executeWorkflowActions = async (actions: WorkflowAction[], event: WorkflowEvent) => {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    for (const action of actions) {
      await executeActionWithRetry(action, event, maxRetries, retryDelay);
    }
  };

  const executeActionWithRetry = async (
    action: WorkflowAction,
    event: WorkflowEvent,
    maxRetries: number,
    delay: number,
    attempt: number = 1
  ): Promise<void> => {
    let currentDelay = delay;
    let lastError: unknown = null;

    for (let currentAttempt = attempt; currentAttempt <= maxRetries; currentAttempt++) {
      try {
        await executeSingleAction(action, event);
        return;
      } catch (actionError) {
        lastError = actionError;
        console.error(
          `Failed to execute action ${action.type} (attempt ${currentAttempt}):`,
          sanitizeLogMessage(getErrorMessage(actionError))
        );

        if (currentAttempt < maxRetries) {
          devLog(`Retrying action ${action.type} in ${currentDelay}ms...`);
          await sleep(currentDelay);
          currentDelay *= 2;
          continue;
        }
      }
    }

    console.error(`Action ${action.type} failed after ${maxRetries} attempts`);

    // Log failed action for admin review
    await supabase.from('workflow_action_failures').insert({
      hospital_id: hospital?.id,
      workflow_event_id: event.type,
      action_type: action.type,
      action_metadata: action,
      error_message: getErrorMessage(lastError),
      retry_attempts: maxRetries,
      patient_id: event.patientId,
      created_at: new Date().toISOString()
    });

    // Send notification to admin about failed action
    if (hospital?.id && profile?.user_id) {
      await sendNotification({
        hospital_id: hospital.id,
        recipient_id: profile.user_id,
        sender_id: profile.user_id,
        title: 'Workflow Action Failed',
        message: `Failed to execute ${action.type} for event ${event.type} after ${maxRetries} retries`,
        type: 'system',
        priority: 'high',
        metadata: { failed_action: action.type, event_type: event.type },
      });
    }
  };

  const executeSingleAction = async (action: WorkflowAction, event: WorkflowEvent) => {
    switch (action.type) {
      case 'create_task': {
        // Compute due_date: urgent → +1 h, follow_up → +7 d, routine → +14 d, default → +24 h
        const TASK_DUE_HOURS: Record<string, number> = {
          urgent: 1,
          follow_up: 168,
          routine: 336,
        };
        const taskType = (action.metadata as Record<string, unknown>)?.task_type as string | undefined;
        const priorityKey = taskType ?? event.priority ?? 'normal';
        const dueDateHours = TASK_DUE_HOURS[priorityKey] ?? (event.priority === 'urgent' ? 1 : 24);
        const dueDate = new Date(Date.now() + dueDateHours * 60 * 60 * 1_000).toISOString();
        await supabase.from('workflow_tasks').insert({
          hospital_id: hospital?.id,
          patient_id: event.patientId,
          title: action.message || `Automated task: ${event.type}`,
          description: JSON.stringify(action.metadata || event.data),
          assigned_role: action.target_role,
          assigned_to: action.target_user,
          priority: event.priority || 'normal',
          status: 'pending',
          workflow_type: event.type,
          due_date: dueDate,
        });
        break;
      }

      case 'send_notification':
        if (!hospital?.id || !action.target_user) {
          throw new Error('Notification action requires hospital context and target user');
        }
        await sendNotification({
          hospital_id: hospital.id,
          recipient_id: action.target_user,
          sender_id: profile?.user_id ?? null,
          title: `Workflow Alert: ${event.type}`,
          message: action.message || `Workflow alert for ${event.type}`,
          type: 'workflow',
          priority: event.priority === 'urgent' ? 'critical' : 'high',
          metadata: event.data,
        });
        break;

      case 'update_status':
        // Logic to update patient_status or other entities
        if (event.patientId && action.metadata?.status) {
          await supabase
            .from('patients')
            .update({ status: action.metadata.status })
            .eq('id', event.patientId);
        }
        break;

      case 'trigger_function':
        if (action.metadata?.function_name) {
          await supabase.functions.invoke(action.metadata.function_name, {
            body: { ...event.data, patient_id: event.patientId }
          });
        }
        break;

      case 'escalate':
        await supabase.from('escalations').insert({
          hospital_id: hospital?.id,
          related_event_id: event.type,
          patient_id: event.patientId,
          reason: action.message,
          severity: 'high'
        });
        break;
    }
  };

  // Add workflow step completion tracking
  const trackStep = async (
    patientId: string,
    workflowType: string,
    stepName: string,
    completedBy: string,
    completedByRole: UserRole
  ) => {
    await supabase.from('workflow_step_completions').insert({
      hospital_id: hospital?.id,
      patient_id: patientId,
      workflow_type: workflowType,
      step_name: stepName,
      completed_by: completedBy,
      completed_by_role: completedByRole,
      completed_at: new Date().toISOString()
    });
  };

  return { triggerWorkflow, trackStep };
}
