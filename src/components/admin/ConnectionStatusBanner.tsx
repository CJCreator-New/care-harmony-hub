/**
 * Realtime Connection Status Banner Component
 * Shows connection status and allows manual retry
 */

import { useEffect, useState } from 'react';
import { useRealtimeConnectionStatus } from '@/hooks/useRealtimeConnectionStatus';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConnectionStatusBannerProps {
  logToDatabase?: boolean;
  showOnlyWhenDisconnected?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Banner component that displays Realtime connection status
 * Shows when connection is lost and provides retry option
 */
export function ConnectionStatusBanner({
  logToDatabase = true,
  showOnlyWhenDisconnected = true,
  position = 'top',
  className,
}: ConnectionStatusBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const status = useRealtimeConnectionStatus(
    logToDatabase,
    undefined, // onDisconnect
    () => setIsVisible(false) // onReconnect - hide banner
  );

  /**
   * Show/hide banner based on connection status
   */
  useEffect(() => {
    if (status.isConnected) {
      // Auto-hide when reconnected
      const hideTimer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(hideTimer);
    } else {
      // Show when disconnected
      setIsVisible(true);
    }
  }, [status.isConnected]);

  // Don't render if only showing when disconnected and we're connected
  if (showOnlyWhenDisconnected && status.isConnected) {
    return null;
  }

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const positionClasses =
    position === 'top'
      ? 'fixed top-0 left-0 right-0 z-50'
      : 'fixed bottom-0 left-0 right-0 z-50';

  return (
    <div
      className={cn(
        'w-full',
        positionClasses,
        'transition-all duration-300 ease-in-out'
      )}
    >
      <div
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between gap-4',
          status.isConnected
            ? 'bg-green-50 border-b border-green-200'
            : 'bg-red-50 border-b border-red-200',
          className
        )}
      >
        {/* Left side: Icon and message */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {status.isConnected ? (
            <>
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div className="text-sm font-medium text-green-800">
                ✓ Connection restored
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-red-900">
                  🔴 Connection lost
                </div>
                <div className="text-xs text-red-700 truncate">
                  Clinical updates may be delayed. Attempting to reconnect...
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right side: Details and actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Show retry counter when disconnected */}
          {!status.isConnected && (
            <div className="text-xs font-mono text-red-600 px-2 py-1 bg-red-100 rounded">
              Attempt {status.retryAttempt}/{10}
            </div>
          )}

          {/* Details toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-8 px-2 text-xs"
          >
            {showDetails ? 'Hide' : 'Details'}
          </Button>

          {/* Close button */}
          {status.isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details section */}
      {showDetails && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-semibold text-red-900">Status:</span>
                <span
                  className={cn(
                    'ml-2',
                    status.isConnected
                      ? 'text-green-700'
                      : 'text-red-700'
                  )}
                >
                  {status.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-red-900">Retries:</span>
                <span className="ml-2 text-red-700">
                  {status.retryAttempt}
                </span>
              </div>
              <div>
                <span className="font-semibold text-red-900">
                  Next Retry:
                </span>
                <span className="ml-2 text-red-700">
                  {status.retryDelayMs}ms
                </span>
              </div>
              <div>
                <span className="font-semibold text-red-900">
                  Disconnects:
                </span>
                <span className="ml-2 text-red-700">
                  {status.disconnectCount}
                </span>
              </div>
            </div>

            {status.lastDisconnectedAt && (
              <div className="text-xs text-red-700">
                <span className="font-semibold">Last disconnected:</span>
                {' '}
                {status.lastDisconnectedAt.toLocaleTimeString()}
              </div>
            )}

            {status.error && (
              <div className="text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Error:</span>
                  {' '}
                  {status.error.message}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Attempt manual retry
                  window.location.reload();
                }}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Page
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetails(false)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatusBanner;
