import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMfaAssurance } from '@/lib/hooks/auth/useMfaAssurance';

/**
 * Mandatory 2FA enrolment for privileged clinical roles (admin/doctor).
 * The route guard sends a user here when their role requires a second factor
 * and they have no verified Supabase MFA TOTP factor. This includes users who
 * had enabled the retired custom 2FA: that enrolment is not carried over.
 * Completing `mfa.verify` upgrades the session to aal2, after which the guard
 * lets them through.
 */
export default function MandatoryTwoFactorSetupPage() {
  const { logout, primaryRole } = useAuth();
  const { refresh } = useMfaAssurance();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const handleEnabled = () => {
    setFinishing(true);
    refresh();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary p-3 rounded-full mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Two-factor authentication required</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Your role{primaryRole ? ` (${primaryRole})` : ''} has access to protected health
            information. To meet our security policy, you must set up an authenticator app
            before continuing.
          </p>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            If you set up two-factor authentication before, our sign-in system has changed and
            you need to add your authenticator again. You can remove the old entry from your app.
          </p>
        </div>

        <TwoFactorSetup onEnabled={handleEnabled} />

        <div className="flex justify-center">
          <Button variant="ghost" disabled={finishing} onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
