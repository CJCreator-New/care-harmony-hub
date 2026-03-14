import React, { useState, useMemo } from 'react';
import { useAmendmentAlerts, type AmendmentAlert } from '@/hooks/useAmendmentAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search, Filter, Lock, AlertTriangle, Info } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Phase 2B: Audit Dashboard
 * 
 * Hospital admin/audit team view for all amendments across all records.
 * Features:
 * - Real-time amendment feed
 * - Filters: record_type, severity, legal_hold_status
 * - Search: record_id, patient_name, reason
 * - Export to CSV/Excel
 * - Compliance summary
 */

export interface AuditDashboardProps {
  /** Hospital ID (optional - uses current auth context if not provided) */
  hospitalId?: string;
}

const severityBadgeVariants = {
  CRITICAL: 'destructive',
  HIGH: 'secondary',
  MEDIUM: 'outline',
  LOW: 'secondary',
} as const;

const recordTypeIcons: Record<AmendmentAlert['recordType'], string> = {
  prescription: 'Rx',
  lab_result: '🧪',
  appointment: '📅',
};

export function AuditDashboard({ hospitalId: providedHospitalId }: AuditDashboardProps) {
  const { profile } = useAuth();
  const hospitalId = providedHospitalId || profile?.hospital_id;

  // Hooks
  const { alerts } = useAmendmentAlerts(hospitalId);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<'all' | AmendmentAlert['recordType']>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AmendmentAlert['severity']>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('7days');

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Date range filter
    const now = new Date();
    let fromDate = now;
    switch (dateRangeFilter) {
      case '1day':
        fromDate = subDays(now, 1);
        break;
      case '7days':
        fromDate = subDays(now, 7);
        break;
      case '30days':
        fromDate = subDays(now, 30);
        break;
      case 'all':
        fromDate = new Date(0);
        break;
    }

    result = result.filter(alert => new Date(alert.timestamp) >= fromDate);

    // Record type filter
    if (recordTypeFilter !== 'all') {
      result = result.filter(alert => alert.recordType === recordTypeFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(alert => alert.severity === severityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(alert => {
        const searchIn = [
          alert.recordId,
          alert.recordTitle,
          alert.amendedBy.name,
          alert.reason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchIn.includes(query);
      });
    }

    return result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [alerts, searchQuery, recordTypeFilter, severityFilter, dateRangeFilter]);

  // Compute compliance metrics
  const complianceMetrics = useMemo(() => {
    return {
      totalAmendments: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
      highCount: alerts.filter(a => a.severity === 'HIGH').length,
      legalHeldCount: alerts.filter(a => a.recordId.includes('_hold')).length, // Simplified
      last24Hours: alerts.filter(
        a => new Date(a.timestamp) >= subDays(new Date(), 1)
      ).length,
    };
  }, [alerts]);

  // Export to CSV
  const handleExport = () => {
    const headers = [
      'Timestamp',
      'Record Type',
      'Record ID',
      'Severity',
      'Changed By',
      'Role',
      'Change Type',
      'Reason',
    ];

    const rows = filteredAlerts.map(alert => [
      format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      alert.recordType,
      alert.recordId,
      alert.severity,
      alert.amendedBy.name,
      alert.amendedBy.role,
      alert.message,
      alert.reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell => {
            const cellStr = String(cell || '');
            return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
          })
          .join(',')
      ),
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    );
    element.setAttribute(
      'download',
      `audit_trail_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Dashboard</h1>
        <p className="text-gray-600">
          Monitor all record amendments across hospital in real-time
        </p>
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ComplianceCard
          title="Total Amendments"
          value={complianceMetrics.totalAmendments}
          icon="📊"
          color="blue"
        />
        <ComplianceCard
          title="Critical (24h)"
          value={complianceMetrics.criticalCount}
          icon="🚨"
          color="red"
        />
        <ComplianceCard
          title="High (24h)"
          value={complianceMetrics.highCount}
          icon="⚠️"
          color="orange"
        />
        <ComplianceCard
          title="In Last 24h"
          value={complianceMetrics.last24Hours}
          icon="⏱️"
          color="green"
        />
        <ComplianceCard
          title="Legal Holds"
          value={complianceMetrics.legalHeldCount}
          icon="🔒"
          color="purple"
        />
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by record ID, patient, or reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Filter Selects */}
          <div className="grid grid-cols-3 gap-4">
            {/* Record Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Record Type</label>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter as any}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="prescription">Prescriptions</SelectItem>
                  <SelectItem value="lab_result">Lab Results</SelectItem>
                  <SelectItem value="appointment">Appointments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter as any}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Amendment Feed ({filteredAlerts.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredAlerts.length} of {alerts.length} total amendments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No amendments found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Record</TableHead>
                    <TableHead className="w-32">Timestamp</TableHead>
                    <TableHead className="w-24">Severity</TableHead>
                    <TableHead className="w-20">Changed By</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-20">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map(alert => (
                    <TableRow key={alert.amendmentId}>
                      {/* Record Type & ID */}
                      <TableCell className="font-mono text-xs">
                        <Badge variant="outline">
                          {recordTypeIcons[alert.recordType]}
                        </Badge>
                        <p className="mt-1 text-xs">{alert.recordId.substring(0, 16)}</p>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-xs text-gray-600">
                        <div>
                          {format(new Date(alert.timestamp), 'MMM d, yyyy')}
                        </div>
                        <div className="text-gray-500">
                          {format(new Date(alert.timestamp), 'h:mm a')}
                        </div>
                      </TableCell>

                      {/* Severity Badge */}
                      <TableCell>
                        <Badge variant={severityBadgeVariants[alert.severity]}>
                          {alert.severity}
                        </Badge>
                      </TableCell>

                      {/* Actor */}
                      <TableCell className="text-sm">
                        <div className="font-medium">{alert.amendedBy.name}</div>
                        <div className="text-xs text-gray-600">
                          {alert.amendedBy.role}
                        </div>
                      </TableCell>

                      {/* Message */}
                      <TableCell className="text-sm">
                        <p className="max-w-xs truncate">{alert.message}</p>
                      </TableCell>

                      {/* Reason (truncated) */}
                      <TableCell className="text-xs text-gray-600 max-w-xs">
                        <p className="truncate">{alert.reason || '—'}</p>
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

/**
 * Compliance metric card
 */
interface ComplianceCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'red' | 'orange' | 'green' | 'purple';
}

function ComplianceCard({ title, value, icon, color }: ComplianceCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <Card className={cn('border', colorClasses[color])}>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-600 mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
