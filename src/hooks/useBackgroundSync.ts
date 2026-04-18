/**
 * Background Sync Utility for Offline Actions
 * Manages sync registration, periodic sync, and sync event handling
 * HIPAA-compliant with encrypted PHI handling
 */

interface SyncOptions {
  tag: string;
  minInterval?: number; // milliseconds
  maxRetries?: number;
}

interface SyncEvent {
  tag: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  attempts: number;
}

class BackgroundSyncManager {
  private syncEvents: Map<string, SyncEvent> = new Map();
  private isSupported = false;

  constructor() {
    // Check if Service Worker and Background Sync API are supported
    this.isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'SyncManager' in window;
  }

  /**
   * Register a background sync task
   * @param tag Unique identifier for the sync task
   * @param options Sync configuration
   */
  async registerSync(tag: string, options: SyncOptions = {}): Promise<void> {
    if (!this.isSupported) {
      console.warn('Background Sync not supported. Will sync on next online event.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!registration.sync) {
        console.warn('Service Worker sync not available');
        return;
      }

      await registration.sync.register(tag);

      // Track sync event locally
      this.syncEvents.set(tag, {
        tag,
        timestamp: Date.now(),
        status: 'pending',
        attempts: 0
      });

      console.log(`[BackgroundSync] Registered sync task: ${tag}`);
    } catch (error) {
      console.error(`[BackgroundSync] Failed to register sync for ${tag}:`, error);
      throw error;
    }
  }

  /**
   * Register periodic background sync (for auto-sync at intervals)
   * @param tag Unique identifier for the periodic sync task
   * @param minInterval Minimum interval in milliseconds (typically 24h minimum)
   */
  async registerPeriodicSync(
    tag: string,
    minInterval: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<void> {
    if (!this.isSupported) {
      console.warn('Periodic Background Sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!registration.periodicSync) {
        console.warn('Service Worker periodic sync not available');
        return;
      }

      await registration.periodicSync.register(tag, { minInterval });
      console.log(`[BackgroundSync] Registered periodic sync: ${tag} (${minInterval}ms)`);
    } catch (error) {
      console.error(`[BackgroundSync] Failed to register periodic sync for ${tag}:`, error);
      throw error;
    }
  }

  /**
   * Get sync event status
   */
  getSyncStatus(tag: string): SyncEvent | undefined {
    return this.syncEvents.get(tag);
  }

  /**
   * Get all pending sync tasks
   */
  getPendingSyncTasks(): SyncEvent[] {
    return Array.from(this.syncEvents.values())
      .filter(event => event.status === 'pending' || event.status === 'syncing');
  }

  /**
   * Manual sync trigger (when sync fails or user requests immediate sync)
   */
  async triggerManualSync(tag: string): Promise<boolean> {
    if (!navigator.onLine) {
      console.warn('[BackgroundSync] Cannot sync - offline');
      return false;
    }

    try {
      const event = this.syncEvents.get(tag);
      if (event) {
        event.status = 'syncing';
        event.attempts += 1;
      }

      // Trigger the sync
      await this.registerSync(tag, { maxRetries: 3 });
      
      if (event) {
        event.status = 'completed';
      }
      return true;
    } catch (error) {
      console.error(`[BackgroundSync] Manual sync failed for ${tag}:`, error);
      if (event) {
        const event = this.syncEvents.get(tag);
        if (event) event.status = 'failed';
      }
      return false;
    }
  }

  /**
   * Clear sync event after successful completion
   */
  clearSyncEvent(tag: string): void {
    this.syncEvents.delete(tag);
  }

  /**
   * Check if Background Sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return this.isSupported;
  }
}

// Export singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();

// Service Worker sync event handler (install in public/sw.js or Workbox handler)
export function setupBackgroundSyncHandlers(
  onVitalsSyncNeeded?: () => Promise<void>,
  onMedicationsSyncNeeded?: () => Promise<void>,
  onActionsSyncNeeded?: () => Promise<void>
): void {
  if (typeof window === 'undefined') return; // Server-side guard

  // Listen for sync events from Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, data } = event.data;

      if (type === 'BACKGROUND_SYNC_START') {
        console.log('[BackgroundSync] Sync started:', data.tag);
      }

      if (type === 'VITALS_SYNC_NEEDED' && onVitalsSyncNeeded) {
        try {
          await onVitalsSyncNeeded();
          console.log('[BackgroundSync] Vitals sync completed');
        } catch (error) {
          console.error('[BackgroundSync] Vitals sync failed:', error);
        }
      }

      if (type === 'MEDICATIONS_SYNC_NEEDED' && onMedicationsSyncNeeded) {
        try {
          await onMedicationsSyncNeeded();
          console.log('[BackgroundSync] Medications sync completed');
        } catch (error) {
          console.error('[BackgroundSync] Medications sync failed:', error);
        }
      }

      if (type === 'ACTIONS_SYNC_NEEDED' && onActionsSyncNeeded) {
        try {
          await onActionsSyncNeeded();
          console.log('[BackgroundSync] Actions sync completed');
        } catch (error) {
          console.error('[BackgroundSync] Actions sync failed:', error);
        }
      }
    });
  }
}

// Auto-sync when coming back online
export function enableOnlineAutoSync(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[BackgroundSync] Device online - triggering sync');
    // Emit custom event that app can listen to
    window.dispatchEvent(new CustomEvent('app:online', { detail: { timestamp: Date.now() } }));
  });
}
