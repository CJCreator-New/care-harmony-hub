import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityLogs } from '@/hooks/useActivityLog';
import { format } from 'date-fns';
import { 
  Activity, 
  Search, 
  Filter,
  LogIn,
  LogOut,
  Eye,
  UserPlus,
  Edit,
  Calendar,
  Stethoscope,
  Pill,
  TestTube2,
  CreditCard,
  Settings,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  patient_view: Eye,
  patient_create: UserPlus,
  patient_update: Edit,
  appointment_create: Calendar,
  appointment_update: Calendar,
  appointment_cancel: Calendar,
  consultation_start: Stethoscope,
  consultation_complete: Stethoscope,
  prescription_create: Pill,
  prescription_dispense: Pill,
  lab_order_create: TestTube2,
  lab_result_enter: TestTube2,
  invoice_create: CreditCard,
  payment_record: CreditCard,
  staff_invite: UserPlus,
  staff_deactivate: LogOut,
  settings_update: Settings,
};

const actionLabels: Record<string, string> = {
  login: 'User Login',
  logout: 'User Logout',
  patient_view: 'Viewed Patient',
  patient_create: 'Created Patient',
  patient_update: 'Updated Patient',
  appointment_create: 'Created Appointment',
  appointment_update: 'Updated Appointment',
  appointment_cancel: 'Cancelled Appointment',
  consultation_start: 'Started Consultation',
  consultation_complete: 'Completed Consultation',
  prescription_create: 'Created Prescription',
  prescription_dispense: 'Dispensed Prescription',
  lab_order_create: 'Created Lab Order',
  lab_result_enter: 'Entered Lab Result',
  invoice_create: 'Created Invoice',
  payment_record: 'Recorded Payment',
  staff_invite: 'Invited Staff',
  staff_deactivate: 'Deactivated Staff',
  settings_update: 'Updated Settings',
};

const actionColors: Record<string, string> = {
  login: 'bg-green-500/10 text-green-700 dark:text-green-400',
  logout: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  patient_view: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  patient_create: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  patient_update: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  appointment_create: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  appointment_update: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  appointment_cancel: 'bg-red-500/10 text-red-700 dark:text-red-400',
  consultation_start: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  consultation_complete: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  prescription_create: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  prescription_dispense: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  lab_order_create: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  lab_result_enter: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  invoice_create: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  payment_record: 'bg-green-500/10 text-green-700 dark:text-green-400',
  staff_invite: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  staff_deactivate: 'bg-red-500/10 text-red-700 dark:text-red-400',
  settings_update: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

export default function ActivityLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs, isLoading } = useActivityLogs({
    actionType: actionFilter === 'all' ? undefined : actionFilter,
    limit: 200,
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const profile = log.profiles as any;
    const userName = profile ? `${profile.first_name} ${profile.last_name}`.toLowerCase() : '';
    return userName.includes(searchQuery.toLowerCase()) ||
           log.action_type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleExport = () => {
    if (!filteredLogs) return;
    
    const csv = [
      ['Date', 'Time', 'User', 'Action', 'Entity Type', 'Details'].join(','),
      ...filteredLogs.map(log => {
        const profile = log.profiles as any;
        const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
        return [
          format(new Date(log.created_at), 'yyyy-MM-dd'),
          format(new Date(log.created_at), 'HH:mm:ss'),
          `"${userName}"`,
          log.action_type,
          log.entity_type || '-',
          `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        ].join(',');
      }),
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
            <p className="text-muted-foreground">
              HIPAA-compliant audit trail of all user actions in your hospital.
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Logins</SelectItem>
                  <SelectItem value="patient_view">Patient Views</SelectItem>
                  <SelectItem value="patient_create">Patient Created</SelectItem>
                  <SelectItem value="consultation_complete">Consultations</SelectItem>
                  <SelectItem value="prescription_create">Prescriptions</SelectItem>
                  <SelectItem value="lab_order_create">Lab Orders</SelectItem>
                  <SelectItem value="settings_update">Settings Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Showing the last 200 activities. Export for full history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const Icon = actionIcons[log.action_type] || Activity;
                  const profile = log.profiles as any;
                  const userName = profile 
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Unknown User';

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${actionColors[log.action_type] || 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {actionLabels[log.action_type] || log.action_type}
                          </Badge>
                          {log.entity_type && (
                            <span className="text-sm text-muted-foreground">
                              • {log.entity_type}
                            </span>
                          )}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                        <div>{format(new Date(log.created_at), 'h:mm a')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No activity logs found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
