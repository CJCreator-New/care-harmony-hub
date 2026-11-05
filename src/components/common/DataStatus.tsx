import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Shown in place of a number when its data could not be loaded. Never "0". */
const DATA_UNAVAILABLE = '—';

interface DataErrorProps {
  /** Human name of the failed data, e.g. "pending prescriptions". */
  resource: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Explicit error state for a failed query. Announced to assistive tech via
 * role="alert" and always offers Retry when a retry handler is supplied.
 */
export function DataError({ resource, onRetry, className }: DataErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive',
        className,
      )}
    >
      <p>Could not load {resource}.</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

interface DataStatusProps {
  isLoading: boolean;
  isError: boolean;
  /** Human name of the data, used in the error and loading labels. */
  resource: string;
  onRetry?: () => void;
  loadingClassName?: string;
  children: ReactNode;
}

/**
 * Renders the error state, then the loading state, and only then the children.
 * Children must render "nothing to show" messages only for a successful result.
 */
export function DataStatus({
  isLoading,
  isError,
  resource,
  onRetry,
  loadingClassName,
  children,
}: DataStatusProps) {
  if (isError) {
    return <DataError resource={resource} onRetry={onRetry} />;
  }
  if (isLoading) {
    return (
      <Skeleton
        role="status"
        aria-label={`Loading ${resource}`}
        className={cn('h-16 w-full', loadingClassName)}
      />
    );
  }
  return <>{children}</>;
}

interface StatValueProps {
  isLoading: boolean;
  isError: boolean;
  /** Only rendered on success. */
  value: ReactNode;
  resource?: string;
}

/**
 * Value for a stat card. Shows a skeleton while loading and a dash (with an
 * accessible label) on error, so a failed count is never displayed as 0.
 */
export function StatValue({ isLoading, isError, value, resource }: StatValueProps) {
  if (isLoading) {
    return <Skeleton role="status" aria-label={`Loading ${resource ?? 'value'}`} className="h-8 w-16" />;
  }
  if (isError) {
    return (
      <span aria-label={`${resource ?? 'Value'} unavailable`} title="Data unavailable">
        {DATA_UNAVAILABLE}
      </span>
    );
  }
  return <>{value}</>;
}
