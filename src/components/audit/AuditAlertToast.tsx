import React, { useEffect } from 'react';
import { useAmendmentAlerts, type AmendmentAlert } from '@/hooks/useAmendmentAlerts';
import { toast } from 'sonner';
import { AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Phase 2B: Audit Alert Toast System
 * 
 * Displays real-time toast notifications for amendment alerts.
 * Severity determines styling and auto-dismiss behavior:
 * - CRITICAL: Red, persistent
 * - HIGH: Orange, 8s auto-dismiss
 * - MEDIUM: Yellow, 6s auto-dismiss
 * - LOW: Blue, 4s auto-dismiss
 * 
 * Usage (in App.tsx root):
 * ```typescript
 * export function App() {
 *   return (
 *     <>
 *       <AuditAlertToastSystem hospitalId={hospitalId} />
 *       [rest of app]
 *     </>
 *   );
 * }
 * ```
 */

interface AuditAlertToastSystemProps {
  /** Hospital ID for scoped alerts */
  hospitalId: string | null;
  /** Optional role filter */
  filterByRole?: string;
  /** Callback when alert shown */
  onAlertShown?: (alert: AmendmentAlert) => void;
  /** Custom toast formatter */
  formatToastMessage?: (alert: AmendmentAlert) => string;
  /** Disable toast system */
  disabled?: boolean;
}

export function AuditAlertToastSystem({
  hospitalId,
  filterByRole,
  onAlertShown,
  formatToastMessage,
  disabled = false,
}: AuditAlertToastSystemProps) {
  const { profile } = useAuth();
  const { alerts, markAsRead } = useAmendmentAlerts(hospitalId, filterByRole);

  // Track which alerts we've already shown
  const [shownAlertIds, setShownAlertIds] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    if (disabled || !alerts.length) return;

    // Show toasts for new unread alerts
    alerts.forEach(alert => {
      if (!shownAlertIds.has(alert.amendmentId) && alert.unread) {
        showAlertToast(alert);
        setShownAlertIds(prev => new Set(prev).add(alert.amendmentId));

        // Callback
        if (onAlertShown) {
          onAlertShown(alert);
        }
      }
    });
  }, [alerts, shownAlertIds, disabled, onAlertShown]);

  const showAlertToast = (alert: AmendmentAlert) => {
    const message = formatToastMessage
      ? formatToastMessage(alert)
      : defaultFormatMessage(alert);

    const duration = getAutoCloseDuration(alert.severity);
    const icon = getSeverityIcon(alert.severity);
    const actionLabel = getActionLabel(alert.recordType);

    // Create custom toast content
    const toastContent = (
      <div className="flex gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{message}</p>
          {alert.reason && (
            <p className="text-xs text-gray-600 mt-1">
              Reason: {alert.reason.substring(0, 60)}
              {alert.reason.length > 60 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
    );

    if (alert.severity === 'CRITICAL') {
      // Critical alerts are persistent
      toast.error(toastContent, {
        duration: 0, // Persistent
        action: {
          label: actionLabel,
          onClick: () => {
            navigateToRecord(alert);
            markAsRead(alert.amendmentId);
          },
        },
        onAutoClose: () => {
          markAsRead(alert.amendmentId);
        },
      });
    } else if (alert.severity === 'HIGH') {
      toast.warning(toastContent, {
        duration: 8000,
        action: {
          label: actionLabel,
          onClick: () => {
            navigateToRecord(alert);
            markAsRead(alert.amendmentId);
          },
        },
        onAutoClose: () => {
          markAsRead(alert.amendmentId);
        },
      });
    } else if (alert.severity === 'MEDIUM') {
      toast(toastContent, {
        duration: 6000,
        action: {
          label: actionLabel,
          onClick: () => {
            navigateToRecord(alert);
            markAsRead(alert.amendmentId);
          },
        },
        onAutoClose: () => {
          markAsRead(alert.amendmentId);
        },
      });
    } else {
      // LOW severity
      toast.info(toastContent, {
        duration: 4000,
        action: {
          label: actionLabel,
          onClick: () => {
            navigateToRecord(alert);
            markAsRead(alert.amendmentId);
          },
        },
        onAutoClose: () => {
          markAsRead(alert.amendmentId);
        },
      });
    }
  };

  return null; // This component only manages toasts, doesn't render UI
}

/**
 * Get auto-close duration in milliseconds
 */
function getAutoCloseDuration(severity: AmendmentAlert['severity']): number {
  switch (severity) {
    case 'CRITICAL':
      return 0; // Don't auto-close
    case 'HIGH':
      return 8000;
    case 'MEDIUM':
      return 6000;
    case 'LOW':
    default:
      return 4000;
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: AmendmentAlert['severity']) {
  switch (severity) {
    case 'CRITICAL':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    case 'HIGH':
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    case 'MEDIUM':
      return <Clock className="w-5 h-5 text-yellow-600" />;
    case 'LOW':
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

/**
 * Get action label based on record type
 */
function getActionLabel(recordType: AmendmentAlert['recordType']): string {
  switch (recordType) {
    case 'prescription':
      return 'View Rx';
    case 'lab_result':
      return 'View Lab';
    case 'appointment':
      return 'View Appointment';
    default:
      return 'View';
  }
}

/**
 * Navigate to record detail view
 */
function navigateToRecord(alert: AmendmentAlert) {
  const baseUrl = window.location.origin;
  let url = '';

  switch (alert.recordType) {
    case 'prescription':
      url = `${baseUrl}/pharmacy/prescriptions/${alert.recordId}`;
      break;
    case 'lab_result':
      url = `${baseUrl}/laboratory/results/${alert.recordId}`;
      break;
    case 'appointment':
      url = `${baseUrl}/appointments/${alert.recordId}`;
      break;
  }

  if (url) {
    window.location.href = url;
  }
}

/**
 * Default message formatter
 */
function defaultFormatMessage(alert: AmendmentAlert): string {
  const recordTypeLabel = alert.recordType === 'prescription'
    ? 'Rx'
    : alert.recordType === 'lab_result'
    ? 'Lab'
    : 'Appointment';

  return `${alert.amendedBy.name} (${alert.amendedBy.role}) amended ${recordTypeLabel}`;
}

/**
 * Standalone hook for manually showing alerts
 * Useful for custom alert handling
 */
export function useShowAmendmentAlert() {
  return {
    show: (alert: AmendmentAlert) => {
      const message = defaultFormatMessage(alert);
      const icon = getSeverityIcon(alert.severity);
      const duration = getAutoCloseDuration(alert.severity);
      const actionLabel = getActionLabel(alert.recordType);

      const toastContent = (
        <div className="flex gap-3">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{message}</p>
            {alert.reason && (
              <p className="text-xs text-gray-600 mt-1">
                Reason: {alert.reason.substring(0, 60)}
              </p>
            )}
          </div>
        </div>
      );

      if (alert.severity === 'CRITICAL') {
        toast.error(toastContent, {
          duration: 0,
          action: {
            label: actionLabel,
            onClick: () => navigateToRecord(alert),
          },
        });
      } else if (alert.severity === 'HIGH') {
        toast.warning(toastContent, {
          duration,
          action: {
            label: actionLabel,
            onClick: () => navigateToRecord(alert),
          },
        });
      } else {
        toast.info(toastContent, {
          duration,
          action: {
            label: actionLabel,
            onClick: () => navigateToRecord(alert),
          },
        });
      }
    },
  };
}

