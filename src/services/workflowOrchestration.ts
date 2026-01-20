import { supabase } from '@/integrations/supabase/client';

export interface WorkflowTask {
  id: string;
  type: string;
  assignedTo: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
  dueTime: Date;
}

export const workflowOrchestration = {
  async routeTask(task: Omit<WorkflowTask, 'id'>): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    
    await this.notifyAssignee(data.assignedTo, task.type);
    return data.id;
  },

  async escalateTask(taskId: string, reason: string) {
    const { error } = await supabase
      .from('workflow_tasks')
      .update({ priority: 1, escalated: true, escalation_reason: reason })
      .eq('id', taskId);
    
    if (error) throw error;
  },

  async predictResourceNeeds(patientCount: number, timeOfDay: number): Promise<any> {
    const baseStaff = Math.ceil(patientCount / 10);
    const peakMultiplier = timeOfDay >= 9 && timeOfDay <= 17 ? 1.5 : 1;
    
    return {
      doctors: Math.ceil(baseStaff * peakMultiplier),
      nurses: Math.ceil(baseStaff * 2 * peakMultiplier),
      rooms: Math.ceil(patientCount * 0.3)
    };
  },

  async coordinateCareTeam(patientId: string, requiredRoles: string[]) {
    const tasks = requiredRoles.map(role => ({
      type: `${role}_consultation`,
      assignedTo: role,
      priority: 2,
      status: 'pending' as const,
      dueTime: new Date(Date.now() + 3600000)
    }));
    
    for (const task of tasks) {
      await this.routeTask(task);
    }
  },

  async notifyAssignee(userId: string, taskType: string) {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'New Task Assigned',
      message: `You have a new ${taskType} task`,
      priority: 2
    });
  }
};
