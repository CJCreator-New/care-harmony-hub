import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanitizeForLog } from '@/utils/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeForLog } from '@/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeForLog } from '@/utils/sanitize';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';
import { Json } from '@/integrations/supabase/types';
import { sanitizeForLog } from '@/utils/sanitize';
import { PATIENT_COLUMNS } from '@/lib/queryColumns';
import { sanitizeForLog } from '@/utils/sanitize';
import { useHIPAACompliance } from './useDataProtection';
import { sanitizeForLog } from '@/utils/sanitize';

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
  const { decryptPHI } = useHIPAACompliance();

  return useQuery({
    queryKey: ['patients', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('patients')
        .select(PATIENT_COLUMNS.list + ',encryption_metadata')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;

      // Decrypt PHI data for each patient
      const decryptedPatients = await Promise.all(
        (data || []).map(async (patient: any) => {
          if (patient.encryption_metadata) {
            try {
              const decrypted = await decryptPHI(patient, patient.encryption_metadata);
              return { ...patient, ...decrypted } as Patient;
            } catch (decryptError) {
              console.error('Failed to decrypt patient data:', decryptError);
              // Return patient with encrypted fields marked as unavailable
              return {
                ...patient,
                phone: '[Encrypted]',
                email: '[Encrypted]',
                address: '[Encrypted]',
                emergency_contact_phone: '[Encrypted]',
                insurance_policy_number: '[Encrypted]',
                insurance_group_number: '[Encrypted]',
              } as Patient;
            }
          }
          return patient as Patient;
        })
      );

      return decryptedPatients;
    },
    enabled: !!hospital?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - patient data changes infrequently
  });
}

export function usePatient(patientId: string | undefined) {
  const { decryptPHI } = useHIPAACompliance();

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

      if (!data) return null;

      // Decrypt PHI data if encryption metadata exists
      if (data.encryption_metadata) {
        try {
          const decrypted = await decryptPHI(data, data.encryption_metadata);
          return { ...data, ...decrypted } as Patient;
        } catch (decryptError) {
          console.error('Failed to decrypt patient data:', decryptError);
          // Return patient with encrypted fields marked as unavailable
          return {
            ...data,
            phone: '[Encrypted]',
            email: '[Encrypted]',
            address: '[Encrypted]',
            emergency_contact_phone: '[Encrypted]',
            insurance_policy_number: '[Encrypted]',
            insurance_group_number: '[Encrypted]',
          } as Patient;
        }
      }

      return data as Patient;
    },
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();
  const { encryptPHI } = useHIPAACompliance();

  return useMutation({
    mutationFn: async (patientData: Omit<PatientInsert, 'hospital_id'>) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Generate MRN
      const { data: mrn, error: mrnError } = await supabase
        .rpc('generate_mrn', { hospital_id: hospital.id });

      if (mrnError) throw mrnError;

      // Encrypt PHI fields before storing
      const { data: encryptedData, metadata: encryptionMetadata } = await encryptPHI({
        ...patientData,
        hospital_id: hospital.id,
        mrn: mrn,
      });

      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...encryptedData,
          encryption_metadata: encryptionMetadata,
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
  const { encryptPHI, decryptPHI } = useHIPAACompliance();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      // Get current patient data including encryption metadata
      const { data: currentPatient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Add optimistic locking with version check
      if (updates.updated_at && currentPatient?.updated_at !== updates.updated_at) {
        throw new Error('Patient record has been modified by another user. Please refresh and try again.');
      }

      // Decrypt current PHI data if encrypted
      let currentDecryptedData = currentPatient;
      if (currentPatient.encryption_metadata) {
        try {
          currentDecryptedData = await decryptPHI(currentPatient, currentPatient.encryption_metadata);
        } catch (decryptError) {
          console.error('Failed to decrypt current patient data:', decryptError);
          throw new Error('Unable to update patient: decryption failed');
        }
      }

      // Merge updates with current decrypted data
      const updatedData = {
        ...currentDecryptedData,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Encrypt PHI fields in the updated data
      const { data: encryptedData, metadata: newEncryptionMetadata } = await encryptPHI(updatedData);

      // Merge encryption metadata (preserve existing metadata for unchanged fields)
      const mergedEncryptionMetadata = {
        ...currentPatient.encryption_metadata,
        ...newEncryptionMetadata
      };

      const { data, error } = await supabase
        .from('patients')
        .update({
          ...encryptedData,
          encryption_metadata: mergedEncryptionMetadata,
        })
        .eq('id', id)
        .eq('updated_at', currentPatient?.updated_at) // Optimistic locking
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
