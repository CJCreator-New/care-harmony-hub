import React, { useState } from 'react';
import { usePrescriptionAmendmentChain } from '@/hooks/useForensicQueries';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { format } from 'date-fns';
import { sanitizeHtml } from '@/utils/sanitize';

/**
 * Phase 2B: Forensic Timeline Component
 * 
 * Read-only forensic amendment chain viewer showing:
 * - Event time (UTC)
 * - Action type (CREATE, APPROVE, AMEND, etc.)
 * - Actor (role, email)
 * - Changes (before/after state for measurable fields)
 * - Change reason & justification
 * 
 * Features:
 * - Role-based visibility (doctor sees own amendments, admin sees all)
 * - Expandable details for each amendment
 * - Date range filter
 * - CSV export
 */

export interface ForensicTimelineProps {
  /** Prescription ID to show amendment chain for */
  prescriptionId: string;
  /** Show only amendments by current user (doctor view) */
  showOwnOnly?: boolean;
}

interface ExpandedRows {
  [key: string]: boolean;
}

const actionTypeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  APPROVE: 'bg-blue-100 text-blue-800',
  REJECT: 'bg-red-100 text-red-800',
  DISPENSE: 'bg-purple-100 text-purple-800',
  AMEND: 'bg-yellow-100 text-yellow-800',
  REVERSAL: 'bg-red-100 text-red-800',
  VERIFY: 'bg-blue-100 text-blue-800',
};

const actionTypeLabels: Record<string, string> = {
  CREATE: 'Created',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  DISPENSE: 'Dispensed',
  AMEND: 'Amended',
  REVERSAL: 'Reversed',
  VERIFY: 'Verified',
  PENDING: 'Pending',
};

export function ForensicTimeline({
  prescriptionId,
  showOwnOnly = false,
}: ForensicTimelineProps) {
  const { profile, session } = useAuth();
  const { data: amendmentChain = [], isLoading, error } = usePrescriptionAmendmentChain(
    prescriptionId
  );

  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Filter by role if applicable
  const filteredChain = amendmentChain.filter(record => {
    if (roleFilter !== 'all' && record.actor_role !== roleFilter) {
      return false;
    }
    if (showOwnOnly && record.actor_email !== session?.user?.email) {
      return false;
    }
    return true;
  });

  // Toggle row expansion
  const toggleExpand = (auditId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [auditId]: !prev[auditId],
    }));
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      'Sequence',
      'Date/Time (UTC)',
      'Action',
      'Actor Role',
      'Actor Email',
      'Dosage Before',
      'Dosage After',
      'Quantity Before',
      'Quantity After',
      'Change Reason',
      'Amendment Justification',
    ];

    const rows = filteredChain.map(record => [
      record.sequence_number,
      record.event_time,
      record.action_type,
      record.actor_role,
      record.actor_email,
      record.dosage_before || '',
      record.dosage_after || '',
      record.quantity_before || '',
      record.quantity_after || '',
      record.change_reason || '',
      record.amendment_justification || '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell => {
            // Escape quotes and wrap in quotes if contains comma
            const cellStr = String(cell || '');
            return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
          })
          .join(',')
      ),
    ].join('\n');

    // Download
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    );
    element.setAttribute(
      'download',
      `prescription_${prescriptionId.slice(0, 8)}_audit_trail_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(amendmentChain.map(r => r.actor_role))).sort();

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Amendment Timeline</h3>
          <p className="text-sm text-gray-600">
            Immutable forensic chain for Rx {prescriptionId.slice(0, 8)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filteredChain.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {uniqueRoles.map(role => (
              <SelectItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Failed to load amendment chain</p>
            <p className="text-xs text-red-800">{String(error)}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredChain.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No amendments found for this prescription</p>
        </div>
      )}

      {/* Timeline Table */}
      {!isLoading && !error && filteredChain.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-24">Seq.</TableHead>
                <TableHead className="w-32">Date/Time (UTC)</TableHead>
                <TableHead className="w-20">Action</TableHead>
                <TableHead className="w-20">Role</TableHead>
                <TableHead>Doctor / Actor</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="text-right">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChain.map(record => (
                <React.Fragment key={record.audit_id}>
                  {/* Main Row */}
                  <TableRow className="hover:bg-gray-50 cursor-pointer">
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(record.audit_id)}
                        className="inline-flex items-center justify-center"
                      >
                        {expandedRows[record.audit_id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {record.sequence_number}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(record.event_time), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          actionTypeColors[record.action_type] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {actionTypeLabels[record.action_type] || record.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {record.actor_role}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">{sanitizeHtml(record.actor_email)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      {record.dosage_before && record.dosage_after ? (
                        <div className="font-mono text-xs">
                          {record.dosage_before} →{'\n'}
                          {record.dosage_after}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs max-w-xs">
                      <p className="line-clamp-2">{record.change_reason || '-'}</p>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedRows[record.audit_id] && (
                    <TableRow className="bg-gray-50 border-l-4 border-l-blue-500">
                      <TableCell colSpan={8} className="p-4">
                        <div className="space-y-3">
                          {/* Dosage Change Details */}
                          {record.dosage_before && record.dosage_after && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 uppercase mb-1">
                                Dosage Amendment
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Before:</span>{' '}
                                  <span className="font-mono font-semibold">
                                    {record.dosage_before}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">After:</span>{' '}
                                  <span className="font-mono font-semibold">
                                    {record.dosage_after}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Quantity Change Details */}
                          {record.quantity_before && record.quantity_after && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 uppercase mb-1">
                                Quantity Amendment
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Before:</span>{' '}
                                  <span className="font-mono font-semibold">
                                    {record.quantity_before} units
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">After:</span>{' '}
                                  <span className="font-mono font-semibold">
                                    {record.quantity_after} units
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Clinical Justification */}
                          {record.amendment_justification && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 uppercase mb-1">
                                Clinical Justification
                              </p>
                              <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                {sanitizeHtml(record.amendment_justification)}
                              </p>
                            </div>
                          )}

                          {/* Audit ID */}
                          <div className="pt-2 border-t text-xs text-gray-500">
                            Audit ID: <span className="font-mono">{record.audit_id}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-xs text-gray-600 pt-2 border-t">
        <p>
          Showing {filteredChain.length} of {amendmentChain.length} record
          {amendmentChain.length !== 1 ? 's' : ''}. All entries are immutable and cryptographically
          linked.
        </p>
      </div>
    </div>
  );
}
