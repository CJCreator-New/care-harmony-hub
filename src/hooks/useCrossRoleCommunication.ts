import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CommunicationMessage {
  id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  recipient_id?: string;
  recipient_role?: string;
  message_type: 'task_assignment' | 'status_update' | 'urgent_alert' | 'general' | 'patient_update' | 'workflow_notification';
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  patient_id?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CommunicationThread {
  id: string;
  participants: string[];
  patient_id?: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  task_assignments: boolean;
  urgent_alerts: boolean;
  status_updates: boolean;
  patient_updates: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export function useCrossRoleCommunication() {
  const { profile, hospital } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Get messages for current user
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['communication-messages', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('communication_messages')
        .select(`
          *,
          sender:sender_id(name, role),
          recipient:recipient_id(name, role)
        `)
        .or(`recipient_id.eq.${profile.id},recipient_role.eq.${profile.role}`)
        .eq('hospital_id', hospital?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CommunicationMessage[];
    },
    enabled: !!profile?.id && !!hospital?.id,
  });

  // Get unread messages count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;

      const { count, error } = await supabase
        .from('communication_messages')
        .select('*', { count: 'exact', head: true })
        .or(`recipient_id.eq.${profile.id},recipient_role.eq.${profile.role}`)
        .eq('read', false)
        .eq('hospital_id', hospital?.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id && !!hospital?.id,
  });

  // Get communication threads
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['communication-threads', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('communication_threads')
        .select(`
          *,
          messages:communication_messages(count)
        `)
        .contains('participants', [profile.id])
        .eq('hospital_id', hospital?.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as CommunicationThread[];
    },
    enabled: !!profile?.id && !!hospital?.id,
  });

  // Get notification settings
  const { data: notificationSettings } = useQuery({
    queryKey: ['notification-settings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as NotificationSettings | null;
    },
    enabled: !!profile?.id,
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: Omit<CommunicationMessage, 'id' | 'sender_id' | 'sender_role' | 'sender_name' | 'read' | 'created_at'>) => {
      if (!profile?.id || !hospital?.id) throw new Error('User not authenticated');

      const messageData = {
        ...message,
        sender_id: profile.id,
        sender_role: profile.role,
        sender_name: profile.name || 'Unknown User',
        hospital_id: hospital.id,
        read: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('communication_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return data as CommunicationMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      toast.success('Message sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from('communication_messages')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data as CommunicationMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
    onError: (error) => {
      toast.error('Failed to mark message as read: ' + error.message);
    },
  });

  // Update notification settings
  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      if (!profile?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: profile.id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update notification settings: ' + error.message);
    },
  });

  // Send bulk notifications
  const sendBulkNotificationMutation = useMutation({
    mutationFn: async ({
      recipientRoles,
      message
    }: {
      recipientRoles: string[];
      message: Omit<CommunicationMessage, 'id' | 'sender_id' | 'sender_role' | 'sender_name' | 'recipient_id' | 'read' | 'created_at'>
    }) => {
      if (!profile?.id || !hospital?.id) throw new Error('User not authenticated');

      const messages = recipientRoles.map(role => ({
        ...message,
        sender_id: profile.id,
        sender_role: profile.role,
        sender_name: profile.name || 'Unknown User',
        recipient_role: role,
        hospital_id: hospital.id,
        read: false,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('communication_messages')
        .insert(messages)
        .select();

      if (error) throw error;
      return data as CommunicationMessage[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      toast.success('Bulk notification sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send bulk notification: ' + error.message);
    },
  });

  // Initialize real-time subscriptions
  useEffect(() => {
    if (!profile?.id || !hospital?.id) return;

    const channel = supabase
      .channel('communication-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_messages',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        (payload) => {
          // Check if message is for current user
          const message = payload.new as CommunicationMessage;
          const isForMe = message.recipient_id === profile.id ||
                         message.recipient_role === profile.role;

          if (isForMe) {
            queryClient.invalidateQueries({ queryKey: ['communication-messages'] });
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });

            // Show notification for high priority messages
            if (message.priority === 'urgent' || message.priority === 'high') {
              toast.error(`Urgent: ${message.subject}`, {
                description: message.content.substring(0, 100) + '...',
                duration: 10000,
              });
            } else {
              toast.info(`New message: ${message.subject}`);
            }
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, profile?.role, hospital?.id, queryClient]);

  // Get messages by type
  const getMessagesByType = (type: CommunicationMessage['message_type']) => {
    return messages?.filter(msg => msg.message_type === type) || [];
  };

  // Get urgent messages
  const getUrgentMessages = () => {
    return messages?.filter(msg => msg.priority === 'urgent' || msg.priority === 'high') || [];
  };

  // Get unread messages
  const getUnreadMessages = () => {
    return messages?.filter(msg => !msg.read) || [];
  };

  return {
    messages,
    threads,
    unreadCount,
    notificationSettings,
    isLoading: messagesLoading || threadsLoading,
    sendMessage: sendMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    updateNotificationSettings: updateNotificationSettingsMutation.mutate,
    sendBulkNotification: sendBulkNotificationMutation.mutate,
    getMessagesByType,
    getUrgentMessages,
    getUnreadMessages,
    isSendingMessage: sendMessageMutation.isPending,
    isMarkingRead: markAsReadMutation.isPending,
    isUpdatingSettings: updateNotificationSettingsMutation.isPending,
    isSendingBulk: sendBulkNotificationMutation.isPending,
  };
}