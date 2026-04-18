import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const { isOnline, pendingActionCount } = useOfflineSync();

  if (isOnline && pendingActionCount === 0) {
    return null; // Online and no pending actions — hide banner
  }

  if (!isOnline) {
    return (
      <Alert 
        variant="destructive" 
        className="mb-4 border-red-600 bg-red-50"
        role="alert"
        aria-label={`Offline mode active. ${pendingActionCount} pending actions.`}
      >
        <WifiOff className="h-4 w-4 flex-shrink-0" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Offline Mode</strong>: Changes will sync when you reconnect
          </span>
          {pendingActionCount > 0 && (
            <Badge variant="secondary">
              {pendingActionCount} pending
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Online but with pending actions
  return (
    <Alert 
      variant="default" 
      className="mb-4 border-yellow-500 bg-yellow-50"
      role="alert"
      aria-label={`${pendingActionCount} offline actions syncing.`}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>Syncing</strong>: {pendingActionCount} offline actions being uploaded
        </span>
        <Wifi className="h-4 w-4 animate-pulse" />
      </AlertDescription>
    </Alert>
  );
}
