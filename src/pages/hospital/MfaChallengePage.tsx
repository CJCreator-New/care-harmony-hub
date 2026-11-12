import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMfaAssurance } from '@/lib/hooks/auth/useMfaAssurance';
import { MFA_REENROLL_LOGIN_STATE, redeemBackupCode, verifyTotpCode } from '@/lib/auth/mfa';

/**
 * Login-time second factor. The route guard sends every signed-in user here
 * whose session is aal1 but who has a verified TOTP factor, and also when the
 * assurance lookup fails (fail closed). No app route renders until
 * `mfa.verify` upgrades the session to aal2.
 */
export default function MfaChallengePage() {
  const { logout } = useAuth();
  const { assurance, refresh } = useMfaAssurance();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const factorId = assurance.status === 'ready' ? assurance.verifiedTotpFactorId : null;

  const handleVerify = async () => {
    if (!factorId) return;
    setIsBusy(true);
    setError(null);
    try {
      await verifyTotpCode(factorId, code);
      refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setCode('');
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBackupCode = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const ok = await redeemBackupCode(code);
      if (!ok) {
        setError('That backup code was not accepted.');
        return;
      }
      // The server has removed the TOTP factor. End this aal1 session; at the
      // next login a mandatory-role user is sent to enrol a new authenticator.
      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Backup code accepted', {
        description: 'Sign in again and set up your authenticator app.',
      });
      navigate('/hospital/login', { replace: true, state: MFA_REENROLL_LOGIN_STATE });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup code recovery failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    await logout();
    navigate('/hospital/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {assurance.status === 'error' ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : mode === 'backup' ? (
              <KeyRound className="h-5 w-5 text-primary" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            {mode === 'backup' ? 'Use a backup code' : 'Two-factor authentication'}
          </CardTitle>
          <CardDescription>
            {assurance.status === 'error'
              ? 'We could not confirm the security status of your sign-in.'
              : mode === 'backup'
                ? 'Enter one of your backup codes. Your authenticator will be removed and you will set up a new one after signing in again.'
                : 'Enter the 6-digit code from your authenticator app to continue.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assurance.status === 'error' && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={refresh} disabled={isBusy}>
                Try again
              </Button>
              <Button variant="outline" onClick={handleSignOut} disabled={isBusy}>
                Sign out
              </Button>
            </div>
          )}

          {assurance.status === 'loading' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {assurance.status === 'ready' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">{mode === 'backup' ? 'Backup code' : 'Code'}</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode={mode === 'totp' ? 'numeric' : 'text'}
                  autoComplete="one-time-code"
                  maxLength={mode === 'totp' ? 6 : 64}
                  placeholder={mode === 'totp' ? '000000' : 'Backup code'}
                  value={code}
                  autoFocus
                  className="text-center text-lg tracking-widest font-mono"
                  onChange={(e) =>
                    setCode(mode === 'totp' ? e.target.value.replace(/\D/g, '') : e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || isBusy) return;
                    if (mode === 'totp' && code.length === 6) void handleVerify();
                    if (mode === 'backup' && code.trim()) void handleBackupCode();
                  }}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              {mode === 'totp' ? (
                <Button
                  className="w-full"
                  onClick={handleVerify}
                  disabled={isBusy || code.length !== 6 || !factorId}
                >
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleBackupCode}
                  disabled={isBusy || !code.trim()}
                >
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Use backup code
                </Button>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => {
                    setMode(mode === 'totp' ? 'backup' : 'totp');
                    setCode('');
                    setError(null);
                  }}
                >
                  {mode === 'totp' ? (
                    'Use a backup code'
                  ) : (
                    <>
                      <ArrowLeft className="h-3 w-3" />
                      Back to authenticator app
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                  disabled={isBusy}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
