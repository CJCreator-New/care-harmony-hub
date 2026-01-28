import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';

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

export function useWorkflowOrchestrator() {
  const { hospital, profile, primaryRole } = useAuth();
  const queryClient = useQueryClient();

  const triggerWorkflow = async (event: WorkflowEvent) => {
    if (!hospital?.id) {
      console.error('Hospital ID missing for workflow trigger');
      return;
    }

    try {
      console.log(`Triggering workflow: ${event.type} for hospital ${hospital.id}`);

      // 1. Log the event for audit purposes
      const { data: eventRecord, error: eventError } = await supabase
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

      // 2. Fetch active rules for this event type
      const { data: rules, error: rulesError } = await supabase
        .from('workflow_rules')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('trigger_event', event.type)
        .eq('active', true);

      if (rulesError) throw rulesError;

      if (!rules || rules.length === 0) {
        console.log(`No active rules found for event: ${event.type}`);
        return;
      }

      // 3. Execute actions for each rule
      for (const rule of rules) {
        console.log(`Executing rule: ${rule.name}`);
        const actions = rule.actions as WorkflowAction[];
        
        if (actions && Array.isArray(actions)) {
          await executeWorkflowActions(actions, event);
        }

        // Update last triggered
        await supabase
          .from('workflow_rules')
          .update({ last_triggered: new Date().toISOString() })
          .eq('id', rule.id);
      }

      // 4. Mark event as processed
      await supabase
        .from('workflow_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', eventRecord.id);

      // 5. Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-events'] });

    } catch (error: any) {
      console.error('Workflow orchestration failed:', error);
      toast.error(`Workflow error: ${error.message}`);
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
    try {
      await executeSingleAction(action, event);
    } catch (actionError) {
      console.error(`Failed to execute action ${action.type} (attempt ${attempt}):`, actionError);

      if (attempt < maxRetries) {
        console.log(`Retrying action ${action.type} in ${delay}ms...`);
        setTimeout(() => {
          executeActionWithRetry(action, event, maxRetries, delay * 2, attempt + 1); // Exponential backoff
        }, delay);
      } else {
        console.error(`Action ${action.type} failed after ${maxRetries} attempts`);

        // Log failed action for admin review
        await supabase.from('workflow_action_failures').insert({
          hospital_id: hospital?.id,
          workflow_event_id: event.type,
          action_type: action.type,
          action_metadata: action,
          error_message: actionError instanceof Error ? actionError.message : 'Unknown error',
          retry_attempts: maxRetries,
          patient_id: event.patientId,
          created_at: new Date().toISOString()
        });

        // Send notification to admin about failed action
        await supabase.from('notifications').insert({
          hospital_id: hospital?.id,
          user_id: null, // System notification
          title: 'Workflow Action Failed',
          message: `Failed to execute ${action.type} for event ${event.type} after ${maxRetries} retries`,
          type: 'system',
          priority: 'high'
        });
      }
    }
  };

  const executeSingleAction = async (action: WorkflowAction, event: WorkflowEvent) => {
    switch (action.type) {
      case 'create_task':
        await supabase.from('workflow_tasks').insert({
          hospital_id: hospital?.id,
          patient_id: event.patientId,
          title: action.message || `Automated task: ${event.type}`,
          description: JSON.stringify(action.metadata || event.data),
          assigned_role: action.target_role,
          assigned_to: action.target_user,
          priority: event.priority || 'normal',
          status: 'pending',
          workflow_type: event.type
        });
        break;

      case 'send_notification':
        await supabase.from('notifications').insert({
          hospital_id: hospital?.id,
          user_id: action.target_user,
          title: `Workflow Alert: ${event.type}`,
          message: action.message,
          type: 'workflow',
          priority: event.priority === 'urgent' ? 'critical' : 'high'
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

  return { triggerWorkflow };
}
