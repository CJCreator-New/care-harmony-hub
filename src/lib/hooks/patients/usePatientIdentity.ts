import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Resolves the authenticated user's auth.user.id to their patients row.
 * Returns { patientId, hospitalId, mrn } or surfaces an error when the
 * patients record is missing (e.g. the user is staff, not a patient).
 */
export function usePatientIdentity() {
  const { user, hospital } = useAuth();

  return useQuery({
    queryKey: ['patient-identity', user?.id, hospital?.id],
    queryFn: async () => {
      if (!user?.id || !hospital?.id) {
        throw new Error('No auth context available');
      }

      const { data, error } = await supabase
        .from('patients')
        .select('id, mrn, hospital_id')
        .eq('user_id', user.id)
        .eq('hospital_id', hospital.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Patient record not found for this user');

      return {
        patientId: data.id as string,
        hospitalId: data.hospital_id as string,
        mrn: data.mrn as string | null,
      };
    },
    enabled: !!user?.id && !!hospital?.id,
    staleTime: 5 * 60 * 1_000, // identity rarely changes
  });
}
