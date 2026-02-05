-- Add salt metadata for encrypted 2FA backup codes

ALTER TABLE public.two_factor_secrets
  ADD COLUMN IF NOT EXISTS backup_codes_salt TEXT,
  ADD COLUMN IF NOT EXISTS secret_version INTEGER DEFAULT 1;

COMMENT ON COLUMN public.two_factor_secrets.secret IS 'Encrypted 2FA secret (v{version}:{iv}.{ciphertext})';
COMMENT ON COLUMN public.two_factor_secrets.backup_codes IS 'Hashed backup codes (SHA-256 with per-user salt)';
COMMENT ON COLUMN public.two_factor_secrets.backup_codes_salt IS 'Base64 salt for backup code hashing';
