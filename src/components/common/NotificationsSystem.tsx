import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  User, 
  Calendar,
  Stethoscope,
  Pill,
  Mic2
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  created_at: string;
}

export function NotificationsSystem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      return data as Notification[];
    },
    enabled: !!user
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    }
  });

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          if (newNotification.priority === 'urgent' || newNotification.priority === 'high') {
            toast.error(newNotification.title, {
              description: newNotification.message,
              duration: 10000,
            });
          } else {
            toast.info(newNotification.title, {
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'consultation': return <Stethoscope className="h-4 w-4 text-blue-500" />;
      case 'lab_results': return <Info className="h-4 w-4 text-purple-500" />;
      case 'prescription_ready': return <Pill className="h-4 w-4 text-green-500" />;
      case 'appointment_reminder': return <Calendar className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group overflow-visible">
          <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-xl border-border/50 backdrop-blur-sm">
        <DropdownMenuLabel className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-sm font-bold">Clinical Alerts</span>
            <span className="text-[10px] font-normal text-muted-foreground">Real-time status updates</span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Clock className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Syncing clinical data...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-semibold text-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                We'll notify you when there are updates to your patients or schedule.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/50">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "group flex flex-col p-4 hover:bg-muted/50 transition-all cursor-pointer relative",
                    !notification.is_read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        !notification.is_read ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-muted"
                      )}>
                        {getIcon(notification.type)}
                      </div>
                      <span className={cn(
                        "text-sm truncate max-w-[200px]",
                        !notification.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                      )}>
                        {notification.title}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wider px-1.5 h-4", getPriorityBadgeClass(notification.priority))}>
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className={cn(
                    "text-xs line-clamp-2 mb-2 leading-relaxed",
                    !notification.is_read ? "text-foreground/80" : "text-muted-foreground"
                  )}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                    {!notification.is_read && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-primary font-bold">New</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button variant="ghost" className="w-full text-xs font-bold text-primary hover:bg-primary/5 h-9">
            View Patient Alert History
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

