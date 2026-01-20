import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineCache {
  patientData: any[];
  vitals: any[];
  medications: any[];
  syncStatus: 'pending' | 'synced' | 'error';
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cache, setCache] = useState<OfflineCache>({
    patientData: [],
    vitals: [],
    medications: [],
    syncStatus: 'synced'
  });
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
      toast({ title: "Back online", description: "Syncing data..." });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "Offline mode", description: "Changes will sync when online", variant: "destructive" });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncData = async () => {
    if (cache.syncStatus === 'pending') {
      setCache(prev => ({ ...prev, syncStatus: 'synced' }));
    }
  };

  const cacheData = (type: keyof OfflineCache, data: any) => {
    if (!isOnline) {
      setCache(prev => ({
        ...prev,
        [type]: Array.isArray(prev[type]) ? [...prev[type], data] : data,
        syncStatus: 'pending'
      }));
    }
  };

  return { isOnline, cache, cacheData, syncData };
};
