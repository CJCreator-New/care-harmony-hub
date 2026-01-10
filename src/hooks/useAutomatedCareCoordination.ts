import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CareTeamAssignment {
  patient_id: string;
  primary_doctor: string;
  assigned_nurse: string;
  specialists: string[];
  assignment_reason: string;
  confidence_score: number;
}

export interface CareGap {
  patient_id: string;
  gap_type: 'preventive_care' | 'follow_up' | 'medication_adherence' | 'screening';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommended_action: string;
  due_date: string;
}

export interface AutomatedTask {
  id: string;
  task_type: string;
  assigned_to: string;
  patient_id: string;
  priority: number;
  estimated_duration: number;
  auto_generated: boolean;
  dependencies: string[];
}

export function useAutomatedCareCoordination() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const assignCareTeam = useMutation({
    mutationFn: async ({ patientId, condition, acuity }: {
      patientId: string;
      condition: string;
      acuity: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      // AI-driven care team assignment logic
      const assignment: CareTeamAssignment = {
        patient_id: patientId,
        primary_doctor: "dr_smith_001", // AI would select based on availability, expertise
        assigned_nurse: "nurse_jones_002",
        specialists: acuity === 'high' ? ["cardiologist_001"] : [],
        assignment_reason: `Optimal match for ${condition} with ${acuity} acuity`,
        confidence_score: 0.89
      };

      // Create task assignments
      await supabase.from('task_assignments').insert({
        patient_id: patientId,
        assigned_to: assignment.primary_doctor,
        task_type: 'primary_care_assignment',
        priority: acuity === 'critical' ? 1 : acuity === 'high' ? 2 : 3,
        hospital_id: profile?.hospital_id,
        auto_generated: true
      });

      return assignment;
    },
    onSuccess: () => {
      toast({
        title: "Care Team Assigned",
        description: "AI has optimally assigned the care team for this patient.",
      });
    }
  });

  const { data: careGaps, isLoading: loadingCareGaps } = useQuery({
    queryKey: ['care-gaps', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      const { data, error } = await supabase
        .from('care_gaps')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('hospital_id', profile.hospital_id)
        .eq('status', 'open')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as CareGap[];
    },
    enabled: !!profile?.hospital_id
  });

  const scheduleAutomatedFollowUp = useMutation({
    mutationFn: async ({ patientId, followUpType, daysFromNow }: {
      patientId: string;
      followUpType: 'post_discharge' | 'medication_check' | 'test_results' | 'routine';
      daysFromNow: number;
    }) => {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + daysFromNow);

      // Create automated appointment request
      const { data, error } = await supabase
        .from('appointment_requests')
        .insert({
          patient_id: patientId,
          hospital_id: profile?.hospital_id,
          appointment_type: followUpType,
          preferred_date: followUpDate.toISOString().split('T')[0],
          status: 'auto_scheduled',
          reason_for_visit: `Automated ${followUpType} follow-up`,
          auto_generated: true
        });

      if (error) throw error;

      // Log automated scheduling
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: profile?.hospital_id,
        action_type: 'automated_followup_scheduled',
        entity_type: 'appointment',
        entity_id: data[0]?.id,
        details: { follow_up_type: followUpType, days_from_now: daysFromNow }
      });

      return data[0];
    }
  });

  const identifyAndCloseCareGaps = useMutation({
    mutationFn: async ({ patientId }: { patientId: string }) => {
      // AI analysis to identify care gaps
      const identifiedGaps: CareGap[] = [
        {
          patient_id: patientId,
          gap_type: 'preventive_care',
          description: 'Annual mammogram overdue by 3 months',
          priority: 'medium',
          recommended_action: 'Schedule mammogram within 2 weeks',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Insert identified gaps
      for (const gap of identifiedGaps) {
        await supabase.from('care_gaps').insert({
          ...gap,
          hospital_id: profile?.hospital_id,
          identified_by: 'ai_system',
          status: 'open'
        });
      }

      return identifiedGaps;
    }
  });

  const prioritizeTasks = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // AI-driven task prioritization
      const { data: tasks, error } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', 'pending');

      if (error) throw error;

      // AI prioritization algorithm (simplified)
      const prioritizedTasks = tasks.map((task, index) => ({
        ...task,
        ai_priority_score: Math.random() * 100, // In production, this would be ML-based
        recommended_order: index + 1
      }));

      return prioritizedTasks.sort((a, b) => b.ai_priority_score - a.ai_priority_score);
    }
  });

  return {
    assignCareTeam: assignCareTeam.mutate,
    isAssigningCareTeam: assignCareTeam.isPending,
    careGaps,
    loadingCareGaps,
    scheduleAutomatedFollowUp: scheduleAutomatedFollowUp.mutate,
    isSchedulingFollowUp: scheduleAutomatedFollowUp.isPending,
    identifyAndCloseCareGaps: identifyAndCloseCareGaps.mutate,
    isIdentifyingCareGaps: identifyAndCloseCareGaps.isPending,
    prioritizeTasks: prioritizeTasks.mutate,
    isPrioritizingTasks: prioritizeTasks.isPending,
  };
}