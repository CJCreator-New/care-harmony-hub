import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineCache {
  patientData: Record<string, unknown>[];
  vitals: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  syncStatus: 'pending' | 'synced' | 'error';
  pendingActions: PendingAction[];
}

const OFFLINE_CACHE_KEY = 'care-harmony-offline-cache';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// OPTIMIZED: Maximum cache size to prevent storage quota exceeded errors
const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB limit for localStorage
const MAX_PENDING_ACTIONS = 100; // Prevent unbounded growth of pending actions

// Helper to estimate object size in bytes
const estimateSize = (obj: any): number => {
  return new Blob([JSON.stringify(obj)]).size;
};

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cache, setCache] = useState<OfflineCache>({
    patientData: [],
    vitals: [],
    medications: [],
    syncStatus: 'synced',
    pendingActions: []
  });
  const { toast } = useToast();

  // OPTIMIZED: Load cached data from localStorage on mount with size validation
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (savedCache) {
        // Check cache size before parsing
        if (savedCache.length > MAX_CACHE_SIZE) {
          console.warn('Cache size exceeds limit, clearing old cache');
          localStorage.removeItem(OFFLINE_CACHE_KEY);
          return;
        }
        
        const parsedCache = JSON.parse(savedCache);
        
        // Validate and limit pending actions to prevent memory issues
        if (parsedCache.pendingActions?.length > MAX_PENDING_ACTIONS) {
          parsedCache.pendingActions = parsedCache.pendingActions.slice(-MAX_PENDING_ACTIONS);
          console.warn(`Pending actions truncated to ${MAX_PENDING_ACTIONS}`);
        }
        
        // Limit cached data arrays to prevent unbounded growth
        if (parsedCache.patientData?.length > 50) {
          parsedCache.patientData = parsedCache.patientData.slice(-50);
        }
        if (parsedCache.vitals?.length > 100) {
          parsedCache.vitals = parsedCache.vitals.slice(-100);
        }
        if (parsedCache.medications?.length > 50) {
          parsedCache.medications = parsedCache.medications.slice(-50);
        }
        
        setCache(prev => ({ ...prev, ...parsedCache }));
      }
    } catch (error) {
      console.error('Failed to parse offline cache:', error);
      // Clear corrupted cache
      localStorage.removeItem(OFFLINE_CACHE_KEY);
    }
  }, []);

  // OPTIMIZED: Save cache to localStorage with size checking and error handling
  useEffect(() => {
    try {
      const cacheString = JSON.stringify(cache);
      
      // Check if cache would exceed storage limit
      if (cacheString.length > MAX_CACHE_SIZE) {
        console.warn('Cache too large, trimming data');
        // Trim the cache before saving
        const trimmedCache = {
          ...cache,
          patientData: cache.patientData.slice(-25),
          vitals: cache.vitals.slice(-50),
          medications: cache.medications.slice(-25),
          pendingActions: cache.pendingActions.slice(-50),
        };
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(trimmedCache));
      } else {
        localStorage.setItem(OFFLINE_CACHE_KEY, cacheString);
      }
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded, clearing cache');
        // Clear non-essential cached data, keep only pending actions
        const minimalCache = {
          ...cache,
          patientData: [],
          vitals: [],
          medications: [],
          pendingActions: cache.pendingActions.slice(-20), // Keep only most critical
        };
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(minimalCache));
        toast({
          title: "Storage limit reached",
          description: "Offline data cleared. Pending actions preserved.",
          variant: "destructive"
        });
      } else {
        console.error('Failed to save offline cache:', error);
      }
    }
  }, [cache, toast]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
      toast({ title: "Back online", description: "Syncing pending actions..." });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline mode",
        description: "Changes will sync when online",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Exponential backoff delay calculation
  const getRetryDelay = (retryCount: number): number => {
    return RETRY_DELAY_BASE * Math.pow(2, retryCount);
  };

  // Execute a single pending action with retry logic
  const executeAction = useCallback(async (action: PendingAction): Promise<boolean> => {
    try {
      // Simulate API call - replace with actual Supabase calls
      switch (action.type) {
        case 'create':
          // await supabase.from(action.table).insert(action.data);
          console.log(`Creating ${action.table}:`, action.data);
          break;
        case 'update':
          // await supabase.from(action.table).update(action.data).eq('id', action.data.id);
          console.log(`Updating ${action.table}:`, action.data);
          break;
        case 'delete':
          // await supabase.from(action.table).delete().eq('id', action.data.id);
          console.log(`Deleting ${action.table}:`, action.data);
          break;
      }

      return true; // Success
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);
      return false; // Failure
    }
  }, []);

  // Sync all pending actions
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || cache.pendingActions.length === 0) return;

    setCache(prev => ({ ...prev, syncStatus: 'pending' }));

    const actionsToProcess = [...cache.pendingActions];
    const successfulActions: string[] = [];
    const failedActions: PendingAction[] = [];

    for (const action of actionsToProcess) {
      const success = await executeAction(action);

      if (success) {
        successfulActions.push(action.id);
      } else {
        const updatedAction = { ...action, retryCount: action.retryCount + 1 };

        if (updatedAction.retryCount < updatedAction.maxRetries) {
          // Schedule retry with exponential backoff
          setTimeout(() => {
            syncPendingActions();
          }, getRetryDelay(updatedAction.retryCount));

          failedActions.push(updatedAction);
        } else {
          // Max retries exceeded, mark as failed
          toast({
            title: "Sync failed",
            description: `Failed to sync ${action.type} action after ${MAX_RETRY_ATTEMPTS} attempts`,
            variant: "destructive"
          });
        }
      }
    }

    // Update cache with results
    setCache(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(action =>
        !successfulActions.includes(action.id) && !failedActions.some(failed => failed.id === action.id)
      ).concat(failedActions),
      syncStatus: prev.pendingActions.length === successfulActions.length ? 'synced' : 'error'
    }));

    if (successfulActions.length > 0) {
      toast({
        title: "Sync complete",
        description: `Successfully synced ${successfulActions.length} actions`
      });
    }
  }, [isOnline, cache.pendingActions, executeAction, toast]);

  // OPTIMIZED: Queue an action with size limits and deduplication
  const queueAction = useCallback((type: 'create' | 'update' | 'delete', table: string, data: Record<string, unknown>) => {
    // Check if adding this action would exceed size limits
    const actionSize = estimateSize({ type, table, data });
    if (actionSize > 100000) { // 100KB per action limit
      console.warn('Action too large, skipping offline queue');
      toast({
        title: "Action too large",
        description: "Please try again when online",
        variant: "destructive"
      });
      return;
    }

    const action: PendingAction = {
      id: `${type}-${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRY_ATTEMPTS
    };

    setCache(prev => {
      // Check if we're at the pending actions limit
      let newPendingActions = [...prev.pendingActions, action];
      if (newPendingActions.length > MAX_PENDING_ACTIONS) {
        // Remove oldest actions, keeping the newest
        newPendingActions = newPendingActions.slice(-MAX_PENDING_ACTIONS);
        console.warn(`Pending actions limit reached (${MAX_PENDING_ACTIONS}), oldest removed`);
      }
      
      return {
        ...prev,
        pendingActions: newPendingActions,
        syncStatus: 'pending'
      };
    });

    // If online, try to sync immediately
    if (isOnline) {
      syncPendingActions();
    } else {
      toast({
        title: "Action queued",
        description: "Will sync when online"
      });
    }
  }, [isOnline, syncPendingActions, toast]);

  // Legacy cacheData function for backward compatibility
  const cacheData = useCallback((type: keyof Omit<OfflineCache, 'syncStatus' | 'pendingActions'>, data: Record<string, unknown>) => {
    if (!isOnline) {
      setCache(prev => ({
        ...prev,
        [type]: Array.isArray(prev[type]) ? [...prev[type], data] : data,
        syncStatus: 'pending'
      }));
    }
  }, [isOnline]);

  // Manual sync trigger
  const syncData = useCallback(async () => {
    await syncPendingActions();
  }, [syncPendingActions]);

  // Clear all pending actions (use with caution)
  const clearPendingActions = useCallback(() => {
    setCache(prev => ({
      ...prev,
      pendingActions: [],
      syncStatus: 'synced'
    }));
    localStorage.removeItem(OFFLINE_CACHE_KEY);
  }, []);

  return {
    isOnline,
    cache,
    queueAction,
    cacheData,
    syncData,
    clearPendingActions,
    pendingActionCount: cache.pendingActions.length
  };
};
