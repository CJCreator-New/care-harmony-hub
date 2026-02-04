import { supabase } from '@/integrations/supabase/client';
import { createHmac } from 'crypto';

// Webhook configuration interface
export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  headers?: Record<string, string>;
  timeout: number;
  createdAt: string;
  hospitalId?: string;
}

// Webhook payload types
export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  hospitalId?: string;
}

// Webhook retry item
export interface WebhookRetry {
  webhookId: string;
  event: string;
  payload: WebhookPayload;
  attempt: number;
  nextRetry: Date;
  error?: string;
}

// Webhook delivery log
export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: WebhookPayload | Record<string, unknown>;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

// Webhook Service for CareSync HMS
export class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private retryQueue: WebhookRetry[] = [];
  private isProcessingRetries = false;
  private deliveryLogs: WebhookLog[] = [];
  private retryProcessorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startRetryProcessor();
  }

  // Cleanup method to clear intervals
  destroy(): void {
    if (this.retryProcessorInterval) {
      clearInterval(this.retryProcessorInterval);
      this.retryProcessorInterval = null;
    }
  }

  constructor() {
    this.startRetryProcessor();
  }

  // Check if webhook service is configured
  isConfigured(): boolean {
    return true; // Basic implementation always configured
  }

  // Register a webhook
  async registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): Promise<{ success: boolean; webhookId?: string; error?: string }> {
    try {
      const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const webhookConfig: WebhookConfig = {
        ...config,
        id: webhookId,
        createdAt: new Date().toISOString()
      };

      this.webhooks.set(webhookId, webhookConfig);

      // Log webhook registration
      await this.logWebhookDelivery({
        id: `log_${Date.now()}`,
        webhookId,
        event: 'webhook.registered',
        payload: { webhookId, url: config.url, events: config.events },
        success: true,
        responseTime: 0,
        timestamp: new Date().toISOString()
      });

      return { success: true, webhookId };
    } catch (error) {
      console.error('Failed to register webhook:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Unregister a webhook
  async unregisterWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.webhooks.has(webhookId)) {
        return { success: false, error: 'Webhook not found' };
      }

      this.webhooks.delete(webhookId);

      // Log webhook unregistration
      await this.logWebhookDelivery({
        id: `log_${Date.now()}`,
        webhookId,
        event: 'webhook.unregistered',
        payload: { webhookId },
        success: true,
        responseTime: 0,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to unregister webhook:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Trigger webhook for an event
  async triggerWebhook(event: string, payload: WebhookPayload, hospitalId?: string): Promise<{ success: boolean; deliveries: number; errors: string[] }> {
    const errors: string[] = [];
    let deliveries = 0;

    try {
      const relevantWebhooks = Array.from(this.webhooks.values()).filter(
        webhook => webhook.active &&
        webhook.events.includes(event) &&
        (!hospitalId || !webhook.hospitalId || webhook.hospitalId === hospitalId)
      );

      if (relevantWebhooks.length === 0) {
        return { success: true, deliveries: 0, errors: [] };
      }

      for (const webhook of relevantWebhooks) {
        try {
          await this.sendWebhook(webhook, event, payload);
          deliveries++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Webhook ${webhook.id}: ${errorMessage}`);

          // Add to retry queue if retry policy allows
          if (webhook.retryPolicy.maxRetries > 0) {
            this.addToRetryQueue(webhook.id, event, payload);
          }
        }
      }

      return { success: deliveries > 0, deliveries, errors };
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      return { success: false, deliveries, errors: [...errors, error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Send webhook to a specific endpoint
  private async sendWebhook(webhook: WebhookConfig, event: string, payload: WebhookPayload): Promise<void> {
    const startTime = Date.now();

    try {
      const signature = this.generateSignature(payload, webhook.secret);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-ID': webhook.id,
        'User-Agent': 'CareSync-HMS-Webhook/1.0',
        ...webhook.headers
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      // Log successful delivery
      await this.logWebhookDelivery({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhookId: webhook.id,
        event,
        payload,
        success: response.ok,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log failed delivery
      await this.logWebhookDelivery({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhookId: webhook.id,
        event,
        payload,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  // Generate webhook signature for security
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  // Add webhook to retry queue
  private addToRetryQueue(webhookId: string, event: string, payload: WebhookPayload): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return;

    const retry: WebhookRetry = {
      webhookId,
      event,
      payload,
      attempt: 1,
      nextRetry: new Date(Date.now() + webhook.retryPolicy.initialDelay),
      error: undefined
    };

    this.retryQueue.push(retry);
  }

  // Start retry processor
  private startRetryProcessor(): void {
    // Clear any existing interval
    if (this.retryProcessorInterval) {
      clearInterval(this.retryProcessorInterval);
    }

    this.retryProcessorInterval = setInterval(async () => {
      if (this.isProcessingRetries || this.retryQueue.length === 0) return;

      this.isProcessingRetries = true;

      const now = new Date();
      const toProcess = this.retryQueue.filter(retry => retry.nextRetry <= now);

      for (const retry of toProcess) {
        const webhook = this.webhooks.get(retry.webhookId);
        if (!webhook) {
          // Remove retry if webhook no longer exists
          this.retryQueue = this.retryQueue.filter(r => r !== retry);
          continue;
        }

        try {
          await this.sendWebhook(webhook, retry.event, retry.payload);

          // Remove from retry queue on success
          this.retryQueue = this.retryQueue.filter(r => r !== retry);

        } catch (error) {
          retry.attempt++;
          retry.error = error instanceof Error ? error.message : 'Unknown error';

          if (retry.attempt >= webhook.retryPolicy.maxRetries) {
            // Remove from queue after max retries
            this.retryQueue = this.retryQueue.filter(r => r !== retry);
            console.error(`Webhook ${webhook.id} failed after ${retry.attempt} attempts:`, error);
          } else {
            // Schedule next retry with exponential backoff
            const delay = webhook.retryPolicy.initialDelay * Math.pow(webhook.retryPolicy.backoffMultiplier, retry.attempt - 1);
            retry.nextRetry = new Date(Date.now() + delay);
          }
        }
      }

      this.isProcessingRetries = false;
    }, 30000); // Check every 30 seconds
  }

  // Log webhook delivery
  private async logWebhookDelivery(log: WebhookLog): Promise<void> {
    try {
      this.deliveryLogs.push(log);

      // Keep only last 1000 logs to prevent memory issues
      if (this.deliveryLogs.length > 1000) {
        this.deliveryLogs = this.deliveryLogs.slice(-1000);
      }

      // In a production system, you would store this in the database
      // For now, we'll just keep it in memory

    } catch (error) {
      console.error('Failed to log webhook delivery:', error);
    }
  }

  // Get webhook statistics
  async getWebhookStats(webhookId: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
  }> {
    const logs = this.deliveryLogs.filter(log => log.webhookId === webhookId);

    const totalDeliveries = logs.length;
    const successfulDeliveries = logs.filter(log => log.success).length;
    const failedDeliveries = totalDeliveries - successfulDeliveries;
    const averageResponseTime = logs.length > 0
      ? logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length
      : 0;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageResponseTime
    };
  }

  // Get all webhooks
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  // Test webhook endpoint
  async testWebhook(webhookId: string): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook' }
    };

    try {
      const startTime = Date.now();
      await this.sendWebhook(webhook, 'test', testPayload);
      const responseTime = Date.now() - startTime;

      return { success: true, responseTime };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// Predefined webhook events for CareSync HMS
export const WEBHOOK_EVENTS = {
  // Patient events
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_DELETED: 'patient.deleted',

  // Appointment events
  APPOINTMENT_SCHEDULED: 'appointment.scheduled',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',

  // Prescription events
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_UPDATED: 'prescription.updated',
  PRESCRIPTION_FILLED: 'prescription.filled',

  // Billing events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Lab events
  LAB_ORDER_CREATED: 'lab_order.created',
  LAB_RESULTS_READY: 'lab_results.ready',

  // System events
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  SYSTEM_ERROR: 'system.error'
} as const;

// Utility functions for easy access
export const triggerWebhook = (event: string, payload: WebhookPayload, hospitalId?: string) =>
  webhookService.triggerWebhook(event, payload, hospitalId);

export const registerWebhook = (config: Omit<WebhookConfig, 'id' | 'createdAt'>) =>
  webhookService.registerWebhook(config);

export const unregisterWebhook = (webhookId: string) =>
  webhookService.unregisterWebhook(webhookId);