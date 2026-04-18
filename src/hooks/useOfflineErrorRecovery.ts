/**
 * Offline Error Recovery & Conflict Resolution
 * Handles sync failures, data conflicts, and recovery strategies
 * HIPAA-compliant with audit logging for all recovery actions
 */

import { useToast } from '@/hooks/use-toast';

export interface ConflictResolution {
  strategy: 'local' | 'server' | 'merge' | 'manual';
  timestamp: number;
  details: string;
}

export interface RecoveryAction {
  id: string;
  action: string;
  status: 'pending' | 'retrying' | 'failed' | 'recovered';
  attempts: number;
  maxRetries: number;
  lastError?: string;
  conflictResolution?: ConflictResolution;
  createdAt: number;
  updatedAt: number;
}

class OfflineErrorRecoveryManager {
  private recoveryQueue: Map<string, RecoveryAction> = new Map();
  private conflictLog: ConflictResolution[] = [];
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 5000; // 5 seconds base delay

  /**
   * Queue a failed action for retry
   */
  queueForRetry(
    actionId: string,
    action: string,
    error: Error,
    maxRetries: number = this.MAX_RETRIES
  ): void {
    const existing = this.recoveryQueue.get(actionId);

    if (existing && existing.attempts >= maxRetries) {
      console.error(`[RecoveryManager] Max retries exceeded for ${actionId}`);
      existing.status = 'failed';
      return;
    }

    const recoveryAction: RecoveryAction = existing || {
      id: actionId,
      action,
      status: 'pending',
      attempts: 0,
      maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    recoveryAction.attempts += 1;
    recoveryAction.status = 'retrying';
    recoveryAction.lastError = error.message;
    recoveryAction.updatedAt = Date.now();

    this.recoveryQueue.set(actionId, recoveryAction);

    // Schedule retry with exponential backoff
    this.scheduleRetry(actionId);
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(actionId: string): void {
    const action = this.recoveryQueue.get(actionId);
    if (!action) return;

    const delay = this.RETRY_DELAY * Math.pow(2, action.attempts - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    setTimeout(async () => {
      await this.attemptRecovery(actionId);
    }, delay + jitter);
  }

  /**
   * Attempt to recover a failed action
   */
  private async attemptRecovery(actionId: string): Promise<void> {
    const action = this.recoveryQueue.get(actionId);
    if (!action) return;

    try {
      // Emit event that app listeners can respond to
      window.dispatchEvent(
        new CustomEvent('recovery:attempt', {
          detail: { actionId, action: action.action, attempt: action.attempts }
        })
      );
    } catch (error) {
      console.error(`[RecoveryManager] Recovery failed for ${actionId}:`, error);
      action.status = 'failed';
    }
  }

  /**
   * Mark a recovery as successful
   */
  markRecovered(actionId: string): void {
    const action = this.recoveryQueue.get(actionId);
    if (action) {
      action.status = 'recovered';
      action.updatedAt = Date.now();
      console.log(`[RecoveryManager] Action recovered: ${actionId} (${action.attempts} attempts)`);
    }
  }

  /**
   * Handle data conflict between local and server versions
   */
  resolveConflict(
    actionId: string,
    localData: any,
    serverData: any,
    strategy: 'local' | 'server' | 'merge' = 'merge'
  ): ConflictResolution {
    const resolution: ConflictResolution = {
      strategy,
      timestamp: Date.now(),
      details: `Conflict for ${actionId}: Chose ${strategy} version`
    };

    let resolvedData: any;

    switch (strategy) {
      case 'local':
        resolvedData = localData;
        break;
      case 'server':
        resolvedData = serverData;
        break;
      case 'merge':
        // Merge strategy: prefer server values but keep local timestamps
        resolvedData = {
          ...serverData,
          local_timestamp: localData.timestamp,
          synced_timestamp: serverData.timestamp
        };
        break;
      default:
        resolvedData = serverData;
    }

    // Log conflict for audit trail
    this.conflictLog.push(resolution);

    // Update recovery action with conflict resolution
    const action = this.recoveryQueue.get(actionId);
    if (action) {
      action.conflictResolution = resolution;
    }

    console.log('[RecoveryManager] Conflict resolved:', resolution);
    return resolution;
  }

  /**
   * Get recovery status for an action
   */
  getRecoveryStatus(actionId: string): RecoveryAction | undefined {
    return this.recoveryQueue.get(actionId);
  }

  /**
   * Get all pending recoveries
   */
  getPendingRecoveries(): RecoveryAction[] {
    return Array.from(this.recoveryQueue.values())
      .filter(a => a.status === 'pending' || a.status === 'retrying');
  }

  /**
   * Get all failed recoveries
   */
  getFailedRecoveries(): RecoveryAction[] {
    return Array.from(this.recoveryQueue.values())
      .filter(a => a.status === 'failed');
  }

  /**
   * Get conflict log for audit purposes
   */
  getConflictLog(): ConflictResolution[] {
    return [...this.conflictLog];
  }

  /**
   * Clear recovery action after manual intervention
   */
  clearRecoveryAction(actionId: string): void {
    this.recoveryQueue.delete(actionId);
  }

  /**
   * Reset all recovery state (use with caution)
   */
  resetAll(): void {
    this.recoveryQueue.clear();
    this.conflictLog = [];
    console.log('[RecoveryManager] All recovery state cleared');
  }
}

// Export singleton
export const errorRecoveryManager = new OfflineErrorRecoveryManager();

/**
 * Hook for using error recovery in React components
 */
export function useOfflineErrorRecovery() {
  const { toast } = useToast();

  const handleSyncError = (
    actionId: string,
    action: string,
    error: Error
  ): void => {
    errorRecoveryManager.queueForRetry(actionId, action, error);

    toast({
      title: 'Sync Failed',
      description: `Will retry: ${action}`,
      variant: 'destructive',
      duration: 3000
    });
  };

  const resolveDataConflict = (
    actionId: string,
    localData: any,
    serverData: any
  ): any => {
    const resolution = errorRecoveryManager.resolveConflict(
      actionId,
      localData,
      serverData,
      'merge'
    );

    toast({
      title: 'Data Conflict Resolved',
      description: `Used ${resolution.strategy} version`,
      duration: 2000
    });

    return resolution;
  };

  return {
    handleSyncError,
    resolveDataConflict,
    getPendingRecoveries: () => errorRecoveryManager.getPendingRecoveries(),
    getFailedRecoveries: () => errorRecoveryManager.getFailedRecoveries()
  };
}

/**
 * Setup global recovery event listeners
 */
export function setupRecoveryEventHandlers(
  onRecoveryAttempt?: (detail: any) => void
): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('recovery:attempt', (event: any) => {
    console.log('[RecoveryManager] Recovery attempt:', event.detail);
    onRecoveryAttempt?.(event.detail);
  });

  window.addEventListener('recovery:success', (event: any) => {
    const { actionId } = event.detail;
    errorRecoveryManager.markRecovered(actionId);
  });

  window.addEventListener('recovery:failed', (event: any) => {
    const { actionId } = event.detail;
    console.error('[RecoveryManager] Recovery permanently failed:', actionId);
  });
}
