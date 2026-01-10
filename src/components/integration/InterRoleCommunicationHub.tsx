import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, AlertTriangle, User, Clock, CheckCircle } from 'lucide-react';
import { InterRoleMessage, SendMessageForm, MessageFilters } from '@/types/integration';

interface CommunicationHubProps {
  hospitalId: string;
  currentUserId: string;
  currentUserRole: string;
}

export const InterRoleCommunicationHub: React.FC<CommunicationHubProps> = ({ 
  hospitalId, 
  currentUserId, 
  currentUserRole 
}) => {
  const [messages, setMessages] = useState<InterRoleMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InterRoleMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [filters, setFilters] = useState<MessageFilters>({});
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'urgent'>('inbox');

  const [composeForm, setComposeForm] = useState<SendMessageForm>({
    recipient_id: '',
    message_type: 'general',
    subject: '',
    content: ''
  });

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'alert': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'handoff': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'general': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'handoff': return <User className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleSendMessage = async () => {
    // Implementation would send message via API
    console.log('Sending message:', composeForm);
    setIsComposeOpen(false);
    setComposeForm({
      recipient_id: '',
      message_type: 'general',
      subject: '',
      content: ''
    });
  };

  const handleMarkAsRead = async (messageId: string) => {
    // Implementation would mark message as read via API
    console.log('Marking as read:', messageId);
  };

  const handleAcknowledge = async (messageId: string) => {
    // Implementation would acknowledge message via API
    console.log('Acknowledging message:', messageId);
  };

  const filteredMessages = messages.filter(message => {
    if (activeTab === 'inbox' && message.recipient_id !== currentUserId) return false;
    if (activeTab === 'sent' && message.sender_id !== currentUserId) return false;
    if (activeTab === 'urgent' && message.message_type !== 'urgent') return false;
    
    if (filters.message_type && !filters.message_type.includes(message.message_type)) return false;
    if (filters.unread_only && message.read_at) return false;
    
    return true;
  });

  const unreadCount = messages.filter(m => m.recipient_id === currentUserId && !m.read_at).length;
  const urgentCount = messages.filter(m => m.recipient_id === currentUserId && m.message_type === 'urgent' && !m.read_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Communication Hub</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {unreadCount} unread
            </Badge>
          )}
          {urgentCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {urgentCount} urgent
            </Badge>
          )}
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={composeForm.recipient_id} onValueChange={(value) => setComposeForm({...composeForm, recipient_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff1">Dr. Smith (Doctor)</SelectItem>
                    <SelectItem value="staff2">Nurse Johnson (Nurse)</SelectItem>
                    <SelectItem value="staff3">Tech Wilson (Lab Tech)</SelectItem>
                    <SelectItem value="staff4">Admin Davis (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message_type">Message Type</Label>
                <Select value={composeForm.message_type} onValueChange={(value: any) => setComposeForm({...composeForm, message_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="handoff">Patient Handoff</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="patient_id">Patient (Optional)</Label>
                <Select value={composeForm.patient_id || ''} onValueChange={(value) => setComposeForm({...composeForm, patient_id: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No patient</SelectItem>
                    <SelectItem value="patient1">John Doe (MRN: 12345)</SelectItem>
                    <SelectItem value="patient2">Jane Smith (MRN: 67890)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
                  placeholder="Message subject"
                />
              </div>
              <div>
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({...composeForm, content: e.target.value})}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage}>
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    variant={activeTab === 'inbox' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('inbox')}
                    className="relative"
                  >
                    Inbox
                    {unreadCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant={activeTab === 'sent' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('sent')}
                  >
                    Sent
                  </Button>
                  <Button 
                    variant={activeTab === 'urgent' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('urgent')}
                    className="relative"
                  >
                    Urgent
                    {urgentCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">
                        {urgentCount}
                      </Badge>
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={filters.message_type?.[0] || ''} onValueChange={(value) => setFilters({...filters, message_type: value ? [value] : undefined})}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="handoff">Handoff</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0 max-h-96 overflow-y-auto">
                {filteredMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      !message.read_at && message.recipient_id === currentUserId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getMessageTypeIcon(message.message_type)}
                          <Badge className={getMessageTypeColor(message.message_type)}>
                            {message.message_type}
                          </Badge>
                          {!message.read_at && message.recipient_id === currentUserId && (
                            <Badge className="bg-blue-100 text-blue-800">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {activeTab === 'sent' ? `To: ${message.recipient.full_name}` : `From: ${message.sender.full_name}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({activeTab === 'sent' ? message.recipient.role : message.sender.role})
                          </span>
                        </div>
                        {message.subject && (
                          <h4 className="font-medium text-sm mb-1">{message.subject}</h4>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        {message.patient && (
                          <p className="text-xs text-blue-600 mt-1">
                            Patient: {message.patient.full_name} ({message.patient.mrn})
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                        {message.read_at && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Message Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMessage ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getMessageTypeIcon(selectedMessage.message_type)}
                    <Badge className={getMessageTypeColor(selectedMessage.message_type)}>
                      {selectedMessage.message_type}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">From:</Label>
                    <p className="text-sm">{selectedMessage.sender.full_name} ({selectedMessage.sender.role})</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">To:</Label>
                    <p className="text-sm">{selectedMessage.recipient.full_name} ({selectedMessage.recipient.role})</p>
                  </div>
                  
                  {selectedMessage.patient && (
                    <div>
                      <Label className="text-sm font-medium">Patient:</Label>
                      <p className="text-sm">{selectedMessage.patient.full_name} ({selectedMessage.patient.mrn})</p>
                    </div>
                  )}
                  
                  {selectedMessage.subject && (
                    <div>
                      <Label className="text-sm font-medium">Subject:</Label>
                      <p className="text-sm">{selectedMessage.subject}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Message:</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Sent:</Label>
                    <p className="text-sm">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                  </div>
                  
                  {selectedMessage.read_at && (
                    <div>
                      <Label className="text-sm font-medium">Read:</Label>
                      <p className="text-sm">{new Date(selectedMessage.read_at).toLocaleString()}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {!selectedMessage.read_at && selectedMessage.recipient_id === currentUserId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkAsRead(selectedMessage.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                    {selectedMessage.message_type === 'urgent' && !selectedMessage.acknowledged_at && selectedMessage.recipient_id === currentUserId && (
                      <Button 
                        size="sm"
                        onClick={() => handleAcknowledge(selectedMessage.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Select a message to view details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};