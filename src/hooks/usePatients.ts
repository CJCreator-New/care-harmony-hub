import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { PATIENT_COLUMNS } from '@/lib/queryColumns';

export interface Patient {
  id: string;
  hospital_id: string;
  user_id: string | null;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_group_number: string | null;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: Json;
  blood_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PatientInsert = Omit<Patient, 'id' | 'mrn' | 'created_at' | 'updated_at'>;

export function usePatients() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['patients', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('patients')
        .select(PATIENT_COLUMNS.list)
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!hospital?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - patient data changes infrequently
  });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (error) throw error;
      return data as Patient | null;
    },
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async (patientData: Omit<PatientInsert, 'hospital_id'>) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Generate MRN
      const { data: mrn, error: mrnError } = await supabase
        .rpc('generate_mrn', { hospital_id: hospital.id });

      if (mrnError) throw mrnError;

      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          hospital_id: hospital.id,
          mrn: mrn,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient registered successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to register patient: ${error.message}`);
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      toast.success('Patient updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update patient: ${error.message}`);
    },
  });
}

export function useSearchPatients(searchTerm: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['patients', 'search', searchTerm, hospital?.id],
    queryFn: async () => {
      if (!hospital?.id || !searchTerm) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,mrn.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('last_name', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!hospital?.id && searchTerm.length >= 2,
  });
}
