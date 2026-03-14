import React, { useState } from 'react';
import { useAuditTrail, type RecordType, type Amendment } from '@/hooks/useAuditTrail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronDown, ChevronUp, Calendar, User, MessageSquare } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Phase 2B: Audit Timeline Component
 * 
 * Visual timeline showing all amendments to a record with:
 * - Chronological events (original → amendment1 → amendment2 → current)
 * - Timestamp, actor, reason, before/after values
 * - Color coding by event type
 * - Hover tooltips with full details
 * - Expandable detail view
 * - "View Full Details" link to forensic modal
 * 
 * @example
 * ```typescript
 * <AuditTimeline 
 *   recordId="rx_123" 
 *   recordType="prescription"
 *   onViewForensics={() => setShowForensicModal(true)}
 * />
 * ```
 */

export interface AuditTimelineProps {
  /** Record ID to show audit trail for */
  recordId: string;
  /** Type of record (prescription, lab_result, appointment) */
  recordType?: RecordType;
  /** Callback when "View Full Details" clicked */
  onViewForensics?: () => void;
  /** Max amendments to show (rest in "show more") */
  maxAmendments?: number;
  /** Hide if no amendments */
  hideIfEmpty?: boolean;
}

const severityColors = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-900',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-900',
  MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  LOW: 'bg-blue-50 border-blue-200 text-blue-900',
};

const severityBadgeVariants = {
  CRITICAL: 'destructive',
  HIGH: 'secondary',
  MEDIUM: 'secondary',
  LOW: 'secondary',
} as const;

const changeTypeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  APPROVE: 'bg-blue-100 text-blue-800',
  REJECT: 'bg-red-100 text-red-800',
  AMEND: 'bg-orange-100 text-orange-800',
  VERIFIED: 'bg-green-100 text-green-800',
  CORRECTED: 'bg-yellow-100 text-yellow-800',
  INVALIDATED: 'bg-red-100 text-red-800',
  CRITICAL_ALERT: 'bg-red-100 text-red-800',
  RESCHEDULE: 'bg-purple-100 text-purple-800',
  CANCEL: 'bg-red-100 text-red-800',
};

export function AuditTimeline({
  recordId,
  recordType = 'prescription',
  onViewForensics,
  maxAmendments = 3,
  hideIfEmpty = false,
}: AuditTimelineProps) {
  const { auditTrail, isLoading, error, hasAmendments } = useAuditTrail(recordId, recordType);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Hide if no amendments and hideIfEmpty is true
  if (hideIfEmpty && !hasAmendments && !isLoading) {
    return null;
  }

  const displayedAmendments = showMore ? auditTrail : auditTrail.slice(0, maxAmendments);
  const hasMoreAmendments = auditTrail.length > maxAmendments;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            {recordType === 'prescription' ? 'Prescription' : 'Record'} History
          </h3>
          {hasAmendments && (
            <Badge variant="outline" className="text-xs">
              {auditTrail.length} amendment{auditTrail.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-800">
            <p className="font-medium">Failed to load audit trail</p>
            <p>{String(error)}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !hasAmendments && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>No amendments yet</p>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && !error && hasAmendments && (
        <div className="space-y-3">
          {displayedAmendments.map((amendment, idx) => (
            <TimelineEvent
              key={amendment.amendmentId}
              amendment={amendment}
              isFirst={idx === 0}
              isExpanded={expandedId === amendment.amendmentId}
              onToggleExpand={() =>
                setExpandedId(
                  expandedId === amendment.amendmentId ? null : amendment.amendmentId
                )
              }
            />
          ))}

          {/* Show More Button */}
          {hasMoreAmendments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMore(!showMore)}
              className="w-full text-xs"
            >
              {showMore ? 'Show Less' : `Show ${auditTrail.length - maxAmendments} More`}
            </Button>
          )}

          {/* View Full Details Button */}
          {onViewForensics && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewForensics}
              className="w-full text-xs"
            >
              View Full Details
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual timeline event card
 */
interface TimelineEventProps {
  amendment: Amendment;
  isFirst: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TimelineEvent({
  amendment,
  isFirst,
  isExpanded,
  onToggleExpand,
}: TimelineEventProps) {
  const severityClass = severityColors[amendment.severity];
  const changeTypeClass = changeTypeColors[amendment.changeType] || 'bg-gray-100 text-gray-800';

  // Format values for display
  const originalDisplay = formatValue(amendment.originalValue);
  const amendedDisplay = formatValue(amendment.amendedValue);

  return (
    <div className={cn('p-3 rounded-lg border cursor-pointer transition', severityClass)}>
      {/* Main Row */}
      <div onClick={onToggleExpand} className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Timestamp & Actor */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-600">
                {formatDistance(new Date(amendment.timestamp), new Date(), {
                  addSuffix: true,
                })}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(amendment.timestamp), 'MMM d, yyyy h:mm a')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <User className="w-3 h-3 text-gray-600" />
              <span className="font-medium">{amendment.amendedBy.name}</span>
              <Badge variant="outline" className="text-xs">
                {amendment.amendedBy.role}
              </Badge>
            </div>
          </div>

          {/* Right: Expand Button & Severity */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={severityBadgeVariants[amendment.severity]} className="text-xs">
              {amendment.severity}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Change Type & Values Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-xs ${changeTypeClass}`}>
            {amendment.changeType}
          </Badge>
          <span className="text-xs text-gray-700">
            <span className="line-through">{originalDisplay}</span>
            {' → '}
            <span className="font-semibold">{amendedDisplay}</span>
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Change Reason */}
          {amendment.reason && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <MessageSquare className="w-3 h-3" />
                Reason
              </div>
              <p className="text-xs text-gray-800 ml-5">{amendment.reason}</p>
            </div>
          )}

          {/* Detailed Values */}
          <div className="grid grid-cols-2 gap-3 p-2 bg-black/5 rounded text-xs">
            <div>
              <p className="font-medium text-gray-700">Before</p>
              <p className="text-gray-900 mt-0.5 whitespace-pre-wrap break-words">
                {originalDisplay}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">After</p>
              <p className="text-gray-900 mt-0.5 whitespace-pre-wrap break-words">
                {amendedDisplay}
              </p>
            </div>
          </div>

          {/* Approval Context */}
          {amendment.approvedBy && (
            <div className="flex gap-2 text-xs p-2 bg-green-100/50 rounded">
              <span className="font-medium text-green-900">✓ Reviewed by:</span>
              <span className="text-green-900">
                {amendment.approvedBy.name} ({amendment.approvedBy.role})
              </span>
            </div>
          )}

          {/* Legal Hold Status */}
          {amendment.legalHoldAt && (
            <div className="flex gap-2 text-xs p-2 bg-amber-100/50 rounded">
              <span className="font-medium text-amber-900">🔒 Under Legal Hold</span>
            </div>
          )}

          {/* Audit ID for Forensics */}
          <div className="text-xs text-gray-600 font-mono">
            Amendment ID: {amendment.amendmentId.substring(0, 16)}...
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format value for display (handles objects, nulls, etc.)
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
