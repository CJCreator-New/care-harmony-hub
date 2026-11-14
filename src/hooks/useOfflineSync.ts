import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { devLog } from '@/utils/sanitize';
import {
  getOfflineSyncStore,
  isOfflineReplayAllowed,
  MAX_RETRY_ATTEMPTS,
  normalizeOfflineTable,
  type ActionExecutor,
  type OfflineCacheKind,
  type OfflineEvent,
  type PendingAction,
  type SyncStatus,
} from '@/modules/offline-store';
import { supabase } from '@/integrations/supabase/client';

/**
 * SECF-06: offline caches and the pending-write queue live in an encrypted,
 * session-scoped IndexedDB store (`@/modules/offline-store`), never in
 * localStorage. All hook instances share one store.
 */

export type { PendingAction };

export interface OfflineCache {
  patientData: Record<string, unknown>[];
  vitals: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  syncStatus: SyncStatus;
  pendingActions: PendingAction[];
}

interface ReplayResult {
  error: { message?: string } | null;
}

interface ReplayQuery {
  insert(data: Record<string, unknown>): PromiseLike<ReplayResult>;
  update(data: Record<string, unknown>): {
    eq(column: string, value: string): PromiseLike<ReplayResult>;
  };
  delete(): { eq(column: string, value: string): PromiseLike<ReplayResult> };
}

const replayClient = supabase as unknown as { from(table: string): ReplayQuery };

/**
 * Replays a queued bedside write against Supabase (ADR-0013). Only the
 * whitelisted low-risk tables are replayed; anything else fails closed and
 * stays in the encrypted queue. Payloads are never logged.
 */
const replayAction: ActionExecutor = async (action) => {
  const table = normalizeOfflineTable(action.table);
  if (!isOfflineReplayAllowed(table)) {
    devLog(`[offline-sync] refused replay for non-whitelisted table (${action.id})`);
    return false;
  }

  const recordId = typeof action.data.id === 'string' ? action.data.id : null;
  const payload = { ...action.data };
  if (recordId) delete payload.id;

  try {
    let result: ReplayResult;
    if (action.type === 'create') {
      result = await replayClient.from(table).insert(action.data);
    } else if (action.type === 'update') {
      if (!recordId) return false;
      result = await replayClient.from(table).update(payload).eq('id', recordId);
    } else {
      if (!recordId) return false;
      result = await replayClient.from(table).delete().eq('id', recordId);
    }

    if (result.error) {
      devLog(`[offline-sync] replay failed for ${action.type} (${action.id})`);
      return false;
    }
    return true;
  } catch {
    devLog(`[offline-sync] replay threw for ${action.type} (${action.id})`);
    return false;
  }
};

const store = getOfflineSyncStore(replayAction);

const notify = (event: OfflineEvent) => {
  switch (event.type) {
    case 'online':
      toast({ title: 'Back online', description: 'Syncing pending actions...' });
      break;
    case 'offline':
      toast({
        title: 'Offline mode',
        description: 'Changes will sync when online',
        variant: 'destructive',
      });
      break;
    case 'queued':
      toast({ title: 'Action queued', description: 'Will sync when online' });
      break;
    case 'action-too-large':
      toast({
        title: 'Action too large',
        description: 'Please try again when online',
        variant: 'destructive',
      });
      break;
    case 'synced':
      toast({ title: 'Sync complete', description: `Successfully synced ${event.count} actions` });
      break;
    case 'action-failed':
      toast({
        title: 'Sync failed',
        description: `Failed to sync ${event.action.type} action after ${MAX_RETRY_ATTEMPTS} attempts`,
        variant: 'destructive',
      });
      break;
    case 'persist-error':
      console.error('[offline-sync] encrypted offline storage failed');
      break;
  }
};
store.onEvent(notify);

export const useOfflineSync = () => {
  const { user } = useAuth();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null>(null);

  // Open the encrypted store for the signed-in user; wipe on sign-out.
  useEffect(() => {
    if (userId) {
      store.open(userId).catch(() => notify({ type: 'persist-error', error: null }));
    } else if (previousUserId.current) {
      void store.wipe().catch(() => undefined);
    }
    previousUserId.current = userId;
  }, [userId]);

  const queueAction = useCallback(
    (type: 'create' | 'update' | 'delete', table: string, data: Record<string, unknown>) => {
      store.queueAction(type, table, data);
    },
    []
  );

  // Legacy API: cache read-side data only while offline (unchanged behaviour).
  const cacheData = useCallback((type: OfflineCacheKind, data: Record<string, unknown>) => {
    if (!store.getSnapshot().isOnline) store.cacheData(type, data);
  }, []);

  const syncData = useCallback(() => store.sync(), []);

  const clearPendingActions = useCallback(() => {
    void store.clearPendingActions();
  }, []);

  const cache: OfflineCache = {
    patientData: snapshot.patientData,
    vitals: snapshot.vitals,
    medications: snapshot.medications,
    syncStatus: snapshot.syncStatus,
    pendingActions: snapshot.pendingActions,
  };

  return {
    isOnline: snapshot.isOnline,
    cache,
    queueAction,
    cacheData,
    syncData,
    clearPendingActions,
    pendingActionCount: snapshot.pendingActions.length,
  };
};
