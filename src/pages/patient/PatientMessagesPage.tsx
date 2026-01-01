import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Plus, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMessages,
  useConversation,
  useSendMessage,
  useMarkAsRead,
  useMessagesRealtime,
  useMessageContacts,
  Message,
} from '@/hooks/useSecureMessaging';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PatientMessagesPage() {
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
  const [newConvoRecipient, setNewConvoRecipient] = useState('');
  const [newConvoSubject, setNewConvoSubject] = useState('');
  const [newConvoMessage, setNewConvoMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allMessages = [], isLoading: messagesLoading } = useMessages();
  const { data: conversation = [], isLoading: conversationLoading } = useConversation(selectedContactId);
  const { data: contacts = [], isLoading: contactsLoading } = useMessageContacts();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Enable realtime updates
  useMessagesRealtime();

  // Get unique conversations (group by other user)
  const conversations = allMessages.reduce((acc, msg) => {
    const otherId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
    const otherName = msg.sender_id === user?.id 
      ? msg.recipient 
      : msg.sender;
    
    if (!acc.has(otherId)) {
      acc.set(otherId, {
        contactId: otherId,
        contactName: otherName ? `${otherName.first_name} ${otherName.last_name}` : 'Unknown',
        lastMessage: msg,
        unreadCount: 0,
      });
    }

    // Count unread
    if (msg.recipient_id === user?.id && !msg.is_read) {
      const existing = acc.get(otherId);
      if (existing) {
        existing.unreadCount++;
      }
    }

    return acc;
  }, new Map<string, { contactId: string; contactName: string; lastMessage: Message; unreadCount: number }>());

  // Auto scroll to bottom when conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedContactId && conversation.length > 0) {
      const unreadIds = conversation
        .filter(m => m.recipient_id === user?.id && !m.is_read)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead.mutate(unreadIds);
      }
    }
  }, [selectedContactId, conversation, user?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContactId) return;

    await sendMessage.mutateAsync({
      recipient_id: selectedContactId,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const handleStartNewConversation = async () => {
    if (!newConvoRecipient || !newConvoMessage.trim()) return;

    await sendMessage.mutateAsync({
      recipient_id: newConvoRecipient,
      subject: newConvoSubject || undefined,
      content: newConvoMessage.trim(),
    });

    setIsNewMessageDialogOpen(false);
    setNewConvoRecipient('');
    setNewConvoSubject('');
    setNewConvoMessage('');
    setSelectedContactId(newConvoRecipient);
  };

  const conversationsList = Array.from(conversations.values());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with your healthcare providers</p>
          </div>
          <Button onClick={() => setIsNewMessageDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-340px)]">
                {messagesLoading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : conversationsList.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a new message to begin</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversationsList.map((convo) => (
                      <button
                        key={convo.contactId}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                          selectedContactId === convo.contactId && 'bg-muted'
                        )}
                        onClick={() => setSelectedContactId(convo.contactId)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {convo.contactName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{convo.contactName}</p>
                              {convo.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {convo.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {convo.lastMessage.content.substring(0, 50)}
                              {convo.lastMessage.content.length > 50 && '...'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(convo.lastMessage.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation View */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedContactId ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">
                      {conversations.get(selectedContactId)?.contactName || 'Conversation'}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    {conversationLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-3/4" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {conversation.map((msg) => {
                          const isOwn = msg.sender_id === user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[75%] rounded-lg px-4 py-2',
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
                              >
                                {msg.subject && (
                                  <p className="font-medium text-sm mb-1">{msg.subject}</p>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p
                                  className={cn(
                                    'text-xs mt-1',
                                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  )}
                                >
                                  {format(parseISO(msg.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessage.isPending}
                        className="self-end"
                      >
                        {sendMessage.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-1">Select a conversation</h3>
                  <p>Choose a conversation from the list or start a new one</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* New Message Dialog */}
        <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a message to your healthcare provider
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>To *</Label>
                <Select value={newConvoRecipient} onValueChange={setNewConvoRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsLoading ? (
                      <div className="p-2">Loading...</div>
                    ) : (
                      contacts.map((contact: any) => (
                        <SelectItem key={contact.user_id} value={contact.user_id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Message subject (optional)"
                  value={newConvoSubject}
                  onChange={(e) => setNewConvoSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={newConvoMessage}
                  onChange={(e) => setNewConvoMessage(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewMessageDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartNewConversation}
                disabled={!newConvoRecipient || !newConvoMessage.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
