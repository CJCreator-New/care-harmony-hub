import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock, User, Globe, Search } from 'lucide-react';
import { format } from 'date-fns';

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

export function ErrorTrackingDashboard() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchErrorLogs();
  }, [severityFilter, timeRange, searchTerm]);

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
        query = query.ilike('details->>message', `%${searchTerm}%`);
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
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
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

  const getSeverityIcon = (severity: string) => {
    return <AlertTriangle className="h-4 w-4" />;
  };

  const errorStats = {
    total: errorLogs.length,
    critical: errorLogs.filter(log => log.severity === 'critical').length,
    high: errorLogs.filter(log => log.severity === 'high').length,
    medium: errorLogs.filter(log => log.severity === 'medium').length,
    low: errorLogs.filter(log => log.severity === 'low').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Error Tracking</h2>
          <p className="text-muted-foreground">
            Monitor and analyze application errors and user activity
          </p>
        </div>
        <Button onClick={fetchErrorLogs} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Error Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorStats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{errorStats.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{errorStats.medium}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low</CardTitle>
            <AlertTriangle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{errorStats.low}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
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
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search error messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>
            Recent application errors and exceptions
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
                        <div className="flex items-center gap-1">
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={log.message}>
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate" title={log.url}>
                          {log.url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user_id ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {log.user_id.slice(0, 8)}...
                          </span>
                        </div>
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
    </div>
  );
}