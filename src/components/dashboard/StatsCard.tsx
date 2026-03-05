import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Compact-formats a numeric value for display in a stats card.
 * Examples: 1234 -> "1.2k", 1500000 -> "1.5M", 42 -> "42"
 */
export function formatStatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}k`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** When true, numeric values are compact-formatted (e.g. 1200 -> "1.2k"). */
  formatNumbers?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    container: 'bg-card',
    icon: 'bg-muted text-muted-foreground',
  },
  primary: {
    container: 'bg-card',
    icon: 'bg-primary/10 text-primary',
  },
  success: {
    container: 'bg-card',
    icon: 'bg-success/10 text-success',
  },
  warning: {
    container: 'bg-card',
    icon: 'bg-warning/10 text-warning',
  },
  danger: {
    container: 'bg-card',
    icon: 'bg-destructive/10 text-destructive',
  },
  info: {
    container: 'bg-card',
    icon: 'bg-info/10 text-info',
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  formatNumbers = false,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const displayValue =
    formatNumbers && typeof value === 'number' ? formatStatValue(value) : value;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border p-6 shadow-card transition-all hover:shadow-card-hover',
        styles.container,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{displayValue}</h3>
            {trend && (
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl', styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
