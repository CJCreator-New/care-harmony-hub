import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Consistent empty-state treatment used throughout the app.
 * Renders a gradient icon bubble, DM Serif Display title, muted description, and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const padding = size === 'sm' ? 'py-8' : size === 'lg' ? 'py-20' : 'py-12';
  const bubbleSize = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const iconSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', padding, className)}>
      {/* Icon bubble — faint primary gradient ring */}
      <div
        className={cn(
          bubbleSize,
          'rounded-2xl flex items-center justify-center mb-4',
          'bg-gradient-to-br from-[hsl(var(--primary)/0.12)] to-[hsl(var(--primary)/0.04)]',
          'ring-1 ring-inset ring-[hsl(var(--primary)/0.15)]',
        )}
      >
        <Icon className={cn(iconSize, 'text-[hsl(var(--primary)/0.55)]')} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <p className={cn('font-display font-normal text-foreground/80 mb-1', titleSize)}>
        {title}
      </p>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}

      {/* Optional CTA */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
