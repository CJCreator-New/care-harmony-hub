import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Optional (self-service) TOTP enrolment from the profile page. Uses the same
 * Supabase Auth MFA flow as the mandatory enrolment page. Closing the dialog
 * unmounts TwoFactorSetup, which removes any unverified factor.
 */
export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Protect your account with a code from an authenticator app.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TwoFactorSetup
            onEnabled={() => {
              onOpenChange(false);
              onSuccess?.();
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
