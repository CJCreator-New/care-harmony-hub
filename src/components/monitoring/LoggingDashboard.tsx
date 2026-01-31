import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Activity, Users, Clock, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { sanitizeHtml, sanitizeLogMessage } from '@/utils/sanitize';

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  url: string;
  user_agent: string;
  user_id?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

interface UserActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  details?: any;
  entity_type: string;
  entity_id: string;
  user_agent?: string;
  created_at: string;
}

export function LoggingDashboard() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('errors');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'errors') {
      fetchErrorLogs();
    } else {
      fetchActivityLogs();
    }
  }, [activeTab, severityFilter, actionFilter, timeRange, searchTerm]);

  const fetchErrorLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('action_type', 'error')
        .order('created_at', { ascending: false });

      // Apply severity filter
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('message', `%${searchTerm}%`);
      }

      // Apply time range filter
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      query = query.gte('timestamp', startDate.toISOString());

      const { data, error } = await query.limit(100);

      if (error) throw error;
      // Transform the data to match ErrorLog interface
      const transformedData: ErrorLog[] = (data || []).map(log => {
        const details = log.details as any;
        return {
          id: log.id,
          message: details?.message || 'Unknown error',
          stack: details?.stack,
          url: details?.url || '',
          user_agent: log.user_agent || '',
          user_id: log.user_id,
          timestamp: log.created_at,
          severity: (log.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
          context: details?.context,
        };
      });
      setErrorLogs(transformedData);
    } catch (error) {
      console.error('Failed to fetch error logs:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .neq('action_type', 'error')  // Exclude error logs
        .order('created_at', { ascending: false });

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`action_type.ilike.%${searchTerm}%,details->>description.ilike.%${searchTerm}%`);
      }

      // Apply time range filter
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      query = query.gte('created_at', startDate.toISOString());

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setActivityLogs(data as UserActivityLog[] || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (type: 'errors' | 'activity') => {
    const logs = type === 'errors' ? errorLogs : activityLogs;
    const csvContent = logs.map(log => {
      if (type === 'errors') {
        const errorLog = log as ErrorLog;
        return `${errorLog.timestamp},${errorLog.severity},${errorLog.message},${errorLog.url},${errorLog.user_id || 'anonymous'}`;
      } else {
        const activityLog = log as UserActivityLog;
        return `${activityLog.created_at},${activityLog.action_type},${activityLog.user_id},${activityLog.entity_type}`;
      }
    }).join('\n');

    const headers = type === 'errors'
      ? 'timestamp,severity,message,url,user_id\n'
      : 'created_at,action_type,user_id,entity_type\n';

    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const errorStats = {
    total: errorLogs.length,
    critical: errorLogs.filter(log => log.severity === 'critical').length,
    high: errorLogs.filter(log => log.severity === 'high').length,
    medium: errorLogs.filter(log => log.severity === 'medium').length,
    low: errorLogs.filter(log => log.severity === 'low').length,
  };

  const activityStats = {
    total: activityLogs.length,
    uniqueUsers: new Set(activityLogs.map(log => log.user_id)).size,
    topActions: activityLogs.reduce((acc, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Logs</h2>
          <p className="text-muted-foreground">
            Monitor system errors and user activity across the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportLogs(activeTab === 'errors' ? 'errors' : 'activity')}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => activeTab === 'errors' ? fetchErrorLogs() : fetchActivityLogs()}
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorStats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time Range:</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeTab === 'errors' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Severity:</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Action:</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="view_patient">View Patient</SelectItem>
                  <SelectItem value="update_patient">Update Patient</SelectItem>
                  <SelectItem value="create_appointment">Create Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Application errors and exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading error logs...</div>
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">No errors found for the selected filters</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorLogs.map((log, idx) => (
                      <TableRow key={`error-${idx}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={log.message}>
                            {sanitizeHtml(log.message)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <span className="truncate" title={log.url}>
                            {log.url}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.user_id ? (
                            <span className="text-sm text-muted-foreground">
                              {log.user_id.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Anonymous</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Logs</CardTitle>
              <CardDescription>
                User actions and system interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading activity logs...</div>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">No activity found for the selected filters</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Entity Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log, idx) => (
                      <TableRow key={`activity-${idx}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.user_id.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <div className="truncate" title={JSON.stringify(log.details)}>
                            {log.details ? JSON.stringify(log.details) : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <span className="truncate" title={log.entity_type}>
                            {log.entity_type}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}