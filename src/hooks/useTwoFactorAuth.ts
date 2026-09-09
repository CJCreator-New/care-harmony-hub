import { useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export const useTwoFactorAuth = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);

  // Generate a cryptographically secure random secret (base32 encoded)
  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[randomBytes[i] % chars.length];
    }
    return secret;
  };

  // Generate cryptographically secure backup codes
  const generateBackupCodes = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const randomBytes = new Uint8Array(6);
      window.crypto.getRandomValues(randomBytes);
      let code = '';
      for (let j = 0; j < 6; j++) {
        code += chars[randomBytes[j] % chars.length];
      }
      codes.push(code);
    }
    return codes;
  };

  // Initialize 2FA setup
  const initializeSetup = async () => {
    if (!user) {
      toast.error('You must be logged in to set up 2FA');
      return null;
    }

    setIsLoading(true);
    try {
      const secret = generateSecret();
      const backupCodes = generateBackupCodes();
      
      // Create TOTP URI for QR code
      const issuer = 'AROCORD-HIMS';
      const account = profile?.email || user.email || 'user';
      const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      // Generate QR code as data URL using client-side library (no external dependency)
      const qrCode = await QRCode.toDataURL(totpUri, { errorCorrectionLevel: 'M', width: 200 });

      const data: TwoFactorSetup = { secret, qrCode, backupCodes };
      setSetupData(data);
      return data;
    } catch (error) {
      console.error('Error initializing 2FA:', error);
      toast.error('Failed to initialize 2FA setup');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify TOTP code and enable 2FA
  const verifyAndEnable = async (code: string) => {
    if (!user || !setupData) {
      toast.error('Setup not initialized');
      return false;
    }

    setIsLoading(true);
    try {
      // 1. Check if code is 6 digits
      if (!/^\d{6}$/.test(code)) {
        toast.error('Please enter a valid 6-digit code');
        return false;
      }

      // 2. Stage the secret securely via backend
      const { data: storeData, error: storeError } = await supabase.functions.invoke('store-2fa-secret', {
        body: {
          secret: setupData.secret,
          backupCodes: setupData.backupCodes,
        },
      });

      if (storeError || !storeData?.success) {
        throw new Error(storeData?.error || storeError?.message || 'Failed to stage 2FA secret');
      }

      // 3. Cryptographically verify the submitted TOTP code with the server
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-totp', {
        body: { code },
      });

      if (verifyError || !verifyData?.success) {
        // Rollback staged secret on verification failure
        await supabase
          .from('two_factor_secrets')
          .delete()
          .eq('user_id', user.id);

        toast.error(verifyData?.error || 'Invalid 2FA code. Verification failed.');
        return false;
      }

      toast.success('Two-factor authentication enabled successfully');
      setSetupData(null);
      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Disable 2FA
  const disable = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    setIsLoading(true);
    try {
      // Delete 2FA secret
      const { error: secretError } = await supabase
        .from('two_factor_secrets')
        .delete()
        .eq('user_id', user.id);

      if (secretError) {
        throw secretError;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: false })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Two-factor authentication disabled');
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify backup code
  const verifyBackupCode = async (code: string) => {
    if (!user) {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-backup-code', {
        body: { code },
      });

      if (error || !data?.success) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  };

  return {
    isLoading,
    setupData,
    initializeSetup,
    verifyAndEnable,
    disable,
    verifyBackupCode,
  };
};
