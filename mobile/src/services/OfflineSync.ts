import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';

export class OfflineSyncManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline = true;
  
  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
  }
  
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }
  
  async cacheData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache failed:', error);
    }
  }
  
  async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached).data : null;
    } catch (error) {
      console.error('Cache read failed:', error);
      return null;
    }
  }
  
  async queueOperation(operation: SyncOperation): Promise<void> {
    this.syncQueue.push(operation);
    await this.saveSyncQueue();
    
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }
  
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    const operations = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Sync failed:', error);
        this.syncQueue.push(operation);
      }
    }
    
    await this.saveSyncQueue();
  }
  
  private async executeOperation(operation: SyncOperation): Promise<void> {
    // Execute sync operation with backend
    console.log('Syncing:', operation);
  }
  
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Queue save failed:', error);
    }
  }
  
  private async loadSyncQueue(): Promise<void> {
    try {
      const queue = await AsyncStorage.getItem('sync_queue');
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error('Queue load failed:', error);
    }
  }
}

interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data?: any;
  timestamp: number;
}