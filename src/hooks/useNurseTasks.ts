import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NurseTask {
  id: string;
  title: string;
  description?: string;
  patient_id?: string;
  patient_name?: string;
  patient_mrn?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  created_at: string;
  completed_at?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  task_type?: 'medication' | 'vital_check' | 'patient_prep' | 'documentation' | 'follow_up' | 'other';
  context?: Record<string, any>;
}

export function useNurseTasks(patientId?: string) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('task_assignments')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn),
          assigned_by_profile:profiles!task_assignments_assigned_by_fkey(first_name, last_name)
        `)
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formattedTasks: NurseTask[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        patient_id: item.patient_id,
        patient_name: item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : undefined,
        patient_mrn: item.patient?.mrn,
        priority: item.priority || 'medium',
        status: item.status || 'pending',
        due_date: item.due_date,
        created_at: item.created_at,
        completed_at: item.completed_at,
        assigned_by: item.assigned_by,
        assigned_by_name: item.assigned_by_profile ? 
          `${item.assigned_by_profile.first_name} ${item.assigned_by_profile.last_name}` : undefined,
        task_type: item.task_type,
        context: item.context,
      }));

      setTasks(formattedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, patientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Partial<NurseTask>) => {
    if (!profile?.id) throw new Error('Not authenticated');

    try {
      const { data, error: createError } = await supabase
        .from('task_assignments')
        .insert({
          title: taskData.title,
          description: taskData.description,
          patient_id: taskData.patient_id,
          priority: taskData.priority || 'medium',
          status: 'pending',
          due_date: taskData.due_date,
          assigned_to: profile.id,
          task_type: taskData.task_type,
          context: taskData.context,
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchTasks();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create task');
    }
  }, [profile?.id, fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: NurseTask['status']) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', taskId);

      if (updateError) throw updateError;

      await fetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update task');
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;

      await fetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete task');
    }
  }, [fetchTasks]);

  // Auto-create tasks from consultation actions
  const createFollowUpTask = useCallback(async ({
    patientId,
    patientName,
    followUpType,
    dueDate,
    notes,
  }: {
    patientId: string;
    patientName: string;
    followUpType: string;
    dueDate: string;
    notes?: string;
  }) => {
    return createTask({
      title: `Follow-up: ${followUpType}`,
      description: notes,
      patient_id: patientId,
      patient_name: patientName,
      priority: 'medium',
      due_date: dueDate,
      task_type: 'follow_up',
      context: { follow_up_type: followUpType },
    });
  }, [createTask]);

  const createLabReviewTask = useCallback(async ({
    patientId,
    patientName,
    labOrderId,
    testName,
    dueDate,
  }: {
    patientId: string;
    patientName: string;
    labOrderId: string;
    testName: string;
    dueDate: string;
  }) => {
    return createTask({
      title: `Review Lab Results: ${testName}`,
      description: `Review ${testName} results when available`,
      patient_id: patientId,
      patient_name: patientName,
      priority: 'high',
      due_date: dueDate,
      task_type: 'documentation',
      context: { lab_order_id: labOrderId, test_name: testName },
    });
  }, [createTask]);

  const createMedicationTask = useCallback(async ({
    patientId,
    patientName,
    medicationName,
    dosage,
    schedule,
  }: {
    patientId: string;
    patientName: string;
    medicationName: string;
    dosage: string;
    schedule: string;
  }) => {
    return createTask({
      title: `Administer: ${medicationName}`,
      description: `Dosage: ${dosage}, Schedule: ${schedule}`,
      patient_id: patientId,
      patient_name: patientName,
      priority: 'high',
      task_type: 'medication',
      context: { medication: medicationName, dosage, schedule },
    });
  }, [createTask]);

  // Filter tasks by various criteria
  const filterTasks = useCallback(({
    status,
    priority,
    taskType,
    searchTerm,
  }: {
    status?: NurseTask['status'] | 'all';
    priority?: NurseTask['priority'] | 'all';
    taskType?: NurseTask['task_type'] | 'all';
    searchTerm?: string;
  }) => {
    return tasks.filter((task) => {
      if (status && status !== 'all' && task.status !== status) return false;
      if (priority && priority !== 'all' && task.priority !== priority) return false;
      if (taskType && taskType !== 'all' && task.task_type !== taskType) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(search);
        const matchesPatient = task.patient_name?.toLowerCase().includes(search);
        const matchesMRN = task.patient_mrn?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesPatient && !matchesMRN) return false;
      }
      return true;
    });
  }, [tasks]);

  // Get task statistics
  const getTaskStats = useCallback(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return { total, pending, inProgress, completed, urgent, overdue };
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
    createFollowUpTask,
    createLabReviewTask,
    createMedicationTask,
    filterTasks,
    getTaskStats,
  };
}

// Hook for patient-contextual task management
export function usePatientContextualTasks(patientId: string) {
  const { tasks, loading, error, refetch, ...actions } = useNurseTasks(patientId);

  const getTasksByType = useCallback((taskType: NurseTask['task_type']) => {
    return tasks.filter(t => t.task_type === taskType);
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  }, [tasks]);

  const getCompletedTasks = useCallback(() => {
    return tasks.filter(t => t.status === 'completed');
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
    ...actions,
    getTasksByType,
    getPendingTasks,
    getCompletedTasks,
  };
}
