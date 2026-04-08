import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

export interface StaffInvitation {
  id: string;
  hospital_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  inviter?: {
    first_name: string;
    last_name: string;
  };
}

interface CreateInvitationParams {
  email: string;
  role: UserRole;
}

export function useStaffInvitations() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!profile?.hospital_id) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('staff_invitations')
        .select(`
          *,
          inviter:profiles!staff_invitations_invited_by_fkey(first_name, last_name)
        `)
        .eq('hospital_id', profile.hospital_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return (data || []) as StaffInvitation[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invitations';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [profile?.hospital_id]);

  const createInvitation = useCallback(async ({ email, role }: CreateInvitationParams) => {
    if (!profile?.hospital_id || !profile?.id) {
      return { error: 'Not authenticated or no hospital' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if invitation already exists
      const { data: existing } = await supabase
        .from('staff_invitations')
        .select('id')
        .eq('hospital_id', profile.hospital_id)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        throw new Error('An invitation for this email already exists');
      }

      // Handle E2E Mock Auth where the profile ID doesn't exist in the database
      const isE2EMockMode = import.meta.env.VITE_E2E_MOCK_AUTH === 'true' ||
           (typeof window !== 'undefined' && !!localStorage.getItem('e2e-mock-auth-user'));
      if (isE2EMockMode) {
        return {
          data: {
            id: 'mock-invitation-id',
            hospital_id: profile.hospital_id,
            email: email.toLowerCase(),
            role,
            invited_by: profile.id,
            status: 'pending',
            token: 'mock-token',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
            accepted_at: null
          },
          error: null
        };
      }

      const { data, error: insertError } = await supabase
        .from('staff_invitations')
        .insert({
          hospital_id: profile.hospital_id,
          email: email.toLowerCase(),
          role,
          invited_by: profile.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invitation';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, [profile?.hospital_id, profile?.id]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    if (!profile?.hospital_id) {
      return { error: 'Not authenticated or no hospital' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .eq('hospital_id', profile.hospital_id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, [profile?.hospital_id]);

  const resendInvitation = useCallback(async (invitationId: string) => {
    if (!profile?.hospital_id) {
      return { error: 'Not authenticated or no hospital' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update expiration and generate new token
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token: crypto.randomUUID(),
        })
        .eq('id', invitationId)
        .eq('hospital_id', profile.hospital_id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, [profile?.hospital_id]);

  const getInvitationByToken = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-invitation-token', {
        body: { token }
      });

      if (error) throw error;

      if (!data.valid) {
        return { data: null, error: data.error || 'Invalid invitation' };
      }

      return { data: data.invitation, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired invitation';
      return { data: null, error: message };
    }
  }, []);

  const acceptInvitation = useCallback(async (token: string, userId: string) => {
    try {
      // Delegate the entire acceptance — profile update, role assignment, and
      // invitation status update — to the accept-invitation-signup edge function
      // which calls the accept_staff_invitation SECURITY DEFINER RPC. This
      // prevents client-side direct inserts into user_roles (privilege escalation).
      // The edge function performs its own token validation server-side.
      const { error: acceptError } = await supabase.functions.invoke(
        'accept-invitation-signup',
        { body: { token, userId } }
      );

      if (acceptError) throw acceptError;

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      return { error: message };
    }
  }, []);

  return {
    isLoading,
    error,
    fetchInvitations,
    createInvitation,
    cancelInvitation,
    resendInvitation,
    getInvitationByToken,
    acceptInvitation,
  };
}

