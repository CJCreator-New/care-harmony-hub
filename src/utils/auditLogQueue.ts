/**
 * Async Audit Log Queue
 * 
 * Batches audit logs and flushes them asynchronously to prevent
 * blocking the main thread during user interactions.
 * 
 * @module auditLogQueue
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  id: string;
  hospital_id: string;
  user_id: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: number;
}

interface AuditLogQueueConfig {
  maxBatchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class AuditLogQueue {
  private queue: AuditLogEntry[] = [];
  private flushTimer: number | null = null;
  private isFlushing = false;
  private retryCount = new Map<string, number>();
  
  private config: Required<AuditLogQueueConfig>;

  constructor(config: AuditLogQueueConfig = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 10,
      flushInterval: config.flushInterval || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000 // 1 second
    };

    // Setup periodic flush
    this.setupPeriodicFlush();
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushSync();
      });
    }
  }

  /**
   * Add an audit log entry to the queue
   */
  add(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.queue.push(fullEntry);

    // Flush immediately if batch size reached
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Generate unique ID for audit log entry
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup periodic flush interval
   */
  private setupPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = window.setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush queue asynchronously (non-blocking)
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      await this.sendBatch(batch);
      
      // Clear retry counts for successful entries
      batch.forEach(entry => {
        this.retryCount.delete(entry.id);
      });
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      
      // Re-queue failed entries with retry tracking
      const failedEntries = batch.filter(entry => {
        const retries = (this.retryCount.get(entry.id) || 0) + 1;
        this.retryCount.set(entry.id, retries);
        
        if (retries < this.config.maxRetries) {
          return true; // Will retry
        } else {
          console.error(`Audit log entry ${entry.id} exceeded max retries, dropping`);
          return false; // Drop after max retries
        }
      });

      // Re-add failed entries to queue
      this.queue.unshift(...failedEntries);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Flush queue synchronously (for page unload)
   */
  private flushSync(): void {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.maxBatchSize);
    
    // Use sendBeacon if available for reliable delivery on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      navigator.sendBeacon('/api/audit-logs', blob);
    } else {
      // Fallback to synchronous XHR
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/audit-logs', false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(batch));
    }
  }

  /**
   * Send batch to Supabase
   */
  private async sendBatch(batch: AuditLogEntry[]): Promise<void> {
    if (batch.length === 0) return;

    // Transform entries for database
    const dbEntries = batch.map(entry => ({
      hospital_id: entry.hospital_id,
      user_id: entry.user_id,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: new Date(entry.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from('audit_logs')
      .insert(dbEntries);

    if (error) {
      throw error;
    }
  }

  /**
   * Get current queue statistics
   */
  getStats(): {
    queueSize: number;
    isFlushing: boolean;
    retryCounts: number;
  } {
    return {
      queueSize: this.queue.length,
      isFlushing: this.isFlushing,
      retryCounts: this.retryCount.size
    };
  }

  /**
   * Clear all pending logs
   */
  clear(): void {
    this.queue = [];
    this.retryCount.clear();
  }

  /**
   * Destroy the queue and cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushSync(); // Final flush
  }
}

// Singleton instance with default config
export const auditLogQueue = new AuditLogQueue();

/**
 * Convenience function to add audit log
 */
export function logAudit(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): void {
  auditLogQueue.add(entry);
}

/**
 * Convenience function for HIPAA-compliant audit logging
 */
export function logPHIAccess(
  hospitalId: string,
  userId: string,
  action: 'view' | 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  details?: Record<string, any>
): void {
  auditLogQueue.add({
    hospital_id: hospitalId,
    user_id: userId,
    action_type: `phi_${action}`,
    entity_type: entityType,
    entity_id: entityId,
    details: {
      ...details,
      phi_access: true,
      hipaa_relevant: true
    }
  });
}

/**
 * Convenience function for security event logging
 */
export function logSecurityEvent(
  hospitalId: string,
  userId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, any>
): void {
  auditLogQueue.add({
    hospital_id: hospitalId,
    user_id: userId,
    action_type: `security_${eventType}`,
    details: {
      ...details,
      severity,
      security_event: true
    }
  });
}

export default auditLogQueue;
