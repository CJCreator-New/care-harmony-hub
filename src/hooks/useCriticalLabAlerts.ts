/**
 * Backward compatibility facade for `useCriticalLabAlerts`.
 *
 * CareSync HIMS: Deep Module Facade
 * Delegates directly to the canonical deep module `@/modules/critical-lab-escalation`.
 */

import { useCriticalLabEscalation, type LabCriticalAlert } from '@/modules/critical-lab-escalation';

export type CriticalLabAlert = LabCriticalAlert;

export function useCriticalLabAlerts() {
  const { alerts, isLoading, unacknowledgedCount, acknowledgeAlert, resolveAlert, refresh } =
    useCriticalLabEscalation();

  return {
    alerts,
    isLoading,
    unresolved: unacknowledgedCount,
    acknowledgeAlert: async (alertId: string, notes?: string) => {
      await acknowledgeAlert(alertId, notes);
    },
    resolveAlert: async (alertId: string, notes: string) => {
      await resolveAlert(alertId, notes);
    },
    refreshAlerts: refresh,
  };
}
