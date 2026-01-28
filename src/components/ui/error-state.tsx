import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  FileQuestion,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  WifiOff,
} from "lucide-react"

interface ErrorStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  icon,
  action,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-lg border bg-card",
        className
      )}
    >
      {icon && (
        <div className="mb-4 p-4 rounded-full bg-destructive/10 text-destructive">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {description}
      </p>
      <div className="flex gap-3">
        {action && (
          <Button onClick={action.onClick}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}

function Error404({
  className,
  onNavigateHome,
}: {
  className?: string
  onNavigateHome?: () => void
}) {
  return (
    <ErrorState
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      icon={<FileQuestion className="h-8 w-8" />}
      action={
        onNavigateHome
          ? {
              label: "Go Home",
              onClick: onNavigateHome,
            }
          : undefined
      }
      className={className}
    />
  )
}

function Error500({
  className,
  onRetry,
}: {
  className?: string
  onRetry?: () => void
}) {
  return (
    <ErrorState
      title="Server error"
      description="Something went wrong on our end. Please try again later."
      icon={<Server className="h-8 w-8" />}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  )
}

function ErrorNetwork({
  className,
  onRetry,
}: {
  className?: string
  onRetry?: () => void
}) {
  return (
    <ErrorState
      title="Connection lost"
      description="Please check your internet connection and try again."
      icon={<WifiOff className="h-8 w-8" />}
      action={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  )
}

function ErrorPermission({
  className,
  onContactSupport,
}: {
  className?: string
  onContactSupport?: () => void
}) {
  return (
    <ErrorState
      title="Access denied"
      description="You don't have permission to access this resource."
      icon={<ShieldAlert className="h-8 w-8" />}
      action={
        onContactSupport
          ? {
              label: "Contact Support",
              onClick: onContactSupport,
            }
          : undefined
      }
      className={className}
    />
  )
}

function ErrorMaintenance({
  className,
  estimatedTime,
}: {
  className?: string
  estimatedTime?: string
}) {
  return (
    <ErrorState
      title="Under maintenance"
      description={
        estimatedTime
          ? `We're performing scheduled maintenance. Estimated completion: ${estimatedTime}`
          : "We're performing scheduled maintenance. Please check back later."
      }
      icon={<Ban className="h-8 w-8" />}
      className={className}
    />
  )
}

function EmptyState({
  title = "No results found",
  description = "Try adjusting your search or filters.",
  icon,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        className
      )}
    >
      {icon && (
        <div className="mb-4 p-4 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

function EmptySearch({
  className,
  onClear,
}: {
  className?: string
  onClear?: () => void
}) {
  return (
    <EmptyState
      title="No matches found"
      description="We couldn't find any results matching your search."
      icon={<Search className="h-8 w-8" />}
      action={
        onClear
          ? {
              label: "Clear Search",
              onClick: onClear,
            }
          : undefined
      }
      className={className}
    />
  )
}

function EmptyData({
  className,
  onCreate,
  createLabel = "Create New",
}: {
  className?: string
  onCreate?: () => void
  createLabel?: string
}) {
  return (
    <EmptyState
      title="No data yet"
      description="Get started by creating your first entry."
      icon={<AlertCircle className="h-8 w-8" />}
      action={
        onCreate
          ? {
              label: createLabel,
              onClick: onCreate,
            }
          : undefined
      }
      className={className}
    />
  )
}

function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState
        title="Application error"
        description={
          error.message || "An unexpected error occurred in the application."
        }
        icon={<AlertTriangle className="h-8 w-8" />}
        action={{
          label: "Try Again",
          onClick: resetErrorBoundary,
        }}
        secondaryAction={{
          label: "Reload Page",
          onClick: () => window.location.reload(),
        }}
      />
    </div>
  )
}

export {
  ErrorState,
  Error404,
  Error500,
  ErrorNetwork,
  ErrorPermission,
  ErrorMaintenance,
  EmptyState,
  EmptySearch,
  EmptyData,
  ErrorBoundaryFallback,
}