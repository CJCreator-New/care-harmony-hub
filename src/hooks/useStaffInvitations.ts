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
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendInvitation = useCallback(async (invitationId: string) => {
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
        .eq('id', invitationId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Update profile with hospital_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ hospital_id: invitation.hospital_id })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: invitation.role,
          hospital_id: invitation.hospital_id,
        });

      if (roleError) throw roleError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

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
