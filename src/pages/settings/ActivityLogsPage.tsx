import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Filter, Download, Eye, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  details: any;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export default function ActivityLogsPage() {
  const { hospital } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity-logs', hospital?.id, searchTerm, actionFilter, severityFilter, dateFrom, dateTo],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as ActivityLog[];
    },
    enabled: !!hospital?.id,
  });

  const filteredLogs = activityLogs?.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.entity_id.toLowerCase().includes(searchLower) ||
      (log.user?.first_name + ' ' + log.user?.last_name).toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    );
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('create')) return '➕';
    if (actionType.includes('update')) return '✏️';
    if (actionType.includes('delete')) return '🗑️';
    if (actionType.includes('view')) return '👁️';
    if (actionType.includes('login')) return '🔐';
    return '📝';
  };

  const exportLogs = () => {
    if (!filteredLogs) return;
    
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
        log.action_type,
        log.entity_type,
        log.entity_id,
        log.severity,
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground">
          Comprehensive audit trail of all system activities for compliance and security monitoring.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter activity logs by action type, severity, date range, or search terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="patient_registered">Patient Registered</SelectItem>
                  <SelectItem value="appointment_created">Appointment Created</SelectItem>
                  <SelectItem value="appointment_updated">Appointment Updated</SelectItem>
                  <SelectItem value="consultation_started">Consultation Started</SelectItem>
                  <SelectItem value="consultation_completed">Consultation Completed</SelectItem>
                  <SelectItem value="prescription_created">Prescription Created</SelectItem>
                  <SelectItem value="payment_recorded">Payment Recorded</SelectItem>
                  <SelectItem value="user_login">User Login</SelectItem>
                  <SelectItem value="user_logout">User Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {filteredLogs?.length || 0} activities found
            </div>
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(log.created_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.user ? (
                            <span>{log.user.first_name} {log.user.last_name}</span>
                          ) : (
                            <span className="text-muted-foreground italic">System</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getActionIcon(log.action_type)}</span>
                          <span className="font-medium">{log.action_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.entity_type}</div>
                          <div className="text-sm text-muted-foreground">{log.entity_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity) as any}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {log.details && typeof log.details === 'object' ? (
                            <div className="space-y-1">
                              {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>{' '}
                                  <span className="text-muted-foreground">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {log.details || 'No details'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}