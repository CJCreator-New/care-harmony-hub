import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  MessageSquare, 
  Search,
  User,
  ArrowLeft,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useMessages, 
  useConversation, 
  useSendMessage, 
  useMarkAsRead,
  useMessagesRealtime,
  useMessageContacts,
} from '@/hooks/useSecureMessaging';

export default function DoctorMessagesPage() {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; type: string } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allMessages } = useMessages();
  const { data: conversationMessages } = useConversation(selectedContact?.id || '');
  const { data: contacts } = useMessageContacts();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  
  useMessagesRealtime();

  // Group messages by contact to show conversations
  const conversations = allMessages?.reduce((acc, msg) => {
    const contactId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
    const contactName = msg.sender_id === user?.id 
      ? `${msg.recipient?.first_name} ${msg.recipient?.last_name}`
      : `${msg.sender?.first_name} ${msg.sender?.last_name}`;
    
    if (!acc.has(contactId)) {
      acc.set(contactId, {
        contactId,
        contactName,
        lastMessage: msg,
        unreadCount: 0,
      });
    }
    
    const existing = acc.get(contactId)!;
    if (new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
      existing.lastMessage = msg;
    }
    if (!msg.is_read && msg.recipient_id === user?.id) {
      existing.unreadCount++;
    }
    
    return acc;
  }, new Map<string, { contactId: string; contactName: string; lastMessage: any; unreadCount: number }>());

  const conversationsList = conversations ? Array.from(conversations.values()) : [];
  
  const filteredConversations = conversationsList.filter(conv => 
    conv.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Mark messages as read when selecting a conversation
  useEffect(() => {
    if (selectedContact && conversationMessages) {
      const unreadIds = conversationMessages
        .filter(m => !m.is_read && m.recipient_id === user?.id)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsRead.mutate(unreadIds);
      }
    }
  }, [selectedContact, conversationMessages, user?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    await sendMessage.mutateAsync({
      recipient_id: selectedContact.id,
      content: newMessage,
    });
    setNewMessage('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Communicate with patients securely</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversations
                </CardTitle>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No conversations yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.contactId}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedContact?.id === conv.contactId ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedContact({ 
                          id: conv.contactId, 
                          name: conv.contactName,
                          type: 'patient'
                        })}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {conv.contactName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{conv.contactName}</p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(conv.lastMessage.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedContact ? (
              <>
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden"
                      onClick={() => setSelectedContact(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedContact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{selectedContact.type}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[calc(100vh-420px)] p-4">
                    <div className="space-y-4">
                      {conversationMessages?.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {format(parseISO(message.created_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[60px] resize-none"
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
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
