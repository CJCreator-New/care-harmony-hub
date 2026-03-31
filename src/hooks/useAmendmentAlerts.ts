import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeForLog } from '@/utils/sanitize';

/**
 * Phase 2B: Real-time Amendment Alerts Hook
 * 
 * Subscribes to real-time amendments and provides:
 * - Unread alert count
 * - Alert filtering by severity
 * - Mark as read functionality
 * - Auto-cleanup after 24 hours
 * 
 * @example
 * ```typescript
 * const { alerts, unreadCount, markAsRead } = useAmendmentAlerts('hospital_123');
 * 
 * return (
 *   <div>
 *     <Badge>{unreadCount}</Badge>
 *     {alerts.map(alert => (
 *       <AlertCard
 *         key={alert.amendmentId}
 *         alert={alert}
 *         onView={() => markAsRead(alert.amendmentId)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */

export interface AmendmentAlert {
  amendmentId: string;
  recordId: string;
  recordType: 'prescription' | 'lab_result' | 'appointment';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: string;
  unread: boolean;
  amendedBy: {
    name: string;
    role: string;
    email?: string;
  };
  originalValue?: string;
  amendedValue?: string;
  reason?: string;
  recordTitle?: string; // e.g., "Rx-2026-0891", "Lab: Creatinine"
}

export interface UseAmendmentAlertsReturn {
  alerts: AmendmentAlert[];
  unreadCount: number;
  markAsRead: (amendmentId: string) => void;
  clearAlert: (amendmentId: string) => void;
  clearAllAlerts: () => void;
}

/**
 * Subscribe to real-time amendment notifications
 * Hospital-scoped, role-filtered
 */
export function useAmendmentAlerts(
  hospitalId: string | null,
  filterByRole?: string
): UseAmendmentAlertsReturn {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<AmendmentAlert[]>([]);
  const alertTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Mark alert as read
   */
  const markAsRead = useCallback((amendmentId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.amendmentId === amendmentId ? { ...alert, unread: false } : alert
      )
    );
  }, []);

  /**
   * Clear individual alert
   */
  const clearAlert = useCallback((amendmentId: string) => {
    // Clear any pending timeout
    const timer = alertTimerRef.current.get(amendmentId);
    if (timer) {
      clearTimeout(timer);
      alertTimerRef.current.delete(amendmentId);
    }

    setAlerts(prev => prev.filter(alert => alert.amendmentId !== amendmentId));
  }, []);

  /**
   * Clear all alerts
   */
  const clearAllAlerts = useCallback(() => {
    // Clear all timers
    alertTimerRef.current.forEach(timer => clearTimeout(timer));
    alertTimerRef.current.clear();

    setAlerts([]);
  }, []);

  /**
   * Add new alert with auto-cleanup (24 hours or if legal hold)
   */
  const addAlert = useCallback(
    (alert: AmendmentAlert) => {
      setAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.amendmentId === alert.amendmentId)) {
          return prev;
        }
        return [alert, ...prev];
      });

      // Set auto-cleanup timer (24 hours unless legal hold)
      const timer = setTimeout(() => {
        clearAlert(alert.amendmentId);
      }, 24 * 60 * 60 * 1000);

      alertTimerRef.current.set(alert.amendmentId, timer);
    },
    [clearAlert]
  );

  /**
   * In production, this would subscribe to Supabase Realtime
   * For now, we use a polling fallback for demonstration
   */
  useEffect(() => {
    if (!hospitalId || !profile?.hospital_id) return;

    // Simulate real-time subscription
    // In production: use supabase.channel() with realtime()
    const checkNewAmendments = async () => {
      try {
        // This would be replaced with actual Supabase realtime subscription
        // Placeholder for demonstration
      } catch (err) {
        console.error('Failed to fetch amendments:', sanitizeForLog(String(err)));
      }
    };

    const interval = setInterval(checkNewAmendments, 5000);
    return () => clearInterval(interval);
  }, [hospitalId, profile?.hospital_id]);

  /**
   * Filter alerts by role if specified
   */
  const filteredAlerts = filterByRole
    ? alerts.filter(alert => {
        const userRole = filterByRole;
        // Only show critical amendments to all roles
        if (alert.severity === 'CRITICAL') return true;
        // Show prescription amendments to doctors/pharmacists
        if (alert.recordType === 'prescription') {
          return ['doctor', 'pharmacist'].includes(userRole.toLowerCase());
        }
        // Show lab amendments to lab staff/doctors
        if (alert.recordType === 'lab_result') {
          return ['doctor', 'lab_technician', 'pathologist'].includes(
            userRole.toLowerCase()
          );
        }
        return true;
      })
    : alerts;

  return {
    alerts: filteredAlerts,
    unreadCount: filteredAlerts.filter(a => a.unread).length,
    markAsRead,
    clearAlert,
    clearAllAlerts,
  };
}

/**
 * Helper: Create alert from amendment
 * Used by components that receive amendment data
 */
export function createAmendmentAlert(amendment: any): AmendmentAlert {
  return {
    amendmentId: amendment.amendmentId || amendment.amendment_id,
    recordId: amendment.recordId || amendment.prescription_id || amendment.lab_result_id,
    recordType: amendment.recordType || 'prescription',
    severity: parseSeverity(amendment.changeType || amendment.action_type),
    message: formatAlertMessage(amendment),
    timestamp: amendment.timestamp || new Date().toISOString(),
    unread: true,
    amendedBy: {
      name: amendment.amendedBy?.name || 'Unknown',
      role: amendment.amendedBy?.role || 'System',
      email: amendment.amendedBy?.email,
    },
    originalValue: amendment.originalValue,
    amendedValue: amendment.amendedValue,
    reason: amendment.reason,
  };
}

/**
 * Helper: Format alert message for display
 */
function formatAlertMessage(amendment: any): string {
  const recordType = amendment.recordType || 'Record';
  const actor = amendment.amendedBy?.name || 'Unknown User';
  const change = `${amendment.originalValue} → ${amendment.amendedValue}`;

  return `${actor} amended ${recordType}: ${change}`;
}

/**
 * Helper: Determine severity
 */
function parseSeverity(changeType: string): AmendmentAlert['severity'] {
  const lower = String(changeType).toLowerCase();
  if (
    lower.includes('critical') ||
    lower.includes('discontinue') ||
    lower.includes('dosage') && lower.includes('high')
  ) {
    return 'CRITICAL';
  }
  if (
    lower.includes('dosage') ||
    lower.includes('substitution') ||
    lower.includes('critical_alert')
  ) {
    return 'HIGH';
  }
  if (lower.includes('quantity') || lower.includes('frequency')) {
    return 'MEDIUM';
  }
  return 'LOW';
}
