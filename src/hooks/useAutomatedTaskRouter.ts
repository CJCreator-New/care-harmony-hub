import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StaffMember {
  user_id: string;
  role: string;
  current_workload: number;
  skills: string[];
  available: boolean;
}

export function useAutomatedTaskRouter() {
  const { hospital } = useAuth();

  const { data: availableStaff } = useQuery({
    queryKey: ['available-staff', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          user_roles(role),
          shift_schedules(status)
        `)
        .eq('hospital_id', hospital.id);

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
  });

  const assignTask = async (task: {
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    required_role: string;
    required_skills?: string[];
  }) => {
    const candidates = availableStaff?.filter((staff: any) => 
      staff.user_roles?.some((r: any) => r.role === task.required_role)
    );

    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Load balancing: assign to staff with lowest workload
    const workloads = await Promise.all(
      candidates.map(async (staff: any) => {
        const { count } = await supabase
          .from('workflow_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', staff.user_id)
          .in('status', ['pending', 'in_progress']);

        return { user_id: staff.user_id, workload: count || 0 };
      })
    );

    const selected = workloads.reduce((min, curr) => 
      curr.workload < min.workload ? curr : min
    );

    return selected.user_id;
  };

  const routeByPriority = (priority: string): string => {
    const priorityMap: Record<string, number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4,
    };
    return priorityMap[priority]?.toString() || '3';
  };

  return {
    availableStaff,
    assignTask,
    routeByPriority,
  };
}
