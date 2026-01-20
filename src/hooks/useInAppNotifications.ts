import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface Notification {
  id: string;
  hospital_id: string;
  recipient_id: string;
  sender_id: string | null;
  type: 'appointment_reminder' | 'prescription_ready' | 'lab_results' | 'invoice' | 'system' | 'message' | 'alert' | 'task';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'clinical' | 'administrative' | 'billing' | 'system' | 'communication' | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  metadata: Json;
  expires_at: string | null;
  created_at: string;
}

export function useInAppNotifications() {
  const { user, hospital } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications for the current user
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Get unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Create notification (for internal use)
  const createNotification = useMutation({
    mutationFn: async (notification: {
      hospital_id: string;
      recipient_id: string;
      sender_id?: string | null;
      type: string;
      title: string;
      message: string;
      priority?: string;
      category?: string | null;
      action_url?: string | null;
      metadata?: Json;
      expires_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    createNotification: createNotification.mutateAsync,
    isMarkingRead: markAsRead.isPending,
  };
}
