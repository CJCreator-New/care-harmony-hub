import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/utils/sanitize';

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { isLoading, setupData, initializeSetup, verifyAndEnable } = useTwoFactorAuth();
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'backup'>('intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleStart = async () => {
    const data = await initializeSetup();
    if (data) {
      setStep('qr');
    }
  };

  const handleVerify = async () => {
    const success = await verifyAndEnable(verificationCode);
    if (success) {
      setStep('backup');
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
    }
  };

  const handleComplete = () => {
    setStep('intro');
    setVerificationCode('');
    setCopiedCodes(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('intro');
      setVerificationCode('');
      setCopiedCodes(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Add an extra layer of security to your account'}
            {step === 'qr' && 'Scan the QR code with your authenticator app'}
            {step === 'verify' && 'Enter the verification code from your app'}
            {step === 'backup' && 'Save your backup codes in a safe place'}
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">Enhanced Security</p>
                    <p className="text-sm text-muted-foreground">
                      Protect your account with a time-based verification code
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium">Authenticator App Required</p>
                    <p className="text-sm text-muted-foreground">
                      You'll need Google Authenticator, Authy, or similar app
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleStart} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Set Up Two-Factor Authentication'
              )}
            </Button>
          </div>
        )}

        {step === 'qr' && setupData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={setupData.qrCode}
                alt="2FA QR Code"
                className="w-48 h-48 rounded-lg border"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Can't scan? Enter this code manually:
              </p>
              <code className="px-3 py-1.5 bg-muted rounded font-mono text-sm break-all">
                {sanitizeHtml(setupData.secret)}
              </code>
            </div>
            <Button onClick={() => setStep('verify')} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={verificationCode.length !== 6 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and Enable'
              )}
            </Button>
            <Button variant="ghost" onClick={() => setStep('qr')} className="w-full">
              Back
            </Button>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2 text-center">Your Backup Codes</p>
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code) => (
                  <code key={code} className="px-2 py-1 bg-background rounded text-center text-sm font-mono">
                    {code}
                  </code>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Each code can only be used once. Store them securely.
            </p>
            <Button variant="outline" onClick={handleCopyBackupCodes} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              {copiedCodes ? 'Copied!' : 'Copy Backup Codes'}
            </Button>
            <Button onClick={handleComplete} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
