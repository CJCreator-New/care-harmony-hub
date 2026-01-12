import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState<OfflineData[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadPendingData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingData = useCallback(() => {
    const stored = localStorage.getItem('offline_pending');
    if (stored) {
      setPendingSync(JSON.parse(stored));
    }
  }, []);

  const saveOffline = useCallback((type: string, data: any) => {
    const offlineData: OfflineData = {
      id: `${type}_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    const updated = [...pendingSync, offlineData];
    setPendingSync(updated);
    localStorage.setItem('offline_pending', JSON.stringify(updated));

    return offlineData.id;
  }, [pendingSync]);

  const syncData = useCallback(async () => {
    if (!isOnline || pendingSync.length === 0) return;

    const toSync = pendingSync.filter(item => !item.synced);
    
    for (const item of toSync) {
      try {
        // Sync logic would go here based on item.type
        item.synced = true;
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
      }
    }

    const updated = pendingSync.map(item => 
      toSync.find(s => s.id === item.id) || item
    );
    
    setPendingSync(updated);
    localStorage.setItem('offline_pending', JSON.stringify(updated));
    
    queryClient.invalidateQueries();
  }, [isOnline, pendingSync, queryClient]);

  const clearSynced = useCallback(() => {
    const unsynced = pendingSync.filter(item => !item.synced);
    setPendingSync(unsynced);
    localStorage.setItem('offline_pending', JSON.stringify(unsynced));
  }, [pendingSync]);

  useEffect(() => {
    if (isOnline) {
      syncData();
    }
  }, [isOnline, syncData]);

  return {
    isOnline,
    pendingSync: pendingSync.filter(item => !item.synced),
    saveOffline,
    syncData,
    clearSynced,
  };
}
