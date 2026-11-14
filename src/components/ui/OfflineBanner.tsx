import { WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

/**
 * ADR-0013: visible offline state for ward staff. Bedside documentation keeps
 * working; critical actions fail closed until the connection returns.
 */
export function OfflineBanner() {
  const { isOnline, pendingActionCount } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">
          Offline mode
          {pendingActionCount > 0 && ` — ${pendingActionCount} change(s) queued on this device`}
        </p>
        <p>
          Bedside vitals and nursing notes are saved locally and sync when the connection returns.
          Medication dispensing, discharge release, and billing finalization require a network
          connection for critical clinical safety validation.
        </p>
      </div>
    </div>
  );
}
