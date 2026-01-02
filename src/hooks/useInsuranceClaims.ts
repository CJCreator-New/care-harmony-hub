import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InsuranceClaim {
  id: string;
  hospital_id: string;
  patient_id: string;
  invoice_id: string | null;
  claim_number: string;
  insurance_provider: string;
  policy_number: string | null;
  group_number: string | null;
  diagnosis_codes: string[] | null;
  procedure_codes: string[] | null;
  claim_amount: number;
  approved_amount: number | null;
  paid_amount: number | null;
  patient_responsibility: number | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  denial_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
    insurance_provider: string | null;
    insurance_policy_number: string | null;
  };
}

export const useInsuranceClaims = () => {
  const { profile } = useAuth();
  const hospitalId = profile?.hospital_id;
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({
    queryKey: ['insurance-claims', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('insurance_claims')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn, insurance_provider, insurance_policy_number)
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InsuranceClaim[];
    },
    enabled: !!hospitalId,
  });

  const createClaim = useMutation({
    mutationFn: async (claim: {
      patient_id: string;
      invoice_id?: string;
      insurance_provider: string;
      policy_number?: string;
      group_number?: string;
      claim_amount: number;
      diagnosis_codes?: string[];
      procedure_codes?: string[];
      notes?: string;
    }) => {
      if (!hospitalId) throw new Error('No hospital ID');
      
      // Generate claim number
      const { data: claimNumber } = await supabase
        .rpc('generate_claim_number', { p_hospital_id: hospitalId });

      const { data, error } = await supabase
        .from('insurance_claims')
        .insert({
          ...claim,
          hospital_id: hospitalId,
          claim_number: claimNumber || `CLM-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Insurance claim created');
    },
    onError: (error) => {
      toast.error('Failed to create claim: ' + error.message);
    },
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InsuranceClaim> & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Claim updated');
    },
    onError: (error) => {
      toast.error('Failed to update claim: ' + error.message);
    },
  });

  const submitClaim = useMutation({
    mutationFn: async (claimId: string) => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Claim submitted');
    },
  });

  const pendingClaims = claims?.filter(c => c.status === 'pending') || [];
  const submittedClaims = claims?.filter(c => c.status === 'submitted' || c.status === 'in_review') || [];
  const approvedClaims = claims?.filter(c => c.status === 'approved' || c.status === 'partially_approved') || [];
  const deniedClaims = claims?.filter(c => c.status === 'denied') || [];

  const totalClaimsAmount = claims?.reduce((sum, c) => sum + c.claim_amount, 0) || 0;
  const totalApprovedAmount = claims?.reduce((sum, c) => sum + (c.approved_amount || 0), 0) || 0;
  const totalPaidAmount = claims?.reduce((sum, c) => sum + (c.paid_amount || 0), 0) || 0;

  return {
    claims,
    pendingClaims,
    submittedClaims,
    approvedClaims,
    deniedClaims,
    totalClaimsAmount,
    totalApprovedAmount,
    totalPaidAmount,
    isLoading,
    createClaim,
    updateClaim,
    submitClaim,
  };
};
