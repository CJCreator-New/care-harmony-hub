import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, Bell, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function UnifiedCommunicationHub() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['unified-messages', profile?.user_id, activeTab],
    queryFn: async () => {
      if (!profile?.user_id) return [];

      let query = supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(first_name, last_name, role)
        `)
        .eq('recipient_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activeTab !== 'all') {
        if (activeTab === 'unread') {
          query = query.eq('read', false);
        } else {
          query = query.eq('type', activeTab);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
    refetchInterval: 10000,
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-messages'] });
    },
  });

  const sendReply = useMutation({
    mutationFn: async ({ messageId, text }: { messageId: string; text: string }) => {
      const message = messages.find(m => m.id === messageId);
      if (!message?.sender_id) return;

      const { error } = await supabase.from('notifications').insert({
        recipient_id: message.sender_id,
        sender_id: profile?.id,
        title: `Re: ${message.title}`,
        message: text,
        type: 'message',
        hospital_id: profile?.hospital_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Reply sent successfully' });
      setReplyText({});
    },
  });

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_assignment': return <Clock className="h-4 w-4" />;
      case 'alert': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Unified Communication Hub
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="task_assignment">Tasks</TabsTrigger>
            <TabsTrigger value="alert">Alerts</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-4 border rounded-lg space-y-3 ${
                        !msg.read ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTypeIcon(msg.type)}
                            <span className="font-medium">{msg.title}</span>
                            {msg.priority && (
                              <Badge variant={getPriorityColor(msg.priority)}>
                                {msg.priority}
                              </Badge>
                            )}
                            {!msg.read && <Badge>New</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{msg.message}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {msg.sender && (
                              <span>
                                From: {msg.sender.first_name} {msg.sender.last_name} ({msg.sender.role})
                              </span>
                            )}
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {!msg.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead.mutate(msg.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {msg.sender_id && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a reply..."
                            value={replyText[msg.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && replyText[msg.id]?.trim()) {
                                sendReply.mutate({ messageId: msg.id, text: replyText[msg.id] });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={!replyText[msg.id]?.trim()}
                            onClick={() => sendReply.mutate({ messageId: msg.id, text: replyText[msg.id] })}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
