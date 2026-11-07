import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Patient Prep Checklist Interface
export interface PatientPrepChecklist {
  id: string;
  patient_id: string;
  queue_entry_id?: string;
  appointment_id?: string;
  vitals_completed?: boolean;
  allergies_verified?: boolean;
  medications_reviewed?: boolean;
  chief_complaint_recorded?: boolean;
  consent_obtained?: boolean;
  ready_for_doctor?: boolean;
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

// Shift Handover Interface — matches actual shift_handovers table schema
export interface ShiftHandover {
  id: string;
  hospital_id: string;
  outgoing_nurse_id: string;
  incoming_nurse_id?: string | null;
  shift_date: string;
  shift_type: string;
  notes: string | null;
  pending_tasks: string[] | null;
  critical_patients?: any | null;
  status: string;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Patient Checklist Hooks
export const usePatientChecklist = (patientId: string) => {
  const [checklist, setChecklist] = useState<PatientPrepChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChecklist = async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setChecklist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [patientId]);

  return {
    data: checklist,
    isLoading: loading,
    error,
    refetch: loadChecklist,
  };
};

export const useCreateChecklist = () => {
  const { user, hospital } = useAuth();
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: {
    patientId: string;
    queueEntryId?: string;
    appointmentId?: string;
  }) => {
    setLoading(true);
    try {
      if (!user) throw new Error('User not authenticated');
      if (!hospital?.id) throw new Error('Hospital ID not found');

      const { data: result, error } = await supabase
        .from('patient_prep_checklists')
        .insert({
          patient_id: data.patientId,
          queue_entry_id: data.queueEntryId,
          appointment_id: data.appointmentId,
          hospital_id: hospital.id,
          vitals_completed: false,
          allergies_verified: false,
          medications_reviewed: false,
          chief_complaint_recorded: false,
          consent_obtained: false,
          ready_for_doctor: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading,
  };
};

export const useUpdateChecklist = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: {
    id: string;
    vitals_completed?: boolean;
    allergies_verified?: boolean;
    medications_reviewed?: boolean;
    chief_complaint_recorded?: boolean;
    consent_obtained?: boolean;
    ready_for_doctor?: boolean;
    completed_at?: string;
    completed_by?: string;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('patient_prep_checklists')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading,
  };
};

export const usePatientChecklists = (hospitalId?: string) => {
  const [checklists, setChecklists] = useState<PatientPrepChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChecklists = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('patient_prep_checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [hospitalId]);

  return {
    checklists,
    loading,
    error,
    refetch: loadChecklists,
  };
};

// Shift Handover Hooks
export const useCreateHandover = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Partial<ShiftHandover>) => {
      const { data: result, error } = await supabase
        .from('shift_handovers')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handovers'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

export const usePendingHandovers = (nurseId?: string) => {
  const query = useQuery({
    queryKey: ['pending-handovers', nurseId],
    queryFn: async () => {
      let q = supabase
        .from('shift_handovers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (nurseId) {
        q = q.eq('incoming_nurse_id', nurseId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  return {
    handovers: query.data || [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
};

export const useAcknowledgeHandover = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (handoverId: string) => {
      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', handoverId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handovers'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

// Unified Nurse Workflow Hook
export function useNurseWorkflow() {
  const markReadyForDoctor = async (
    queueId: string,
    data: {
      chief_complaint?: string;
      allergies?: string;
      current_medications?: string;
      triage_notes?: string;
    }
  ) => {
    try {
      // Update the patient prep checklist to mark as ready for doctor
      const { error } = await supabase
        .from('patient_prep_checklists')
        .update({
          ready_for_doctor: true,
          completed_at: new Date().toISOString(),
          chief_complaint_recorded: !!data.chief_complaint,
          allergies_verified: !!data.allergies,
          medications_reviewed: !!data.current_medications,
          notes: data.triage_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('queue_entry_id', queueId);

      if (error) throw error;

      await supabase
        .from('patient_queue')
        .update({
          status: 'waiting',
          notes: data.chief_complaint || data.triage_notes || null,
          service_start_time: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', queueId);
    } catch (err) {
      console.error('Error marking patient ready for doctor:', err);
      throw err;
    }
  };

  return {
    markReadyForDoctor,
  };
}
