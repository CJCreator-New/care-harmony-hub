import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Message {
  id: string;
  hospital_id: string;
  sender_id: string;
  recipient_id: string;
  patient_id: string | null;
  subject: string | null;
  content: string;
  is_read: boolean;
  read_at: string | null;
  parent_message_id: string | null;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
  recipient?: {
    first_name: string;
    last_name: string;
  };
}

export interface SendMessageParams {
  recipient_id: string;
  subject?: string;
  content: string;
  parent_message_id?: string;
}

// Hook to fetch all messages for current user
export function useMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user context');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender/recipient profiles separately
      if (!data || data.length === 0) return [] as Message[];

      const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.recipient_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id),
        recipient: profileMap.get(m.recipient_id),
      })) as Message[];
    },
    enabled: !!user?.id,
  });
}

// Hook to fetch conversation thread
export function useConversation(otherUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return [] as Message[];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [] as Message[];

      // Fetch sender/recipient profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', [user.id, otherUserId]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id),
        recipient: profileMap.get(m.recipient_id),
      })) as Message[];
    },
    enabled: !!user?.id && !!otherUserId,
  });
}

// Hook to send a message
export function useSendMessage() {
  const { user, hospital } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!user?.id) throw new Error('No user context');
      if (!hospital?.id) throw new Error('No hospital context');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          hospital_id: hospital.id,
          sender_id: user.id,
          recipient_id: params.recipient_id,
          subject: params.subject || null,
          content: params.content,
          parent_message_id: params.parent_message_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, variables.recipient_id] });
      toast.success('Message sent');
    },
    onError: (error) => {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    },
  });
}

// Hook to mark messages as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
  });
}

// Hook to get unread message count
export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

// Hook for real-time message updates
export function useMessagesRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

// Hook to get available contacts (staff for patients, patients for staff)
export function useMessageContacts() {
  const { user, hospital, roles } = useAuth();
  const isPatient = roles.includes('patient');

  return useQuery({
    queryKey: ['message-contacts', user?.id, hospital?.id, isPatient],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user context');

      if (isPatient) {
        // Patients can message doctors and nurses
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            email
          `)
          .eq('hospital_id', hospital?.id || '');

        if (error) throw error;

        // Filter to only doctors and nurses
        const staffIds = data?.map(p => p.user_id).filter((id): id is string => id != null) || [];
        if (staffIds.length === 0) return [];

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', staffIds)
          .in('role', ['doctor', 'nurse']);

        if (rolesError) throw rolesError;

        const clinicalStaffIds = new Set(rolesData?.map(r => r.user_id) || []);
        return data?.filter(p => p.user_id && clinicalStaffIds.has(p.user_id)) || [];
      } else {
        // Staff can message patients linked to their hospital
        const { data: patients, error } = await supabase
          .from('patients')
          .select('id, user_id, first_name, last_name, email, mrn')
          .eq('hospital_id', hospital?.id || '')
          .not('user_id', 'is', null);

        if (error) throw error;
        return patients || [];
      }
    },
    enabled: !!user?.id && !!hospital?.id,
  });
}
