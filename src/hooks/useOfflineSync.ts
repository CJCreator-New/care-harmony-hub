import { useState, useEffect } from 'react';

interface OfflineState {
  isOnline: boolean;
  pendingOperations: Array<{
    id: string;
    operation: string;
    data: any;
    timestamp: number;
  }>;
}

export function useOfflineSync() {
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingOperations: []
  });

  useEffect(() => {
    const handleOnline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      // Sync pending operations when back online
      syncPendingOperations();
    };

    const handleOffline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingOperation = (operation: string, data: any) => {
    const id = crypto.randomUUID();
    setOfflineState(prev => ({
      ...prev,
      pendingOperations: [...prev.pendingOperations, {
        id,
        operation,
        data,
        timestamp: Date.now()
      }]
    }));
    
    // Store in localStorage for persistence
    localStorage.setItem('pendingOperations', JSON.stringify(offlineState.pendingOperations));
    return id;
  };

  const syncPendingOperations = async () => {
    // Implementation would sync with server
    console.log('Syncing pending operations...');
    // Clear operations after successful sync
    setOfflineState(prev => ({ ...prev, pendingOperations: [] }));
    localStorage.removeItem('pendingOperations');
  };

  return {
    isOnline: offlineState.isOnline,
    pendingOperations: offlineState.pendingOperations,
    addPendingOperation
  };
}