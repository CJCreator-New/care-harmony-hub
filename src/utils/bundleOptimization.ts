/**
 * Bundle Optimization Utilities
 * Lazy loading strategies for heavy components
 */

import { lazy, Suspense, ReactNode, ComponentType } from 'react';
import React from 'react';

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
export function ChartLoadingFallback(): React.ReactElement {
  return React.createElement('div', {
    className: 'flex items-center justify-center h-64 bg-muted/50 rounded-lg'
  }, React.createElement('div', {
    className: 'text-center'
  }, [
    React.createElement('div', {
      key: 'spinner',
      className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2'
    }),
    React.createElement('p', {
      key: 'text',
      className: 'text-sm text-muted-foreground'
    }, 'Loading chart...')
  ]));
}

// Wrapper for lazy components with Suspense
export function withLazyLoading<P extends object>(
  Component: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: ReactNode
) {
  return function LazyLoadedComponent(props: P) {
    return React.createElement(Suspense, {
      fallback: fallback || React.createElement(ChartLoadingFallback)
    }, React.createElement(Component, props));
  };
}

/**
 * Dynamic import for route-based code splitting
 */
export const dynamicImport = (path: string) => lazy(() => import(/* @vite-ignore */ path));

/**
 * Preload component for better UX
 */
export function preloadComponent(importFn: () => Promise<unknown>) {
  importFn().catch(() => {
    // Silently fail - component will load on demand
  });
}
