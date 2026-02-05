import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackupCodeVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  onBack: () => void;
}

export function BackupCodeVerifyModal({
  open,
  onOpenChange,
  onVerified,
  onBack,
}: BackupCodeVerifyModalProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      toast.error('Please enter a backup code');
      return;
    }

    setIsVerifying(true);
    try {
      const normalizedCode = code.toUpperCase().replace(/\s/g, '');
      const { data, error } = await supabase.functions.invoke('verify-backup-code', {
        body: { code: normalizedCode },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Invalid backup code');
        return;
      }

      toast.success('Backup code verified successfully');
      if (typeof data.remaining === 'number') {
        toast.info(`You have ${data.remaining} backup codes remaining`);
      }
      onVerified();
    } catch (error) {
      console.error('Error verifying backup code:', error);
      toast.error('Failed to verify backup code');
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
            <KeyRound className="h-5 w-5 text-primary" />
            Use Backup Code
          </DialogTitle>
          <DialogDescription>
            Enter one of your backup codes to verify your identity.
            Each code can only be used once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="backup-code">Backup Code</Label>
            <Input
              id="backup-code"
              type="text"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-center text-lg tracking-widest font-mono uppercase"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={!code.trim() || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Backup Code'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to authenticator app
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
