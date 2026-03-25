/**
 * usePerformanceSafety Hook
 * Wraps performance monitoring utilities for React components.
 * 
 * Usage:
 *   const { checkPagination, shouldVirtualize } = usePerformanceSafety();
 *   const result = checkPagination(patients);
 *   if (result.limitReached) toast.warning(result.warning);
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  detectPaginationLimit,
  calculatePaginationParams,
  shouldVirtualizeList,
  selectRenderStrategy,
  calculateVirtualSize,
  trackQueryExecution,
  createStableKey,
  TimerRegistry,
} from '@/utils/performanceSafety';

interface ListPerformanceState {
  itemCount: number;
  renderStrategy: 'standard' | 'pagination' | 'virtualization';
  pageSize: number;
  currentPage: number;
}

/**
 * Hook for performance monitoring and optimization in list/table contexts.
 */
export function usePerformanceSafety() {
  const timerRegistryRef = useRef(new TimerRegistry());

  // ─── Pagination Check ────────────────────────────────────────────────────────

  const checkPagination = useCallback(
    <T,>(results: T[] | null | undefined, limit?: number) => {
      return detectPaginationLimit(results, limit);
    },
    []
  );

  // ─── List Virtualization Decision ────────────────────────────────────────────

  const shouldVirtualize = useCallback((itemCount: number): boolean => {
    return shouldVirtualizeList(itemCount);
  }, []);

  // ─── Query Execution Tracking ───────────────────────────────────────────────

  const trackQuery = useCallback((query: string) => {
    const result = trackQueryExecution(query);
    if (result.isN1) {
      console.warn('N+1 Detection:', result.message);
    }
    return result;
  }, []);

  // ─── List Rendering Strategy Selection ──────────────────────────────────────

  const selectStrategy = useCallback(
    (itemCount: number): ListPerformanceState => {
      const strategy = selectRenderStrategy(itemCount);
      return {
        itemCount,
        renderStrategy: strategy,
        pageSize: strategy === 'standard' ? itemCount : strategy === 'pagination' ? 50 : 100,
        currentPage: 1,
      };
    },
    []
  );

  // ─── Pagination Params Calculation ──────────────────────────────────────────

  const getPaginationParams = useCallback(
    (page: number = 1, pageSize: number = 50) => {
      return calculatePaginationParams(page, pageSize);
    },
    []
  );

  // ─── Virtual Scrolling Size Calculation ────────────────────────────────────

  const getVirtualSize = useCallback(
    (viewportHeightPx: number, itemHeightPx: number, bufferCount?: number) => {
      return calculateVirtualSize(viewportHeightPx, itemHeightPx, bufferCount);
    },
    []
  );

  // ─── Stable Key Generation for React.memo ──────────────────────────────────

  const getStableKey = useCallback(
    <T extends Record<string, any>>(obj: T): string => {
      return createStableKey(obj);
    },
    []
  );

  // ─── Cleanup on Unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      timerRegistryRef.current.cleanup();
    };
  }, []);

  // ─── Safe Timer Wrappers ───────────────────────────────────────────────────

  const safeSetTimeout = useCallback((fn: () => void, ms: number) => {
    return timerRegistryRef.current.setTimeout(fn, ms);
  }, []);

  const safeSetInterval = useCallback((fn: () => void, ms: number) => {
    return timerRegistryRef.current.setInterval(fn, ms);
  }, []);

  const safeClearTimeout = useCallback((timer: NodeJS.Timeout) => {
    timerRegistryRef.current.clearTimeout(timer);
  }, []);

  const safeClearInterval = useCallback((interval: NodeJS.Timeout) => {
    timerRegistryRef.current.clearInterval(interval);
  }, []);

  // ─── Memoized Pagination State ─────────────────────────────────────────────

  const createPaginationState = useCallback(
    (
      itemCount: number,
      pageSize: number = 50
    ): {
      totalPages: number;
      hasNextPage: (page: number) => boolean;
      hasPrevPage: (page: number) => boolean;
    } => {
      const totalPages = Math.ceil(itemCount / pageSize);
      return {
        totalPages,
        hasNextPage: (page: number) => page < totalPages,
        hasPrevPage: (page: number) => page > 1,
      };
    },
    []
  );

  return {
    // Pagination helpers
    checkPagination,
    getPaginationParams,
    createPaginationState,
    
    // Virtualization
    shouldVirtualize,
    selectStrategy,
    getVirtualSize,
    
    // Query tracking
    trackQuery,
    
    // Utilities
    getStableKey,
    
    // Timer management
    safeSetTimeout,
    safeSetInterval,
    safeClearTimeout,
    safeClearInterval,
  };
}

/**
 * Performance monitoring context hook.
 * Emits performance warnings to user via toast or silent logging.
 */
export function usePerformanceMonitoring<T extends Record<string, any>>(
  data: T[] | undefined,
  name: string = 'List'
) {
  const { checkPagination, shouldVirtualize, trackQuery } = usePerformanceSafety();
  
  const metrics = useMemo(() => {
    if (!data) return null;

    const paginationCheck = checkPagination(data);
    const virtualizationNeeded = shouldVirtualize(data.length);

    return {
      count: data.length,
      paginationCheck,
      virtualizationNeeded,
      renderStrategy: virtualizationNeeded ? 'virtualization' : data.length > 100 ? 'pagination' : 'standard',
    };
  }, [data, checkPagination, shouldVirtualize]);

  // Log warnings
  useEffect(() => {
    if (!metrics) return;

    if (metrics.paginationCheck.warning) {
      console.warn(`[${name}] ${metrics.paginationCheck.warning}`);
    }

    if (metrics.virtualizationNeeded) {
      console.warn(`[${name}] Large list (${metrics.count} items) - consider virtualization`);
    }
  }, [metrics, name]);

  return metrics;
}
