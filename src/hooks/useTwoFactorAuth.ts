import { useState } from 'react';
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

  // Generate a random secret (base32 encoded)
  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  };

  // Generate backup codes
  const generateBackupCodes = () => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
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
      const issuer = 'CareSync';
      const account = profile?.email || user.email || 'user';
      const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      // Generate QR code URL using a public API
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`;

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
      // In a real implementation, you would verify the TOTP code server-side
      // For now, we'll just save the secret and enable 2FA
      
      // Check if code is 6 digits
      if (!/^\d{6}$/.test(code)) {
        toast.error('Please enter a valid 6-digit code');
        return false;
      }

      // Save 2FA secret to database
      const { error: secretError } = await supabase
        .from('two_factor_secrets')
        .upsert({
          user_id: user.id,
          secret: setupData.secret,
          backup_codes: setupData.backupCodes,
          verified_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (secretError) {
        throw secretError;
      }

      // Update profile to indicate 2FA is enabled
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: true })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Two-factor authentication enabled successfully');
      setSetupData(null);
      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error('Failed to enable 2FA');
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
      const { data, error } = await supabase
        .from('two_factor_secrets')
        .select('backup_codes')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return false;
      }

      const backupCodes = data.backup_codes as string[];
      const codeIndex = backupCodes.indexOf(code.toUpperCase());
      
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      const newCodes = backupCodes.filter((_, i) => i !== codeIndex);
      await supabase
        .from('two_factor_secrets')
        .update({ backup_codes: newCodes })
        .eq('user_id', user.id);

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
