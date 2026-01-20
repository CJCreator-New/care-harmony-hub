import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export enum NotificationPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

interface RealTimeNotification {
  id: string;
  priority: NotificationPriority;
  role: string;
  message: string;
  actionRequired: boolean;
  escalationTime?: number;
}

export const useRealTimeNotifications = (userId: string, userRole: string) => {
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          if (notification.priority <= NotificationPriority.HIGH) {
            toast({
              title: notification.title,
              description: notification.message,
              variant: notification.priority === NotificationPriority.CRITICAL ? 'destructive' : 'default'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole]);
};
