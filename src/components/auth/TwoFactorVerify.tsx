import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorVerifyProps {
  email: string;
  onVerify: (code: string) => Promise<boolean>;
  onBack: () => void;
  isLoading?: boolean;
}

export function TwoFactorVerify({ email, onVerify, onBack, isLoading }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || (useBackupCode ? code.length < 8 : code.length !== 6)) {
      toast.error(useBackupCode ? 'Please enter a valid backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    const success = await onVerify(code);
    if (!success) {
      setCode('');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Enter your verification code</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="2fa-code">
              {useBackupCode ? 'Backup Code' : 'Authentication Code'}
            </Label>
            <Input
              id="2fa-code"
              type="text"
              maxLength={useBackupCode ? 12 : 6}
              placeholder={useBackupCode ? 'Enter backup code' : '000000'}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {useBackupCode 
                ? 'Enter one of your backup codes' 
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !code || (useBackupCode ? code.length < 8 : code.length !== 6)}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setUseBackupCode(!useBackupCode)}
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Logging in as: <span className="font-medium">{email}</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
