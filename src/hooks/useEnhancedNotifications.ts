import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'role_based' | 'department' | 'emergency' | 'personal';
  participants: string[];
  is_active: boolean;
}

interface RealTimeMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'alert' | 'task' | 'patient_update';
  patient_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read_by: string[];
  created_at: string;
}

export const useEnhancedNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get user's notification channels
  const { data: channels } = useQuery({
    queryKey: ['notification-channels', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .contains('participants', [profile?.user_id]);
      
      if (error) throw error;
      return data as NotificationChannel[];
    },
    enabled: !!profile?.user_id,
  });

  // Get recent messages
  const { data: messages } = useQuery({
    queryKey: ['real-time-messages', profile?.id],
    queryFn: async () => {
      if (!channels?.length) return [];
      
      const channelIds = channels.map(c => c.id);
      const { data, error } = await supabase
        .from('real_time_messages')
        .select(`
          *,
          sender:profiles!real_time_messages_sender_id_fkey(first_name, last_name),
          channel:notification_channels!real_time_messages_channel_id_fkey(name, type)
        `)
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as (RealTimeMessage & { sender: any; channel: any })[];
    },
    enabled: !!channels?.length,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!profile?.user_id || !channels?.length) return;

    const channelIds = channels.map(c => c.id);
    
    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('real-time-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'real_time_messages',
        filter: `channel_id=in.(${channelIds.join(',')})`
      }, (payload) => {
        const newMessage = payload.new as RealTimeMessage;
        
        // Don't show notification for own messages
        if (newMessage.sender_id === profile.user_id) return;
        
        // Update query cache
        queryClient.invalidateQueries({ queryKey: ['real-time-messages'] });
        
        // Show browser notification for high priority messages
        if (newMessage.priority === 'urgent' || newMessage.priority === 'high') {
          showBrowserNotification(newMessage);
        }
        
        // Show toast for alerts
        if (newMessage.message_type === 'alert') {
          toast({
            title: "Alert",
            description: newMessage.message,
            variant: newMessage.priority === 'urgent' ? 'destructive' : 'default'
          });
        }
        
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [profile?.user_id, channels, queryClient, toast]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      channelId,
      message,
      messageType = 'text',
      patientId,
      priority = 'normal'
    }: {
      channelId: string;
      message: string;
      messageType?: string;
      patientId?: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase
        .from('real_time_messages')
        .insert({
          channel_id: channelId,
          sender_id: profile?.user_id,
          message,
          message_type: messageType,
          patient_id: patientId,
          priority
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-time-messages'] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Send emergency alert
  const sendEmergencyAlert = useMutation({
    mutationFn: async ({ message, patientId }: { message: string; patientId?: string }) => {
      // Find emergency channel
      const emergencyChannel = channels?.find(ch => ch.type === 'emergency');
      
      if (!emergencyChannel) {
        throw new Error('No emergency channel found');
      }

      return sendMessage.mutateAsync({
        channelId: emergencyChannel.id,
        message,
        messageType: 'alert',
        patientId,
        priority: 'urgent'
      });
    },
    onSuccess: () => {
      toast({
        title: "Emergency Alert Sent",
        description: "Alert has been sent to all staff members.",
      });
    }
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from('real_time_messages')
        .update({
          read_by: supabase.rpc('array_append', {
            arr: supabase.raw('read_by'),
            elem: profile?.user_id
          })
        })
        .in('id', messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: ['real-time-messages'] });
    }
  });

  return {
    channels: channels || [],
    messages: messages || [],
    unreadCount,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    sendEmergencyAlert: sendEmergencyAlert.mutate,
    isSendingAlert: sendEmergencyAlert.isPending,
    markAsRead: markAsRead.mutate,
    isMarkingRead: markAsRead.isPending
  };
};

// Browser notification helper
function showBrowserNotification(message: RealTimeMessage) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(`Urgent: ${message.message}`, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: message.id,
        requireInteraction: message.priority === 'urgent'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(message);
        }
      });
    }
  }
}