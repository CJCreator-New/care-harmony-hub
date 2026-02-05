import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Stethoscope
} from 'lucide-react';
import { SecureMessage, MessageThread } from '@/types/patient-portal';
import { format, isToday, isYesterday } from 'date-fns';

interface SecureMessagingProps {
  patientId: string;
  currentUserId: string;
  currentUserType: 'patient' | 'doctor' | 'nurse' | 'staff';
  onSendMessage: (message: Partial<SecureMessage>) => void;
}

export const SecureMessaging: React.FC<SecureMessagingProps> = ({
  patientId,
  currentUserId,
  currentUserType,
  onSendMessage
}) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'appointment' | 'prescription' | 'test_result'>('general');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'urgent'>('all');
  const [isComposing, setIsComposing] = useState(false);

  // Mock message threads
  const mockThreads: MessageThread[] = [
    {
      thread_id: '1',
      subject: 'Lab Results Question',
      participants: [
        { id: 'patient1', name: 'John Doe', role: 'patient' },
        { id: 'doctor1', name: 'Dr. Smith', role: 'doctor' }
      ],
      messages: [
        {
          id: '1',
          thread_id: '1',
          patient_id: patientId,
          sender_id: 'patient1',
          sender_type: 'patient',
          recipient_id: 'doctor1',
          recipient_type: 'doctor',
          subject: 'Lab Results Question',
          message_body: 'Hi Dr. Smith, I received my lab results and have some questions about my cholesterol levels.',
          message_type: 'test_result',
          priority: 'normal',
          is_read: true,
          hospital_id: 'current',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          thread_id: '1',
          patient_id: patientId,
          sender_id: 'doctor1',
          sender_type: 'doctor',
          recipient_id: 'patient1',
          recipient_type: 'patient',
          message_body: 'Hello John, I\'d be happy to discuss your results. Your LDL cholesterol is slightly elevated at 145 mg/dL. We should discuss dietary changes and possibly medication.',
          message_type: 'test_result',
          priority: 'normal',
          is_read: false,
          hospital_id: 'current',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ],
      last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      unread_count: 1,
      priority: 'normal',
      status: 'active'
    },
    {
      thread_id: '2',
      subject: 'Appointment Rescheduling',
      participants: [
        { id: 'patient1', name: 'John Doe', role: 'patient' },
        { id: 'staff1', name: 'Sarah Johnson', role: 'staff' }
      ],
      messages: [
        {
          id: '3',
          thread_id: '2',
          patient_id: patientId,
          sender_id: 'patient1',
          sender_type: 'patient',
          recipient_id: 'staff1',
          recipient_type: 'staff',
          subject: 'Appointment Rescheduling',
          message_body: 'I need to reschedule my appointment next Tuesday due to a work conflict.',
          message_type: 'appointment',
          priority: 'normal',
          is_read: true,
          hospital_id: 'current',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      unread_count: 0,
      priority: 'normal',
      status: 'active'
    }
  ];

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'prescription': return '💊';
      case 'test_result': return '🧪';
      default: return '💬';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserIcon = (role: string) => {
    switch (role) {
      case 'doctor': return <Stethoscope className="h-4 w-4" />;
      case 'nurse': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Partial<SecureMessage> = {
      thread_id: selectedThread?.thread_id,
      patient_id: patientId,
      sender_id: currentUserId,
      sender_type: currentUserType,
      recipient_id: selectedThread?.participants.find(p => p.id !== currentUserId)?.id,
      recipient_type: selectedThread?.participants.find(p => p.id !== currentUserId)?.role as any,
      subject: selectedThread ? undefined : newSubject,
      message_body: newMessage,
      message_type: messageType,
      priority: priority,
      is_read: false
    };

    onSendMessage(message);
    setNewMessage('');
    
    if (isComposing) {
      setNewSubject('');
      setIsComposing(false);
    }
  };

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.messages.some(msg => msg.message_body.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'unread' && thread.unread_count > 0) ||
                         (filterStatus === 'urgent' && thread.priority === 'urgent');
    
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    setThreads(mockThreads);
  }, []);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Thread List */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h3>
            <Button
              size="sm"
              onClick={() => setIsComposing(true)}
            >
              New Message
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-y-auto">
          {filteredThreads.map((thread) => (
            <div
              key={thread.thread_id}
              className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                selectedThread?.thread_id === thread.thread_id ? 'bg-white border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => setSelectedThread(thread)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getMessageTypeIcon(thread.messages[0]?.message_type || 'general')}</span>
                  <h4 className="font-medium text-sm truncate">{thread.subject}</h4>
                </div>
                {thread.unread_count > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {thread.unread_count}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                {thread.participants
                  .filter(p => p.id !== currentUserId)
                  .map(participant => (
                    <div key={participant.id} className="flex items-center gap-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">{participant.name}</span>
                      {getUserIcon(participant.role)}
                    </div>
                  ))
                }
              </div>
              
              <p className="text-xs text-gray-600 truncate mb-2">
                {thread.messages[thread.messages.length - 1]?.message_body}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatMessageTime(thread.last_message_at)}
                </span>
                {thread.priority !== 'normal' && (
                  <Badge className={getPriorityColor(thread.priority)} variant="outline">
                    {thread.priority}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col">
        {selectedThread || isComposing ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {isComposing ? 'New Message' : selectedThread?.subject}
                  </h3>
                  {selectedThread && (
                    <div className="flex items-center gap-2 mt-1">
                      {selectedThread.participants
                        .filter(p => p.id !== currentUserId)
                        .map(participant => (
                          <span key={participant.id} className="text-sm text-gray-600">
                            {participant.name} ({participant.role})
                          </span>
                        ))
                      }
                    </div>
                  )}
                </div>
                {isComposing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsComposing(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedThread?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === currentUserId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {selectedThread.participants.find(p => p.id === message.sender_id)?.name}
                      </span>
                      <span className="text-xs opacity-70">
                        {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                      </span>
                      {message.is_read && message.sender_id === currentUserId && (
                        <CheckCircle className="h-3 w-3 opacity-70" />
                      )}
                    </div>
                    <p className="text-sm">{message.message_body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Compose */}
            <div className="p-4 border-t bg-white">
              {isComposing && (
                <div className="space-y-3 mb-3">
                  <Input
                    placeholder="Subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="test_result">Test Result</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || (isComposing && !newSubject.trim())}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
