import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { MessageSquare, AlertTriangle, Users, Clock, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RealTimeCommunicationHub = () => {
  const {
    channels,
    messages,
    unreadCount,
    sendMessage,
    isSending,
    sendEmergencyAlert,
    isSendingAlert,
    markAsRead
  } = useEnhancedNotifications();

  const [selectedChannel, setSelectedChannel] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');

  const handleSendMessage = () => {
    if (!selectedChannel || !newMessage.trim()) return;
    
    sendMessage({
      channelId: selectedChannel,
      message: newMessage.trim(),
      messageType: 'text',
      priority: 'normal'
    });
    
    setNewMessage('');
  };

  const handleEmergencyAlert = () => {
    if (!emergencyMessage.trim()) return;
    
    sendEmergencyAlert({
      message: emergencyMessage.trim()
    });
    
    setEmergencyMessage('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'default';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'task': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Real-time Communication Hub
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name} ({channel.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSendMessage} 
              disabled={isSending || !selectedChannel || !newMessage.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>

        {/* Emergency Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                value={emergencyMessage}
                onChange={(e) => setEmergencyMessage(e.target.value)}
                placeholder="Emergency alert message..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleEmergencyAlert}
              disabled={isSendingAlert || !emergencyMessage.trim()}
              variant="destructive"
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isSendingAlert ? 'Sending Alert...' : 'Send Emergency Alert'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Channels Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Active Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(channel => (
              <div key={channel.id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{channel.name}</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {channel.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-gray-600">
                    {channel.participants.length} participants
                  </div>
                  <div className="text-gray-600">
                    Status: {channel.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Recent Messages
            </span>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const unreadMessages = messages
                    .filter(m => !m.read_by.includes(m.sender_id))
                    .map(m => m.id);
                  if (unreadMessages.length > 0) {
                    markAsRead(unreadMessages);
                  }
                }}
              >
                Mark All Read
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`border rounded-lg p-4 ${
                  !message.read_by.includes(message.sender_id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMessageTypeIcon(message.message_type)}
                    <span className="font-medium">
                      {message.sender?.first_name} {message.sender?.last_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.channel?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(message.priority)} className="text-xs">
                      {message.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700">{message.message}</p>
                {message.message_type === 'alert' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-1 text-yellow-600" />
                    This is an alert message
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeCommunicationHub;