// Phase 8: Cross-Role Integration Hooks
import { useState, useEffect } from 'react';
import { sanitizeLogMessage } from '@/utils/sanitize';
import { supabase } from '@/integrations/supabase/client';
import {
  TaskAssignment, 
  PatientStatusBoard, 
  ResourceAvailability, 
  WorkflowQueue, 
  InterRoleMessage,
  WorkflowMetric,
  TaskSummary,
  DepartmentMetrics,
  CreateTaskForm,
  SendMessageForm,
  UpdatePatientStatusForm,
  TaskFilters,
  MessageFilters,
  StatusBoardFilters
} from '@/types/integration';

const inferMessageType = (subject?: string | null, content?: string): InterRoleMessage['message_type'] => {
  const lower = `${subject || ''} ${content || ''}`.toLowerCase();
  if (lower.includes('handoff')) return 'handoff';
  if (lower.includes('alert')) return 'alert';
  if (
    lower.includes('urgent') ||
    lower.includes('critical') ||
    lower.includes('stat') ||
    lower.includes('immediate')
  ) {
    return 'urgent';
  }
  return 'general';
};

// Task Assignment Hooks
export const useTaskAssignments = (hospitalId: string, userId: string) => {
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    total_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    completed_today: 0,
    high_priority_tasks: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (filters?: TaskFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('workflow_tasks')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn),
          assigned_to_profile:profiles!workflow_tasks_assigned_to_fkey(id, first_name, last_name),
          assigned_by_profile:profiles!workflow_tasks_created_by_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospitalId)
        .or(`assigned_to.eq.${userId},assigned_role.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedTasks: TaskAssignment[] = (data || []).map((task: any) => ({
        ...task,
        assigned_by: task.created_by,
        assigned_to: task.assigned_to,
        assigned_by_profile: task.assigned_by_profile
          ? {
              full_name: `${task.assigned_by_profile.first_name || ''} ${task.assigned_by_profile.last_name || ''}`.trim(),
              role: task.assigned_role || 'staff',
            }
          : undefined,
        assigned_to_profile: task.assigned_to_profile
          ? {
              full_name: `${task.assigned_to_profile.first_name || ''} ${task.assigned_to_profile.last_name || ''}`.trim(),
              role: task.assigned_role || 'staff',
            }
          : undefined,
        patient: task.patient
          ? {
              full_name: `${task.patient.first_name || ''} ${task.patient.last_name || ''}`.trim(),
              mrn: task.patient.mrn,
            }
          : undefined,
      }));

      setTasks(mappedTasks);
      setSummary({
        total_tasks: mappedTasks.length,
        pending_tasks: mappedTasks.filter(t => t.status === 'pending').length,
        overdue_tasks: mappedTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
        completed_today: mappedTasks.filter(t => t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length,
        high_priority_tasks: mappedTasks.filter(t => ['high', 'urgent'].includes(t.priority)).length
      });
    } catch (error) {
      console.error('Error fetching tasks:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: CreateTaskForm) => {
    try {
      const { error } = await supabase
        .from('workflow_tasks')
        .insert({
          hospital_id: hospitalId,
          patient_id: taskData.patient_id || null,
          title: taskData.title,
          description: taskData.description || null,
          assigned_role: taskData.assigned_role || null,
          assigned_to: taskData.assigned_to || null,
          created_by: userId,
          priority: taskData.priority || 'normal',
          status: 'pending',
          due_date: taskData.due_date || null,
          workflow_type: taskData.task_type || 'general',
        });
      if (error) throw error;
      await fetchTasks();
      return { success: true };
    } catch (error) {
      console.error('Error creating task:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const patch: Record<string, any> = { status };
      if (status === 'completed') {
        patch.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('workflow_tasks')
        .update(patch)
        .eq('id', taskId)
        .eq('hospital_id', hospitalId);
      if (error) throw error;

      await fetchTasks();
      return { success: true };
    } catch (error) {
      console.error('Error updating task status:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [hospitalId, userId]);

  return {
    tasks,
    summary,
    loading,
    fetchTasks,
    createTask,
    updateTaskStatus
  };
};

// Status Board Hooks
export const useStatusBoard = (hospitalId: string) => {
  const [patients, setPatients] = useState<PatientStatusBoard[]>([]);
  const [resources, setResources] = useState<ResourceAvailability[]>([]);
  const [queues, setQueues] = useState<WorkflowQueue[]>([]);
  const [metrics, setMetrics] = useState<DepartmentMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatusBoard = async (filters?: StatusBoardFilters) => {
    setLoading(true);
    try {
      let queueQuery = supabase
        .from('patient_queue')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, date_of_birth),
          assigned_staff:profiles!patient_queue_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospitalId)
        .in('status', ['waiting', 'called', 'in_prep', 'in_service'])
        .order('created_at', { ascending: true });

      if (filters?.status && filters.status.length > 0) {
        queueQuery = queueQuery.in('status', filters.status as any);
      }
      if (filters?.department && filters.department.length > 0) {
        queueQuery = queueQuery.in('department', filters.department);
      }
      if (filters?.staff_id) {
        queueQuery = queueQuery.eq('assigned_to', filters.staff_id);
      }

      const { data: queueData, error: queueError } = await queueQuery;
      if (queueError) throw queueError;

      const queuesMapped: WorkflowQueue[] = (queueData || []).map((entry: any, index: number) => {
        const waitMins = Math.max(0, Math.floor((Date.now() - new Date(entry.check_in_time || entry.created_at).getTime()) / 60000));
        const priorityScoreMap: Record<string, number> = {
          emergency: 100,
          urgent: 80,
          high: 65,
          normal: 50,
          low: 30,
        };
        return {
          id: entry.id,
          queue_name: entry.department || 'General Queue',
          department: entry.department || 'General',
          patient_id: entry.patient_id,
          priority_score: priorityScoreMap[entry.priority] || 50,
          wait_time_minutes: waitMins,
          queue_position: index + 1,
          status: entry.status === 'called' ? 'called' : entry.status === 'in_service' ? 'in_service' : 'waiting',
          hospital_id: entry.hospital_id,
          created_at: entry.created_at,
          updated_at: entry.created_at,
          patient: {
            full_name: `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.trim(),
            mrn: entry.patient?.mrn || '',
            date_of_birth: entry.patient?.date_of_birth || '',
          },
        };
      });

      const patientsMapped: PatientStatusBoard[] = (queueData || []).map((entry: any) => ({
        id: entry.id,
        patient_id: entry.patient_id,
        current_location: entry.department || 'General',
        status: entry.status === 'in_service' ? 'in_progress' : entry.status === 'completed' ? 'completed' : 'waiting',
        assigned_staff: entry.assigned_to || undefined,
        estimated_duration: entry.service_start_time ? undefined : 30,
        actual_start_time: entry.service_start_time || undefined,
        estimated_completion: undefined,
        notes: entry.notes || undefined,
        hospital_id: entry.hospital_id,
        created_at: entry.created_at,
        updated_at: entry.created_at,
        patient: {
          full_name: `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.trim(),
          mrn: entry.patient?.mrn || '',
          date_of_birth: entry.patient?.date_of_birth || '',
        },
        staff: entry.assigned_staff
          ? {
              full_name: `${entry.assigned_staff.first_name || ''} ${entry.assigned_staff.last_name || ''}`.trim(),
              role: 'staff',
            }
          : undefined,
      }));

      const deptMap = new Map<string, DepartmentMetrics>();
      queuesMapped.forEach((q) => {
        const key = q.department || 'General';
        const existing = deptMap.get(key) || {
          department: key,
          total_patients: 0,
          average_wait_time: 0,
          completion_rate: 0,
          staff_utilization: 0,
          resource_utilization: 0,
        };
        existing.total_patients += 1;
        existing.average_wait_time += q.wait_time_minutes;
        deptMap.set(key, existing);
      });
      const metricsMapped = Array.from(deptMap.values()).map((m) => ({
        ...m,
        average_wait_time: m.total_patients > 0 ? Math.round(m.average_wait_time / m.total_patients) : 0,
        completion_rate: 0,
        staff_utilization: 0,
        resource_utilization: 0,
      }));

      setPatients(patientsMapped);
      setQueues(queuesMapped);
      setMetrics(metricsMapped);
      setResources([]);
    } catch (error) {
      console.error('Error fetching status board:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const updatePatientStatus = async (patientId: string, statusData: UpdatePatientStatusForm) => {
    try {
      const nextStatus =
        statusData.status === 'in_progress' ? 'in_service' :
        statusData.status === 'completed' ? 'completed' : 'waiting';

      const { error } = await supabase
        .from('patient_queue')
        .update({
          department: statusData.current_location,
          status: nextStatus,
          assigned_to: statusData.assigned_staff || null,
          notes: statusData.notes || null,
          service_start_time: nextStatus === 'in_service' ? new Date().toISOString() : null,
          service_end_time: nextStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('hospital_id', hospitalId)
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called', 'in_prep', 'in_service']);
      if (error) throw error;

      await fetchStatusBoard();
      return { success: true };
    } catch (error) {
      console.error('Error updating patient status:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchStatusBoard();
    // Set up real-time subscription
    const interval = setInterval(fetchStatusBoard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [hospitalId]);

  return {
    patients,
    resources,
    queues,
    metrics,
    loading,
    fetchStatusBoard,
    updatePatientStatus
  };
};

// Communication Hooks
export const useInterRoleMessages = (hospitalId: string, userId: string) => {
  const [messages, setMessages] = useState<InterRoleMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async (filters?: MessageFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select('id,sender_id,recipient_id,patient_id,subject,content,is_read,read_at,hospital_id,created_at')
        .eq('hospital_id', hospitalId)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.sender_id) {
        query = query.eq('sender_id', filters.sender_id);
      }
      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters?.unread_only) {
        query = query.eq('recipient_id', userId).eq('is_read', false);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = Array.from(
        new Set(
          (data || []).flatMap((m) => [m.sender_id, m.recipient_id]).filter(Boolean)
        )
      );

      const { data: profileRows } = userIds.length
        ? await supabase
            .from('profiles')
            .select('user_id,first_name,last_name')
            .in('user_id', userIds)
        : { data: [] as any[] };

      const profileMap = new Map(
        (profileRows || []).map((p: any) => [
          p.user_id,
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Staff',
        ])
      );

      const patientIds = Array.from(new Set((data || []).map((m) => m.patient_id).filter(Boolean)));
      const { data: patientRows } = patientIds.length
        ? await supabase
            .from('patients')
            .select('id,first_name,last_name,mrn')
            .in('id', patientIds as string[])
        : { data: [] as any[] };

      const patientMap = new Map(
        (patientRows || []).map((p: any) => [
          p.id,
          {
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Patient',
            mrn: p.mrn || '',
          },
        ])
      );

      let mappedMessages: InterRoleMessage[] = (data || []).map((m: any) => ({
        id: m.id,
        sender_id: m.sender_id,
        recipient_id: m.recipient_id,
        patient_id: m.patient_id || undefined,
        message_type: inferMessageType(m.subject, m.content),
        subject: m.subject || undefined,
        content: m.content,
        read_at: m.read_at || undefined,
        hospital_id: m.hospital_id,
        created_at: m.created_at,
        sender: {
          full_name: profileMap.get(m.sender_id) || 'Staff',
          role: 'staff',
        },
        recipient: {
          full_name: profileMap.get(m.recipient_id) || 'Staff',
          role: 'staff',
        },
        patient: m.patient_id ? patientMap.get(m.patient_id) : undefined,
      }));

      if (filters?.message_type?.length) {
        mappedMessages = mappedMessages.filter((m) => filters.message_type!.includes(m.message_type));
      }

      setMessages(mappedMessages);
      setUnreadCount(mappedMessages.filter((m) => m.recipient_id === userId && !m.read_at).length);
      setUrgentCount(
        mappedMessages.filter((m) => m.recipient_id === userId && m.message_type === 'urgent' && !m.read_at).length
      );
    } catch (error) {
      console.error('Error fetching messages:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: SendMessageForm) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          hospital_id: hospitalId,
          sender_id: userId,
          recipient_id: messageData.recipient_id,
          patient_id: messageData.patient_id || null,
          subject: messageData.subject || null,
          content: messageData.content,
          is_read: false,
        });
      if (error) throw error;

      const notificationPriority = messageData.message_type === 'urgent' || messageData.message_type === 'alert'
        ? 'high'
        : 'normal';
      await supabase.from('notifications').insert({
        hospital_id: hospitalId,
        recipient_id: messageData.recipient_id,
        sender_id: userId,
        title: messageData.subject || 'New Message',
        message: messageData.content,
        type: 'message',
        category: messageData.message_type,
        priority: notificationPriority,
      });

      await fetchMessages();
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('hospital_id', hospitalId)
        .eq('recipient_id', userId);
      if (error) throw error;

      await fetchMessages();
      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  const acknowledgeMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('hospital_id', hospitalId)
        .eq('recipient_id', userId);
      if (error) throw error;

      await fetchMessages();
      return { success: true };
    } catch (error) {
      console.error('Error acknowledging message:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchMessages();
    // Set up real-time subscription for new messages
    const interval = setInterval(fetchMessages, 10000); // Check for new messages every 10 seconds
    return () => clearInterval(interval);
  }, [hospitalId, userId]);

  return {
    messages,
    unreadCount,
    urgentCount,
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    acknowledgeMessage
  };
};

// Workflow Metrics Hooks
export const useWorkflowMetrics = (hospitalId: string) => {
  const [metrics, setMetrics] = useState<WorkflowMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async (dateRange?: { from: string; to: string }) => {
    setLoading(true);
    try {
      const fromDate = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = dateRange?.to || new Date().toISOString();
      const recordedDate = new Date(toDate).toISOString().split('T')[0];

      const [{ data: queueRows, error: queueError }, { data: taskRows, error: taskError }] = await Promise.all([
        supabase
          .from('patient_queue')
          .select('id,department,status,check_in_time,service_end_time')
          .eq('hospital_id', hospitalId)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
        supabase
          .from('workflow_tasks')
          .select('id,status,priority,created_at,completed_at,workflow_type')
          .eq('hospital_id', hospitalId)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
      ]);

      if (queueError) throw queueError;
      if (taskError) throw taskError;

      const averageWaitMinutes = (() => {
        const waits = (queueRows || [])
          .filter((q: any) => q.check_in_time)
          .map((q: any) => {
            const start = new Date(q.check_in_time).getTime();
            const end = q.service_end_time ? new Date(q.service_end_time).getTime() : Date.now();
            return Math.max(0, Math.round((end - start) / 60000));
          });
        if (!waits.length) return 0;
        return Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
      })();

      const totalTasks = taskRows?.length || 0;
      const completedTasks = (taskRows || []).filter((t: any) => t.status === 'completed').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const highPriorityOpen = (taskRows || []).filter(
        (t: any) => ['high', 'urgent'].includes(t.priority) && t.status !== 'completed'
      ).length;
      const activeQueue = (queueRows || []).filter((q: any) =>
        ['waiting', 'called', 'in_prep', 'in_service'].includes(q.status || '')
      ).length;

      const derivedMetrics: WorkflowMetric[] = [
        {
          id: `avg-wait-${recordedDate}`,
          metric_type: 'average_wait_time',
          metric_value: averageWaitMinutes,
          measurement_unit: 'minutes',
          recorded_date: recordedDate,
          hospital_id: hospitalId,
          created_at: new Date().toISOString(),
        },
        {
          id: `queue-active-${recordedDate}`,
          metric_type: 'active_queue_count',
          metric_value: activeQueue,
          measurement_unit: 'count',
          recorded_date: recordedDate,
          hospital_id: hospitalId,
          created_at: new Date().toISOString(),
        },
        {
          id: `task-completion-rate-${recordedDate}`,
          metric_type: 'task_completion_rate',
          metric_value: completionRate,
          measurement_unit: 'percent',
          recorded_date: recordedDate,
          hospital_id: hospitalId,
          created_at: new Date().toISOString(),
        },
        {
          id: `high-priority-open-${recordedDate}`,
          metric_type: 'high_priority_open_tasks',
          metric_value: highPriorityOpen,
          measurement_unit: 'count',
          recorded_date: recordedDate,
          hospital_id: hospitalId,
          created_at: new Date().toISOString(),
        },
      ];

      setMetrics(derivedMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const recordMetric = async (metricData: Omit<WorkflowMetric, 'id' | 'created_at'>) => {
    try {
      return {
        success: false,
        error: new Error(
          `Metric persistence unavailable for "${metricData.metric_type}" because workflow metrics storage is not configured.`
        ),
      };
    } catch (error) {
      console.error('Error recording metric:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [hospitalId]);

  return {
    metrics,
    loading,
    fetchMetrics,
    recordMetric
  };
};

// Real-time Updates Hook
export const useRealTimeUpdates = (hospitalId: string, userId: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,type,title,message,priority,created_at,is_read,read_at,metadata')
        .eq('hospital_id', hospitalId)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching real-time notifications:', sanitizeLogMessage(error.message));
        return;
      }

      setNotifications(
        (data || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          priority: n.priority,
          timestamp: n.created_at,
          is_read: n.is_read,
          read_at: n.read_at,
          metadata: n.metadata,
        }))
      );
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);

    return () => clearInterval(interval);
  }, [hospitalId, userId]);

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    void supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('hospital_id', hospitalId)
      .eq('recipient_id', userId);
  };

  return {
    notifications,
    clearNotification
  };
};
