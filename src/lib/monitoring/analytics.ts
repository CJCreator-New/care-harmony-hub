interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

class Analytics {
  private queue: AnalyticsEvent[] = [];
  private flushInterval = 5000;

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  track(name: string, properties?: Record<string, unknown>) {
    this.queue.push({
      name,
      properties,
      timestamp: Date.now(),
    });
  }

  page(pageName: string, properties?: Record<string, unknown>) {
    this.track('page_view', { page: pageName, ...properties });
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error('Analytics flush failed:', error);
      this.queue.unshift(...events);
    }
  }
}

export const analytics = new Analytics();

export const useAnalytics = () => {
  const trackEvent = (name: string, properties?: Record<string, unknown>) => {
    analytics.track(name, properties);
  };

  const trackPage = (pageName: string) => {
    analytics.page(pageName);
  };

  return { trackEvent, trackPage };
};
