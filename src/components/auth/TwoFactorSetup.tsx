import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generateSecret = async () => {
    setIsLoading(true);
    try {
      // Generate TOTP secret
      const { data, error } = await supabase.functions.invoke('generate-2fa-secret');
      
      if (error) throw error;
      
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      toast.success('2FA secret generated');
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa', {
        body: { secret, code: verificationCode }
      });

      if (error) throw error;

      if (data.valid) {
        // Save 2FA settings to user profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            two_factor_enabled: true,
            two_factor_secret: secret 
          })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);

        if (updateError) throw updateError;

        setIsEnabled(true);
        toast.success('2FA enabled successfully');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify 2FA code');
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: false,
          two_factor_secret: null 
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setIsEnabled(false);
      setSecret('');
      setQrCode('');
      setBackupCodes([]);
      toast.success('2FA disabled');
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    toast.success('Backup codes copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          {isEnabled && (
            <Badge variant="success">Enabled</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEnabled && !secret && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Enhance your account security</p>
                <p className="text-muted-foreground">
                  Two-factor authentication adds an extra layer of protection by requiring a code from your authenticator app in addition to your password.
                </p>
              </div>
            </div>
            <Button onClick={generateSecret} disabled={isLoading}>
              Enable 2FA
            </Button>
          </div>
        )}

        {!isEnabled && secret && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Or enter this code manually: <code className="bg-muted px-2 py-1 rounded">{secret}</code>
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Verify Code</h4>
              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
                <Input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button 
                onClick={verify2FA} 
                disabled={isLoading || verificationCode.length !== 6}
                className="mt-4"
              >
                Verify and Enable
              </Button>
            </div>

            {backupCodes.length > 0 && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Backup Codes
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Save these codes in a safe place. You can use them to access your account if you lose your device.
                </p>
                <div className="bg-background p-3 rounded font-mono text-sm space-y-1">
                  {backupCodes.map((code, i) => (
                    <div key={i}>{code}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                  className="mt-3"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {isEnabled && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <Shield className="h-5 w-5 text-success mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">2FA is active</p>
                <p className="text-muted-foreground">
                  Your account is protected with two-factor authentication.
                </p>
              </div>
            </div>
            <Button variant="destructive" onClick={disable2FA} disabled={isLoading}>
              Disable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
