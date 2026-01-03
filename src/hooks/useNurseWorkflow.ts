import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface ShiftHandover {
  id: string;
  hospital_id: string;
  outgoing_nurse_id: string;
  incoming_nurse_id: string | null;
  shift_date: string;
  shift_type: string;
  status: string;
  critical_patients: unknown;
  pending_tasks: unknown;
  notes: string | null;
  handover_time: string;
  acknowledged_at: string | null;
  created_at: string;
  outgoing_nurse?: {
    first_name: string;
    last_name: string;
  };
  incoming_nurse?: {
    first_name: string;
    last_name: string;
  };
}

export interface PatientPrepChecklist {
  id: string;
  hospital_id: string;
  patient_id: string;
  queue_entry_id: string | null;
  appointment_id: string | null;
  nurse_id: string | null;
  vitals_completed: boolean;
  allergies_verified: boolean;
  medications_reviewed: boolean;
  chief_complaint_recorded: boolean;
  consent_obtained: boolean;
  ready_for_doctor: boolean;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
}

export interface MedicationAdministration {
  id: string;
  hospital_id: string;
  patient_id: string;
  prescription_id: string | null;
  prescription_item_id: string | null;
  medication_name: string;
  dosage: string;
  route: string | null;
  administered_by: string;
  administered_at: string;
  scheduled_time: string | null;
  status: 'given' | 'refused' | 'held' | 'not_given';
  notes: string | null;
  witness_id: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  administered_by_nurse?: {
    first_name: string;
    last_name: string;
  };
}

// Shift Handover Hooks
export function useShiftHandovers(date?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['shift-handovers', hospital?.id, date],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('shift_handovers')
        .select(`
          *,
          outgoing_nurse:profiles!shift_handovers_outgoing_nurse_id_fkey(first_name, last_name),
          incoming_nurse:profiles!shift_handovers_incoming_nurse_id_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('handover_time', { ascending: false });

      if (date) {
        query = query.eq('shift_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShiftHandover[];
    },
    enabled: !!hospital?.id,
  });
}

export function usePendingHandovers() {
  const { hospital, profile } = useAuth();

  return useQuery({
    queryKey: ['shift-handovers', 'pending', hospital?.id, profile?.id],
    queryFn: async () => {
      if (!hospital?.id || !profile?.id) return [];

      const { data, error } = await supabase
        .from('shift_handovers')
        .select(`
          *,
          outgoing_nurse:profiles!shift_handovers_outgoing_nurse_id_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .eq('status', 'pending')
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return data as ShiftHandover[];
    },
    enabled: !!hospital?.id && !!profile?.id,
  });
}

export function useCreateHandover() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (handover: {
      shift_type: string;
      critical_patients: Array<{ patient_id: string; patient_name: string; notes: string }>;
      pending_tasks: Array<{ task: string; priority: string; patient_id?: string }>;
      notes?: string;
    }) => {
      if (!hospital?.id || !profile?.id) throw new Error('No auth context');

      const { data, error } = await supabase
        .from('shift_handovers')
        .insert({
          hospital_id: hospital.id,
          outgoing_nurse_id: profile.id,
          shift_type: handover.shift_type,
          critical_patients: handover.critical_patients,
          pending_tasks: handover.pending_tasks,
          notes: handover.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast.success('Shift handover created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create handover: ${error.message}`);
    },
  });
}

export function useAcknowledgeHandover() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (handoverId: string) => {
      if (!profile?.id) throw new Error('No auth context');

      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          incoming_nurse_id: profile.id,
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
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast.success('Handover acknowledged');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    },
  });
}

// Patient Prep Checklist Hooks
export function usePatientChecklists() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['patient-checklists', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn)
        `)
        .eq('hospital_id', hospital.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientPrepChecklist[];
    },
    enabled: !!hospital?.id,
  });
}

export function usePatientChecklist(patientId: string | undefined) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['patient-checklist', patientId],
    queryFn: async () => {
      if (!hospital?.id || !patientId) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('patient_id', patientId)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PatientPrepChecklist | null;
    },
    enabled: !!hospital?.id && !!patientId,
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, queueEntryId, appointmentId }: {
      patientId: string;
      queueEntryId?: string;
      appointmentId?: string;
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .insert({
          hospital_id: hospital.id,
          patient_id: patientId,
          queue_entry_id: queueEntryId,
          appointment_id: appointmentId,
          nurse_id: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-checklists'] });
      queryClient.invalidateQueries({ queryKey: ['patient-checklist'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create checklist: ${error.message}`);
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PatientPrepChecklist> & { id: string }) => {
      // Check if all items are complete to mark ready_for_doctor
      const isComplete = updates.vitals_completed && 
                         updates.allergies_verified && 
                         updates.medications_reviewed && 
                         updates.chief_complaint_recorded;

      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .update({
          ...updates,
          ready_for_doctor: isComplete || updates.ready_for_doctor,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn)
        `)
        .single();

      if (error) throw error;
      return data as PatientPrepChecklist;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-checklists'] });
      queryClient.invalidateQueries({ queryKey: ['patient-checklist', data.patient_id] });
      if (data.ready_for_doctor) {
        toast.success('Patient ready for doctor');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update checklist: ${error.message}`);
    },
  });
}

// Medication Administration Hooks
export function useMedicationAdministrations(patientId?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['medication-administrations', hospital?.id, patientId],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('medication_administrations')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          administered_by_nurse:profiles!medication_administrations_administered_by_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('administered_at', { ascending: false })
        .limit(50);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MedicationAdministration[];
    },
    enabled: !!hospital?.id,
  });
}

export function useRecordMedicationAdministration() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (administration: {
      patient_id: string;
      prescription_id?: string;
      prescription_item_id?: string;
      medication_name: string;
      dosage: string;
      route?: string;
      scheduled_time?: string;
      status?: 'given' | 'refused' | 'held' | 'not_given';
      notes?: string;
      witness_id?: string;
    }) => {
      if (!hospital?.id || !profile?.id) throw new Error('No auth context');

      const { data, error } = await supabase
        .from('medication_administrations')
        .insert({
          ...administration,
          hospital_id: hospital.id,
          administered_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-administrations'] });
      toast.success('Medication administration recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record: ${error.message}`);
    },
  });
}
