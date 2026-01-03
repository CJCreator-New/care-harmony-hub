import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TwoFactorVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onVerified: () => void;
  onUseBackupCode: () => void;
}

export function TwoFactorVerifyModal({
  open,
  onOpenChange,
  userId,
  onVerified,
  onUseBackupCode,
}: TwoFactorVerifyModalProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-totp', {
        body: { code, userId },
      });

      if (error) {
        throw error;
      }

      if (data.valid) {
        toast.success('Two-factor authentication verified');
        onVerified();
      } else {
        toast.error('Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast.error('Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="totp-code">Authentication Code</Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onUseBackupCode}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <KeyRound className="h-3 w-3" />
              Use a backup code instead
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
