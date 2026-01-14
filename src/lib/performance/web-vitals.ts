import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { sanitizeForLog } from '@/utils/sanitize';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

const sendToAnalytics = (metric: PerformanceMetric) => {
  if (import.meta.env.PROD) {
    console.log('Performance Metric:', sanitizeForLog(metric));
    
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(() => {});
  }
};

const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    INP: [200, 500],
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  const [good, poor] = thresholds[name] || [0, 0];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
};

const handleMetric = (metric: Metric) => {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now(),
  };
  
  sendToAnalytics(performanceMetric);
};

export const initWebVitals = () => {
  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
};

export const usePerformanceMonitoring = () => {
  const trackPageLoad = (pageName: string) => {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationTiming) {
      sendToAnalytics({
        name: `page-load-${pageName}`,
        value: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
        rating: 'good',
        timestamp: Date.now(),
      });
    }
  };

  const trackCustomMetric = (name: string, value: number) => {
    sendToAnalytics({
      name,
      value,
      rating: 'good',
      timestamp: Date.now(),
    });
  };

  return { trackPageLoad, trackCustomMetric };
};
