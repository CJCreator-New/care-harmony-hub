import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Mandatory 2FA enrollment gate for privileged clinical roles (admin/doctor).
 * Reached via ProtectedRoute when `pendingTwoFactor` is true; the user cannot
 * access PHI until two-factor authentication is enabled.
 */
export default function MandatoryTwoFactorSetupPage() {
  const { reloadProfile, logout, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const handleEnabled = async () => {
    setFinishing(true);
    await reloadProfile();
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
            information. To meet our security policy, you must enable two-factor
            authentication before continuing.
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
