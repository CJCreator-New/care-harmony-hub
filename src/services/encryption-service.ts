import { fieldEncryption as legacyFieldEncryption, keyManager as legacyKeyManager } from '@/utils/dataProtection';
import type { EncryptedData } from '@/utils/dataProtection';
import { supabase } from '@/integrations/supabase/client';

type DecryptionFailureDetails = {
  error: string;
  stack?: string;
  context?: Record<string, any>;
};

async function logDecryptionFailure(details: DecryptionFailureDetails) {
  try {
    // Attempt to insert an audit log record. If the client is running in a browser
    // the insert will be subject to RLS. This is a best-effort telemetry path.
    await supabase.from('audit_logs').insert({
      action: 'decryption_failure',
      resource_type: 'encryption',
      resource_id: null,
      user_id: null,
      details,
      timestamp: new Date().toISOString(),
      severity: 'high',
      hospital_id: null,
    });

    // Also create a security alert to ensure on-call is notified if configured.
    await supabase.from('security_alerts').insert({
      type: 'decryption_failure',
      severity: 'high',
      message: 'Decryption failure detected',
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // If logging fails, fallback to console.warn to avoid throwing during decryption.
    console.warn('[encryption-service] failed to log decryption failure', err);
  }
}

// Simple facade around existing field-level encryption utilities.
export async function encryptField(value: string, keyVersion?: string): Promise<EncryptedData> {
  return legacyFieldEncryption.encryptField(value, keyVersion);
}

export async function decryptField(encrypted: EncryptedData): Promise<string> {
  try {
    return await legacyFieldEncryption.decryptField(encrypted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : undefined;
    const details: DecryptionFailureDetails = { error: message, stack, context: { encrypted } };
    // Best-effort: log and alert, but do not mask the original error
    await logDecryptionFailure(details);
    throw err;
  }
}

export async function rotateKey(): Promise<string> {
  return legacyKeyManager.rotateKey();
}

export async function getKey(version?: string) {
  return legacyKeyManager.getKey(version);
}

export default {
  encryptField,
  decryptField,
  rotateKey,
  getKey,
};
