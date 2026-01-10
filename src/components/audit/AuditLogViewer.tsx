import { useState } from 'react';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, Filter, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const actionTypeLabels = {
  login: 'Login',
  logout: 'Logout',
  patient_create: 'Patient Created',
  patient_view: 'Patient Viewed',
  patient_update: 'Patient Updated',
  prescription_create: 'Prescription Created',
  lab_result_view: 'Lab Result Viewed',
  appointment_create: 'Appointment Created',
  billing_create: 'Bill Created',
  security_event: 'Security Event',
};

const severityColors = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
};

export function AuditLogViewer() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filters = {
    hospital_id: profile?.hospital_id,
    ...(actionFilter !== 'all' && { action_type: actionFilter }),
    ...(severityFilter !== 'all' && { severity: severityFilter }),
  };

  const {
    data: auditLogs,
    count,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    nextPage,
    prevPage,
    goToPage,
  } = usePaginatedQuery({
    table: 'activity_logs',
    select: '*',
    filters,
    orderBy: { column: 'created_at', ascending: false },
    pageSize: 50,
  });

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(query) ||
      log.action_type.toLowerCase().includes(query) ||
      log.entity_type?.toLowerCase().includes(query) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(query)
    );
  });

  const exportAuditLogs = async () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Severity', 'IP Address', 'Details'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || 'System',
        actionTypeLabels[log.action_type] || log.action_type,
        log.entity_type || '',
        log.severity || 'info',
        log.ip_address || '',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Audit Trail
          </h2>
          <p className="text-muted-foreground">Security and activity monitoring</p>
        </div>
        <Button onClick={exportAuditLogs} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="patient_view">Patient Access</SelectItem>
            <SelectItem value="security_event">Security Events</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">No audit logs found</p>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>{log.user_email || 'System'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {actionTypeLabels[log.action_type] || log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.entity_type || '—'}</TableCell>
                    <TableCell>
                      <Badge className={severityColors[log.severity] || severityColors.info}>
                        {log.severity === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {log.severity || 'info'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address || '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onPrevious={prevPage}
                  onNext={nextPage}
                  pageSize={pageSize}
                  totalCount={count}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}