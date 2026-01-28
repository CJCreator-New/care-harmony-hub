/**
 * Security Worker Manager
 * 
 * Manages the security analysis Web Worker and provides a simple API
 * for offloading security analysis tasks.
 * 
 * @module securityWorkerManager
 * @version 1.0.0
 */

import type { SecurityAlert } from '@/workers/securityAnalysis.worker';

interface AnalysisRequest {
  type: 'analyzeLogs' | 'detectAnomalies' | 'checkPatterns';
  data: any;
}

interface AnalysisResponse {
  type: 'result' | 'error';
  data?: SecurityAlert[];
  error?: string;
}

class SecurityWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: SecurityAlert[]) => void;
    reject: (reason: Error) => void;
    timeout: number;
  }>();
  private requestId = 0;
  private isInitialized = false;

  /**
   * Initialize the security worker
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL('@/workers/securityAnalysis.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<AnalysisResponse>) => {
        this.handleMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Security worker error:', error);
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize security worker:', error);
      // Fallback to main thread processing
      this.isInitialized = false;
    }
  }

  /**
   * Analyze security logs using the worker
   */
  async analyzeLogs(
    logs: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<SecurityAlert[]> {
    return this.sendRequest({
      type: 'analyzeLogs',
      data: { logs, timeRange }
    });
  }

  /**
   * Detect anomalies in user behavior
   */
  async detectAnomalies(userData: any[]): Promise<SecurityAlert[]> {
    return this.sendRequest({
      type: 'detectAnomalies',
      data: { userData }
    });
  }

  /**
   * Check for specific security patterns
   */
  async checkPatterns(logs: any[], patterns: string[]): Promise<SecurityAlert[]> {
    return this.sendRequest({
      type: 'checkPatterns',
      data: { logs, patterns }
    });
  }

  /**
   * Send request to worker and wait for response
   */
  private sendRequest(request: AnalysisRequest): Promise<SecurityAlert[]> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.isInitialized) {
        // Fallback: process on main thread (synchronous)
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = (++this.requestId).toString();
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Security analysis timeout'));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.worker!.postMessage({
        ...request,
        requestId: id
      });
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(response: AnalysisResponse & { requestId: string }): void {
    const { requestId, type, data, error } = response;
    const pending = this.pendingRequests.get(requestId);

    if (!pending) return;

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    if (type === 'error') {
      pending.reject(new Error(error || 'Unknown worker error'));
    } else {
      pending.resolve(data || []);
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('Worker terminated'));
      });
      this.pendingRequests.clear();

      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if worker is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

// Singleton instance
export const securityWorker = new SecurityWorkerManager();

// Convenience functions
export async function analyzeSecurityLogs(
  logs: any[],
  timeRange: { start: Date; end: Date }
): Promise<SecurityAlert[]> {
  await securityWorker.init();
  return securityWorker.analyzeLogs(logs, timeRange);
}

export async function detectSecurityAnomalies(userData: any[]): Promise<SecurityAlert[]> {
  await securityWorker.init();
  return securityWorker.detectAnomalies(userData);
}

export async function checkSecurityPatterns(
  logs: any[],
  patterns: string[]
): Promise<SecurityAlert[]> {
  await securityWorker.init();
  return securityWorker.checkPatterns(logs, patterns);
}

export type { SecurityAlert };

export default securityWorker;
