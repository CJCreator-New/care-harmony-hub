-- Add 2FA fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Create index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_profiles_2fa_enabled ON profiles(two_factor_enabled) WHERE two_factor_enabled = TRUE;

-- Add comment
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN profiles.backup_codes IS 'Hashed backup codes for 2FA recovery';
