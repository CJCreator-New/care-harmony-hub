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
  Stethoscope,
  Pill,
  UserCheck,
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

export default function PharmacistMessagesPage() {
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
        id: contactId,
        name: contactName,
        lastMessage: msg.content,
        timestamp: msg.created_at,
        unreadCount: msg.sender_id !== user?.id && !msg.is_read ? 1 : 0,
        type: 'staff'
      });
    } else {
      // Update unread count
      const existing = acc.get(contactId);
      if (existing && msg.sender_id !== user?.id && !msg.is_read) {
        existing.unreadCount += 1;
      }
    }

    return acc;
  }, new Map()) || new Map();

  // Filter contacts based on search
  const filteredContacts = contacts?.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = () => {
    if (!selectedContact || !newMessage.trim()) return;

    sendMessage.mutate({
      recipient_id: selectedContact.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const handleMarkAsRead = (messageId: string) => {
    markAsRead.mutate([messageId]);
  };

  const getRoleIcon = (type: string) => {
    switch (type) {
      case 'doctor':
        return <Stethoscope className="h-4 w-4" />;
      case 'nurse':
        return <UserCheck className="h-4 w-4" />;
      case 'patient':
        return <User className="h-4 w-4" />;
      default:
        return <Pill className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Pharmacy Communication Hub</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Contacts Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Contacts</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 p-4">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact({
                        id: contact.id,
                        name: contact.name,
                        type: contact.role || 'staff'
                      })}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getRoleIcon(contact.role || 'staff')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{contact.name}</p>
                          <p className="text-sm opacity-70 capitalize">{contact.role}</p>
                        </div>
                        {contact.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {contact.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                {selectedContact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContact(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="text-lg">
                  {selectedContact ? selectedContact.name : 'Select a contact'}
                </CardTitle>
                {selectedContact && (
                  <Badge variant="outline" className="capitalize">
                    {selectedContact.type}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col h-[500px]">
              {selectedContact ? (
                <>
                  {/* Messages List */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {conversationMessages?.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.sender_id === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(parseISO(message.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="flex gap-2 mt-4">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 min-h-[60px] max-h-[120px]"
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a contact to start messaging</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
