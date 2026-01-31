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
    const event: AnalyticsEvent = {
      name,
      properties,
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
    try {
      // Send to analytics service (e.g., Google Analytics, Mixpanel)
      console.debug('Analytics event:', event);
    } catch (e) {
      console.error('Failed to send analytics:', e);
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
