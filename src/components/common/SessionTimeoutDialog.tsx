import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  getSessionWarningState,
  signOutFromWarning,
  staySignedIn,
  subscribeSessionWarning,
} from '@/lib/hooks/auth/useSessionTimeout';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Persistent inactivity warning with a live countdown. It stays until the user chooses
 * "Stay signed in" or "Sign out now", and it does not close on outside clicks or Escape.
 * Mount once, inside the auth provider.
 */
export function SessionTimeoutDialog() {
  const state = useSyncExternalStore(
    subscribeSessionWarning,
    getSessionWarningState,
    getSessionWarningState,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.open) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.open]);

  const remainingMs = state.deadline ? state.deadline - now : 0;

  return (
    <AlertDialog open={state.open}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for a while. For patient privacy you will be signed out in{' '}
            <span role="timer" aria-live="off" className="font-semibold tabular-nums text-foreground">
              {formatRemaining(remainingMs)}
            </span>
            . Anything you were typing is kept for this session, so you can pick it up after you sign
            in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => signOutFromWarning()}>
            Sign out now
          </Button>
          <Button type="button" onClick={() => staySignedIn()}>
            Stay signed in
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default SessionTimeoutDialog;
