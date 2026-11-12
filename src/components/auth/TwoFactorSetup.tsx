import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelTotpEnrollment,
  confirmTotpEnrollment,
  startTotpEnrollment,
  type PendingTotpEnrollment,
} from '@/lib/auth/mfa';

interface TwoFactorSetupProps {
  /** Called after the factor is verified (the session is now aal2). */
  onEnabled?: () => void;
  /** Called after the user abandons the enrolment (the unverified factor is removed). */
  onCancel?: () => void;
}

/**
 * TOTP enrolment through Supabase Auth MFA:
 * enroll -> show QR/secret -> challenge + verify a code from the app.
 * The factor only counts once `verify` succeeds; unverified factors are
 * removed on cancel, on retry and when the component unmounts.
 */
export function TwoFactorSetup({ onEnabled, onCancel }: TwoFactorSetupProps = {}) {
  const [pending, setPending] = useState<PendingTotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingFactorRef = useRef<string | null>(null);

  // Remove an unverified factor if the user navigates away mid-enrolment.
  useEffect(() => {
    return () => {
      if (pendingFactorRef.current) void cancelTotpEnrollment(pendingFactorRef.current);
    };
  }, []);

  const start = async () => {
    setIsLoading(true);
    setError(null);
    setCode('');
    try {
      if (pendingFactorRef.current) {
        await cancelTotpEnrollment(pendingFactorRef.current);
        pendingFactorRef.current = null;
      }
      const enrollment = await startTotpEnrollment();
      pendingFactorRef.current = enrollment.factorId;
      setPending(enrollment);
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Could not start enrolment');
      toast.error('Could not start two-factor setup');
    } finally {
      setIsLoading(false);
    }
  };

  const verify = async () => {
    if (!pending) return;
    setIsLoading(true);
    setError(null);
    try {
      await confirmTotpEnrollment(pending.factorId, code);
      pendingFactorRef.current = null;
      setPending(null);
      setCode('');
      toast.success('Two-factor authentication enabled');
      onEnabled?.();
    } catch (err) {
      setCode('');
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const cancel = async () => {
    setIsLoading(true);
    if (pendingFactorRef.current) await cancelTotpEnrollment(pendingFactorRef.current);
    pendingFactorRef.current = null;
    setPending(null);
    setCode('');
    setError(null);
    setIsLoading(false);
    onCancel?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pending && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Use an authenticator app</p>
                <p className="text-muted-foreground">
                  You will scan a QR code with an authenticator app (Google Authenticator,
                  Microsoft Authenticator, Authy, 1Password…) and confirm with a 6-digit code.
                </p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button onClick={start} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set up authenticator
            </Button>
          </div>
        )}

        {pending && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Step 1: Scan the QR code</h4>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={pending.qrCode} alt="Authenticator QR code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center break-all">
                Or enter this key manually:{' '}
                <code className="bg-muted px-2 py-1 rounded">{pending.secret}</code>
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Enter the code from the app</h4>
              <div className="space-y-2">
                <Label htmlFor="verification-code">6-digit code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6 && !isLoading) void verify();
                  }}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive mt-2" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={verify} disabled={isLoading || code.length !== 6}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and enable
                </Button>
                <Button variant="outline" onClick={start} disabled={isLoading}>
                  New QR code
                </Button>
                <Button variant="ghost" onClick={cancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
