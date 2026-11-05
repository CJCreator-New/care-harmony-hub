import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Minimum length for an audit reason. Matches the order-safety override rule
 * (`overrideReason.trim().length >= 10` in src/modules/order-safety).
 */
export const MIN_REASON_LENGTH = 10;

export function isValidDestructiveReason(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH;
}

export interface ConfirmDestructiveActionProps {
  /** Element that opens the dialog. Omit it when the parent controls `open`. */
  trigger?: React.ReactNode;
  /** Controlled open state. When omitted the component manages its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  /** What will happen, naming the patient or record. */
  description: React.ReactNode;
  /** Label for the destructive button, e.g. "Cancel appointment". */
  confirmLabel: string;
  /** Require a reason before confirming. Defaults to true. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Shows a spinner state and blocks closing while true. */
  isPending?: boolean;
  /**
   * Receives the trimmed reason. Resolve to close the dialog. Throw or reject
   * to keep it open so the entered reason is not lost; the caller reports the error.
   */
  onConfirm: (reason: string) => void | Promise<void>;
  className?: string;
}

/**
 * Confirmation for irreversible actions (cancel, discharge, dispense, delete, refund).
 * The reason is required and must be at least MIN_REASON_LENGTH characters, and it is
 * passed to `onConfirm` so the caller can write it to the existing audit log.
 */
export function ConfirmDestructiveAction({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  requireReason = true,
  reasonLabel = 'Reason (recorded in the audit log)',
  reasonPlaceholder = 'Explain why this action is needed',
  isPending = false,
  onConfirm,
  className,
}: ConfirmDestructiveActionProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = isControlled ? open : internalOpen;
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const reasonId = React.useId();
  const helpId = React.useId();

  const busy = isPending || submitting;
  const reasonValid = !requireReason || isValidDestructiveReason(reason);
  const showReasonError = requireReason && reason.length > 0 && !reasonValid;

  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const handleConfirm = async () => {
    if (!reasonValid || busy) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
    } catch {
      // The caller reports the failure. The dialog stays open with the reason intact.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      {trigger !== undefined && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className={cn('max-w-md', className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor={reasonId}>{reasonLabel}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              disabled={busy}
              aria-invalid={showReasonError || undefined}
              aria-describedby={helpId}
            />
            <p
              id={helpId}
              className={cn(
                'text-xs',
                showReasonError ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              At least {MIN_REASON_LENGTH} characters, not counting leading or trailing spaces.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={!reasonValid || busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDestructiveAction;
