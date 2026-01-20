import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CommunicationHub() {
  const { profile, hospital } = useAuth();
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [replyText, setReplyText] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', profile?.user_id, selectedPriority],
    queryFn: async () => {
      if (!profile?.user_id) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedPriority !== 'all') {
        query = query.eq('priority', selectedPriority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const quickReplies = [
    'Acknowledged',
    'On my way',
    'Will handle shortly',
    'Need more information',
    'Completed',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPriority} onValueChange={setSelectedPriority}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
            <TabsTrigger value="high">High</TabsTrigger>
            <TabsTrigger value="normal">Normal</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedPriority} className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">Loading messages...</div>
            ) : !messages || messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{msg.title}</span>
                            <Badge variant={msg.priority === 'urgent' ? 'destructive' : 'secondary'}>
                              {msg.priority}
                            </Badge>
                            {!msg.read && <Badge variant="default">New</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {quickReplies.map((reply) => (
                          <Button key={reply} variant="outline" size="sm">
                            {reply}
                          </Button>
                        ))}
                      </div>
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
