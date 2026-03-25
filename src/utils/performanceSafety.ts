/**
 * Performance Safety Utilities
 * Prevents N+1 queries, pagination issues, memory leaks.
 * 
 * Per hims-performance-safety skill:
 * - Detect when query results hit default limit (1000 rows)
 * - Add memoization guards to heavy list components
 * - Use virtualization for 10K+ record lists
 */

// ─── Pagination Limit Detection ──────────────────────────────────────────────

const DEFAULT_PAGE_LIMIT = 1000;
const WARNING_THRESHOLD = 0.9; // Warn at 90% of limit

/**
 * Detect if query results hit the default limit, indicating potential data loss.
 * Returns warning if results.length >= limit * 0.9 (90% threshold).
 */
export function detectPaginationLimit(
  results: any[] | null | undefined,
  limit: number = DEFAULT_PAGE_LIMIT
): { limitReached: boolean; warning?: string } {
  if (!results) {
    return { limitReached: false };
  }

  const percentage = results.length / limit;

  if (percentage >= 1.0) {
    return {
      limitReached: true,
      warning: `Query returned exactly ${results.length} rows. May be truncated at default limit. Implement pagination.`,
    };
  }

  if (percentage >= WARNING_THRESHOLD) {
    return {
      limitReached: false,
      warning: `Query approaching limit: ${results.length}/${limit} rows (${(percentage * 100).toFixed(1)}%). Consider pagination.`,
    };
  }

  return { limitReached: false };
}

/**
 * Build paginated query params.
 */
export interface PaginationParams {
  offset: number;
  limit: number;
  page: number;
}

export function calculatePaginationParams(
  page: number = 1,
  pageSize: number = 50
): PaginationParams {
  return {
    page,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

// ─── Memoization Guidelines ─────────────────────────────────────────────────

/**
 * Helps identify unstable dependencies in memoized components.
 * Logs when dependencies change unexpectedly.
 */
export function logDependencyChanges<T>(
  deps: React.DependencyList,
  name: string
): void {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;

  // Simple approach: stringify deps and log changes
  const depsString = JSON.stringify(deps || []);

  // Store in sessionStorage to compare across renders
  const key = `dep_tracking_${name}`;
  const prev = sessionStorage.getItem(key);

  if (prev && prev !== depsString) {
    console.warn(`Dependencies changed for ${name}:`, { prev, current: depsString });
  }

  sessionStorage.setItem(key, depsString);
}

/**
 * Wrapper component for memo with dependency logging.
 * Helps catch unnecessary re-renders.
 */
export function useMemoExt<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  name: string
): T {
  if (process.env.NODE_ENV === 'development' && deps) {
    logDependencyChanges(deps, `memo_${name}`);
  }
  // In production, just use standard useMemo
  // Note: this is simplified; real integration needs useCallback/useMemo
  return factory();
}

// ─── N+1 Query Detection ─────────────────────────────────────────────────────

interface QueryMetric {
  query: string;
  count: number;
  firstSeenAt: number;
}

const queryMetrics = new Map<string, QueryMetric>();

/**
 * Detect N+1 pattern: same query executed N times in rapid succession.
 */
export function trackQueryExecution(query: string): { isN1: boolean; message?: string } {
  const now = Date.now();
  const metric = queryMetrics.get(query);

  if (!metric) {
    queryMetrics.set(query, { query, count: 1, firstSeenAt: now });
    return { isN1: false };
  }

  const elapsed = now - metric.firstSeenAt;

  // Flag as N+1 if same query run 5+ times in 5 seconds
  const isN1 = metric.count >= 5 && elapsed < 5000;

  if (isN1) {
    return {
      isN1: true,
      message: `Possible N+1: Query "${query}" executed ${metric.count} times in ${elapsed}ms`,
    };
  }

  metric.count++;

  // Cleanup old metrics
  if (elapsed > 10000) {
    queryMetrics.delete(query);
  }

  return { isN1: false };
}

/**
 * Clear query metrics (useful for testing).
 */
export function clearQueryMetrics(): void {
  queryMetrics.clear();
}

// ─── Component Rendering Helpers ────────────────────────────────────────────

/**
 * Detect when a list is too large for standard rendering (10K+ items).
 * Recommend virtualization.
 */
export function shouldVirtualizeList(itemCount: number): boolean {
  return itemCount > 10000;
}

/**
 * Memoization key generator for stable object references.
 * Useful for React.memo equality checks.
 */
export function createStableKey<T extends Record<string, any>>(
  obj: T
): string {
  const keys = Object.keys(obj).sort();
  return keys.map((k) => `${k}:${JSON.stringify(obj[k])}`).join('|');
}

// ─── Memory Leak Prevention ──────────────────────────────────────────────────

/**
 * Track timers and intervals for cleanup.
 */
export class TimerRegistry {
  private timers: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();

  setTimeout(fn: () => void, ms: number): NodeJS.Timeout {
    const timer = setTimeout(fn, ms);
    this.timers.add(timer);
    return timer;
  }

  setInterval(fn: () => void, ms: number): NodeJS.Timeout {
    const interval = setInterval(fn, ms);
    this.intervals.add(interval);
    return interval;
  }

  clearTimeout(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  cleanup(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.intervals.forEach((interval) => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }
}

// ─── Lazy List Component Wrapper ────────────────────────────────────────────

/**
 * Heuristic: Render strategy based on list size.
 */
export function selectRenderStrategy(itemCount: number): 'standard' | 'pagination' | 'virtualization' {
  if (itemCount < 100) return 'standard';
  if (itemCount < 10000) return 'pagination';
  return 'virtualization';
}

/**
 * Calculate virtualization window size based on viewport height.
 */
export function calculateVirtualSize(
  viewportHeightPx: number,
  itemHeightPx: number,
  bufferCount: number = 5
): number {
  const visibleItems = Math.ceil(viewportHeightPx / itemHeightPx);
  return visibleItems + bufferCount * 2; // Add before/after buffer
}
