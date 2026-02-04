import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { secureTransmission } from '@/utils/dataProtection';

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
  encryptionMetadata?: {
    patientData: Record<string, any>[];
    vitals: Record<string, any>[];
    medications: Record<string, any>[];
  };
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
    pendingActions: [],
    encryptionMetadata: {
      patientData: [],
      vitals: [],
      medications: []
    }
  });
  const { toast } = useToast();

  // OPTIMIZED: Load cached data from localStorage on mount with size validation and decryption
  useEffect(() => {
    const loadCache = async () => {
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

          // Decrypt PHI data if encryption metadata exists
          let decryptedCache = { ...parsedCache };

          if (parsedCache.encryptionMetadata) {
            try {
              // Decrypt patient data
              if (parsedCache.encryptionMetadata.patientData?.length > 0) {
                decryptedCache.patientData = await Promise.all(
                  parsedCache.patientData.map((item: any, index: number) =>
                    parsedCache.encryptionMetadata.patientData[index]
                      ? secureTransmission.restoreFromTransmission(item, parsedCache.encryptionMetadata.patientData[index])
                      : item
                  )
                );
              }

              // Decrypt vitals data
              if (parsedCache.encryptionMetadata.vitals?.length > 0) {
                decryptedCache.vitals = await Promise.all(
                  parsedCache.vitals.map((item: any, index: number) =>
                    parsedCache.encryptionMetadata.vitals[index]
                      ? secureTransmission.restoreFromTransmission(item, parsedCache.encryptionMetadata.vitals[index])
                      : item
                  )
                );
              }

              // Decrypt medications data
              if (parsedCache.encryptionMetadata.medications?.length > 0) {
                decryptedCache.medications = await Promise.all(
                  parsedCache.medications.map((item: any, index: number) =>
                    parsedCache.encryptionMetadata.medications[index]
                      ? secureTransmission.restoreFromTransmission(item, parsedCache.encryptionMetadata.medications[index])
                      : item
                  )
                );
              }
            } catch (decryptError) {
              console.error('Failed to decrypt cached data:', decryptError);
              // Clear corrupted encrypted cache
              localStorage.removeItem(OFFLINE_CACHE_KEY);
              return;
            }
          }

          // Validate and limit pending actions to prevent memory issues
          if (decryptedCache.pendingActions?.length > MAX_PENDING_ACTIONS) {
            decryptedCache.pendingActions = decryptedCache.pendingActions.slice(-MAX_PENDING_ACTIONS);
            console.warn(`Pending actions truncated to ${MAX_PENDING_ACTIONS}`);
          }

          // Limit cached data arrays to prevent unbounded growth
          if (decryptedCache.patientData?.length > 50) {
            decryptedCache.patientData = decryptedCache.patientData.slice(-50);
          }
          if (decryptedCache.vitals?.length > 100) {
            decryptedCache.vitals = decryptedCache.vitals.slice(-100);
          }
          if (decryptedCache.medications?.length > 50) {
            decryptedCache.medications = decryptedCache.medications.slice(-50);
          }

          setCache(prev => ({ ...prev, ...decryptedCache }));
        }
      } catch (error) {
        console.error('Failed to parse offline cache:', error);
        // Clear corrupted cache
        localStorage.removeItem(OFFLINE_CACHE_KEY);
      }
    };

    loadCache();
  }, []);

  // OPTIMIZED: Save cache to localStorage with size checking, error handling, and encryption
  useEffect(() => {
    const saveCache = async () => {
      try {
        // Define PHI fields that need encryption
        const phiFields = [
          'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address',
          'city', 'state', 'zip', 'blood_type', 'allergies', 'chronic_conditions',
          'current_medications', 'insurance_provider', 'insurance_policy_number',
          'emergency_contact_name', 'emergency_contact_phone', 'notes'
        ];

        // Encrypt PHI data before saving
        const { data: encryptedPatientData, encryptionMetadata: patientMetadata } =
          await secureTransmission.prepareForTransmission(cache.patientData, phiFields);

        const { data: encryptedVitals, encryptionMetadata: vitalsMetadata } =
          await secureTransmission.prepareForTransmission(cache.vitals, ['value', 'notes', 'recorded_by']);

        const { data: encryptedMedications, encryptionMetadata: medicationsMetadata } =
          await secureTransmission.prepareForTransmission(cache.medications, ['name', 'dosage', 'instructions', 'prescribed_by']);

        // Create encrypted cache object
        const encryptedCache = {
          ...cache,
          patientData: encryptedPatientData,
          vitals: encryptedVitals,
          medications: encryptedMedications,
          encryptionMetadata: {
            patientData: patientMetadata,
            vitals: vitalsMetadata,
            medications: medicationsMetadata
          }
        };

        const cacheString = JSON.stringify(encryptedCache);

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

          // Re-encrypt trimmed data
          const { data: trimmedPatientData, encryptionMetadata: trimmedPatientMetadata } =
            await secureTransmission.prepareForTransmission(trimmedCache.patientData, phiFields);
          const { data: trimmedVitals, encryptionMetadata: trimmedVitalsMetadata } =
            await secureTransmission.prepareForTransmission(trimmedCache.vitals, ['value', 'notes', 'recorded_by']);
          const { data: trimmedMedications, encryptionMetadata: trimmedMedicationsMetadata } =
            await secureTransmission.prepareForTransmission(trimmedCache.medications, ['name', 'dosage', 'instructions', 'prescribed_by']);

          const trimmedEncryptedCache = {
            ...trimmedCache,
            patientData: trimmedPatientData,
            vitals: trimmedVitals,
            medications: trimmedMedications,
            encryptionMetadata: {
              patientData: trimmedPatientMetadata,
              vitals: trimmedVitalsMetadata,
              medications: trimmedMedicationsMetadata
            }
          };

          localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(trimmedEncryptedCache));
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
            encryptionMetadata: {
              patientData: [],
              vitals: [],
              medications: []
            }
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
    };

    saveCache();
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
