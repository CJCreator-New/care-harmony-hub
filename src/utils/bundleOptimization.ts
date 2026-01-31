/**
 * Bundle Optimization Utilities
 * Lazy loading strategies for heavy components
 */

import { lazy, Suspense } from 'react';

// Lazy load chart components
export const LazyCharts = {
  BarChart: lazy(() => import('recharts').then(m => ({ default: m.BarChart }))),
  LineChart: lazy(() => import('recharts').then(m => ({ default: m.LineChart }))),
  PieChart: lazy(() => import('recharts').then(m => ({ default: m.PieChart }))),
  AreaChart: lazy(() => import('recharts').then(m => ({ default: m.AreaChart }))),
};

// Lazy load AI features
export const LazyAI = {
  AIClinicalAssistant: lazy(() => import('@/components/doctor/AIClinicalAssistant').then(m => ({ default: m.AIClinicalAssistant }))),
  LengthOfStayForecasting: lazy(() => import('@/components/ai/LengthOfStayForecastingEngine').then(m => ({ default: m.LengthOfStayForecastingEngine }))),
  ResourceUtilization: lazy(() => import('@/components/ai/ResourceUtilizationOptimizationEngine').then(m => ({ default: m.ResourceUtilizationOptimizationEngine }))),
};

// Lazy load heavy dashboards
export const LazyDashboards = {
  AdminDashboard: lazy(() => import('@/components/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard }))),
  AnalyticsDashboard: lazy(() => import('@/components/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))),
  MonitoringDashboard: lazy(() => import('@/components/monitoring/MonitoringDashboard').then(m => ({ default: m.default }))),
};

// Loading fallback component
export const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm text-muted-foreground">Loading chart...</p>
    </div>
  </div>
);

// Wrapper for lazy components with Suspense
export function withLazyLoading<P extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<P>>,
  fallback?: React.ReactNode
) {
  return (props: P) => (
    <Suspense fallback={fallback || <ChartLoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Dynamic import for route-based code splitting
 */
export const dynamicImport = (path: string) => lazy(() => import(path));

/**
 * Preload component for better UX
 */
export function preloadComponent(importFn: () => Promise<any>) {
  importFn().catch(() => {
    // Silently fail - component will load on demand
  });
}
