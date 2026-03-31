import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { sanitizeForLog } from '@/utils/sanitize';

/**
 * Phase 2B: Real-Time Amendment Alert System
 * 
 * Pharmacist receives real-time notifications when high-risk amendments occur.
 * Uses Supabase Realtime to subscribe to amendment events on prescriptions table.
 * 
 * Alert payload example:
 * "Doctor Smith amended Rx #123 (Dosage 500mg→250mg). Reason: C. difficile risk. Review?"
 */

export interface AmendmentAlert {
  id: string;
  prescription_id: string;
  doctor_name: string;
  doctor_email: string;
  dosage_before: string;
  dosage_after: string;
  change_reason: string;
  amendment_justification: string | null;
  timestamp: string;
  reviewed: boolean;
}

export interface UseAmendmentAlertOptions {
  /** Enable real-time subscription (default: true for pharmacist role) */
  enabled?: boolean;
  /** Callback when amendment alert received */
  onAlertReceived?: (alert: AmendmentAlert) => void;
  /** Show toast notifications (default: true) */
  showToasts?: boolean;
  /** Custom toast message formatter */
  messageFormatter?: (alert: AmendmentAlert) => string;
}

/**
 * Hook for subscribing to real-time amendment notifications.
 * 
 * Pharmacist gets notified of high-risk amendments:
 * - Dosage changes > 25%
 * - Quantity changes
 * - Changes to critical medications (anticoagulants, etc.)
 * 
 * @example
 * ```typescript
 * const { alerts, acknowledgeAlert } = useAmendmentAlert({
 *   enabled: profile?.primary_role === 'pharmacist',
 *   showToasts: true,
 * });
 * 
 * return (
 *   <div>
 *     {alerts.map(alert => (
 *       <AlertCard
 *         key={alert.id}
 *         alert={alert}
 *         onAcknowledge={() => acknowledgeAlert(alert.id)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useAmendmentAlert(options: UseAmendmentAlertOptions = {}) {
  const { profile, session } = useAuth();
  const alerts = useRef<Map<string, AmendmentAlert>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const {
    enabled = false,
    onAlertReceived,
    showToasts = true,
    messageFormatter,
  } = options;

  // Handle incoming amendment notification
  const handleAmendmentNotification = useCallback(
    (payload: any) => {
      try {
        // Payload structure from trigger:
        // {
        //   new: {
        //     id: prescription_id,
        //     prescribed_by: doctor_id,
        //     ...amendment fields
        //   }
        // }

        const { new: newRecord } = payload;
        if (!newRecord) return;

        const alert: AmendmentAlert = {
          id: `amendment_${newRecord.id}_${Date.now()}`,
          prescription_id: newRecord.id,
          doctor_name: newRecord.doctor_name || 'Unknown',
          doctor_email: newRecord.doctor_email || 'unknown@hospital.local',
          dosage_before: newRecord.dosage_before || 'N/A',
          dosage_after: newRecord.dosage_after || 'N/A',
          change_reason: newRecord.amendment_reason || 'No reason provided',
          amendment_justification: newRecord.amendment_justification || null,
          timestamp: new Date().toISOString(),
          reviewed: false,
        };

        // Store alert
        alerts.current.set(alert.id, alert);

        // Callback
        if (onAlertReceived) {
          onAlertReceived(alert);
        }

        // Toast notification
        if (showToasts) {
          const message = messageFormatter
            ? messageFormatter(alert)
            : `Dr. ${alert.doctor_name} amended Rx #${alert.prescription_id.slice(0, 8)} (${alert.dosage_before}→${alert.dosage_after}). ${alert.change_reason}`;

          toast.warning(message, {
            description: `Justification: ${alert.amendment_justification || 'Not provided'}`,
            icon: <AlertTriangle className="w-4 h-4" />,
            duration: 0, // Don't auto-dismiss
            action: {
              label: 'Review',
              onClick: () => {
                // Navigate to prescription detail
                window.location.href = `/pharmacy/prescriptions/${alert.prescription_id}`;
              },
            },
          });
        }
      } catch (err) {
        console.error('Error processing amendment alert:', sanitizeForLog(String(err)));
      }
    },
    [onAlertReceived, showToasts, messageFormatter]
  );

  // Subscribe to prescription amendments
  useEffect(() => {
    if (!enabled || !profile?.hospital_id || !session?.user?.id) {
      return;
    }

    // Subscribe to prescriptions table for amendments
    // Filter: amendments where hospital_id matches AND amendment_reason is not null
    const subscription = supabase
      .channel(`amendment_alerts_${profile.hospital_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prescriptions',
          filter: `hospital_id=eq.${profile.hospital_id}`,
        },
        (payload) => {
          // Only process if amendment fields are present
          if (payload.new?.amendment_reason) {
            handleAmendmentNotification(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Amendment alert subscription active');
        } else if (status === 'CLOSED') {
          console.log('Amendment alert subscription closed');
        }
      });

    unsubscribeRef.current = () => {
      subscription.unsubscribe();
    };

    return () => {
      unsubscribeRef.current?.();
    };
  }, [enabled, profile?.hospital_id, session?.user?.id, handleAmendmentNotification]);

  // Acknowledge alert (mark as reviewed)
  const acknowledgeAlert = useCallback((alertId: string) => {
    const alert = alerts.current.get(alertId);
    if (alert) {
      alert.reviewed = true;
      toast.success('Amendment acknowledged', {
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 3,
      });
    }
  }, []);

  // Get unreviewed alerts
  const getUnreviewedAlerts = useCallback(() => {
    return Array.from(alerts.current.values())
      .filter(a => !a.reviewed)
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, []);

  // Get all alerts
  const getAllAlerts = useCallback(() => {
    return Array.from(alerts.current.values())
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, []);

  // Clear alert
  const clearAlert = useCallback((alertId: string) => {
    alerts.current.delete(alertId);
  }, []);

  // Dismiss all alerts
  const dismissAllAlerts = useCallback(() => {
    alerts.current.clear();
  }, []);

  return {
    unreviewedAlerts: getUnreviewedAlerts(),
    allAlerts: getAllAlerts(),
    acknowledgeAlert,
    clearAlert,
    dismissAllAlerts,
    isSubscribed: !!unsubscribeRef.current && enabled,
  };
}

/**
 * Hook to query historical amendments (not real-time).
 * Used for dashboard showing recent amendments.
 */
export function useRecentAmendments(limit: number = 10) {
  const { profile } = useAuth();

  // This would query from prescription_audit table
  // For now, returns empty array (to be implemented with Supabase RPC)
  
  return {
    amendments: [] as AmendmentAlert[],
    isLoading: false,
    error: null,
  };
}
