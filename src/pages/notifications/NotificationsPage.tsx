import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useInAppNotifications, Notification } from '@/hooks/useInAppNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Calendar,
  Pill,
  TestTube2,
  CreditCard,
  Settings,
  MessageSquare,
  AlertTriangle,
  ClipboardList,
  CheckCheck,
  Search,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationIcons: Record<Notification['type'], React.ElementType> = {
  appointment_reminder: Calendar,
  prescription_ready: Pill,
  lab_results: TestTube2,
  invoice: CreditCard,
  system: Settings,
  message: MessageSquare,
  alert: AlertTriangle,
  task: ClipboardList,
};

const priorityColors: Record<Notification['priority'], string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

const typeLabels: Record<Notification['type'], string> = {
  appointment_reminder: 'Appointment',
  prescription_ready: 'Prescription',
  lab_results: 'Lab Results',
  invoice: 'Billing',
  system: 'System',
  message: 'Message',
  alert: 'Alert',
  task: 'Task',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingRead,
  } = useInAppNotifications();

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'unread') {
      return matchesSearch && !notification.is_read;
    }
    if (activeTab === 'urgent') {
      return matchesSearch && (notification.priority === 'urgent' || notification.priority === 'high');
    }
    return matchesSearch;
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead()}
              disabled={isMarkingRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                  <p className="text-sm text-muted-foreground">Total Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <MessageSquare className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{urgentCount}</p>
                  <p className="text-sm text-muted-foreground">Urgent/High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="urgent">
                    Urgent
                    {urgentCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {urgentCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg border border-border">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No notifications found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex gap-4 p-4 rounded-lg border border-border transition-colors cursor-pointer hover:bg-accent/50",
                        !notification.is_read && "bg-primary/5 border-primary/20"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
                        priorityColors[notification.priority]
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm font-medium",
                              !notification.is_read && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[notification.type]}
                            </Badge>
                            {notification.priority !== 'normal' && (
                              <Badge 
                                variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {notification.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          {notification.action_url && (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              View details
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
