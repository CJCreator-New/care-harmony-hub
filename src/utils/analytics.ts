import { createLogger, redactForLog } from '@/utils/logger';

const log = createLogger('analytics');

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 500;
  private userId?: string;

  setUserId(userId: string) {
    this.userId = userId;
  }

  trackEvent(name: string, properties?: Record<string, any>) {
    // Properties are redacted before they are stored or sent: callers may pass record data.
    const event: AnalyticsEvent = {
      name,
      properties: properties ? (redactForLog(properties) as Record<string, any>) : undefined,
      timestamp: Date.now(),
      userId: this.userId,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Send to analytics service in production
    if (import.meta.env.PROD) {
      this.sendToAnalytics(event);
    }
  }

  trackPageView(pageName: string) {
    this.trackEvent('page_view', { page: pageName });
  }

  trackUserAction(action: string, details?: Record<string, any>) {
    this.trackEvent('user_action', { action, ...details });
  }

  trackError(error: string, context?: Record<string, any>) {
    this.trackEvent('error', { error, ...context });
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    // No analytics vendor is integrated. Events are recorded through the shared logger
    // (PHI-redacted; Sentry breadcrumb in production).
    try {
      log.debug('analytics event', { event: event.name, properties: event.properties });
    } catch {
      // Analytics must never break the UI.
    }
  }

  getEvents(): AnalyticsEvent[] {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }

  getEventStats() {
    const stats: Record<string, number> = {};
    this.events.forEach(event => {
      stats[event.name] = (stats[event.name] || 0) + 1;
    });
    return stats;
  }
}

export const analytics = new Analytics();
