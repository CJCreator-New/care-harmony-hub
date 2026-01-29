import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  recipient_role: string | null;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface ReceptionistMessagingProps {
  compact?: boolean;
}

export function ReceptionistMessaging({ compact = false }: ReceptionistMessagingProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientRole, setRecipientRole] = useState<'doctor' | 'nurse'>('doctor');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);

  const { profile } = useAuth();
  const { subscribeToChannel } = useRealtimeUpdates();

  useEffect(() => {
    if (profile?.id) {
      loadMessages();
      setupRealtimeSubscription();
    }
  }, [profile?.id]);

  const loadMessages = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('communication_messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          recipient_role,
          content,
          priority,
          read,
          created_at,
          sender:profiles!communication_messages_sender_id_fkey(first_name, last_name)
        `)
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id},recipient_role.in.(receptionist,doctor,nurse)`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.id) return;

    subscribeToChannel('communication_messages', `messages_${profile.id}`, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as Message;
        setMessages(prev => [newMsg, ...prev]);

        // Show notification for urgent messages
        if (newMsg.priority === 'urgent') {
          toast.error(`Urgent message from ${newMsg.sender?.first_name}: ${newMsg.content}`);
        } else {
          toast.info(`New message from ${newMsg.sender?.first_name}`);
        }
      }
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.id) return;

    setLoading(true);
    try {
      // Get hospital_id for the current user
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('hospital_id, first_name, last_name')
        .eq('user_id', profile.id)
        .single();

      if (profileError) throw profileError;

      // Send message to all recipients of the selected role
      await supabase
        .from('communication_messages')
        .insert({
          hospital_id: userProfile.hospital_id,
          sender_id: profile.id,
          sender_role: 'receptionist',
          sender_name: `${userProfile.first_name} ${userProfile.last_name}`,
          recipient_role: recipientRole,
          message_type: priority === 'urgent' ? 'urgent_alert' : 'general',
          subject: `Message from Receptionist`,
          content: newMessage.trim(),
          priority,
          read: false
        });

      toast.success(`Message sent to all ${recipientRole}s`);
      setNewMessage('');
      setPriority('medium');
      loadMessages(); // Refresh messages

    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('communication_messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const unreadCount = messages.filter(m => !m.read && (m.recipient_id === profile?.id || m.recipient_role === 'receptionist')).length;

  if (compact) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOpen(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Send quick messages to doctors and nurses
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOpen(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Internal Messaging
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Coordinate with doctors and nurses in real-time
          </div>
          <Button className="w-full mt-3" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Open Messages
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Internal Messaging
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
            {/* Message List */}
            <div className="space-y-4">
              <h3 className="font-medium">Recent Messages</h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border ${
                        !message.read && (message.recipient_id === profile?.id || message.recipient_role === 'receptionist')
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-muted/50'
                      }`}
                      onClick={() => !message.read && (message.recipient_id === profile?.id || message.recipient_role === 'receptionist') && markAsRead(message.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {message.sender?.first_name} {message.sender?.last_name}
                            </span>
                            {message.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                            {message.priority === 'high' && (
                              <Badge variant="warning" className="text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            {message.read && (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Send Message */}
            <div className="space-y-4">
              <h3 className="font-medium">Send Message</h3>

              <div>
                <label className="text-sm font-medium">Send to</label>
                <Select value={recipientRole} onValueChange={(v: any) => setRecipientRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">All Doctors</SelectItem>
                    <SelectItem value="nurse">All Nurses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  className="w-full p-2 border rounded-md resize-none"
                  rows={4}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>

              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || loading}
                className="w-full"
              >
                {loading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}